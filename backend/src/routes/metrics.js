'use strict';

const express = require('express');
const { getDb } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/metrics?from=2026-01-01&to=2026-12-31
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const cid = req.user.company_id;

  const { from, to } = req.query;
  const fromStr = from || '1970-01-01';
  const toStr   = to   || '9999-12-31';

  function countEvents(eventType) {
    return db.prepare(`
      SELECT COUNT(*) as n FROM audit_events
      WHERE company_id = ? AND event_type = ?
      AND timestamp >= ? AND timestamp <= ?
    `).get(cid, eventType, fromStr, toStr).n;
  }

  const totalJobs = db.prepare(`
    SELECT COUNT(*) as n FROM jobs WHERE company_id = ? AND created_at >= ? AND created_at <= ?
  `).get(cid, fromStr, toStr).n;

  const totalAllocations = db.prepare(`
    SELECT COUNT(*) as n FROM allocations
    WHERE company_id = ? AND allocated_at >= ? AND allocated_at <= ? AND status = 'confirmed'
  `).get(cid, fromStr, toStr).n;

  const topRankedSelections = db.prepare(`
    SELECT COUNT(*) as n FROM allocations
    WHERE company_id = ? AND smartrank_position = 1
    AND allocated_at >= ? AND allocated_at <= ? AND status = 'confirmed'
  `).get(cid, fromStr, toStr).n;

  const lowerRankedSelections = db.prepare(`
    SELECT COUNT(*) as n FROM allocations
    WHERE company_id = ? AND smartrank_position > 1
    AND allocated_at >= ? AND allocated_at <= ? AND status = 'confirmed'
  `).get(cid, fromStr, toStr).n;

  res.json({
    period: { from: fromStr, to: toStr },
    total_jobs:                totalJobs,
    total_allocations:         totalAllocations,
    top_ranked_selections:     topRankedSelections,
    lower_ranked_selections:   lowerRankedSelections,
    credential_blocks:         countEvents('credential_block_applied'),
    fatigue_blocks:            countEvents('fatigue_block_applied'),
    fatigue_warnings:          countEvents('fatigue_warning_triggered'),
    availability_blocks:       countEvents('availability_block_applied'),
    warning_overrides:         countEvents('warning_acknowledged'),
    allocation_rejections:     countEvents('allocation_rejected'),
    total_audit_events:        db.prepare(
      `SELECT COUNT(*) as n FROM audit_events WHERE company_id = ? AND timestamp >= ? AND timestamp <= ?`
    ).get(cid, fromStr, toStr).n
  });
});

module.exports = router;
