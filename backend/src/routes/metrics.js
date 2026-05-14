'use strict';

const express = require('express');
const { getDb } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const PLACEHOLDER_START_RE = /^(0000|1970)-/;
const PLACEHOLDER_END_RE = /^9999-/;

function isValidPeriodDate(value) {
  if (!value) return false;
  const text = String(value).trim();
  if (!text || PLACEHOLDER_START_RE.test(text) || PLACEHOLDER_END_RE.test(text)) return false;
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp);
}

function normalizeRangeBoundary(value, fallback) {
  if (!value) return fallback;
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text}T00:00:00.000Z`;
  const date = new Date(text);
  return Number.isFinite(date.getTime()) ? date.toISOString() : fallback;
}

function normalizeRangeEnd(value, fallback) {
  if (!value) return fallback;
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text}T23:59:59.999Z`;
  const date = new Date(text);
  return Number.isFinite(date.getTime()) ? date.toISOString() : fallback;
}

function formatPeriodDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Brisbane',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

function formatDateOnlyLabel(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Brisbane',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)));
}

function earliestCompanyActivity(db, companyId) {
  const rows = [
    db.prepare(`SELECT MIN(timestamp) AS value FROM audit_events WHERE company_id = ?`).get(companyId),
    db.prepare(`SELECT MIN(created_at) AS value FROM workers WHERE company_id = ?`).get(companyId),
    db.prepare(`SELECT MIN(created_at) AS value FROM jobs WHERE company_id = ?`).get(companyId),
    db.prepare(`SELECT MIN(created_at) AS value FROM job_imports WHERE company_id = ?`).get(companyId),
    db.prepare(`SELECT MIN(allocated_at) AS value FROM allocations WHERE company_id = ?`).get(companyId),
    db.prepare(`SELECT MIN(created_at) AS value FROM company_assets WHERE company_id = ?`).get(companyId)
  ];

  return rows
    .map((row) => row?.value)
    .filter(isValidPeriodDate)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] || null;
}

function resolveDefaultPeriod(db, companyId, now = new Date()) {
  const company = db.prepare(`
    SELECT pilot_starts_at, created_at
    FROM companies
    WHERE id = ?
  `).get(companyId);

  const end = now.toISOString();
  if (isValidPeriodDate(company?.pilot_starts_at)) {
    return {
      start: normalizeRangeBoundary(company.pilot_starts_at, end),
      end,
      label: 'Pilot start to today'
    };
  }

  if (isValidPeriodDate(company?.created_at)) {
    return {
      start: normalizeRangeBoundary(company.created_at, end),
      end,
      label: 'Initial setup to today'
    };
  }

  const activityStart = earliestCompanyActivity(db, companyId);
  if (activityStart) {
    const formatted = formatPeriodDate(activityStart);
    return {
      start: normalizeRangeBoundary(activityStart, end),
      end,
      label: formatted ? `${formatted} to today` : 'Initial activity to today'
    };
  }

  return {
    start: end,
    end,
    label: 'Today'
  };
}

function resolveMetricsPeriod(db, companyId, query) {
  const hasExplicitRange = Boolean(query.from || query.to);
  if (!hasExplicitRange) return resolveDefaultPeriod(db, companyId);

  const now = new Date().toISOString();
  const start = normalizeRangeBoundary(query.from, now);
  const end = normalizeRangeEnd(query.to, now);
  const fromLabel = formatDateOnlyLabel(query.from) || formatPeriodDate(start) || 'Selected start';
  const toLabel = query.to
    ? (formatDateOnlyLabel(query.to) || formatPeriodDate(end) || 'Selected end')
    : 'today';
  return {
    start,
    end,
    label: `${fromLabel} to ${toLabel}`
  };
}

// GET /api/metrics?from=2026-01-01&to=2026-12-31
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const cid = req.user.company_id;

  const period = resolveMetricsPeriod(db, cid, req.query);

  function countEvents(eventType) {
    return db.prepare(`
      SELECT COUNT(*) as n FROM audit_events
      WHERE company_id = ? AND event_type = ?
      AND datetime(timestamp) >= datetime(?) AND datetime(timestamp) <= datetime(?)
    `).get(cid, eventType, period.start, period.end).n;
  }

  const totalJobs = db.prepare(`
    SELECT COUNT(*) as n FROM jobs
    WHERE company_id = ? AND datetime(created_at) >= datetime(?) AND datetime(created_at) <= datetime(?)
  `).get(cid, period.start, period.end).n;

  const totalAllocations = db.prepare(`
    SELECT COUNT(*) as n FROM allocations
    WHERE company_id = ? AND datetime(allocated_at) >= datetime(?) AND datetime(allocated_at) <= datetime(?)
      AND status = 'confirmed'
  `).get(cid, period.start, period.end).n;

  const topRankedSelections = db.prepare(`
    SELECT COUNT(*) as n FROM allocations
    WHERE company_id = ? AND smartrank_position = 1
      AND datetime(allocated_at) >= datetime(?) AND datetime(allocated_at) <= datetime(?)
      AND status = 'confirmed'
  `).get(cid, period.start, period.end).n;

  const lowerRankedSelections = db.prepare(`
    SELECT COUNT(*) as n FROM allocations
    WHERE company_id = ? AND smartrank_position > 1
      AND datetime(allocated_at) >= datetime(?) AND datetime(allocated_at) <= datetime(?)
      AND status = 'confirmed'
  `).get(cid, period.start, period.end).n;

  res.json({
    period: {
      from: period.start,
      to: period.end,
      label: period.label
    },
    period_start_at: period.start,
    period_end_at: period.end,
    period_label: period.label,
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
      `SELECT COUNT(*) as n FROM audit_events
       WHERE company_id = ? AND datetime(timestamp) >= datetime(?) AND datetime(timestamp) <= datetime(?)`
    ).get(cid, period.start, period.end).n
  });
});

module.exports = router;
