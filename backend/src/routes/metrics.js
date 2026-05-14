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
  const company = db.prepare(`SELECT pilot_starts_at, created_at FROM companies WHERE id = ?`).get(cid);
  const defaultFrom = company?.pilot_starts_at || company?.created_at || new Date().toISOString();
  const defaultTo = new Date().toISOString();
  const fromStr = from || defaultFrom;
  const toStr = to || defaultTo;
  const periodLabel = from || to
    ? `${String(fromStr).slice(0, 10)} to ${String(toStr).slice(0, 10)}`
    : (company?.pilot_starts_at ? 'Pilot start to today' : 'Initial setup to today');

  function countEvents(eventType) {
    return db.prepare(`
      SELECT COUNT(*) as n FROM audit_events
      WHERE company_id = ? AND event_type = ?
      AND timestamp >= ? AND timestamp <= ?
    `).get(cid, eventType, fromStr, toStr).n;
  }

  const totalJobs = db.prepare(`
    SELECT COUNT(*) as n
    FROM jobs
    WHERE company_id = ?
      AND archived_at IS NULL
      AND created_at >= ? AND created_at <= ?
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
    period: {
      from: String(fromStr).slice(0, 10),
      to: String(toStr).slice(0, 10),
      period_start_at: fromStr,
      period_end_at: toStr,
      label: periodLabel
    },
    total_jobs:                totalJobs,
    total_allocations:         totalAllocations,
    workers_imported:          countEvents('worker_imported'),
    top_ranked_selections:     topRankedSelections,
    lower_ranked_selections:   lowerRankedSelections,
    credential_blocks:         countEvents('credential_block_applied'),
    fatigue_blocks:            countEvents('fatigue_block_applied'),
    fatigue_warnings:          countEvents('fatigue_warning_triggered'),
    availability_blocks:       countEvents('availability_block_applied'),
    warning_overrides:         countEvents('warning_acknowledged'),
    allocation_rejections:     countEvents('allocation_rejected'),
    preference_signals_created: countEvents('preference_signal_created'),
    preference_signals_updated: countEvents('preference_signal_updated'),
    learned_preference_applications: countEvents('learned_preference_applied'),
    total_audit_events:        db.prepare(
      `SELECT COUNT(*) as n FROM audit_events WHERE company_id = ? AND timestamp >= ? AND timestamp <= ?`
    ).get(cid, fromStr, toStr).n
  });
});

module.exports = router;
