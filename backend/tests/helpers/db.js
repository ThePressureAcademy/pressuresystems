'use strict';

const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');
const { randomUUID } = require('crypto');
const bcrypt   = require('bcryptjs');

const SCHEMA_PATH = path.join(__dirname, '../../src/schema.sql');

/**
 * Creates a fresh in-memory SQLite database with the full schema applied.
 * Used in tests to avoid touching the production database.
 */
function createTestDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  return db;
}

/**
 * Seeds a minimal company + admin user into the given db.
 * Returns { companyId, userId }.
 */
function seedCompanyAndUser(db, overrides = {}) {
  const companyId = overrides.companyId || randomUUID();
  const userId    = overrides.userId    || randomUUID();

  db.prepare(`
    INSERT INTO companies (id, name, locations, operating_regions, status, pilot_start_date)
    VALUES (?, 'Test Company', '[]', '[]', 'pilot', '2026-01-01')
  `).run(companyId);

  db.prepare(`
    INSERT INTO users (id, company_id, name, email, password_hash, role)
    VALUES (?, ?, 'Test Admin', 'admin@test.com', ?, 'admin')
  `).run(userId, companyId, bcrypt.hashSync('testpass', 1));

  return { companyId, userId };
}

/**
 * Creates a worker in the given company.
 */
function seedWorker(db, companyId, overrides = {}) {
  const id = overrides.id || randomUUID();
  db.prepare(`
    INSERT INTO workers (id, company_id, name, role, employment_type, crane_classes, status)
    VALUES (?, ?, ?, ?, 'permanent', ?, ?)
  `).run(
    id, companyId,
    overrides.name            || 'Test Worker',
    overrides.role            || 'crane_operator',
    JSON.stringify(overrides.crane_classes || ['55T']),
    overrides.status          || 'available'
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
  db.prepare(`
    INSERT INTO jobs (
      id, company_id, client_name, site_name, date, shift_type,
      required_credentials, crew_roles_required, site_conditions,
      lift_risk_level, status, created_by_user_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)
  `).run(
    id, companyId,
    overrides.client_name           || 'Test Client',
    overrides.site_name             || 'Test Site',
    overrides.date                  || '2026-06-01',
    overrides.shift_type            || 'day',
    JSON.stringify(overrides.required_credentials || []),
    JSON.stringify(overrides.crew_roles_required  || []),
    JSON.stringify(overrides.site_conditions      || []),
    overrides.lift_risk_level       || 'routine',
    userId, now, now
  );
  return id;
}

module.exports = { createTestDb, seedCompanyAndUser, seedWorker, seedCredential, seedJob };
