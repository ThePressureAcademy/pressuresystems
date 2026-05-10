'use strict';

const express = require('express');
const { randomUUID } = require('crypto');
const { getDb } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { rankWorkersForJob } = require('../services/smart-rank');
const { appendAuditEvent } = require('../services/audit');
const {
  groupPreferencesByWorker,
  upsertLearnedPreferencesFromAllocation
} = require('../services/preferences');
const {
  buildJobScheduleFields,
  currentLocalDate,
  normalizeScheduleStatus
} = require('../services/timezone');
const {
  getCompanyTimeZone,
  serializeAllocation,
  serializeJob
} = require('../services/schedule');

const router = express.Router();

const VALID_JOB_STATUSES = ['draft', 'open', 'allocated', 'in_progress', 'complete', 'cancelled'];
const VALID_RISK_LEVELS = ['routine', 'complex', 'critical'];
const VALID_SHIFT_TYPES = ['day', 'night', 'split'];

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function storedLocalTime(localDateTime) {
  if (!localDateTime || !String(localDateTime).includes(' ')) return null;
  return String(localDateTime).split(' ')[1] || null;
}

function fetchSmartRankData(db, companyId) {
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const workers = db.prepare(
    `SELECT * FROM workers WHERE company_id = ? AND status != 'inactive' AND archived_at IS NULL`
  ).all(companyId);
  workers.forEach((worker) => {
    worker.crane_classes = parseJsonArray(worker.crane_classes);
  });

  const allCredentials = db.prepare(
    `SELECT * FROM credentials WHERE company_id = ?`
  ).all(companyId);
  const credentialsByWorker = {};
  for (const credential of allCredentials) {
    (credentialsByWorker[credential.worker_id] = credentialsByWorker[credential.worker_id] || []).push(credential);
  }

  const fatigueRecords = db.prepare(
    `SELECT * FROM fatigue_records WHERE company_id = ? AND shift_start >= ?`
  ).all(companyId, twoWeeksAgo.toISOString());
  const fatigueByWorker = {};
  for (const record of fatigueRecords) {
    (fatigueByWorker[record.worker_id] = fatigueByWorker[record.worker_id] || []).push(record);
  }

  const allocations = db.prepare(`
    SELECT
      a.*,
      j.reference AS job_reference,
      j.site_name,
      j.client_name,
      j.job_timezone,
      j.schedule_status AS job_schedule_status,
      j.scheduled_start_at_utc AS job_scheduled_start_at_utc,
      j.scheduled_end_at_utc AS job_scheduled_end_at_utc
    FROM allocations a
    JOIN jobs j ON a.job_id = j.id
    WHERE a.company_id = ? AND a.status = 'confirmed'
  `).all(companyId);
  const allocationsByWorker = {};
  for (const allocation of allocations) {
    (allocationsByWorker[allocation.worker_id] = allocationsByWorker[allocation.worker_id] || []).push(allocation);
  }

  const preferenceRows = db.prepare(`
    SELECT *
    FROM worker_task_preferences
    WHERE company_id = ?
  `).all(companyId);

  return {
    workers,
    credsByWorker: credentialsByWorker,
    fatigueByWorker,
    allocsByWorker: allocationsByWorker,
    preferencesByWorker: groupPreferencesByWorker(preferenceRows)
  };
}

function buildJobFields(input, companyTimeZone, existing = null) {
  const date = input.date !== undefined
    ? (input.date || null)
    : (existing?.date || null);
  const existingIsScheduled = Boolean(existing?.scheduled_start_at_utc && existing?.scheduled_end_at_utc);
  const requestedStartTime = input.scheduled_start_time !== undefined
    ? (input.scheduled_start_time || null)
    : input.shift_start_time;
  const requestedEndTime = input.scheduled_end_time !== undefined
    ? (input.scheduled_end_time || null)
    : null;
  const inferredStatus = input.schedule_status !== undefined
    ? input.schedule_status
    : (
        existing
          ? (existing.schedule_status || (existingIsScheduled ? 'planned' : 'draft'))
          : ((date && requestedStartTime && requestedEndTime) ? 'planned' : 'draft')
      );
  const scheduleStatus = normalizeScheduleStatus(inferredStatus, existing?.schedule_status || 'draft');
  const resolvedDate = date || (scheduleStatus === 'draft' ? currentLocalDate(companyTimeZone) : null);

  return buildJobScheduleFields({
    date: resolvedDate,
    scheduled_start_time: input.scheduled_start_time !== undefined
      ? (input.scheduled_start_time || null)
      : undefined,
    shift_start_time: input.shift_start_time !== undefined
      ? (input.shift_start_time || null)
      : (existing ? (storedLocalTime(existing.scheduled_start_local) || existing.shift_start_time || null) : null),
    scheduled_end_time: input.scheduled_end_time !== undefined
      ? (input.scheduled_end_time || null)
      : (existing ? storedLocalTime(existing.scheduled_end_local) : null),
    job_timezone: input.job_timezone !== undefined ? input.job_timezone : existing?.job_timezone,
    company_timezone: companyTimeZone,
    schedule_status: scheduleStatus
  });
}

function scheduleAuditPayload(jobRow) {
  return {
    schedule_status: jobRow.schedule_status,
    job_timezone: jobRow.job_timezone,
    scheduled_start_at_utc: jobRow.scheduled_start_at_utc,
    scheduled_end_at_utc: jobRow.scheduled_end_at_utc,
    scheduled_start_local: jobRow.scheduled_start_local,
    scheduled_end_local: jobRow.scheduled_end_local
  };
}

router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const { status, schedule_status, timezone } = req.query;

  let sql = `SELECT * FROM jobs WHERE company_id = ?`;
  const params = [req.user.company_id];
  if (status) {
    sql += ` AND status = ?`;
    params.push(status);
  }
  if (schedule_status) {
    sql += ` AND schedule_status = ?`;
    params.push(schedule_status);
  }
  sql += ` ORDER BY COALESCE(scheduled_start_at_utc, date || 'T00:00:00Z') ASC, created_at DESC`;

  const jobs = db.prepare(sql).all(...params).map((row) => serializeJob(row, timezone || null));
  res.json(jobs);
});

router.post('/', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  const {
    reference,
    client_name,
    site_name,
    site_location,
    date,
    shift_type,
    estimated_duration_hours,
    crane_class_required,
    task_tags,
    crew_roles_required,
    required_credentials,
    site_conditions,
    lift_risk_level,
    travel_required,
    travel_hours_estimated,
    notes
  } = req.body;

  if (!client_name || !site_name || !shift_type) {
    return res.status(400).json({ error: 'client_name, site_name, and shift_type are required' });
  }
  if (!VALID_SHIFT_TYPES.includes(shift_type)) {
    return res.status(400).json({ error: `shift_type must be one of: ${VALID_SHIFT_TYPES.join(', ')}` });
  }
  if (lift_risk_level && !VALID_RISK_LEVELS.includes(lift_risk_level)) {
    return res.status(400).json({ error: `lift_risk_level must be one of: ${VALID_RISK_LEVELS.join(', ')}` });
  }

  const db = getDb();
  const companyTimeZone = getCompanyTimeZone(db, req.user.company_id);
  let scheduleFields;
  try {
    scheduleFields = buildJobFields(req.body, companyTimeZone);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const jobId = randomUUID();
  const now = new Date().toISOString();
  const persistedDate = date || scheduleFields.scheduled_start_local?.slice(0, 10) || currentLocalDate(companyTimeZone);

  db.prepare(`
    INSERT INTO jobs (
      id, company_id, reference, client_name, site_name, site_location,
      date, shift_start_time, shift_type, estimated_duration_hours,
      crane_class_required, task_tags, crew_roles_required, required_credentials,
      site_conditions, lift_risk_level, scheduled_start_at_utc, scheduled_end_at_utc,
      job_timezone, scheduled_start_local, scheduled_end_local, schedule_status,
      travel_required, travel_hours_estimated, notes, status, created_by_user_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)
  `).run(
    jobId,
    req.user.company_id,
    reference || null,
    client_name,
    site_name,
    site_location || null,
    persistedDate,
    scheduleFields.shift_start_time || null,
    shift_type,
    estimated_duration_hours || null,
    crane_class_required || null,
    JSON.stringify(task_tags || []),
    JSON.stringify(crew_roles_required || []),
    JSON.stringify(required_credentials || []),
    JSON.stringify(site_conditions || []),
    lift_risk_level || 'routine',
    scheduleFields.scheduled_start_at_utc,
    scheduleFields.scheduled_end_at_utc,
    scheduleFields.job_timezone,
    scheduleFields.scheduled_start_local,
    scheduleFields.scheduled_end_local,
    scheduleFields.schedule_status,
    travel_required ? 1 : 0,
    travel_hours_estimated || 0,
    notes || null,
    req.user.id,
    now,
    now
  );

  appendAuditEvent(db, {
    companyId: req.user.company_id,
    eventType: 'job_created',
    userId: req.user.id,
    jobId,
    payload: {
      client_name,
      site_name,
      date: persistedDate,
      shift_type,
      ...scheduleAuditPayload(scheduleFields)
    }
  });

  res.status(201).json(serializeJob(
    db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(jobId)
  ));
});

router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const job = serializeJob(
    db.prepare(`SELECT * FROM jobs WHERE id = ? AND company_id = ?`).get(req.params.id, req.user.company_id)
  );
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

router.patch('/:id', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  const db = getDb();
  const existing = db.prepare(`SELECT * FROM jobs WHERE id = ? AND company_id = ?`)
    .get(req.params.id, req.user.company_id);
  if (!existing) return res.status(404).json({ error: 'Job not found' });

  const nextStatus = req.body.status !== undefined ? req.body.status : existing.status;
  if (nextStatus && !VALID_JOB_STATUSES.includes(nextStatus)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_JOB_STATUSES.join(', ')}` });
  }
  if (req.body.shift_type && !VALID_SHIFT_TYPES.includes(req.body.shift_type)) {
    return res.status(400).json({ error: `shift_type must be one of: ${VALID_SHIFT_TYPES.join(', ')}` });
  }
  if (req.body.lift_risk_level && !VALID_RISK_LEVELS.includes(req.body.lift_risk_level)) {
    return res.status(400).json({ error: `lift_risk_level must be one of: ${VALID_RISK_LEVELS.join(', ')}` });
  }

  const companyTimeZone = getCompanyTimeZone(db, req.user.company_id);
  let scheduleFields;
  try {
    scheduleFields = buildJobFields(req.body, companyTimeZone, existing);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const nextDate = req.body.date !== undefined
    ? (req.body.date || scheduleFields.scheduled_start_local?.slice(0, 10) || existing.date)
    : existing.date;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE jobs
    SET reference = COALESCE(?, reference),
        client_name = COALESCE(?, client_name),
        site_name = COALESCE(?, site_name),
        site_location = COALESCE(?, site_location),
        date = ?,
        shift_start_time = ?,
        shift_type = COALESCE(?, shift_type),
        estimated_duration_hours = COALESCE(?, estimated_duration_hours),
        crane_class_required = COALESCE(?, crane_class_required),
        task_tags = COALESCE(?, task_tags),
        crew_roles_required = COALESCE(?, crew_roles_required),
        required_credentials = COALESCE(?, required_credentials),
        site_conditions = COALESCE(?, site_conditions),
        lift_risk_level = COALESCE(?, lift_risk_level),
        scheduled_start_at_utc = ?,
        scheduled_end_at_utc = ?,
        job_timezone = ?,
        scheduled_start_local = ?,
        scheduled_end_local = ?,
        schedule_status = ?,
        travel_required = COALESCE(?, travel_required),
        travel_hours_estimated = COALESCE(?, travel_hours_estimated),
        notes = COALESCE(?, notes),
        status = COALESCE(?, status),
        updated_at = ?
    WHERE id = ? AND company_id = ?
  `).run(
    req.body.reference !== undefined ? (req.body.reference || null) : null,
    req.body.client_name !== undefined ? (req.body.client_name || null) : null,
    req.body.site_name !== undefined ? (req.body.site_name || null) : null,
    req.body.site_location !== undefined ? (req.body.site_location || null) : null,
    nextDate,
    scheduleFields.shift_start_time || null,
    req.body.shift_type !== undefined ? req.body.shift_type : null,
    req.body.estimated_duration_hours !== undefined ? req.body.estimated_duration_hours : null,
    req.body.crane_class_required !== undefined ? (req.body.crane_class_required || null) : null,
    req.body.task_tags !== undefined ? JSON.stringify(req.body.task_tags || []) : null,
    req.body.crew_roles_required !== undefined ? JSON.stringify(req.body.crew_roles_required || []) : null,
    req.body.required_credentials !== undefined ? JSON.stringify(req.body.required_credentials || []) : null,
    req.body.site_conditions !== undefined ? JSON.stringify(req.body.site_conditions || []) : null,
    req.body.lift_risk_level !== undefined ? req.body.lift_risk_level : null,
    scheduleFields.scheduled_start_at_utc,
    scheduleFields.scheduled_end_at_utc,
    scheduleFields.job_timezone,
    scheduleFields.scheduled_start_local,
    scheduleFields.scheduled_end_local,
    scheduleFields.schedule_status,
    req.body.travel_required !== undefined ? (req.body.travel_required ? 1 : 0) : null,
    req.body.travel_hours_estimated !== undefined ? req.body.travel_hours_estimated : null,
    req.body.notes !== undefined ? (req.body.notes || null) : null,
    req.body.status !== undefined ? req.body.status : null,
    now,
    req.params.id,
    req.user.company_id
  );

  const updated = db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(req.params.id);
  if (req.body.status && req.body.status !== existing.status) {
    appendAuditEvent(db, {
      companyId: req.user.company_id,
      eventType: 'job_status_changed',
      userId: req.user.id,
      jobId: req.params.id,
      payload: { from: existing.status, to: req.body.status }
    });
  }

  const beforeSchedule = JSON.stringify(scheduleAuditPayload(existing));
  const afterSchedule = JSON.stringify(scheduleAuditPayload(updated));
  if (beforeSchedule !== afterSchedule) {
    appendAuditEvent(db, {
      companyId: req.user.company_id,
      eventType: 'job_schedule_changed',
      userId: req.user.id,
      jobId: req.params.id,
      payload: {
        before: scheduleAuditPayload(existing),
        after: scheduleAuditPayload(updated)
      }
    });
  }

  res.json(serializeJob(updated));
});

router.get('/:id/smartrank', requireAuth, requireRole('admin', 'dispatcher', 'supervisor'), (req, res) => {
  const db = getDb();
  const jobRow = db.prepare(`SELECT * FROM jobs WHERE id = ? AND company_id = ?`)
    .get(req.params.id, req.user.company_id);
  if (!jobRow) return res.status(404).json({ error: 'Job not found' });

  const job = serializeJob(jobRow);
  let {
    workers,
    credsByWorker,
    fatigueByWorker,
    allocsByWorker,
    preferencesByWorker
  } = fetchSmartRankData(db, req.user.company_id);

  if (req.query.role) {
    workers = workers.filter((worker) => worker.role === req.query.role);
  }

  const { ranked, blocked } = rankWorkersForJob(
    workers,
    job,
    credsByWorker,
    fatigueByWorker,
    allocsByWorker,
    preferencesByWorker
  );

  const result = { job, ranked, blocked, generated_at: new Date().toISOString() };

  appendAuditEvent(db, {
    companyId: req.user.company_id,
    eventType: 'smartrank_generated',
    userId: req.user.id,
    jobId: job.id,
    payload: { ranked_count: ranked.length, blocked_count: blocked.length }
  });

  const learnedSignals = ranked.flatMap((entry) =>
    (entry.preference_signals || [])
      .filter((signal) => signal.source === 'learned')
      .map((signal) => ({
        worker_id: entry.worker.id,
        worker_name: entry.worker.name,
        task_tag: signal.task_tag,
        rating: signal.rating,
        approval_count: signal.approval_count,
        confidence: signal.confidence
      }))
  );

  if (learnedSignals.length > 0) {
    appendAuditEvent(db, {
      companyId: req.user.company_id,
      eventType: 'learned_preference_applied',
      userId: req.user.id,
      jobId: job.id,
      payload: {
        applied_count: learnedSignals.length,
        signals: learnedSignals.slice(0, 10)
      }
    });
  }

  res.json(result);
});

router.get('/:id/allocations', requireAuth, (req, res) => {
  const db = getDb();
  const job = db.prepare(`SELECT id FROM jobs WHERE id = ? AND company_id = ?`)
    .get(req.params.id, req.user.company_id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const allocations = db.prepare(`
    SELECT
      a.*,
      j.job_timezone,
      j.schedule_status AS job_schedule_status,
      j.scheduled_start_at_utc AS job_scheduled_start_at_utc,
      j.scheduled_end_at_utc AS job_scheduled_end_at_utc,
      j.scheduled_start_local,
      j.scheduled_end_local
    FROM allocations a
    JOIN jobs j ON a.job_id = j.id
    WHERE a.job_id = ? AND a.company_id = ?
    ORDER BY a.allocated_at DESC
  `).all(req.params.id, req.user.company_id);

  res.json(allocations.map((allocation) => serializeAllocation(allocation)));
});

router.post('/:id/allocations', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  const db = getDb();
  const { worker_id, override_reason } = req.body;

  if (!worker_id) {
    return res.status(400).json({ error: 'worker_id is required' });
  }

  const jobRow = db.prepare(`SELECT * FROM jobs WHERE id = ? AND company_id = ?`)
    .get(req.params.id, req.user.company_id);
  if (!jobRow) return res.status(404).json({ error: 'Job not found' });
  const job = serializeJob(jobRow);

  if (!['open', 'draft'].includes(job.status)) {
    return res.status(422).json({
      error: `Job status is '${job.status}' - only 'open' or 'draft' jobs can be allocated`
    });
  }

  const worker = db.prepare(`SELECT * FROM workers WHERE id = ? AND company_id = ?`)
    .get(worker_id, req.user.company_id);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });
  if (worker.archived_at) {
    appendAuditEvent(db, {
      companyId: req.user.company_id,
      eventType: 'allocation_rejected',
      userId: req.user.id,
      workerId: worker_id,
      jobId: job.id,
      payload: {
        reason: 'archived_worker',
        archived_at: worker.archived_at
      }
    });
    return res.status(422).json({ error: 'Worker has been removed from active dispatch.' });
  }

  const {
    workers,
    credsByWorker,
    fatigueByWorker,
    allocsByWorker,
    preferencesByWorker
  } = fetchSmartRankData(db, req.user.company_id);

  const { ranked, blocked } = rankWorkersForJob(
    workers,
    job,
    credsByWorker,
    fatigueByWorker,
    allocsByWorker,
    preferencesByWorker
  );

  const blockedEntry = blocked.find((entry) => entry.worker.id === worker_id);
  if (blockedEntry) {
    appendAuditEvent(db, {
      companyId: req.user.company_id,
      eventType: 'allocation_rejected',
      userId: req.user.id,
      workerId: worker_id,
      jobId: job.id,
      payload: { reason: 'hard_block', blocks: blockedEntry.blocks }
    });
    return res.status(422).json({
      error: 'Worker is hard-blocked and cannot be allocated to this job',
      blocks: blockedEntry.blocks
    });
  }

  const rankedEntry = ranked.find((entry) => entry.worker.id === worker_id);
  if (!rankedEntry) {
    return res.status(422).json({ error: 'Worker is not available for this job' });
  }

  const { rank, score, score_breakdown, warnings, preference_signals } = rankedEntry;
  const overrideRequired = warnings.length > 0 || rank > 1;
  if (overrideRequired && !override_reason) {
    return res.status(422).json({
      error: warnings.length > 0
        ? 'Worker has active warnings. Provide override_reason to confirm this allocation.'
        : 'Selected worker is not top-ranked. Provide override_reason to confirm this allocation.',
      warnings,
      rank
    });
  }

  const snapshot = {
    generated_at: new Date().toISOString(),
    score,
    rank_of_selected: rank,
    total_ranked: ranked.length,
    total_blocked: blocked.length,
    score_breakdown,
    preference_signals,
    schedule: job.schedule,
    ranking_summary: ranked.map((entry) => ({
      worker_id: entry.worker.id,
      worker_name: entry.worker.name,
      score: entry.score,
      rank: entry.rank
    }))
  };

  const blockedSummary = blocked.map((entry) => ({
    worker_id: entry.worker.id,
    worker_name: entry.worker.name,
    block_types: entry.blocks.map((block) => block.type)
  }));

  const allocationId = randomUUID();
  const now = new Date().toISOString();

  db.transaction(() => {
    db.prepare(`
      INSERT INTO allocations (
        id, job_id, worker_id, company_id, allocated_by_user_id,
        smartrank_position, smartrank_score, smartrank_snapshot,
        active_warnings, active_blocks_on_others, override_reason,
        allocation_start_at_utc, allocation_end_at_utc, allocation_timezone, allocation_status,
        status, allocated_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)
    `).run(
      allocationId,
      job.id,
      worker_id,
      req.user.company_id,
      req.user.id,
      rank,
      score,
      JSON.stringify(snapshot),
      JSON.stringify(warnings),
      JSON.stringify(blockedSummary),
      override_reason || null,
      job.scheduled_start_at_utc || null,
      job.scheduled_end_at_utc || null,
      job.job_timezone || null,
      job.schedule_status || null,
      now,
      now
    );

    db.prepare(`UPDATE jobs SET status = 'allocated', updated_at = ? WHERE id = ?`)
      .run(now, job.id);

    appendAuditEvent(db, {
      companyId: req.user.company_id,
      eventType: 'allocation_confirmed',
      userId: req.user.id,
      workerId: worker_id,
      jobId: job.id,
      allocationId,
      payload: {
        smartrank_position: rank,
        score,
        warnings_count: warnings.length,
        schedule: job.schedule
      }
    });

    if (warnings.length > 0 && override_reason) {
      appendAuditEvent(db, {
        companyId: req.user.company_id,
        eventType: 'warning_acknowledged',
        userId: req.user.id,
        workerId: worker_id,
        jobId: job.id,
        allocationId,
        payload: {
          warnings,
          override_reason,
          schedule: job.schedule
        }
      });
    }

    if (rank > 1) {
      appendAuditEvent(db, {
        companyId: req.user.company_id,
        eventType: 'non_top_ranked_selected',
        userId: req.user.id,
        workerId: worker_id,
        jobId: job.id,
        allocationId,
        payload: {
          selected_rank: rank,
          top_ranked_worker_id: ranked[0]?.worker.id,
          top_ranked_worker_name: ranked[0]?.worker.name,
          override_reason: override_reason || null,
          schedule: job.schedule
        }
      });
    }

    upsertLearnedPreferencesFromAllocation(db, appendAuditEvent, {
      companyId: req.user.company_id,
      workerId: worker_id,
      job,
      userId: req.user.id,
      allocationId,
      selectedRank: rank,
      overrideReason: override_reason || null
    });
  })();

  const allocationRow = db.prepare(`
    SELECT
      a.*,
      j.job_timezone,
      j.schedule_status AS job_schedule_status,
      j.scheduled_start_at_utc AS job_scheduled_start_at_utc,
      j.scheduled_end_at_utc AS job_scheduled_end_at_utc,
      j.scheduled_start_local,
      j.scheduled_end_local
    FROM allocations a
    JOIN jobs j ON a.job_id = j.id
    WHERE a.id = ?
  `).get(allocationId);

  res.status(201).json(serializeAllocation(allocationRow));
});

router.patch('/:jobId/allocations/:allocationId', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  const db = getDb();
  const allocation = db.prepare(`
    SELECT *
    FROM allocations
    WHERE id = ? AND job_id = ? AND company_id = ?
  `).get(req.params.allocationId, req.params.jobId, req.user.company_id);
  if (!allocation) return res.status(404).json({ error: 'Allocation not found' });

  const { status } = req.body;
  const validTransitions = ['changed', 'cancelled'];
  if (!status || !validTransitions.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validTransitions.join(', ')}` });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE allocations
    SET status = ?, allocation_status = CASE WHEN ? = 'cancelled' THEN 'cancelled' ELSE allocation_status END, updated_at = ?
    WHERE id = ?
  `).run(status, status, now, req.params.allocationId);

  appendAuditEvent(db, {
    companyId: req.user.company_id,
    eventType: 'allocation_changed',
    userId: req.user.id,
    workerId: allocation.worker_id,
    jobId: req.params.jobId,
    allocationId: req.params.allocationId,
    payload: { from: allocation.status, to: status }
  });

  if (['changed', 'cancelled'].includes(status)) {
    const activeAllocation = db.prepare(`
      SELECT id
      FROM allocations
      WHERE job_id = ? AND status = 'confirmed' AND id != ?
    `).get(req.params.jobId, req.params.allocationId);

    if (!activeAllocation) {
      db.prepare(`UPDATE jobs SET status = 'open', updated_at = ? WHERE id = ?`)
        .run(now, req.params.jobId);
    }
  }

  const updated = db.prepare(`
    SELECT
      a.*,
      j.job_timezone,
      j.schedule_status AS job_schedule_status,
      j.scheduled_start_at_utc AS job_scheduled_start_at_utc,
      j.scheduled_end_at_utc AS job_scheduled_end_at_utc,
      j.scheduled_start_local,
      j.scheduled_end_local
    FROM allocations a
    JOIN jobs j ON a.job_id = j.id
    WHERE a.id = ?
  `).get(req.params.allocationId);

  res.json(serializeAllocation(updated));
});

module.exports = router;
