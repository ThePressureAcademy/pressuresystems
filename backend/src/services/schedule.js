'use strict';

const {
  buildSchedulePayload,
  normalizeTimeZone
} = require('./timezone');

function safeJsonParse(value, fallback = []) {
  try {
    const parsed = JSON.parse(value || JSON.stringify(fallback));
    return Array.isArray(parsed) || (fallback && !Array.isArray(fallback)) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function getCompanyTimeZone(db, companyId) {
  const row = db.prepare(`SELECT timezone FROM companies WHERE id = ?`).get(companyId);
  return normalizeTimeZone(row?.timezone);
}

function serializeJob(row, displayTimeZone = null) {
  if (!row) return null;
  return {
    ...row,
    task_tags: safeJsonParse(row.task_tags, []),
    required_credentials: safeJsonParse(row.required_credentials, []),
    crew_roles_required: safeJsonParse(row.crew_roles_required, []),
    site_conditions: safeJsonParse(row.site_conditions, []),
    schedule: buildSchedulePayload({
      scheduled_start_at_utc: row.scheduled_start_at_utc,
      scheduled_end_at_utc: row.scheduled_end_at_utc,
      job_timezone: row.job_timezone,
      scheduled_start_local: row.scheduled_start_local,
      scheduled_end_local: row.scheduled_end_local,
      schedule_status: row.schedule_status
    }, displayTimeZone)
  };
}

function serializeAllocation(row, displayTimeZone = null) {
  if (!row) return null;
  return {
    ...row,
    smartrank_snapshot: safeJsonParse(row.smartrank_snapshot, {}),
    active_warnings: safeJsonParse(row.active_warnings, []),
    active_blocks_on_others: safeJsonParse(row.active_blocks_on_others, []),
    schedule: buildSchedulePayload({
      scheduled_start_at_utc: row.allocation_start_at_utc || row.job_scheduled_start_at_utc,
      scheduled_end_at_utc: row.allocation_end_at_utc || row.job_scheduled_end_at_utc,
      job_timezone: row.allocation_timezone || row.job_timezone,
      scheduled_start_local: row.allocation_start_local || row.scheduled_start_local || null,
      scheduled_end_local: row.allocation_end_local || row.scheduled_end_local || null,
      schedule_status: row.allocation_status || row.job_schedule_status || 'planned'
    }, displayTimeZone)
  };
}

module.exports = {
  getCompanyTimeZone,
  serializeAllocation,
  serializeJob
};
