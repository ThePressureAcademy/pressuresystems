'use strict';

const express = require('express');
const { randomUUID } = require('crypto');
const { getDb } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { appendAuditEvent } = require('../services/audit');

const router = express.Router();

const VALID_ROLES = ['crane_operator', 'dogman', 'rigger', 'traffic_controller', 'supervisor', 'allocator'];
const VALID_EMP_TYPES = ['permanent', 'casual', 'contractor', 'labour_hire'];
const VALID_STATUSES = ['available', 'allocated', 'unavailable', 'on_leave', 'inactive'];
const VALID_CRED_TYPES = [
  'high_risk_licence_crane', 'high_risk_licence_dogging', 'high_risk_licence_rigging',
  'white_card', 'msic_card', 'site_induction', 'client_induction',
  'medical_clearance', 'drivers_licence', 'other'
];

function parseWorker(w) {
  if (w) w.crane_classes = JSON.parse(w.crane_classes || '[]');
  return w;
}

// ─── Workers ──────────────────────────────────────────────────────────────────

// GET /api/workers
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const { status, role } = req.query;

  let sql = `SELECT * FROM workers WHERE company_id = ?`;
  const params = [req.user.company_id];

  if (status) { sql += ` AND status = ?`;  params.push(status); }
  if (role)   { sql += ` AND role = ?`;    params.push(role); }

  sql += ` ORDER BY name`;
  const workers = db.prepare(sql).all(...params).map(parseWorker);
  res.json(workers);
});

// POST /api/workers
router.post('/', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  const { name, role, employment_type, crane_classes, usual_depot,
          contact_number, availability_note, notes } = req.body;

  if (!name || !role || !employment_type) {
    return res.status(400).json({ error: 'name, role, and employment_type are required' });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` });
  }
  if (!VALID_EMP_TYPES.includes(employment_type)) {
    return res.status(400).json({ error: `employment_type must be one of: ${VALID_EMP_TYPES.join(', ')}` });
  }

  const db = getDb();
  const id = randomUUID();

  db.prepare(`
    INSERT INTO workers (
      id, company_id, name, role, employment_type, crane_classes,
      usual_depot, contact_number, availability_note, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, req.user.company_id, name, role, employment_type,
    JSON.stringify(crane_classes || []),
    usual_depot || null, contact_number || null,
    availability_note || null, notes || null
  );

  res.status(201).json(parseWorker(db.prepare(`SELECT * FROM workers WHERE id = ?`).get(id)));
});

// GET /api/workers/:id
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const worker = parseWorker(
    db.prepare(`SELECT * FROM workers WHERE id = ? AND company_id = ?`)
      .get(req.params.id, req.user.company_id)
  );
  if (!worker) return res.status(404).json({ error: 'Worker not found' });
  res.json(worker);
});

// PATCH /api/workers/:id
router.patch('/:id', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  const db = getDb();
  const { name, role, employment_type, crane_classes, usual_depot,
          contact_number, status, availability_note, notes } = req.body;

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE workers
    SET name              = COALESCE(?, name),
        role              = COALESCE(?, role),
        employment_type   = COALESCE(?, employment_type),
        crane_classes     = COALESCE(?, crane_classes),
        usual_depot       = COALESCE(?, usual_depot),
        contact_number    = COALESCE(?, contact_number),
        status            = COALESCE(?, status),
        availability_note = COALESCE(?, availability_note),
        notes             = COALESCE(?, notes),
        updated_at        = ?
    WHERE id = ? AND company_id = ?
  `).run(
    name || null, role || null, employment_type || null,
    crane_classes !== undefined ? JSON.stringify(crane_classes) : null,
    usual_depot || null, contact_number || null,
    status || null, availability_note || null, notes || null,
    now, req.params.id, req.user.company_id
  );

  const updated = parseWorker(
    db.prepare(`SELECT * FROM workers WHERE id = ? AND company_id = ?`)
      .get(req.params.id, req.user.company_id)
  );
  if (!updated) return res.status(404).json({ error: 'Worker not found' });
  res.json(updated);
});

// ─── Credentials ──────────────────────────────────────────────────────────────

function computeCredStatus(type, expiryDate, today = new Date()) {
  if (!expiryDate) return 'valid';
  const todayStr = today.toISOString().slice(0, 10);
  if (expiryDate < todayStr) return 'expired';
  const warn = new Date(today);
  warn.setDate(warn.getDate() + 30);
  if (expiryDate <= warn.toISOString().slice(0, 10)) return 'expiring_soon';
  return 'valid';
}

// GET /api/workers/:id/credentials
router.get('/:id/credentials', requireAuth, (req, res) => {
  const db = getDb();
  const worker = db.prepare(`SELECT id FROM workers WHERE id = ? AND company_id = ?`)
    .get(req.params.id, req.user.company_id);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  const creds = db.prepare(`SELECT * FROM credentials WHERE worker_id = ? ORDER BY type, expiry_date DESC`)
    .all(req.params.id);
  res.json(creds);
});

// POST /api/workers/:id/credentials
router.post('/:id/credentials', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  const db = getDb();
  const worker = db.prepare(`SELECT id FROM workers WHERE id = ? AND company_id = ?`)
    .get(req.params.id, req.user.company_id);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

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
    id, req.params.id, req.user.company_id,
    type, identifier || null, issuing_body || null,
    issue_date || null, expiry_date || null,
    verified ? 1 : 0, status, notes || null
  );

  res.status(201).json(db.prepare(`SELECT * FROM credentials WHERE id = ?`).get(id));
});

// PATCH /api/workers/:id/credentials/:credId
router.patch('/:id/credentials/:credId', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  const db = getDb();
  const cred = db.prepare(`SELECT * FROM credentials WHERE id = ? AND worker_id = ? AND company_id = ?`)
    .get(req.params.credId, req.params.id, req.user.company_id);
  if (!cred) return res.status(404).json({ error: 'Credential not found' });

  const { identifier, issuing_body, issue_date, expiry_date, verified, notes } = req.body;
  const newExpiry = expiry_date !== undefined ? expiry_date : cred.expiry_date;
  const newStatus = computeCredStatus(cred.type, newExpiry);
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE credentials
    SET identifier   = COALESCE(?, identifier),
        issuing_body = COALESCE(?, issuing_body),
        issue_date   = COALESCE(?, issue_date),
        expiry_date  = COALESCE(?, expiry_date),
        verified     = COALESCE(?, verified),
        status       = ?,
        notes        = COALESCE(?, notes),
        updated_at   = ?
    WHERE id = ?
  `).run(
    identifier || null, issuing_body || null,
    issue_date || null, expiry_date !== undefined ? expiry_date : null,
    verified !== undefined ? (verified ? 1 : 0) : null,
    newStatus, notes || null, now, req.params.credId
  );

  res.json(db.prepare(`SELECT * FROM credentials WHERE id = ?`).get(req.params.credId));
});

// ─── Fatigue Records ──────────────────────────────────────────────────────────

// GET /api/workers/:id/fatigue-records
router.get('/:id/fatigue-records', requireAuth, (req, res) => {
  const db = getDb();
  const worker = db.prepare(`SELECT id FROM workers WHERE id = ? AND company_id = ?`)
    .get(req.params.id, req.user.company_id);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  const records = db.prepare(`
    SELECT * FROM fatigue_records WHERE worker_id = ? ORDER BY shift_start DESC LIMIT 60
  `).all(req.params.id);
  res.json(records);
});

// POST /api/workers/:id/fatigue-records
router.post('/:id/fatigue-records', requireAuth, requireRole('admin', 'dispatcher', 'supervisor'), (req, res) => {
  const db = getDb();
  const worker = db.prepare(`SELECT id FROM workers WHERE id = ? AND company_id = ?`)
    .get(req.params.id, req.user.company_id);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  const { shift_start, shift_end, shift_type, travel_hours, self_declared_fatigue, notes } = req.body;

  if (!shift_start || !shift_end || !shift_type) {
    return res.status(400).json({ error: 'shift_start, shift_end, and shift_type are required' });
  }
  const validShiftTypes = ['day', 'night', 'split'];
  if (!validShiftTypes.includes(shift_type)) {
    return res.status(400).json({ error: `shift_type must be one of: ${validShiftTypes.join(', ')}` });
  }

  const startMs  = new Date(shift_start).getTime();
  const endMs    = new Date(shift_end).getTime();
  if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) {
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
    id, req.params.id, req.user.company_id,
    shift_start, shift_end, shiftLengthHours,
    shift_type, travel_hours || 0,
    self_declared_fatigue ? 1 : 0,
    notes || null, req.user.id
  );

  res.status(201).json(db.prepare(`SELECT * FROM fatigue_records WHERE id = ?`).get(id));
});

module.exports = router;
