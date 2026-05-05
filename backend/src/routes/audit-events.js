'use strict';

const express = require('express');
const { getDb } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/audit-events?job_id=&worker_id=&event_type=&from=&to=&limit=50&offset=0
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const { job_id, worker_id, event_type, from, to, limit = 50, offset = 0 } = req.query;

  let sql = `SELECT * FROM audit_events WHERE company_id = ?`;
  const params = [req.user.company_id];

  if (job_id)     { sql += ` AND job_id = ?`;     params.push(job_id); }
  if (worker_id)  { sql += ` AND worker_id = ?`;  params.push(worker_id); }
  if (event_type) { sql += ` AND event_type = ?`; params.push(event_type); }
  if (from)       { sql += ` AND timestamp >= ?`; params.push(from); }
  if (to)         { sql += ` AND timestamp <= ?`; params.push(to); }

  sql += ` ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  const events = db.prepare(sql).all(...params);
  events.forEach(e => { e.payload = JSON.parse(e.payload); });

  const total = db.prepare(
    `SELECT COUNT(*) as n FROM audit_events WHERE company_id = ?`
  ).get(req.user.company_id).n;

  res.json({ events, total, limit: Number(limit), offset: Number(offset) });
});

// GET /api/audit-events/:id
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const event = db.prepare(
    `SELECT * FROM audit_events WHERE id = ? AND company_id = ?`
  ).get(req.params.id, req.user.company_id);
  if (!event) return res.status(404).json({ error: 'Audit event not found' });
  event.payload = JSON.parse(event.payload);
  res.json(event);
});

module.exports = router;
