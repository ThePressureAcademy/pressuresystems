'use strict';

const { daysRemaining, effectiveAccessStatus } = require('./company-access');

const LOGIN_EVENTS = ['user_login_succeeded'];
const WORKER_IMPORT_EVENTS = ['worker_imported', 'worker_import_completed'];
const JOB_BRIEF_IMPORT_EVENTS = ['job_brief_import_previewed', 'job_created_from_brief', 'job_imported_from_brief'];
const SMARTRANK_EVENTS = ['smartrank_generated'];
const EDIT_EVENTS = [
  'worker_updated',
  'worker_roles_updated',
  'worker_credentials_updated',
  'worker_preferences_updated',
  'job_updated',
  'job_schedule_changed',
  'job_requirements_updated',
  'job_required_roles_updated',
  'job_credentials_updated',
  'job_equipment_requirements_updated',
  'job_site_conditions_updated',
  'job_additional_requirements_updated',
  'job_asset_selected',
  'job_asset_changed',
  'company_catalogue_updated',
  'company_operating_mode_updated',
  'company_asset_updated'
];
const RESET_EVENTS = ['company_reset_previewed', 'company_reset_started', 'company_reset_completed'];
const WARNING_EVENTS = ['fatigue_warning_triggered', 'fatigueguard_warning_created', 'warning_acknowledged', 'credential_expiry_alert'];
const BLOCK_EVENTS = [
  'credential_block_applied',
  'credentialgate_block_created',
  'fatigue_block_applied',
  'availability_block_applied',
  'allocation_rejected'
];
const SETUP_MODE_EVENTS = ['company_operating_mode_updated'];
const INTELLIGENCE_REVIEW_EVENTS = [
  'allocation_confirmed',
  'allocation_rejected',
  'warning_acknowledged',
  'non_top_ranked_selected',
  'learned_preference_applied'
];

function clampWindowDays(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 14;
  return Math.max(1, Math.min(90, Math.floor(parsed)));
}

function toSqlDateTime(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? null : date;
}

function count(db, sql, params = []) {
  return db.prepare(sql).get(...params).n || 0;
}

function inPlaceholders(values) {
  return values.map(() => '?').join(', ');
}

function countEvents(db, companyId, eventTypes, sinceSql = null) {
  if (!eventTypes.length) return 0;
  const params = [companyId, ...eventTypes];
  let sql = `
    SELECT COUNT(*) AS n
    FROM audit_events
    WHERE company_id = ? AND event_type IN (${inPlaceholders(eventTypes)})
  `;
  if (sinceSql) {
    sql += ` AND timestamp >= ?`;
    params.push(sinceSql);
  }
  return count(db, sql, params);
}

function hasEvent(db, companyId, eventTypes) {
  return countEvents(db, companyId, eventTypes) > 0;
}

function activeDays(db, companyId, sinceSql) {
  return count(db, `
    SELECT COUNT(DISTINCT day) AS n
    FROM (
      SELECT substr(timestamp, 1, 10) AS day
      FROM audit_events
      WHERE company_id = ? AND timestamp >= ?
      UNION
      SELECT substr(last_login_at, 1, 10) AS day
      FROM users
      WHERE company_id = ? AND last_login_at IS NOT NULL AND last_login_at >= ?
    )
  `, [companyId, sinceSql, companyId, sinceSql]);
}

function lastAuditActivity(db, companyId) {
  return db.prepare(`
    SELECT event_type, timestamp
    FROM audit_events
    WHERE company_id = ?
    ORDER BY timestamp DESC
    LIMIT 1
  `).get(companyId);
}

function lastLoginAt(db, companyId) {
  return db.prepare(`
    SELECT MAX(last_login_at) AS last_login_at
    FROM users
    WHERE company_id = ? AND status = 'active'
  `).get(companyId).last_login_at || null;
}

function lastActivity(db, companyId) {
  const audit = lastAuditActivity(db, companyId);
  const loginAt = lastLoginAt(db, companyId);
  const auditDate = parseDate(audit?.timestamp);
  const loginDate = parseDate(loginAt);
  if (loginDate && (!auditDate || loginDate.getTime() > auditDate.getTime())) {
    return { at: loginAt, type: 'user_login_succeeded' };
  }
  if (audit) return { at: audit.timestamp, type: audit.event_type };
  return { at: loginAt, type: loginAt ? 'user_login_succeeded' : null };
}

function eventAfter(db, companyId, sinceDate) {
  if (!sinceDate) return false;
  const sinceSql = toSqlDateTime(sinceDate);
  return count(db, `
    SELECT COUNT(*) AS n
    FROM audit_events
    WHERE company_id = ? AND timestamp >= ?
  `, [companyId, sinceSql]) > 0;
}

function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function calculateEngagementScore(metrics, company, db) {
  let score = 0;

  if (metrics.login_count === 1) score += 5;
  if (metrics.login_count > 1) score += metrics.active_days > 1 ? 15 : 10;

  if (hasEvent(db, company.id, SETUP_MODE_EVENTS)) score += 5;
  if (metrics.catalogue_selection_count > 0) score += 5;
  if (metrics.assets_count > 0 || metrics.catalogue_selection_count > 0) score += 5;

  if (metrics.workers_count > 0 || metrics.worker_import_count > 0) score += 10;
  if (countEvents(db, company.id, ['worker_updated', 'worker_credentials_updated', 'worker_preferences_updated']) > 0) {
    score += 5;
  }

  if (metrics.jobs_count > 0 || metrics.job_brief_import_count > 0) score += 10;
  if (countEvents(db, company.id, ['job_updated', 'job_schedule_changed', 'job_requirements_updated', 'job_site_conditions_updated']) > 0) {
    score += 5;
  }
  if (metrics.jobs_count > 1 && metrics.active_days > 1) score += 5;

  if (metrics.smartrank_run_count > 0) score += 10;
  if (countEvents(db, company.id, INTELLIGENCE_REVIEW_EVENTS) > 0 || metrics.warning_count > 0 || metrics.block_count > 0) {
    score += 5;
  }
  if (countEvents(db, company.id, ['internal_pilot_monitor_viewed']) > 0) {
    // Internal views do not indicate customer adoption.
  }

  if (metrics.active_days >= 2) score += 5;
  const pilotStart = parseDate(company.pilot_starts_at || company.pilot_start_date || company.created_at);
  if (eventAfter(db, company.id, pilotStart ? addDays(pilotStart, 3) : null)) score += 5;
  if (eventAfter(db, company.id, pilotStart ? addDays(pilotStart, 7) : null)) score += 5;

  return Math.min(100, score);
}

function adoptionStage(score) {
  if (score <= 15) return 'not activated';
  if (score <= 35) return 'activated but shallow';
  if (score <= 55) return 'testing workflow';
  if (score <= 75) return 'active pilot';
  return 'strong adoption signal';
}

function followUpRecommendation(stage, company, now) {
  const accessStatus = effectiveAccessStatus(company, now);
  if (accessStatus === 'expired') return 'Trial expired';
  if (daysRemaining(company, now) != null && daysRemaining(company, now) <= 3) return 'Pilot ending in 3 days';
  if (stage === 'not activated') return 'Contact today';
  if (stage === 'activated but shallow') return 'Offer guided walkthrough';
  if (stage === 'testing workflow') return 'Ask what was clunky';
  if (stage === 'active pilot') return 'Book midpoint review';
  return 'Discuss paid pilot or referral';
}

function matchesEngagementFilter(company, filter) {
  if (!filter) return true;
  const normalized = String(filter).trim().toLowerCase().replace(/_/g, ' ');
  if (normalized === 'stalled') return company.adoption_stage === 'not activated';
  if (normalized === 'warming') {
    return company.adoption_stage === 'activated but shallow'
      || company.adoption_stage === 'testing workflow';
  }
  if (normalized === 'active') return company.adoption_stage === 'active pilot';
  if (normalized === 'strong') return company.adoption_stage === 'strong adoption signal';
  return company.adoption_stage === normalized;
}

function companyMetrics(db, company, sinceSql, now) {
  const activity = lastActivity(db, company.id);
  const metrics = {
    user_count: count(db, `SELECT COUNT(*) AS n FROM users WHERE company_id = ? AND status = 'active'`, [company.id]),
    last_login_at: lastLoginAt(db, company.id),
    last_activity_at: activity.at,
    last_activity_type: activity.type,
    active_days: activeDays(db, company.id, sinceSql),
    login_count: countEvents(db, company.id, LOGIN_EVENTS, sinceSql),
    workers_count: count(db, `SELECT COUNT(*) AS n FROM workers WHERE company_id = ? AND archived_at IS NULL`, [company.id]),
    jobs_count: count(db, `SELECT COUNT(*) AS n FROM jobs WHERE company_id = ? AND archived_at IS NULL`, [company.id]),
    assets_count: count(db, `SELECT COUNT(*) AS n FROM company_assets WHERE company_id = ? AND asset_status != 'retired'`, [company.id]),
    catalogue_selection_count: count(db, `SELECT COUNT(*) AS n FROM company_catalogue_selections WHERE company_id = ? AND is_enabled = 1`, [company.id]),
    worker_import_count: countEvents(db, company.id, WORKER_IMPORT_EVENTS, sinceSql),
    job_brief_import_count: countEvents(db, company.id, JOB_BRIEF_IMPORT_EVENTS, sinceSql),
    smartrank_run_count: countEvents(db, company.id, SMARTRANK_EVENTS, sinceSql),
    edit_count: countEvents(db, company.id, EDIT_EVENTS, sinceSql),
    reset_count: countEvents(db, company.id, RESET_EVENTS, sinceSql),
    audit_event_count: count(db, `SELECT COUNT(*) AS n FROM audit_events WHERE company_id = ? AND timestamp >= ?`, [company.id, sinceSql]),
    warning_count: countEvents(db, company.id, WARNING_EVENTS, sinceSql),
    block_count: countEvents(db, company.id, BLOCK_EVENTS, sinceSql)
  };
  const engagementScore = calculateEngagementScore(metrics, company, db);
  const stage = adoptionStage(engagementScore);
  return {
    company_id: company.id,
    company_name: company.display_name || company.name,
    company_slug: company.slug || null,
    pilot_type: company.pilot_type || 'internal',
    access_status: effectiveAccessStatus(company, now),
    pilot_expires_at: company.pilot_expires_at || null,
    days_remaining: daysRemaining(company, now),
    user_count: metrics.user_count,
    last_login_at: metrics.last_login_at,
    last_activity_at: metrics.last_activity_at,
    last_activity_type: metrics.last_activity_type,
    active_days: metrics.active_days,
    login_count: metrics.login_count,
    workers_count: metrics.workers_count,
    jobs_count: metrics.jobs_count,
    assets_count: metrics.assets_count,
    worker_import_count: metrics.worker_import_count,
    job_brief_import_count: metrics.job_brief_import_count,
    smartrank_run_count: metrics.smartrank_run_count,
    edit_count: metrics.edit_count,
    reset_count: metrics.reset_count,
    audit_event_count: metrics.audit_event_count,
    warning_count: metrics.warning_count,
    block_count: metrics.block_count,
    engagement_score: engagementScore,
    adoption_stage: stage,
    follow_up: followUpRecommendation(stage, company, now)
  };
}

function listPilotActivity(db, options = {}) {
  const now = options.now || new Date();
  const windowDays = clampWindowDays(options.days);
  const since = new Date(now.getTime() - (windowDays * 24 * 60 * 60 * 1000));
  const sinceSql = toSqlDateTime(since);
  const status = options.status || 'active';

  let sql = `
    SELECT *
    FROM companies
  `;
  const params = [];
  if (options.company_id) {
    sql += ` WHERE id = ?`;
    params.push(options.company_id);
  }
  sql += ` ORDER BY COALESCE(display_name, name) ASC`;

  const companies = db.prepare(sql).all(...params)
    .map((company) => companyMetrics(db, company, sinceSql, now))
    .filter((company) => {
      if (status === 'all') return true;
      if (status === 'expired') return company.access_status === 'expired';
      if (status === 'active') return company.access_status === 'active';
      return true;
    })
    .filter((company) => matchesEngagementFilter(company, options.engagement));

  return {
    generated_at: toSqlDateTime(now),
    window_days: windowDays,
    companies
  };
}

module.exports = {
  adoptionStage,
  calculateEngagementScore,
  followUpRecommendation,
  listPilotActivity
};
