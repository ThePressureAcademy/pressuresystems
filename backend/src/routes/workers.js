'use strict';

const express = require('express');
const { randomUUID } = require('crypto');
const { getDb } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { appendAuditEvent } = require('../services/audit');
const { analyzeWorkerImport } = require('../services/worker-import');
const { normalizeTaskTag } = require('../services/preferences');
const { resolveScheduleRange } = require('../services/timezone');
const { getCompanyTimeZone, serializeAllocation } = require('../services/schedule');

const router = express.Router();

const VALID_ROLES = ['crane_operator', 'dogman', 'rigger', 'traffic_controller', 'supervisor', 'allocator'];
const VALID_EMP_TYPES = ['permanent', 'casual', 'contractor', 'labour_hire'];
const VALID_STATUSES = ['available', 'allocated', 'unavailable', 'on_leave', 'inactive'];
const VALID_CRED_TYPES = [
  'high_risk_licence_crane', 'high_risk_licence_dogging', 'high_risk_licence_rigging',
  'white_card', 'msic_card', 'site_induction', 'client_induction',
  'medical_clearance', 'drivers_licence', 'other'
];

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function parseWorker(worker) {
  if (worker) {
    worker.crane_classes = JSON.parse(worker.crane_classes || '[]');
    worker.is_archived = Boolean(worker.archived_at);
  }
  return worker;
}

function parsePreference(preference) {
  if (!preference) return null;
  return {
    ...preference,
    rating: Number(preference.rating),
    approval_count: Number(preference.approval_count || 0),
    override_selection_count: Number(preference.override_selection_count || 0),
    confidence: Number(preference.confidence || 0)
  };
}

function ensureWorker(db, workerId, companyId, options = {}) {
  let sql = `
    SELECT *
    FROM workers
    WHERE id = ? AND company_id = ?
  `;

  if (options.activeOnly) {
    sql += ` AND archived_at IS NULL`;
  }

  return db.prepare(sql).get(workerId, companyId);
}

function ensureActiveWorkerOrResponse(res, worker) {
  if (!worker) {
    res.status(404).json({ error: 'Worker not found' });
    return false;
  }
  if (worker.archived_at) {
    res.status(409).json({
      error: 'Worker has been removed from active dispatch.',
      archived_at: worker.archived_at
    });
    return false;
  }
  return true;
}

function computeCredStatus(type, expiryDate, today = new Date()) {
  if (!expiryDate) return 'valid';
  const todayStr = today.toISOString().slice(0, 10);
  if (expiryDate < todayStr) return 'expired';
  const warnDate = new Date(today);
  warnDate.setDate(warnDate.getDate() + 30);
  if (expiryDate <= warnDate.toISOString().slice(0, 10)) return 'expiring_soon';
  return 'valid';
}

function ensureUniqueWorkerEmail(db, companyId, email, excludedWorkerId = null) {
  if (!email) return null;
  const existing = excludedWorkerId
    ? db.prepare(`
        SELECT id, name
        FROM workers
        WHERE company_id = ? AND email = ? AND id != ?
      `).get(companyId, email, excludedWorkerId)
    : db.prepare(`
        SELECT id, name
        FROM workers
        WHERE company_id = ? AND email = ?
      `).get(companyId, email);
  return existing || null;
}

function hasOwn(body, field) {
  return Object.prototype.hasOwnProperty.call(body || {}, field);
}

function normalizeRequiredText(value) {
  return String(value || '').trim();
}

function normalizeNullableText(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeCraneClasses(value) {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return null;
}

function parseCraneClasses(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function createImportedRecords(db, user, row, importMode) {
  const workerId = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO workers (
      id, company_id, name, email, role, employment_type, crane_classes,
      usual_depot, contact_number, status, availability_note, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    workerId,
    user.company_id,
    row.worker.name,
    row.worker.email,
    row.worker.role,
    row.worker.employment_type,
    JSON.stringify(row.worker.crane_classes || []),
    row.worker.usual_depot || null,
    row.worker.contact_number || null,
    row.worker.status || 'available',
    row.worker.availability_note || null,
    row.worker.notes || null,
    now,
    now
  );

  let credentialsCreated = 0;
  for (const credential of row.credentials || []) {
    db.prepare(`
      INSERT INTO credentials (
        id, worker_id, company_id, type, identifier, issuing_body,
        issue_date, expiry_date, verified, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      workerId,
      user.company_id,
      credential.type,
      credential.identifier || null,
      credential.issuing_body || null,
      credential.issue_date || null,
      credential.expiry_date || null,
      credential.verified ? 1 : 0,
      computeCredStatus(credential.type, credential.expiry_date),
      credential.notes || null
    );
    credentialsCreated += 1;
  }

  let preferencesCreated = 0;
  for (const preference of row.preferences || []) {
    db.prepare(`
      INSERT INTO worker_task_preferences (
        id, company_id, worker_id, task_tag, rating, source, notes,
        approval_count, override_selection_count, confidence, last_selected_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'imported', ?, 0, 0, 1, NULL, ?, ?)
    `).run(
      randomUUID(),
      user.company_id,
      workerId,
      normalizeTaskTag(preference.task_tag),
      preference.rating,
      preference.notes || null,
      now,
      now
    );
    preferencesCreated += 1;
  }

  appendAuditEvent(db, {
    companyId: user.company_id,
    eventType: 'worker_imported',
    userId: user.id,
    workerId,
    payload: {
      import_mode: importMode,
      email: row.worker.email,
      credential_count: credentialsCreated,
      preference_count: preferencesCreated
    }
  });

  return {
    worker: parseWorker(db.prepare(`SELECT * FROM workers WHERE id = ?`).get(workerId)),
    worker_id: workerId,
    credentials_created: credentialsCreated,
    preferences_created: preferencesCreated
  };
}

// GET /api/workers
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const { status, role, include_archived } = req.query;
  const includeArchived = include_archived === 'true';

  let sql = `SELECT * FROM workers WHERE company_id = ?`;
  const params = [req.user.company_id];

  if (!includeArchived) {
    sql += ` AND archived_at IS NULL`;
  }

  if (status) {
    sql += ` AND status = ?`;
    params.push(status);
  }
  if (role) {
    sql += ` AND role = ?`;
    params.push(role);
  }

  sql += ` ORDER BY name`;
  const workers = db.prepare(sql).all(...params).map(parseWorker);
  res.json(workers);
});

// POST /api/workers
router.post('/', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  const {
    name,
    email,
    role,
    employment_type,
    crane_classes,
    usual_depot,
    contact_number,
    status,
    availability_note,
    notes
  } = req.body;

  if (!name || !role || !employment_type) {
    return res.status(400).json({ error: 'name, role, and employment_type are required' });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` });
  }
  if (!VALID_EMP_TYPES.includes(employment_type)) {
    return res.status(400).json({ error: `employment_type must be one of: ${VALID_EMP_TYPES.join(', ')}` });
  }
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }
  if (email && !isValidEmail(email)) {
    return res.status(400).json({ error: 'email must be a valid email address' });
  }

  const db = getDb();
  const normalizedEmail = email ? String(email).trim().toLowerCase() : null;
  const duplicate = ensureUniqueWorkerEmail(db, req.user.company_id, normalizedEmail);
  if (duplicate) {
    return res.status(409).json({ error: `A worker with email ${normalizedEmail} already exists` });
  }

  const id = randomUUID();

  db.prepare(`
    INSERT INTO workers (
      id, company_id, name, email, role, employment_type, crane_classes,
      usual_depot, contact_number, status, availability_note, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    req.user.company_id,
    name,
    normalizedEmail,
    role,
    employment_type,
    JSON.stringify(crane_classes || []),
    usual_depot || null,
    contact_number || null,
    status || 'available',
    availability_note || null,
    notes || null
  );

  res.status(201).json(parseWorker(db.prepare(`SELECT * FROM workers WHERE id = ?`).get(id)));
});

// POST /api/workers/import
router.post('/import', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  const db = getDb();
  const { content, delimiter, mode = 'preview' } = req.body;

  if (!content || !String(content).trim()) {
    return res.status(400).json({ error: 'content is required' });
  }

  const existingEmails = db.prepare(`
    SELECT email
    FROM workers
    WHERE company_id = ? AND email IS NOT NULL
  `).all(req.user.company_id).map((row) => row.email);

  const preview = analyzeWorkerImport(content, { delimiter, existingEmails });
  if (preview.summary.total_rows === 0) {
    return res.status(400).json({ error: 'No import rows were found' });
  }

  if (mode !== 'import') {
    return res.json({ mode: 'preview', ...preview });
  }

  const summary = {
    total_rows: preview.summary.total_rows,
    workers_created: 0,
    workers_skipped: 0,
    credentials_created: 0,
    preferences_created: 0,
    rows_with_errors: 0
  };

  const rows = [];
  for (const row of preview.rows) {
    if (row.errors.length > 0) {
      summary.rows_with_errors += 1;
      rows.push({
        row_number: row.row_number,
        status: 'error',
        errors: row.errors,
        warnings: row.warnings
      });
      continue;
    }

    if (row.action === 'skip') {
      summary.workers_skipped += 1;
      rows.push({
        row_number: row.row_number,
        status: 'skipped',
        warnings: row.warnings
      });
      continue;
    }

    try {
      const created = db.transaction(() => createImportedRecords(db, req.user, row, preview.delimiter))();
      summary.workers_created += 1;
      summary.credentials_created += created.credentials_created;
      summary.preferences_created += created.preferences_created;
      rows.push({
        row_number: row.row_number,
        status: 'created',
        worker_id: created.worker_id,
        worker_name: created.worker.name,
        warnings: row.warnings,
        credentials_created: created.credentials_created,
        preferences_created: created.preferences_created
      });
    } catch (error) {
      summary.rows_with_errors += 1;
      rows.push({
        row_number: row.row_number,
        status: 'error',
        warnings: row.warnings,
        errors: [error.message]
      });
    }
  }

  appendAuditEvent(db, {
    companyId: req.user.company_id,
    eventType: 'worker_import_completed',
    userId: req.user.id,
    payload: {
      import_mode: preview.delimiter,
      ...summary
    }
  });

  res.status(201).json({
    mode: 'import',
    delimiter: preview.delimiter,
    summary,
    rows
  });
});

// GET /api/workers/:id/schedule
router.get('/:id/schedule', requireAuth, (req, res) => {
  const db = getDb();
  const worker = ensureWorker(db, req.params.id, req.user.company_id);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  let range;
  try {
    range = resolveScheduleRange({
      start: req.query.start,
      end: req.query.end,
      timezone: req.query.timezone || getCompanyTimeZone(db, req.user.company_id)
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const allocations = db.prepare(`
    SELECT
      a.*,
      j.reference AS job_reference,
      j.client_name,
      j.site_name,
      j.job_timezone,
      j.schedule_status AS job_schedule_status,
      j.scheduled_start_at_utc AS job_scheduled_start_at_utc,
      j.scheduled_end_at_utc AS job_scheduled_end_at_utc,
      j.scheduled_start_local,
      j.scheduled_end_local
    FROM allocations a
    JOIN jobs j ON a.job_id = j.id
    WHERE a.company_id = ?
      AND a.worker_id = ?
      AND a.status = 'confirmed'
      AND j.archived_at IS NULL
      AND COALESCE(a.allocation_start_at_utc, j.scheduled_start_at_utc) IS NOT NULL
      AND COALESCE(a.allocation_end_at_utc, j.scheduled_end_at_utc) IS NOT NULL
      AND COALESCE(a.allocation_start_at_utc, j.scheduled_start_at_utc) < ?
      AND COALESCE(a.allocation_end_at_utc, j.scheduled_end_at_utc) > ?
      AND COALESCE(a.allocation_status, j.schedule_status, 'planned') != 'cancelled'
    ORDER BY COALESCE(a.allocation_start_at_utc, j.scheduled_start_at_utc) ASC
  `).all(req.user.company_id, req.params.id, range.end_at_utc, range.start_at_utc)
    .map((row) => serializeAllocation(row, range.timezone));

  res.json({
    worker: parseWorker(worker),
    timezone: range.timezone,
    range,
    allocations
  });
});

// GET /api/workers/:id
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const worker = parseWorker(ensureWorker(db, req.params.id, req.user.company_id));
  if (!worker) return res.status(404).json({ error: 'Worker not found' });
  res.json(worker);
});

// PATCH /api/workers/:id
router.patch('/:id', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  const db = getDb();
  const existing = ensureWorker(db, req.params.id, req.user.company_id);
  if (!ensureActiveWorkerOrResponse(res, existing)) return;

  const updates = [];
  const params = [];
  const changedFields = [];

  function queueUpdate(column, value, existingValue = existing[column]) {
    const current = existingValue === undefined ? null : existingValue;
    const next = value === undefined ? null : value;
    if (current === next) return;
    updates.push(`${column} = ?`);
    params.push(next);
    changedFields.push(column);
  }

  if (hasOwn(req.body, 'name')) {
    const nextName = normalizeRequiredText(req.body.name);
    if (!nextName) return res.status(400).json({ error: 'name is required' });
    queueUpdate('name', nextName);
  }

  if (hasOwn(req.body, 'email')) {
    const normalizedEmail = normalizeNullableText(req.body.email);
    if (normalizedEmail && !isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'email must be a valid email address' });
    }
    const nextEmail = normalizedEmail ? normalizedEmail.toLowerCase() : null;
    if (nextEmail) {
      const duplicate = ensureUniqueWorkerEmail(db, req.user.company_id, nextEmail, req.params.id);
      if (duplicate) {
        return res.status(409).json({ error: `A worker with email ${nextEmail} already exists` });
      }
    }
    queueUpdate('email', nextEmail, existing.email || null);
  }

  if (hasOwn(req.body, 'role')) {
    const nextRole = normalizeRequiredText(req.body.role);
    if (!VALID_ROLES.includes(nextRole)) {
      return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` });
    }
    queueUpdate('role', nextRole);
  }

  if (hasOwn(req.body, 'employment_type')) {
    const nextEmploymentType = normalizeRequiredText(req.body.employment_type);
    if (!VALID_EMP_TYPES.includes(nextEmploymentType)) {
      return res.status(400).json({ error: `employment_type must be one of: ${VALID_EMP_TYPES.join(', ')}` });
    }
    queueUpdate('employment_type', nextEmploymentType);
  }

  if (hasOwn(req.body, 'status')) {
    const nextStatus = normalizeRequiredText(req.body.status);
    if (!VALID_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    queueUpdate('status', nextStatus);
  }

  if (hasOwn(req.body, 'crane_classes')) {
    const nextCraneClasses = normalizeCraneClasses(req.body.crane_classes);
    if (!Array.isArray(nextCraneClasses)) {
      return res.status(400).json({ error: 'crane_classes must be an array or comma-separated string' });
    }
    const nextCraneClassesJson = JSON.stringify(nextCraneClasses);
    const currentCraneClassesJson = JSON.stringify(parseCraneClasses(existing.crane_classes));
    queueUpdate('crane_classes', nextCraneClassesJson, currentCraneClassesJson);
  }

  for (const field of ['usual_depot', 'contact_number', 'availability_note', 'notes']) {
    if (hasOwn(req.body, field)) {
      queueUpdate(field, normalizeNullableText(req.body[field]), existing[field] || null);
    }
  }

  if (updates.length === 0) {
    return res.json(parseWorker(ensureWorker(db, req.params.id, req.user.company_id)));
  }

  const now = new Date().toISOString();
  updates.push('updated_at = ?');
  params.push(now, req.params.id, req.user.company_id);

  const updatedWorker = db.transaction(() => {
    db.prepare(`
      UPDATE workers
      SET ${updates.join(', ')}
      WHERE id = ? AND company_id = ?
    `).run(...params);

    appendAuditEvent(db, {
      companyId: req.user.company_id,
      eventType: 'worker_updated',
      userId: req.user.id,
      workerId: req.params.id,
      payload: {
        changed_fields: changedFields,
        updated_at: now
      }
    });

    return parseWorker(ensureWorker(db, req.params.id, req.user.company_id));
  })();

  res.json(updatedWorker);
});

// POST /api/workers/:id/remove
router.post('/:id/remove', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  const db = getDb();
  const worker = ensureWorker(db, req.params.id, req.user.company_id);
  if (!worker) {
    return res.status(404).json({ error: 'Worker not found' });
  }

  if (worker.archived_at) {
    return res.json({
      ok: true,
      worker_id: worker.id,
      archived_at: worker.archived_at,
      already_removed: true,
      message: 'Worker already removed from active dispatch.'
    });
  }

  const reason = String(req.body?.reason || '').trim() || null;
  const archivedAt = new Date().toISOString();

  db.prepare(`
    UPDATE workers
    SET status = 'inactive',
        archived_at = ?,
        archived_by_user_id = ?,
        archive_reason = ?,
        updated_at = ?
    WHERE id = ? AND company_id = ?
  `).run(
    archivedAt,
    req.user.id,
    reason,
    archivedAt,
    req.params.id,
    req.user.company_id
  );

  appendAuditEvent(db, {
    companyId: req.user.company_id,
    eventType: 'worker_removed',
    userId: req.user.id,
    workerId: req.params.id,
    payload: {
      worker_name: worker.name,
      worker_email: worker.email || null,
      removed_by: req.user.id,
      reason,
      archived_at: archivedAt
    }
  });

  return res.json({
    ok: true,
    worker_id: worker.id,
    archived_at: archivedAt,
    message: 'Worker removed from active dispatch.'
  });
});

// GET /api/workers/:id/preferences
router.get('/:id/preferences', requireAuth, (req, res) => {
  const db = getDb();
  const worker = ensureWorker(db, req.params.id, req.user.company_id);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  const preferences = db.prepare(`
    SELECT *
    FROM worker_task_preferences
    WHERE worker_id = ? AND company_id = ?
    ORDER BY task_tag, source
  `).all(req.params.id, req.user.company_id).map(parsePreference);

  res.json(preferences);
});

// POST /api/workers/:id/preferences
router.post('/:id/preferences', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  const db = getDb();
  const worker = ensureWorker(db, req.params.id, req.user.company_id);
  if (!ensureActiveWorkerOrResponse(res, worker)) return;

  const { task_tag, rating, notes } = req.body;
  const normalizedTag = normalizeTaskTag(task_tag);
  const numericRating = Number(rating);

  if (!normalizedTag) {
    return res.status(400).json({ error: 'task_tag is required' });
  }
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    return res.status(400).json({ error: 'rating must be an integer from 1 to 5' });
  }

  const existing = db.prepare(`
    SELECT id
    FROM worker_task_preferences
    WHERE company_id = ? AND worker_id = ? AND task_tag = ? AND source = 'manual'
  `).get(req.user.company_id, req.params.id, normalizedTag);
  if (existing) {
    return res.status(409).json({ error: `Manual preference already exists for task tag ${normalizedTag}` });
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO worker_task_preferences (
      id, company_id, worker_id, task_tag, rating, source, notes,
      approval_count, override_selection_count, confidence, last_selected_at,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'manual', ?, 0, 0, 1, NULL, ?, ?)
  `).run(
    id,
    req.user.company_id,
    req.params.id,
    normalizedTag,
    numericRating,
    notes || null,
    now,
    now
  );

  appendAuditEvent(db, {
    companyId: req.user.company_id,
    eventType: 'preference_signal_created',
    userId: req.user.id,
    workerId: req.params.id,
    payload: {
      source: 'manual',
      task_tag: normalizedTag,
      rating: numericRating
    }
  });
  appendAuditEvent(db, {
    companyId: req.user.company_id,
    eventType: 'worker_preferences_updated',
    userId: req.user.id,
    workerId: req.params.id,
    payload: {
      action: 'preference_created',
      preference_id: id,
      task_tag: normalizedTag,
      rating: numericRating
    }
  });

  res.status(201).json(parsePreference(
    db.prepare(`SELECT * FROM worker_task_preferences WHERE id = ?`).get(id)
  ));
});

// PATCH /api/workers/:id/preferences/:preferenceId
router.patch('/:id/preferences/:preferenceId', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  const db = getDb();
  const worker = ensureWorker(db, req.params.id, req.user.company_id);
  if (!ensureActiveWorkerOrResponse(res, worker)) return;
  const preference = db.prepare(`
    SELECT *
    FROM worker_task_preferences
    WHERE id = ? AND worker_id = ? AND company_id = ?
  `).get(req.params.preferenceId, req.params.id, req.user.company_id);

  if (!preference) {
    return res.status(404).json({ error: 'Preference not found' });
  }
  if (preference.source !== 'manual') {
    return res.status(422).json({ error: 'Only manual preferences can be edited in the pilot UI' });
  }

  const nextTaskTag = req.body.task_tag !== undefined
    ? normalizeTaskTag(req.body.task_tag)
    : preference.task_tag;
  const nextRating = req.body.rating !== undefined ? Number(req.body.rating) : Number(preference.rating);
  const nextNotes = req.body.notes !== undefined ? (req.body.notes || null) : preference.notes;

  if (!nextTaskTag) {
    return res.status(400).json({ error: 'task_tag is required' });
  }
  if (!Number.isInteger(nextRating) || nextRating < 1 || nextRating > 5) {
    return res.status(400).json({ error: 'rating must be an integer from 1 to 5' });
  }

  const duplicate = db.prepare(`
    SELECT id
    FROM worker_task_preferences
    WHERE company_id = ? AND worker_id = ? AND task_tag = ? AND source = 'manual' AND id != ?
  `).get(req.user.company_id, req.params.id, nextTaskTag, req.params.preferenceId);
  if (duplicate) {
    return res.status(409).json({ error: `Manual preference already exists for task tag ${nextTaskTag}` });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE worker_task_preferences
    SET task_tag = ?, rating = ?, notes = ?, updated_at = ?
    WHERE id = ?
  `).run(nextTaskTag, nextRating, nextNotes, now, req.params.preferenceId);

  appendAuditEvent(db, {
    companyId: req.user.company_id,
    eventType: 'preference_signal_updated',
    userId: req.user.id,
    workerId: req.params.id,
    payload: {
      source: 'manual',
      task_tag: nextTaskTag,
      rating: nextRating
    }
  });
  appendAuditEvent(db, {
    companyId: req.user.company_id,
    eventType: 'worker_preferences_updated',
    userId: req.user.id,
    workerId: req.params.id,
    payload: {
      preference_id: req.params.preferenceId,
      changed_fields: ['task_tag', 'rating', 'notes'].filter((field) => req.body[field] !== undefined)
    }
  });

  res.json(parsePreference(
    db.prepare(`SELECT * FROM worker_task_preferences WHERE id = ?`).get(req.params.preferenceId)
  ));
});

// GET /api/workers/:id/credentials
router.get('/:id/credentials', requireAuth, (req, res) => {
  const db = getDb();
  const worker = ensureWorker(db, req.params.id, req.user.company_id);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  const credentials = db.prepare(`
    SELECT *
    FROM credentials
    WHERE worker_id = ?
    ORDER BY type, expiry_date DESC
  `).all(req.params.id);

  res.json(credentials);
});

// POST /api/workers/:id/credentials
router.post('/:id/credentials', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  const db = getDb();
  const worker = ensureWorker(db, req.params.id, req.user.company_id);
  if (!ensureActiveWorkerOrResponse(res, worker)) return;

  const { type, identifier, issuing_body, issue_date, expiry_date, verified, notes } = req.body;

  if (!type) return res.status(400).json({ error: 'type is required' });
  if (!VALID_CRED_TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${VALID_CRED_TYPES.join(', ')}` });
  }

  const status = computeCredStatus(type, expiry_date);
  const id = randomUUID();

  db.prepare(`
    INSERT INTO credentials (
      id, worker_id, company_id, type, identifier, issuing_body,
      issue_date, expiry_date, verified, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    req.params.id,
    req.user.company_id,
    type,
    identifier || null,
    issuing_body || null,
    issue_date || null,
    expiry_date || null,
    verified ? 1 : 0,
    status,
    notes || null
  );

  appendAuditEvent(db, {
    companyId: req.user.company_id,
    eventType: 'worker_credentials_updated',
    userId: req.user.id,
    workerId: req.params.id,
    payload: {
      action: 'credential_created',
      credential_id: id,
      type,
      status
    }
  });

  res.status(201).json(db.prepare(`SELECT * FROM credentials WHERE id = ?`).get(id));
});

// PATCH /api/workers/:id/credentials/:credId
router.patch('/:id/credentials/:credId', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  const db = getDb();
  const worker = ensureWorker(db, req.params.id, req.user.company_id);
  if (!ensureActiveWorkerOrResponse(res, worker)) return;
  const credential = db.prepare(`
    SELECT *
    FROM credentials
    WHERE id = ? AND worker_id = ? AND company_id = ?
  `).get(req.params.credId, req.params.id, req.user.company_id);

  if (!credential) return res.status(404).json({ error: 'Credential not found' });

  const nextIdentifier = hasOwn(req.body, 'identifier') ? normalizeNullableText(req.body.identifier) : credential.identifier;
  const nextIssuingBody = hasOwn(req.body, 'issuing_body') ? normalizeNullableText(req.body.issuing_body) : credential.issuing_body;
  const nextIssueDate = hasOwn(req.body, 'issue_date') ? normalizeNullableText(req.body.issue_date) : credential.issue_date;
  const nextExpiryDate = hasOwn(req.body, 'expiry_date') ? normalizeNullableText(req.body.expiry_date) : credential.expiry_date;
  const nextVerified = hasOwn(req.body, 'verified') ? (req.body.verified ? 1 : 0) : credential.verified;
  const nextNotes = hasOwn(req.body, 'notes') ? normalizeNullableText(req.body.notes) : credential.notes;
  const nextStatus = computeCredStatus(credential.type, nextExpiryDate);
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE credentials
    SET identifier = ?,
        issuing_body = ?,
        issue_date = ?,
        expiry_date = ?,
        verified = ?,
        status = ?,
        notes = ?,
        updated_at = ?
    WHERE id = ?
  `).run(
    nextIdentifier,
    nextIssuingBody,
    nextIssueDate,
    nextExpiryDate,
    nextVerified,
    nextStatus,
    nextNotes,
    now,
    req.params.credId
  );

  appendAuditEvent(db, {
    companyId: req.user.company_id,
    eventType: 'worker_credentials_updated',
    userId: req.user.id,
    workerId: req.params.id,
    payload: {
      action: 'credential_updated',
      credential_id: req.params.credId,
      changed_fields: ['identifier', 'issuing_body', 'issue_date', 'expiry_date', 'verified', 'notes']
        .filter((field) => hasOwn(req.body, field)),
      status: nextStatus
    }
  });

  res.json(db.prepare(`SELECT * FROM credentials WHERE id = ?`).get(req.params.credId));
});

// GET /api/workers/:id/fatigue-records
router.get('/:id/fatigue-records', requireAuth, (req, res) => {
  const db = getDb();
  const worker = ensureWorker(db, req.params.id, req.user.company_id);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  const records = db.prepare(`
    SELECT *
    FROM fatigue_records
    WHERE worker_id = ?
    ORDER BY shift_start DESC
    LIMIT 60
  `).all(req.params.id);

  res.json(records);
});

// POST /api/workers/:id/fatigue-records
router.post('/:id/fatigue-records', requireAuth, requireRole('admin', 'dispatcher', 'supervisor'), (req, res) => {
  const db = getDb();
  const worker = ensureWorker(db, req.params.id, req.user.company_id);
  if (!ensureActiveWorkerOrResponse(res, worker)) return;

  const { shift_start, shift_end, shift_type, travel_hours, self_declared_fatigue, notes } = req.body;

  if (!shift_start || !shift_end || !shift_type) {
    return res.status(400).json({ error: 'shift_start, shift_end, and shift_type are required' });
  }
  if (!['day', 'night', 'split'].includes(shift_type)) {
    return res.status(400).json({ error: 'shift_type must be one of: day, night, split' });
  }

  const startMs = new Date(shift_start).getTime();
  const endMs = new Date(shift_end).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
    return res.status(400).json({ error: 'shift_end must be after shift_start' });
  }

  const shiftLengthHours = (endMs - startMs) / 3_600_000;
  const id = randomUUID();

  db.prepare(`
    INSERT INTO fatigue_records (
      id, worker_id, company_id, shift_start, shift_end, shift_length_hours,
      shift_type, travel_hours, self_declared_fatigue, notes, recorded_by_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    req.params.id,
    req.user.company_id,
    shift_start,
    shift_end,
    shiftLengthHours,
    shift_type,
    travel_hours || 0,
    self_declared_fatigue ? 1 : 0,
    notes || null,
    req.user.id
  );

  res.status(201).json(db.prepare(`SELECT * FROM fatigue_records WHERE id = ?`).get(id));
});

module.exports = router;
