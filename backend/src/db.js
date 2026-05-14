'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { seedCraneModelCatalog } = require('./services/crane-model-catalog');
const { seedRequirementCatalogue } = require('./services/job-requirement-catalogue');

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
  'worker_updated',
  'worker_removed',
  'job_created',
  'job_brief_import_previewed',
  'job_created_from_brief',
  'job_counterweight_transport_assessed',
  'job_schedule_changed',
  'job_status_changed',
  'transport_requirement_created',
  'company_catalogue_updated',
  'company_operating_mode_updated',
  'company_asset_created',
  'company_asset_updated',
  'company_asset_archived',
  'job_requirements_updated',
  'job_custom_requirement_added',
  'job_requirement_imported_from_brief',
  'job_asset_selected',
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

const JOB_IMPORTS_SQL = `
CREATE TABLE IF NOT EXISTS job_imports (
  id                  TEXT PRIMARY KEY,
  company_id          TEXT NOT NULL REFERENCES companies(id),
  user_id             TEXT NOT NULL REFERENCES users(id),
  source_type         TEXT NOT NULL
                      CHECK (source_type IN ('pasted_text', 'txt', 'markdown', 'docx')),
  filename            TEXT,
  original_text       TEXT NOT NULL,
  parsed_payload_json TEXT NOT NULL DEFAULT '{}',
  confidence_json     TEXT NOT NULL DEFAULT '{}',
  warnings_json       TEXT NOT NULL DEFAULT '[]',
  created_job_id      TEXT REFERENCES jobs(id),
  status              TEXT NOT NULL DEFAULT 'parsed'
                      CHECK (status IN ('parsed', 'job_created', 'cancelled', 'failed')),
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

const CRANE_MODELS_SQL = `
CREATE TABLE IF NOT EXISTS crane_models (
  id                           INTEGER PRIMARY KEY AUTOINCREMENT,
  manufacturer                 TEXT NOT NULL,
  model                        TEXT NOT NULL,
  nominal_capacity_tonnes      REAL,
  max_counterweight_tonnes     REAL,
  transport_length_m           REAL,
  transport_width_m            REAL,
  transport_height_m           REAL,
  gross_vehicle_weight_tonnes  REAL,
  axle_configuration           TEXT,
  source_url                   TEXT,
  source_capture_date          TEXT,
  source_confidence            TEXT,
  notes                        TEXT,
  created_at                   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                   TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

const CRANE_MODEL_TRAVEL_STATES_SQL = `
CREATE TABLE IF NOT EXISTS crane_model_travel_states (
  id                           INTEGER PRIMARY KEY AUTOINCREMENT,
  crane_model_id               INTEGER NOT NULL REFERENCES crane_models(id) ON DELETE CASCADE,
  state_label                  TEXT NOT NULL,
  carried_counterweight_tonnes REAL,
  axle_basis                   TEXT,
  roadability_basis            TEXT,
  gross_vehicle_weight_tonnes  REAL,
  transport_width_m            REAL,
  transport_height_m           REAL,
  transport_length_m           REAL,
  review_required              INTEGER NOT NULL DEFAULT 1,
  source_url                   TEXT,
  source_capture_date          TEXT,
  source_confidence            TEXT,
  notes                        TEXT,
  created_at                   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                   TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

const JOB_CRANE_REQUIREMENTS_SQL = `
CREATE TABLE IF NOT EXISTS job_crane_requirements (
  id                                    INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id                            TEXT NOT NULL REFERENCES companies(id),
  job_id                                TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  crane_model_id                        INTEGER REFERENCES crane_models(id),
  crane_travel_state_id                 INTEGER REFERENCES crane_model_travel_states(id),
  crane_class                           TEXT,
  required_capacity_tonnes              REAL,
  lift_weight_tonnes                    REAL,
  radius_m                              REAL,
  height_m                              REAL,
  counterweight_required_tonnes         REAL,
  counterweight_carried_on_crane_tonnes REAL,
  counterweight_to_transport_tonnes     REAL,
  requires_counterweight_transport      INTEGER NOT NULL DEFAULT 0,
  support_truck_required                INTEGER NOT NULL DEFAULT 0,
  estimated_transport_loads             INTEGER,
  transport_review_required             INTEGER NOT NULL DEFAULT 0,
  route_review_required                 INTEGER NOT NULL DEFAULT 0,
  osom_review_required                  INTEGER NOT NULL DEFAULT 0,
  nhvr_review_required                  INTEGER NOT NULL DEFAULT 0,
  permit_review_required                INTEGER NOT NULL DEFAULT 0,
  manual_review_required                INTEGER NOT NULL DEFAULT 0,
  review_reason                         TEXT,
  site_access_notes                     TEXT,
  setup_notes                           TEXT,
  source_confidence                     TEXT,
  created_at                            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                            TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

const TRANSPORT_REQUIREMENTS_SQL = `
CREATE TABLE IF NOT EXISTS transport_requirements (
  id                        INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id                TEXT NOT NULL REFERENCES companies(id),
  job_id                    TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  job_crane_requirement_id  INTEGER REFERENCES job_crane_requirements(id) ON DELETE CASCADE,
  transport_type            TEXT,
  load_description          TEXT,
  estimated_tonnes          REAL,
  vehicle_type              TEXT,
  driver_required           INTEGER NOT NULL DEFAULT 0,
  rigger_required           INTEGER NOT NULL DEFAULT 0,
  pilot_or_escort_review    INTEGER NOT NULL DEFAULT 0,
  nhvr_review_required      INTEGER NOT NULL DEFAULT 0,
  route_review_required     INTEGER NOT NULL DEFAULT 0,
  permit_review_required    INTEGER NOT NULL DEFAULT 0,
  notes                     TEXT,
  created_at                TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

const REQUIREMENT_CATALOGUE_SQL = `
CREATE TABLE IF NOT EXISTS requirement_catalogue_items (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  category          TEXT NOT NULL
                    CHECK (category IN ('credential', 'equipment', 'transport', 'civil', 'rail', 'energy', 'voc')),
  group_label       TEXT NOT NULL,
  code              TEXT NOT NULL,
  label             TEXT NOT NULL,
  normalized_key    TEXT NOT NULL UNIQUE,
  description       TEXT,
  is_active         INTEGER NOT NULL DEFAULT 1,
  source            TEXT,
  source_confidence TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS company_catalogue_selections (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id        TEXT NOT NULL REFERENCES companies(id),
  catalogue_item_id INTEGER NOT NULL REFERENCES requirement_catalogue_items(id),
  is_enabled        INTEGER NOT NULL DEFAULT 1,
  display_order     INTEGER,
  notes             TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(company_id, catalogue_item_id)
);

CREATE TABLE IF NOT EXISTS job_custom_requirements (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id         TEXT NOT NULL REFERENCES companies(id),
  job_id             TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  category           TEXT NOT NULL,
  label              TEXT NOT NULL,
  normalized_key     TEXT NOT NULL,
  notes              TEXT,
  created_by_user_id TEXT REFERENCES users(id),
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS job_requirement_items (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id            TEXT NOT NULL REFERENCES companies(id),
  job_id                TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  catalogue_item_id     INTEGER REFERENCES requirement_catalogue_items(id),
  custom_requirement_id INTEGER REFERENCES job_custom_requirements(id) ON DELETE CASCADE,
  category              TEXT NOT NULL,
  source                TEXT NOT NULL
                        CHECK (source IN ('catalogue', 'custom', 'imported', 'parsed_from_brief')),
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (
    (catalogue_item_id IS NOT NULL AND custom_requirement_id IS NULL)
    OR (catalogue_item_id IS NULL AND custom_requirement_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS company_assets (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id        TEXT NOT NULL REFERENCES companies(id),
  catalogue_item_id INTEGER NOT NULL REFERENCES requirement_catalogue_items(id),
  asset_number      TEXT NOT NULL,
  display_name      TEXT,
  asset_status      TEXT NOT NULL DEFAULT 'active'
                    CHECK (asset_status IN ('active', 'inactive', 'unavailable', 'retired')),
  home_location     TEXT,
  notes             TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(company_id, asset_number)
);

CREATE TABLE IF NOT EXISTS job_asset_assignments (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id            TEXT NOT NULL REFERENCES companies(id),
  job_id                TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  company_asset_id      INTEGER NOT NULL REFERENCES company_assets(id),
  source                TEXT NOT NULL DEFAULT 'manual'
                        CHECK (source IN ('manual', 'imported', 'suggested')),
  created_by_user_id    TEXT REFERENCES users(id),
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(company_id, job_id, company_asset_id)
);
`;

const POST_MIGRATION_INDEX_SQL = `
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_slug
  ON companies(slug)
  WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_workers_company_email
  ON workers(company_id, email)
  WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workers_company_archived
  ON workers(company_id, archived_at);
CREATE INDEX IF NOT EXISTS idx_jobs_company_schedule_start
  ON jobs(company_id, scheduled_start_at_utc);
CREATE INDEX IF NOT EXISTS idx_jobs_company_schedule_status
  ON jobs(company_id, schedule_status);
CREATE INDEX IF NOT EXISTS idx_allocations_worker_schedule
  ON allocations(worker_id, allocation_start_at_utc, allocation_end_at_utc);
CREATE INDEX IF NOT EXISTS idx_allocations_company_schedule
  ON allocations(company_id, allocation_start_at_utc, allocation_end_at_utc);
CREATE INDEX IF NOT EXISTS idx_job_imports_company
  ON job_imports(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_job_imports_status
  ON job_imports(company_id, status);
CREATE INDEX IF NOT EXISTS idx_preferences_worker ON worker_task_preferences(worker_id);
CREATE INDEX IF NOT EXISTS idx_preferences_company ON worker_task_preferences(company_id, task_tag);
CREATE UNIQUE INDEX IF NOT EXISTS idx_preferences_worker_tag_source
  ON worker_task_preferences(company_id, worker_id, task_tag, source);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crane_models_make_model
  ON crane_models(manufacturer, model);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crane_model_travel_state_unique
  ON crane_model_travel_states(crane_model_id, state_label);
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_crane_requirements_job
  ON job_crane_requirements(job_id);
CREATE INDEX IF NOT EXISTS idx_job_crane_requirements_company
  ON job_crane_requirements(company_id, manual_review_required, transport_review_required);
CREATE INDEX IF NOT EXISTS idx_transport_requirements_job
  ON transport_requirements(job_id, transport_type);
CREATE INDEX IF NOT EXISTS idx_transport_requirements_crane_requirement
  ON transport_requirements(job_crane_requirement_id);
CREATE INDEX IF NOT EXISTS idx_requirement_catalogue_category
  ON requirement_catalogue_items(category, group_label);
CREATE INDEX IF NOT EXISTS idx_company_catalogue_company
  ON company_catalogue_selections(company_id, is_enabled);
CREATE INDEX IF NOT EXISTS idx_job_requirement_items_job
  ON job_requirement_items(company_id, job_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_requirement_items_catalogue_unique
  ON job_requirement_items(company_id, job_id, catalogue_item_id)
  WHERE catalogue_item_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_requirement_items_custom_unique
  ON job_requirement_items(company_id, job_id, custom_requirement_id)
  WHERE custom_requirement_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_custom_requirements_job
  ON job_custom_requirements(company_id, job_id);
CREATE INDEX IF NOT EXISTS idx_company_assets_company
  ON company_assets(company_id, asset_status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_assets_company_number
  ON company_assets(company_id, asset_number);
CREATE INDEX IF NOT EXISTS idx_company_assets_catalogue_status
  ON company_assets(company_id, catalogue_item_id, asset_status);
CREATE INDEX IF NOT EXISTS idx_job_asset_assignments_job
  ON job_asset_assignments(company_id, job_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_asset_assignments_unique
  ON job_asset_assignments(company_id, job_id, company_asset_id);
CREATE INDEX IF NOT EXISTS idx_audit_company ON audit_events(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_job ON audit_events(job_id);
CREATE INDEX IF NOT EXISTS idx_audit_worker ON audit_events(worker_id);
CREATE INDEX IF NOT EXISTS idx_audit_type ON audit_events(company_id, event_type);
`;

let _db = null;

function shouldUseWal(dbPath) {
  if (process.env.LIFTIQ_DISABLE_WAL === '1') return false;
  const resolvedPath = path.resolve(dbPath);
  const tempRoot = path.resolve(os.tmpdir());
  return !resolvedPath.startsWith(tempRoot);
}

function schemaForJournalMode(schema, useWal) {
  if (useWal) return schema;
  return schema.replace(/^PRAGMA journal_mode = WAL;\r?\n/i, '');
}

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
    || !row.sql.includes('preference_signal_created')
    || !row.sql.includes('worker_updated')
    || !row.sql.includes('worker_removed')
    || !row.sql.includes('job_schedule_changed')
    || !row.sql.includes('job_brief_import_previewed')
    || !row.sql.includes('job_created_from_brief')
    || !row.sql.includes('job_counterweight_transport_assessed')
    || !row.sql.includes('transport_requirement_created')
    || !row.sql.includes('company_catalogue_updated')
    || !row.sql.includes('company_operating_mode_updated')
    || !row.sql.includes('company_asset_created')
    || !row.sql.includes('company_asset_updated')
    || !row.sql.includes('company_asset_archived')
    || !row.sql.includes('job_requirements_updated')
    || !row.sql.includes('job_custom_requirement_added')
    || !row.sql.includes('job_requirement_imported_from_brief')
    || !row.sql.includes('job_asset_selected');
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
  ensureColumn(db, 'companies', `timezone TEXT NOT NULL DEFAULT 'Australia/Brisbane'`, 'timezone');
  ensureColumn(db, 'companies', `slug TEXT`, 'slug');
  ensureColumn(db, 'companies', `display_name TEXT`, 'display_name');
  ensureColumn(db, 'companies', `access_status TEXT NOT NULL DEFAULT 'active'`, 'access_status');
  ensureColumn(db, 'companies', `pilot_type TEXT NOT NULL DEFAULT 'internal'`, 'pilot_type');
  ensureColumn(db, 'companies', `pilot_starts_at TEXT`, 'pilot_starts_at');
  ensureColumn(db, 'companies', `pilot_expires_at TEXT`, 'pilot_expires_at');
  ensureColumn(db, 'companies', `notes TEXT`, 'notes');
  ensureColumn(db, 'companies', `operating_mode TEXT NOT NULL DEFAULT 'plant_and_labour'`, 'operating_mode');
  ensureColumn(db, 'users', `must_change_password INTEGER NOT NULL DEFAULT 0`, 'must_change_password');
  ensureColumn(db, 'workers', `email TEXT`, 'email');
  ensureColumn(db, 'workers', `archived_at TEXT`, 'archived_at');
  ensureColumn(db, 'workers', `archived_by_user_id TEXT`, 'archived_by_user_id');
  ensureColumn(db, 'workers', `archive_reason TEXT`, 'archive_reason');
  ensureColumn(db, 'jobs', `task_tags TEXT NOT NULL DEFAULT '[]'`, 'task_tags');
  ensureColumn(db, 'jobs', `scheduled_start_at_utc TEXT`, 'scheduled_start_at_utc');
  ensureColumn(db, 'jobs', `scheduled_end_at_utc TEXT`, 'scheduled_end_at_utc');
  ensureColumn(db, 'jobs', `job_timezone TEXT NOT NULL DEFAULT 'Australia/Brisbane'`, 'job_timezone');
  ensureColumn(db, 'jobs', `scheduled_start_local TEXT`, 'scheduled_start_local');
  ensureColumn(db, 'jobs', `scheduled_end_local TEXT`, 'scheduled_end_local');
  ensureColumn(db, 'jobs', `schedule_status TEXT NOT NULL DEFAULT 'planned'`, 'schedule_status');
  ensureColumn(db, 'jobs', `contact_name TEXT`, 'contact_name');
  ensureColumn(db, 'jobs', `contact_phone TEXT`, 'contact_phone');
  ensureColumn(db, 'jobs', `job_description TEXT`, 'job_description');
  ensureColumn(db, 'jobs', `risk_notes TEXT`, 'risk_notes');
  ensureColumn(db, 'jobs', `travel_notes TEXT`, 'travel_notes');
  ensureColumn(db, 'jobs', `source_note TEXT`, 'source_note');
  ensureColumn(db, 'allocations', `allocation_start_at_utc TEXT`, 'allocation_start_at_utc');
  ensureColumn(db, 'allocations', `allocation_end_at_utc TEXT`, 'allocation_end_at_utc');
  ensureColumn(db, 'allocations', `allocation_timezone TEXT`, 'allocation_timezone');
  ensureColumn(db, 'allocations', `allocation_status TEXT`, 'allocation_status');
  db.exec(`UPDATE jobs SET task_tags = '[]' WHERE task_tags IS NULL;`);
  db.exec(`UPDATE companies SET timezone = 'Australia/Brisbane' WHERE timezone IS NULL OR trim(timezone) = '';`);
  db.exec(`UPDATE companies SET access_status = 'active' WHERE access_status IS NULL OR trim(access_status) = '';`);
  db.exec(`UPDATE companies SET pilot_type = 'internal' WHERE pilot_type IS NULL OR trim(pilot_type) = '';`);
  db.exec(`UPDATE companies SET display_name = name WHERE display_name IS NULL OR trim(display_name) = '';`);
  db.exec(`UPDATE companies SET operating_mode = 'plant_and_labour' WHERE operating_mode IS NULL OR trim(operating_mode) = '';`);
  db.exec(`UPDATE jobs SET job_timezone = 'Australia/Brisbane' WHERE job_timezone IS NULL OR trim(job_timezone) = '';`);
  db.exec(`
    UPDATE jobs
    SET schedule_status = CASE
      WHEN scheduled_start_at_utc IS NULL OR scheduled_end_at_utc IS NULL THEN 'draft'
      ELSE 'planned'
    END
    WHERE schedule_status IS NULL OR trim(schedule_status) = ''
  `);
  db.exec(WORKER_TASK_PREFERENCES_SQL);
  db.exec(JOB_IMPORTS_SQL);
  db.exec(CRANE_MODELS_SQL);
  db.exec(CRANE_MODEL_TRAVEL_STATES_SQL);
  db.exec(JOB_CRANE_REQUIREMENTS_SQL);
  db.exec(TRANSPORT_REQUIREMENTS_SQL);
  db.exec(REQUIREMENT_CATALOGUE_SQL);
  ensureColumn(db, 'job_imports', `warnings_json TEXT NOT NULL DEFAULT '[]'`, 'warnings_json');
  migrateAuditEvents(db);
  db.exec(POST_MIGRATION_INDEX_SQL);
  seedCraneModelCatalog(db);
  seedRequirementCatalogue(db);
}

function getDb() {
  if (_db) return _db;

  const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/liftiq.db');
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  _db = new Database(dbPath);
  const useWal = shouldUseWal(dbPath);
  _db.pragma(useWal ? 'journal_mode = WAL' : 'journal_mode = DELETE');
  _db.pragma('foreign_keys = ON');

  const schema = schemaForJournalMode(fs.readFileSync(SCHEMA_PATH, 'utf8'), useWal);
  _db.exec(schema);
  runMigrations(_db);

  return _db;
}

// Used in tests to inject a fresh in-memory database
function setDb(db) {
  _db = db;
}

module.exports = { getDb, setDb, runMigrations };
