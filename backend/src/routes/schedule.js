'use strict';

const express = require('express');
const { getDb } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { resolveScheduleRange } = require('../services/timezone');
const {
  getCompanyTimeZone,
  serializeAllocation,
  serializeJob
} = require('../services/schedule');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const companyTimeZone = getCompanyTimeZone(db, req.user.company_id);

  let range;
  try {
    range = resolveScheduleRange({
      start: req.query.start,
      end: req.query.end,
      timezone: req.query.timezone || companyTimeZone
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const jobs = db.prepare(`
    SELECT *
    FROM jobs
    WHERE company_id = ?
      AND scheduled_start_at_utc IS NOT NULL
      AND scheduled_end_at_utc IS NOT NULL
      AND scheduled_start_at_utc < ?
      AND scheduled_end_at_utc > ?
    ORDER BY scheduled_start_at_utc ASC, site_name ASC
  `).all(req.user.company_id, range.end_at_utc, range.start_at_utc)
    .map((row) => serializeJob(row, range.timezone));

  const allocations = db.prepare(`
    SELECT
      a.*,
      w.name AS worker_name,
      w.role AS worker_role,
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
    JOIN workers w ON a.worker_id = w.id
    WHERE a.company_id = ?
      AND a.status = 'confirmed'
      AND COALESCE(a.allocation_start_at_utc, j.scheduled_start_at_utc) IS NOT NULL
      AND COALESCE(a.allocation_end_at_utc, j.scheduled_end_at_utc) IS NOT NULL
      AND COALESCE(a.allocation_start_at_utc, j.scheduled_start_at_utc) < ?
      AND COALESCE(a.allocation_end_at_utc, j.scheduled_end_at_utc) > ?
      AND COALESCE(a.allocation_status, j.schedule_status, 'planned') != 'cancelled'
    ORDER BY COALESCE(a.allocation_start_at_utc, j.scheduled_start_at_utc) ASC, w.name ASC
  `).all(req.user.company_id, range.end_at_utc, range.start_at_utc)
    .map((row) => serializeAllocation(row, range.timezone));

  const allocationsByJobId = new Map();
  for (const allocation of allocations) {
    const current = allocationsByJobId.get(allocation.job_id) || [];
    current.push({
      id: allocation.id,
      worker_id: allocation.worker_id,
      worker_name: allocation.worker_name,
      worker_role: allocation.worker_role,
      allocation_status: allocation.allocation_status,
      status: allocation.status,
      schedule: allocation.schedule
    });
    allocationsByJobId.set(allocation.job_id, current);
  }

  res.json({
    timezone: range.timezone,
    range,
    jobs: jobs.map((job) => ({
      ...job,
      assigned_workers: allocationsByJobId.get(job.id) || [],
      is_allocated: (allocationsByJobId.get(job.id) || []).length > 0
    })),
    allocations
  });
});

module.exports = router;
