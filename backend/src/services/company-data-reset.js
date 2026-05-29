'use strict';

const { appendAuditEvent } = require('./audit');

const RESET_SCOPES = {
  jobs: {
    confirmation: 'CLEAR JOBS',
    label: 'Clear jobs only'
  },
  workers: {
    confirmation: 'CLEAR WORKERS',
    label: 'Clear workers only'
  },
  setup: {
    confirmation: 'CLEAR SETUP',
    label: 'Clear Our Business setup only'
  },
  all: {
    confirmation: 'CLEAR COMPANY DATA',
    label: 'Clear all company operational data'
  }
};

function assertValidScope(scope) {
  if (!RESET_SCOPES[scope]) {
    throw new Error('scope must be one of: jobs, workers, setup, all');
  }
}

function count(db, sql, ...params) {
  return db.prepare(sql).get(...params).n;
}

function getCompanyResetPreview(db, companyId, scope) {
  assertValidScope(scope);

  const counts = {
    jobs: count(db, `SELECT COUNT(*) AS n FROM jobs WHERE company_id = ? AND archived_at IS NULL`, companyId),
    archived_jobs: count(db, `SELECT COUNT(*) AS n FROM jobs WHERE company_id = ? AND archived_at IS NOT NULL`, companyId),
    workers: count(db, `SELECT COUNT(*) AS n FROM workers WHERE company_id = ? AND archived_at IS NULL`, companyId),
    archived_workers: count(db, `SELECT COUNT(*) AS n FROM workers WHERE company_id = ? AND archived_at IS NOT NULL`, companyId),
    credentials: count(db, `SELECT COUNT(*) AS n FROM credentials WHERE company_id = ?`, companyId),
    fatigue_records: count(db, `SELECT COUNT(*) AS n FROM fatigue_records WHERE company_id = ?`, companyId),
    worker_preferences: count(db, `SELECT COUNT(*) AS n FROM worker_task_preferences WHERE company_id = ?`, companyId),
    site_logs: count(db, `SELECT COUNT(*) AS n FROM site_logs WHERE company_id = ?`, companyId),
    credential_types: count(db, `SELECT COUNT(*) AS n FROM credential_types WHERE company_id = ? AND active = 1`, companyId),
    active_allocations: count(db, `SELECT COUNT(*) AS n FROM allocations WHERE company_id = ? AND status != 'cancelled'`, companyId),
    allocation_notifications: count(db, `SELECT COUNT(*) AS n FROM allocation_notifications WHERE company_id = ? AND status != 'cancelled'`, companyId),
    job_imports: count(db, `SELECT COUNT(*) AS n FROM job_imports WHERE company_id = ?`, companyId),
    job_requirement_items: count(db, `SELECT COUNT(*) AS n FROM job_requirement_items WHERE company_id = ?`, companyId),
    job_custom_requirements: count(db, `SELECT COUNT(*) AS n FROM job_custom_requirements WHERE company_id = ?`, companyId),
    job_asset_assignments: count(db, `SELECT COUNT(*) AS n FROM job_asset_assignments WHERE company_id = ?`, companyId),
    company_assets: count(db, `SELECT COUNT(*) AS n FROM company_assets WHERE company_id = ? AND asset_status != 'retired'`, companyId),
    catalogue_selections: count(db, `SELECT COUNT(*) AS n FROM company_catalogue_selections WHERE company_id = ?`, companyId),
    source_uploads: count(db, `SELECT COUNT(*) AS n FROM source_uploads WHERE company_id = ? AND deleted_at IS NULL`, companyId),
    audit_events: count(db, `SELECT COUNT(*) AS n FROM audit_events WHERE company_id = ?`, companyId),
    users: count(db, `SELECT COUNT(*) AS n FROM users WHERE company_id = ?`, companyId)
  };

  const effectsByScope = {
    jobs: [
      'Archives active jobs and marks them cancelled.',
      'Cancels allocations linked to this company.',
      'Cancels allocation notification records linked to this company.',
      'Clears job requirements, job imports, transport planning rows, and job asset assignments.',
      'Keeps workers, Daily Site Log records, source document uploads, users, company profile, global catalogues, and audit events.'
    ],
    workers: [
      'Archives active workers and marks them inactive.',
      'Cancels allocations linked to this company.',
      'Cancels allocation notification records linked to this company.',
      'Clears worker credentials, fatigue records, and task preferences.',
      'Keeps jobs unallocated, Daily Site Log records, custom credential types, source document uploads, users, company profile, global catalogues, and audit events.'
    ],
    setup: [
      'Clears Our Business catalogue selections.',
      'Clears company assets and job asset assignments.',
      'Archives custom credential types for this company.',
      'Resets operating mode to Plant + labour so setup is required again.',
      'Keeps users, workers, jobs, Daily Site Log records, source document uploads, global catalogues, and audit events.'
    ],
    all: [
      'Archives active jobs and workers.',
      'Cancels allocations and allocation notifications, then clears imports, requirements, credentials, fatigue records, preferences, site logs, assets, and setup selections.',
      'Keeps users, company profile, source document uploads, global catalogues, crane model catalogue, and audit reset events.',
      'This is not a backup or restore system.'
    ]
  };

  return {
    scope,
    label: RESET_SCOPES[scope].label,
    confirmation_phrase: RESET_SCOPES[scope].confirmation,
    counts,
    effects: effectsByScope[scope]
  };
}

function cancelCompanyAllocations(db, companyId, now) {
  db.prepare(`
    UPDATE allocations
    SET status = 'cancelled',
        allocation_status = 'cancelled',
        override_reason = COALESCE(override_reason, 'Cancelled by company data reset'),
        updated_at = ?
    WHERE company_id = ? AND status != 'cancelled'
  `).run(now, companyId);
  db.prepare(`
    UPDATE allocation_notifications
    SET status = 'cancelled',
        updated_at = ?
    WHERE company_id = ? AND status NOT IN ('cancelled', 'failed')
  `).run(now, companyId);
}

function clearJobs(db, companyId, userId, now) {
  db.prepare(`DELETE FROM transport_requirements WHERE company_id = ?`).run(companyId);
  db.prepare(`DELETE FROM job_crane_requirements WHERE company_id = ?`).run(companyId);
  db.prepare(`DELETE FROM job_asset_assignments WHERE company_id = ?`).run(companyId);
  db.prepare(`DELETE FROM job_requirement_items WHERE company_id = ?`).run(companyId);
  db.prepare(`DELETE FROM job_custom_requirements WHERE company_id = ?`).run(companyId);
  db.prepare(`DELETE FROM job_imports WHERE company_id = ?`).run(companyId);
  cancelCompanyAllocations(db, companyId, now);
  db.prepare(`
    UPDATE jobs
    SET status = 'cancelled',
        schedule_status = 'cancelled',
        scheduled_start_at_utc = NULL,
        scheduled_end_at_utc = NULL,
        scheduled_start_local = NULL,
        scheduled_end_local = NULL,
        archived_at = COALESCE(archived_at, ?),
        archived_by_user_id = COALESCE(archived_by_user_id, ?),
        archive_reason = COALESCE(archive_reason, 'Cleared by company data reset'),
        updated_at = ?
    WHERE company_id = ? AND archived_at IS NULL
  `).run(now, userId, now, companyId);
}

function clearWorkers(db, companyId, userId, now) {
  db.prepare(`DELETE FROM credentials WHERE company_id = ?`).run(companyId);
  db.prepare(`DELETE FROM fatigue_records WHERE company_id = ?`).run(companyId);
  db.prepare(`DELETE FROM worker_task_preferences WHERE company_id = ?`).run(companyId);
  cancelCompanyAllocations(db, companyId, now);
  db.prepare(`
    UPDATE workers
    SET status = 'inactive',
        archived_at = COALESCE(archived_at, ?),
        archived_by_user_id = COALESCE(archived_by_user_id, ?),
        archive_reason = COALESCE(archive_reason, 'Cleared by company data reset'),
        updated_at = ?
    WHERE company_id = ? AND archived_at IS NULL
  `).run(now, userId, now, companyId);
}

function clearSetup(db, companyId) {
  db.prepare(`DELETE FROM job_asset_assignments WHERE company_id = ?`).run(companyId);
  db.prepare(`DELETE FROM company_assets WHERE company_id = ?`).run(companyId);
  db.prepare(`DELETE FROM company_catalogue_selections WHERE company_id = ?`).run(companyId);
  db.prepare(`UPDATE credential_types SET active = 0, updated_at = ? WHERE company_id = ?`)
    .run(new Date().toISOString(), companyId);
  db.prepare(`UPDATE companies SET operating_mode = 'plant_and_labour' WHERE id = ?`).run(companyId);
}

function clearSiteLogs(db, companyId) {
  db.prepare(`DELETE FROM site_log_entries WHERE company_id = ?`).run(companyId);
  db.prepare(`DELETE FROM site_logs WHERE company_id = ?`).run(companyId);
}

function performCompanyReset(db, user, scope, confirmation) {
  assertValidScope(scope);
  const expected = RESET_SCOPES[scope].confirmation;
  if (confirmation !== expected) {
    const error = new Error(`confirmation must exactly match "${expected}"`);
    error.status = 400;
    throw error;
  }

  const company = db.prepare(`SELECT id FROM companies WHERE id = ?`).get(user.company_id);
  if (!company) {
    const error = new Error('Company not found');
    error.status = 404;
    throw error;
  }

  const now = new Date().toISOString();
  let result;
  db.transaction(() => {
    const before = getCompanyResetPreview(db, user.company_id, scope);
    appendAuditEvent(db, {
      companyId: user.company_id,
      eventType: 'company_reset_started',
      userId: user.id,
      payload: {
        scope,
        confirmation_phrase: expected,
        counts: before.counts,
        started_at: now
      }
    });

    if (scope === 'jobs' || scope === 'all') clearJobs(db, user.company_id, user.id, now);
    if (scope === 'workers' || scope === 'all') clearWorkers(db, user.company_id, user.id, now);
    if (scope === 'all') clearSiteLogs(db, user.company_id);
    if (scope === 'setup' || scope === 'all') clearSetup(db, user.company_id);

    const after = getCompanyResetPreview(db, user.company_id, scope);
    appendAuditEvent(db, {
      companyId: user.company_id,
      eventType: 'company_reset_completed',
      userId: user.id,
      payload: {
        scope,
        before_counts: before.counts,
        after_counts: after.counts,
        completed_at: now
      }
    });

    result = {
      ok: true,
      scope,
      label: RESET_SCOPES[scope].label,
      reset_at: now,
      confirmation_phrase: expected,
      before_counts: before.counts,
      after_counts: after.counts
    };
  })();

  return result;
}

module.exports = {
  RESET_SCOPES,
  getCompanyResetPreview,
  performCompanyReset
};
