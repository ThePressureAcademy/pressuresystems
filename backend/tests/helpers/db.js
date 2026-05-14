'use strict';

const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');
const { randomUUID } = require('crypto');
const bcrypt   = require('bcryptjs');
const { runMigrations } = require('../../src/db');

const SCHEMA_PATH = path.join(__dirname, '../../src/schema.sql');

/**
 * Creates a fresh in-memory SQLite database with the full schema applied.
 * Used in tests to avoid touching the production database.
 */
function createTestDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  runMigrations(db);
  return db;
}

/**
 * Seeds a minimal company + admin user into the given db.
 * Returns { companyId, userId }.
 */
function seedCompanyAndUser(db, overrides = {}) {
  const companyId = overrides.companyId || randomUUID();
  const userId    = overrides.userId    || randomUUID();
  const companyName = overrides.companyName || 'Test Company';
  const userName = overrides.name || 'Test Admin';
  const userEmail = overrides.email || 'admin@test.com';
  const userPassword = overrides.password || 'testpass';
  const userRole = overrides.role || 'admin';
  const userStatus = overrides.status || 'active';
  const isInternalAdmin = overrides.isInternalAdmin ? 1 : 0;
  const mustChangePassword = overrides.mustChangePassword ? 1 : 0;

  db.prepare(`
    INSERT INTO companies (
      id, name, slug, display_name, timezone, locations, operating_regions,
      status, pilot_start_date, access_status, pilot_type, pilot_starts_at,
      pilot_expires_at, notes
    )
    VALUES (?, ?, ?, ?, ?, '[]', '[]', 'pilot', '2026-01-01', ?, ?, ?, ?, ?)
  `).run(
    companyId,
    companyName,
    overrides.slug || null,
    overrides.displayName || companyName,
    overrides.timezone || 'Australia/Brisbane',
    overrides.accessStatus || 'active',
    overrides.pilotType || 'internal',
    overrides.pilotStartsAt || null,
    overrides.pilotExpiresAt || null,
    overrides.notes || null
  );

  db.prepare(`
    INSERT INTO users (id, company_id, name, email, password_hash, role, status, is_internal_admin, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    companyId,
    userName,
    userEmail,
    bcrypt.hashSync(userPassword, 1),
    userRole,
    userStatus,
    isInternalAdmin,
    mustChangePassword
  );

  return { companyId, userId };
}

/**
 * Creates a worker in the given company.
 */
function seedWorker(db, companyId, overrides = {}) {
  const id = overrides.id || randomUUID();
  const roles = overrides.roles || [overrides.role || 'crane_operator'];
  db.prepare(`
    INSERT INTO workers (
      id, company_id, name, email, role, roles, employment_type, crane_classes, status,
      archived_at, archived_by_user_id, archive_reason
    )
    VALUES (?, ?, ?, ?, ?, ?, 'permanent', ?, ?, ?, ?, ?)
  `).run(
    id, companyId,
    overrides.name            || 'Test Worker',
    overrides.email           || null,
    overrides.role            || 'crane_operator',
    JSON.stringify(roles),
    JSON.stringify(overrides.crane_classes || ['55T']),
    overrides.status          || 'available',
    overrides.archivedAt      || null,
    overrides.archivedByUserId || null,
    overrides.archiveReason   || null
  );
  return id;
}

/**
 * Creates a credential for a worker.
 */
function seedCredential(db, workerId, companyId, overrides = {}) {
  const id = overrides.id || randomUUID();
  db.prepare(`
    INSERT INTO credentials (id, worker_id, company_id, type, expiry_date, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    id, workerId, companyId,
    overrides.type        || 'high_risk_licence_crane',
    overrides.expiry_date || '2028-01-01',
    overrides.status      || 'valid'
  );
  return id;
}

/**
 * Creates a job.
 */
function seedJob(db, companyId, userId, overrides = {}) {
  const id  = overrides.id  || randomUUID();
  const now = new Date().toISOString();
  const scheduleStatus = overrides.schedule_status
    || ((overrides.scheduled_start_at_utc && overrides.scheduled_end_at_utc) ? 'planned' : 'draft');
  db.prepare(`
    INSERT INTO jobs (
      id, company_id, client_name, site_name, site_location, date, shift_type,
      crane_class_required, crane_classes_required, task_tags, required_credentials, crew_roles_required, site_conditions,
      lift_risk_level, scheduled_start_at_utc, scheduled_end_at_utc, job_timezone,
      scheduled_start_local, scheduled_end_local, schedule_status,
      shift_start_time, status, created_by_user_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)
  `).run(
    id, companyId,
    overrides.client_name           || 'Test Client',
    overrides.site_name             || 'Test Site',
    overrides.site_location         || null,
    overrides.date                  || '2026-06-01',
    overrides.shift_type            || 'day',
    overrides.crane_class_required  || null,
    JSON.stringify(overrides.crane_classes_required || []),
    JSON.stringify(overrides.task_tags || []),
    JSON.stringify(overrides.required_credentials || []),
    JSON.stringify(overrides.crew_roles_required  || []),
    JSON.stringify(overrides.site_conditions      || []),
    overrides.lift_risk_level       || 'routine',
    overrides.scheduled_start_at_utc || null,
    overrides.scheduled_end_at_utc || null,
    overrides.job_timezone || 'Australia/Brisbane',
    overrides.scheduled_start_local || null,
    overrides.scheduled_end_local || null,
    scheduleStatus,
    overrides.shift_start_time || null,
    userId, now, now
  );
  return id;
}

function seedPreference(db, companyId, workerId, overrides = {}) {
  const id = overrides.id || randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO worker_task_preferences (
      id, company_id, worker_id, task_tag, rating, source, notes,
      approval_count, override_selection_count, confidence, last_selected_at,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    companyId,
    workerId,
    overrides.task_tag || 'tower_crane',
    overrides.rating || 4,
    overrides.source || 'manual',
    overrides.notes || null,
    overrides.approval_count || 0,
    overrides.override_selection_count || 0,
    overrides.confidence || (overrides.source === 'learned' ? 0.6 : 1),
    overrides.last_selected_at || null,
    now,
    now
  );
  return id;
}

function seedAllocation(db, companyId, jobId, workerId, userId, overrides = {}) {
  const id = overrides.id || randomUUID();
  const now = overrides.allocated_at || new Date().toISOString();
  db.prepare(`
    INSERT INTO allocations (
      id, job_id, worker_id, company_id, allocated_by_user_id,
      smartrank_position, smartrank_score, smartrank_snapshot,
      active_warnings, active_blocks_on_others, override_reason,
      allocation_start_at_utc, allocation_end_at_utc, allocation_timezone, allocation_status,
      status, allocated_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    jobId,
    workerId,
    companyId,
    userId,
    overrides.smartrank_position || 1,
    overrides.smartrank_score || 84,
    JSON.stringify(overrides.smartrank_snapshot || {}),
    JSON.stringify(overrides.active_warnings || []),
    JSON.stringify(overrides.active_blocks_on_others || []),
    overrides.override_reason || null,
    overrides.allocation_start_at_utc || null,
    overrides.allocation_end_at_utc || null,
    overrides.allocation_timezone || 'Australia/Brisbane',
    overrides.allocation_status || 'planned',
    overrides.status || 'confirmed',
    now,
    now
  );
  return id;
}

module.exports = {
  createTestDb,
  seedAllocation,
  seedCompanyAndUser,
  seedWorker,
  seedCredential,
  seedJob,
  seedPreference
};
