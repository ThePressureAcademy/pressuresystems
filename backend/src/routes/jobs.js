'use strict';

const express = require('express');
const { randomUUID } = require('crypto');
const { getDb } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { rankWorkersForJob } = require('../services/smart-rank');
const { appendAuditEvent } = require('../services/audit');

const router = express.Router();

const VALID_STATUSES = ['draft', 'open', 'allocated', 'in_progress', 'complete', 'cancelled'];
const VALID_RISK_LEVELS = ['routine', 'complex', 'critical'];
const VALID_SHIFT_TYPES = ['day', 'night', 'split'];

function parseJob(job) {
  if (!job) return null;
  job.required_credentials  = JSON.parse(job.required_credentials  || '[]');
  job.crew_roles_required   = JSON.parse(job.crew_roles_required   || '[]');
  job.site_conditions       = JSON.parse(job.site_conditions       || '[]');
  return job;
}

// ─── Helper: fetch SmartRank data for a company ───────────────────────────────

function fetchSmartRankData(db, companyId) {
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const workers = db.prepare(
    `SELECT * FROM workers WHERE company_id = ? AND status != 'inactive'`
  ).all(companyId);
  workers.forEach(w => { w.crane_classes = JSON.parse(w.crane_classes || '[]'); });

  const allCredentials = db.prepare(
    `SELECT * FROM credentials WHERE company_id = ?`
  ).all(companyId);

  const credsByWorker = {};
  for (const c of allCredentials) {
    (credsByWorker[c.worker_id] = credsByWorker[c.worker_id] || []).push(c);
  }

  const fatigueRecords = db.prepare(
    `SELECT * FROM fatigue_records WHERE company_id = ? AND shift_start >= ?`
  ).all(companyId, twoWeeksAgo.toISOString());

  const fatigueByWorker = {};
  for (const f of fatigueRecords) {
    (fatigueByWorker[f.worker_id] = fatigueByWorker[f.worker_id] || []).push(f);
  }

  const recentAllocs = db.prepare(`
    SELECT a.*, j.site_name, j.client_name
    FROM allocations a
    JOIN jobs j ON a.job_id = j.id
    WHERE a.company_id = ? AND a.allocated_at >= ? AND a.status = 'confirmed'
  `).all(companyId, ninetyDaysAgo.toISOString());

  const allocsByWorker = {};
  for (const a of recentAllocs) {
    (allocsByWorker[a.worker_id] = allocsByWorker[a.worker_id] || []).push(a);
  }

  return { workers, credsByWorker, fatigueByWorker, allocsByWorker };
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

// GET /api/jobs
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const { status } = req.query;

  let sql = `SELECT * FROM jobs WHERE company_id = ?`;
  const params = [req.user.company_id];
  if (status) { sql += ` AND status = ?`; params.push(status); }
  sql += ` ORDER BY date DESC, created_at DESC`;

  const jobs = db.prepare(sql).all(...params).map(parseJob);
  res.json(jobs);
});

// POST /api/jobs
router.post('/', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  const {
    reference, client_name, site_name, site_location, date, shift_start_time,
    shift_type, estimated_duration_hours, crane_class_required,
    crew_roles_required, required_credentials, site_conditions,
    lift_risk_level, travel_required, travel_hours_estimated, notes
  } = req.body;

  if (!client_name || !site_name || !date || !shift_type) {
    return res.status(400).json({ error: 'client_name, site_name, date, and shift_type are required' });
  }
  if (!VALID_SHIFT_TYPES.includes(shift_type)) {
    return res.status(400).json({ error: `shift_type must be one of: ${VALID_SHIFT_TYPES.join(', ')}` });
  }
  if (lift_risk_level && !VALID_RISK_LEVELS.includes(lift_risk_level)) {
    return res.status(400).json({ error: `lift_risk_level must be one of: ${VALID_RISK_LEVELS.join(', ')}` });
  }

  const db = getDb();
  const id  = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO jobs (
      id, company_id, reference, client_name, site_name, site_location,
      date, shift_start_time, shift_type, estimated_duration_hours,
      crane_class_required, crew_roles_required, required_credentials,
      site_conditions, lift_risk_level, travel_required, travel_hours_estimated,
      notes, status, created_by_user_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)
  `).run(
    id, req.user.company_id, reference || null, client_name, site_name,
    site_location || null, date, shift_start_time || null, shift_type,
    estimated_duration_hours || null, crane_class_required || null,
    JSON.stringify(crew_roles_required || []),
    JSON.stringify(required_credentials || []),
    JSON.stringify(site_conditions || []),
    lift_risk_level || 'routine',
    travel_required ? 1 : 0,
    travel_hours_estimated || 0,
    notes || null,
    req.user.id, now, now
  );

  appendAuditEvent(db, {
    companyId: req.user.company_id,
    eventType: 'job_created',
    userId:    req.user.id,
    jobId:     id,
    payload:   { client_name, site_name, date, shift_type }
  });

  res.status(201).json(parseJob(db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(id)));
});

// GET /api/jobs/:id
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const job = parseJob(
    db.prepare(`SELECT * FROM jobs WHERE id = ? AND company_id = ?`)
      .get(req.params.id, req.user.company_id)
  );
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

// PATCH /api/jobs/:id
router.patch('/:id', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  const db = getDb();
  const job = db.prepare(`SELECT * FROM jobs WHERE id = ? AND company_id = ?`)
    .get(req.params.id, req.user.company_id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const { status, notes, shift_start_time, estimated_duration_hours } = req.body;
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE jobs
    SET status                 = COALESCE(?, status),
        notes                  = COALESCE(?, notes),
        shift_start_time       = COALESCE(?, shift_start_time),
        estimated_duration_hours = COALESCE(?, estimated_duration_hours),
        updated_at             = ?
    WHERE id = ? AND company_id = ?
  `).run(
    status || null, notes || null, shift_start_time || null,
    estimated_duration_hours || null, now, req.params.id, req.user.company_id
  );

  if (status && status !== job.status) {
    appendAuditEvent(db, {
      companyId: req.user.company_id,
      eventType: 'job_status_changed',
      userId:    req.user.id,
      jobId:     req.params.id,
      payload:   { from: job.status, to: status }
    });
  }

  res.json(parseJob(
    db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(req.params.id)
  ));
});

// ─── SmartRank ────────────────────────────────────────────────────────────────

// GET /api/jobs/:id/smartrank?role=crane_operator
router.get('/:id/smartrank', requireAuth, requireRole('admin', 'dispatcher', 'supervisor'), (req, res) => {
  const db = getDb();
  const job = parseJob(
    db.prepare(`SELECT * FROM jobs WHERE id = ? AND company_id = ?`)
      .get(req.params.id, req.user.company_id)
  );
  if (!job) return res.status(404).json({ error: 'Job not found' });

  let { workers, credsByWorker, fatigueByWorker, allocsByWorker } =
    fetchSmartRankData(db, req.user.company_id);

  // Optional role filter
  if (req.query.role) {
    workers = workers.filter(w => w.role === req.query.role);
  }

  const { ranked, blocked } = rankWorkersForJob(
    workers, job, credsByWorker, fatigueByWorker, allocsByWorker
  );

  const result = { job, ranked, blocked, generated_at: new Date().toISOString() };

  appendAuditEvent(db, {
    companyId: req.user.company_id,
    eventType: 'smartrank_generated',
    userId:    req.user.id,
    jobId:     job.id,
    payload:   { ranked_count: ranked.length, blocked_count: blocked.length }
  });

  res.json(result);
});

// ─── Allocations ──────────────────────────────────────────────────────────────

// GET /api/jobs/:id/allocations
router.get('/:id/allocations', requireAuth, (req, res) => {
  const db = getDb();
  const job = db.prepare(`SELECT id FROM jobs WHERE id = ? AND company_id = ?`)
    .get(req.params.id, req.user.company_id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const allocs = db.prepare(`
    SELECT * FROM allocations WHERE job_id = ? AND company_id = ? ORDER BY allocated_at DESC
  `).all(req.params.id, req.user.company_id);

  const parsed = allocs.map(a => ({
    ...a,
    smartrank_snapshot:      JSON.parse(a.smartrank_snapshot),
    active_warnings:         JSON.parse(a.active_warnings),
    active_blocks_on_others: JSON.parse(a.active_blocks_on_others)
  }));
  res.json(parsed);
});

// POST /api/jobs/:id/allocations
router.post('/:id/allocations', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  const db = getDb();
  const { worker_id, override_reason } = req.body;

  if (!worker_id) {
    return res.status(400).json({ error: 'worker_id is required' });
  }

  const job = parseJob(
    db.prepare(`SELECT * FROM jobs WHERE id = ? AND company_id = ?`)
      .get(req.params.id, req.user.company_id)
  );
  if (!job) return res.status(404).json({ error: 'Job not found' });

  if (!['open', 'draft'].includes(job.status)) {
    return res.status(422).json({
      error: `Job status is '${job.status}' — only 'open' or 'draft' jobs can be allocated`
    });
  }

  const worker = db.prepare(`SELECT * FROM workers WHERE id = ? AND company_id = ?`)
    .get(worker_id, req.user.company_id);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  // Re-run SmartRank at allocation time to get current state + snapshot
  const { workers, credsByWorker, fatigueByWorker, allocsByWorker } =
    fetchSmartRankData(db, req.user.company_id);

  const { ranked, blocked } = rankWorkersForJob(
    workers, job, credsByWorker, fatigueByWorker, allocsByWorker
  );

  // ── Hard block check ──
  const blockedEntry = blocked.find(b => b.worker.id === worker_id);
  if (blockedEntry) {
    appendAuditEvent(db, {
      companyId: req.user.company_id,
      eventType: 'allocation_rejected',
      userId:    req.user.id,
      workerId:  worker_id,
      jobId:     job.id,
      payload:   { reason: 'hard_block', blocks: blockedEntry.blocks }
    });
    return res.status(422).json({
      error: 'Worker is hard-blocked and cannot be allocated to this job',
      blocks: blockedEntry.blocks
    });
  }

  const rankedEntry = ranked.find(r => r.worker.id === worker_id);
  if (!rankedEntry) {
    return res.status(422).json({ error: 'Worker is not available for this job' });
  }

  const { rank, score, score_breakdown, warnings } = rankedEntry;

  // ── Warning requires reason ──
  if (warnings.length > 0 && !override_reason) {
    return res.status(422).json({
      error: 'Worker has active warnings. Provide override_reason to confirm this allocation.',
      warnings
    });
  }

  // ── Build snapshot ──
  const snapshot = {
    generated_at:    new Date().toISOString(),
    score,
    rank_of_selected: rank,
    total_ranked:    ranked.length,
    total_blocked:   blocked.length,
    score_breakdown,
    ranking_summary: ranked.map(r => ({
      worker_id:   r.worker.id,
      worker_name: r.worker.name,
      score:       r.score,
      rank:        r.rank
    }))
  };

  const blockedSummary = blocked.map(b => ({
    worker_id:   b.worker.id,
    worker_name: b.worker.name,
    block_types: b.blocks.map(bl => bl.type)
  }));

  // ── Persist allocation + audit events in one transaction ──
  const allocationId = randomUUID();
  const now          = new Date().toISOString();

  db.transaction(() => {
    db.prepare(`
      INSERT INTO allocations (
        id, job_id, worker_id, company_id, allocated_by_user_id,
        smartrank_position, smartrank_score, smartrank_snapshot,
        active_warnings, active_blocks_on_others, override_reason,
        status, allocated_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)
    `).run(
      allocationId, job.id, worker_id, req.user.company_id, req.user.id,
      rank, score,
      JSON.stringify(snapshot),
      JSON.stringify(warnings),
      JSON.stringify(blockedSummary),
      override_reason || null,
      now, now
    );

    db.prepare(`UPDATE jobs SET status = 'allocated', updated_at = ? WHERE id = ?`)
      .run(now, job.id);

    appendAuditEvent(db, {
      companyId:    req.user.company_id,
      eventType:    'allocation_confirmed',
      userId:       req.user.id,
      workerId:     worker_id,
      jobId:        job.id,
      allocationId,
      payload:      { smartrank_position: rank, score, warnings_count: warnings.length }
    });

    if (warnings.length > 0 && override_reason) {
      appendAuditEvent(db, {
        companyId:    req.user.company_id,
        eventType:    'warning_acknowledged',
        userId:       req.user.id,
        workerId:     worker_id,
        jobId:        job.id,
        allocationId,
        payload:      { warnings, override_reason }
      });
    }

    if (rank > 1) {
      appendAuditEvent(db, {
        companyId:    req.user.company_id,
        eventType:    'non_top_ranked_selected',
        userId:       req.user.id,
        workerId:     worker_id,
        jobId:        job.id,
        allocationId,
        payload: {
          selected_rank:          rank,
          top_ranked_worker_id:   ranked[0]?.worker.id,
          top_ranked_worker_name: ranked[0]?.worker.name,
          override_reason:        override_reason || null
        }
      });
    }
  })();

  const allocation = db.prepare(`SELECT * FROM allocations WHERE id = ?`).get(allocationId);
  allocation.smartrank_snapshot      = JSON.parse(allocation.smartrank_snapshot);
  allocation.active_warnings         = JSON.parse(allocation.active_warnings);
  allocation.active_blocks_on_others = JSON.parse(allocation.active_blocks_on_others);

  res.status(201).json(allocation);
});

// PATCH /api/jobs/:jobId/allocations/:allocationId — cancel or change
router.patch('/:jobId/allocations/:allocationId', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  const db = getDb();
  const alloc = db.prepare(
    `SELECT * FROM allocations WHERE id = ? AND job_id = ? AND company_id = ?`
  ).get(req.params.allocationId, req.params.jobId, req.user.company_id);
  if (!alloc) return res.status(404).json({ error: 'Allocation not found' });

  const { status } = req.body;
  const validTransitions = ['changed', 'cancelled'];
  if (!status || !validTransitions.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validTransitions.join(', ')}` });
  }

  const now = new Date().toISOString();
  db.prepare(`UPDATE allocations SET status = ?, updated_at = ? WHERE id = ?`)
    .run(status, now, req.params.allocationId);

  appendAuditEvent(db, {
    companyId:    req.user.company_id,
    eventType:    'allocation_changed',
    userId:       req.user.id,
    workerId:     alloc.worker_id,
    jobId:        req.params.jobId,
    allocationId: req.params.allocationId,
    payload:      { from: alloc.status, to: status }
  });

  // If cancelled or changed, reopen the job
  if (['changed', 'cancelled'].includes(status)) {
    const activeAlloc = db.prepare(
      `SELECT id FROM allocations WHERE job_id = ? AND status = 'confirmed' AND id != ?`
    ).get(req.params.jobId, req.params.allocationId);

    if (!activeAlloc) {
      db.prepare(`UPDATE jobs SET status = 'open', updated_at = ? WHERE id = ?`)
        .run(now, req.params.jobId);
    }
  }

  const updated = db.prepare(`SELECT * FROM allocations WHERE id = ?`).get(req.params.allocationId);
  updated.smartrank_snapshot      = JSON.parse(updated.smartrank_snapshot);
  updated.active_warnings         = JSON.parse(updated.active_warnings);
  updated.active_blocks_on_others = JSON.parse(updated.active_blocks_on_others);
  res.json(updated);
});

module.exports = router;
