'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const AUDIT_EVENT_TYPES = [
  'smartrank_generated',
  'credential_block_applied',
  'fatigue_block_applied',
  'fatigue_warning_triggered',
  'availability_block_applied',
  'allocation_confirmed',
  'allocation_changed',
  'allocation_rejected',
  'warning_acknowledged',
  'non_top_ranked_selected',
  'credential_expiry_alert',
  'worker_imported',
  'worker_import_completed',
  'job_created',
  'job_status_changed',
  'preference_signal_created',
  'preference_signal_updated',
  'learned_preference_applied'
];

const AUDIT_EVENTS_CREATE_SQL = `
CREATE TABLE audit_events (
  id            TEXT PRIMARY KEY,
  company_id    TEXT NOT NULL REFERENCES companies(id),
  event_type    TEXT NOT NULL
                CHECK (event_type IN (
                  ${AUDIT_EVENT_TYPES.map((type) => `'${type}'`).join(',\n                  ')}
                )),
  user_id       TEXT REFERENCES users(id),
  worker_id     TEXT REFERENCES workers(id),
  job_id        TEXT REFERENCES jobs(id),
  allocation_id TEXT REFERENCES allocations(id),
  payload       TEXT NOT NULL DEFAULT '{}',
  timestamp     TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

const AUDIT_EVENT_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS prevent_audit_event_update
  BEFORE UPDATE ON audit_events
BEGIN
  SELECT RAISE(ABORT, 'audit_events are append-only and cannot be modified');
END;

CREATE TRIGGER IF NOT EXISTS prevent_audit_event_delete
  BEFORE DELETE ON audit_events
BEGIN
  SELECT RAISE(ABORT, 'audit_events are append-only and cannot be deleted');
END;
`;

const WORKER_TASK_PREFERENCES_SQL = `
CREATE TABLE IF NOT EXISTS worker_task_preferences (
  id                       TEXT PRIMARY KEY,
  company_id               TEXT NOT NULL REFERENCES companies(id),
  worker_id                TEXT NOT NULL REFERENCES workers(id),
  task_tag                 TEXT NOT NULL,
  rating                   INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  source                   TEXT NOT NULL
                           CHECK (source IN ('manual', 'learned', 'imported')),
  notes                    TEXT,
  approval_count           INTEGER NOT NULL DEFAULT 0,
  override_selection_count INTEGER NOT NULL DEFAULT 0,
  confidence               REAL NOT NULL DEFAULT 0
                           CHECK (confidence >= 0 AND confidence <= 1),
  last_selected_at         TEXT,
  created_at               TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at               TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

const POST_MIGRATION_INDEX_SQL = `
CREATE UNIQUE INDEX IF NOT EXISTS idx_workers_company_email
  ON workers(company_id, email)
  WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_preferences_worker ON worker_task_preferences(worker_id);
CREATE INDEX IF NOT EXISTS idx_preferences_company ON worker_task_preferences(company_id, task_tag);
CREATE UNIQUE INDEX IF NOT EXISTS idx_preferences_worker_tag_source
  ON worker_task_preferences(company_id, worker_id, task_tag, source);
CREATE INDEX IF NOT EXISTS idx_audit_company ON audit_events(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_job ON audit_events(job_id);
CREATE INDEX IF NOT EXISTS idx_audit_worker ON audit_events(worker_id);
CREATE INDEX IF NOT EXISTS idx_audit_type ON audit_events(company_id, event_type);
`;

let _db = null;

function hasColumn(db, tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some((column) => column.name === columnName);
}

function ensureColumn(db, tableName, columnSql, columnName) {
  if (hasColumn(db, tableName, columnName)) return;
  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnSql}`);
}

function auditEventsNeedMigration(db) {
  const row = db.prepare(`
    SELECT sql
    FROM sqlite_master
    WHERE type = 'table' AND name = 'audit_events'
  `).get();
  if (!row || !row.sql) return true;
  return !row.sql.includes('learned_preference_applied')
    || !row.sql.includes('worker_imported')
    || !row.sql.includes('preference_signal_created');
}

function migrateAuditEvents(db) {
  if (!auditEventsNeedMigration(db)) {
    db.exec(AUDIT_EVENT_TRIGGER_SQL);
    return;
  }

  db.transaction(() => {
    db.exec(`
      DROP TRIGGER IF EXISTS prevent_audit_event_update;
      DROP TRIGGER IF EXISTS prevent_audit_event_delete;
      ALTER TABLE audit_events RENAME TO audit_events_legacy;
    `);

    db.exec(AUDIT_EVENTS_CREATE_SQL);
    db.exec(AUDIT_EVENT_TRIGGER_SQL);

    db.prepare(`
      INSERT INTO audit_events (
        id, company_id, event_type, user_id, worker_id, job_id, allocation_id, payload, timestamp
      )
      SELECT
        id, company_id, event_type, user_id, worker_id, job_id, allocation_id, payload, timestamp
      FROM audit_events_legacy
    `).run();

    db.exec(`DROP TABLE audit_events_legacy;`);
  })();
}

function runMigrations(db) {
  ensureColumn(db, 'users', `must_change_password INTEGER NOT NULL DEFAULT 0`, 'must_change_password');
  ensureColumn(db, 'workers', `email TEXT`, 'email');
  ensureColumn(db, 'jobs', `task_tags TEXT NOT NULL DEFAULT '[]'`, 'task_tags');
  db.exec(`UPDATE jobs SET task_tags = '[]' WHERE task_tags IS NULL;`);
  db.exec(WORKER_TASK_PREFERENCES_SQL);
  migrateAuditEvents(db);
  db.exec(POST_MIGRATION_INDEX_SQL);
}

function getDb() {
  if (_db) return _db;

  const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/liftiq.db');
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  _db = new Database(dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  _db.exec(schema);
  runMigrations(_db);

  return _db;
}

// Used in tests to inject a fresh in-memory database
function setDb(db) {
  _db = db;
}

module.exports = { getDb, setDb, runMigrations };
