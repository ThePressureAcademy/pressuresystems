PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ─────────────────────────────────────────────────────────────────────────────
-- Company
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  abn               TEXT,
  timezone          TEXT NOT NULL DEFAULT 'Australia/Brisbane',
  locations         TEXT NOT NULL DEFAULT '[]',       -- JSON string[]
  operating_regions TEXT NOT NULL DEFAULT '[]',       -- JSON string[]
  status            TEXT NOT NULL DEFAULT 'pilot'
                    CHECK (status IN ('active', 'pilot', 'suspended')),
  pilot_start_date  TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- User
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  company_id    TEXT NOT NULL REFERENCES companies(id),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL
                CHECK (role IN ('admin', 'dispatcher', 'supervisor', 'viewer')),
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'invited', 'deactivated')),
  must_change_password INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Worker
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workers (
  id                TEXT PRIMARY KEY,
  company_id        TEXT NOT NULL REFERENCES companies(id),
  name              TEXT NOT NULL,
  email             TEXT,
  role              TEXT NOT NULL
                    CHECK (role IN (
                      'crane_operator', 'dogman', 'rigger',
                      'traffic_controller', 'supervisor', 'allocator'
                    )),
  employment_type   TEXT NOT NULL
                    CHECK (employment_type IN (
                      'permanent', 'casual', 'contractor', 'labour_hire'
                    )),
  crane_classes     TEXT NOT NULL DEFAULT '[]',  -- JSON string[] e.g. ["25T","55T"]
  usual_depot       TEXT,
  contact_number    TEXT,
  status            TEXT NOT NULL DEFAULT 'available'
                    CHECK (status IN (
                      'available', 'allocated', 'unavailable', 'on_leave', 'inactive'
                    )),
  archived_at       TEXT,
  archived_by_user_id TEXT REFERENCES users(id),
  archive_reason    TEXT,
  availability_note TEXT,
  notes             TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Credential
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS credentials (
  id           TEXT PRIMARY KEY,
  worker_id    TEXT NOT NULL REFERENCES workers(id),
  company_id   TEXT NOT NULL REFERENCES companies(id),
  type         TEXT NOT NULL
               CHECK (type IN (
                 'high_risk_licence_crane', 'high_risk_licence_dogging',
                 'high_risk_licence_rigging', 'white_card', 'msic_card',
                 'site_induction', 'client_induction', 'medical_clearance',
                 'drivers_licence', 'other'
               )),
  identifier   TEXT,
  issuing_body TEXT,
  issue_date   TEXT,
  expiry_date  TEXT,             -- NULL = no expiry
  verified     INTEGER NOT NULL DEFAULT 0,
  attachment_url TEXT,
  status       TEXT NOT NULL DEFAULT 'valid'
               CHECK (status IN (
                 'valid', 'expiring_soon', 'expired', 'pending_verification'
               )),
  notes        TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Fatigue Record
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fatigue_records (
  id                     TEXT PRIMARY KEY,
  worker_id              TEXT NOT NULL REFERENCES workers(id),
  company_id             TEXT NOT NULL REFERENCES companies(id),
  shift_start            TEXT NOT NULL,   -- ISO datetime
  shift_end              TEXT NOT NULL,   -- ISO datetime
  shift_length_hours     REAL NOT NULL,   -- stored for query performance
  shift_type             TEXT NOT NULL
                         CHECK (shift_type IN ('day', 'night', 'split')),
  travel_hours           REAL NOT NULL DEFAULT 0,
  self_declared_fatigue  INTEGER NOT NULL DEFAULT 0,
  notes                  TEXT,
  recorded_by_user_id    TEXT NOT NULL REFERENCES users(id),
  created_at             TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Job
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id                       TEXT PRIMARY KEY,
  company_id               TEXT NOT NULL REFERENCES companies(id),
  reference                TEXT,
  client_name              TEXT NOT NULL,
  site_name                TEXT NOT NULL,
  site_location            TEXT,
  contact_name             TEXT,
  contact_phone            TEXT,
  date                     TEXT NOT NULL,   -- YYYY-MM-DD
  shift_start_time         TEXT,            -- HH:MM
  shift_type               TEXT NOT NULL
                           CHECK (shift_type IN ('day', 'night', 'split')),
  estimated_duration_hours REAL,
  crane_class_required     TEXT,
  job_description          TEXT,
  task_tags                TEXT NOT NULL DEFAULT '[]',    -- JSON string[]
  crew_roles_required      TEXT NOT NULL DEFAULT '[]',    -- JSON
  required_credentials     TEXT NOT NULL DEFAULT '[]',    -- JSON string[]
  site_conditions          TEXT NOT NULL DEFAULT '[]',    -- JSON string[]
  lift_risk_level          TEXT NOT NULL DEFAULT 'routine'
                           CHECK (lift_risk_level IN ('routine', 'complex', 'critical')),
  scheduled_start_at_utc   TEXT,
  scheduled_end_at_utc     TEXT,
  job_timezone             TEXT NOT NULL DEFAULT 'Australia/Brisbane',
  scheduled_start_local    TEXT,
  scheduled_end_local      TEXT,
  schedule_status          TEXT NOT NULL DEFAULT 'planned'
                           CHECK (schedule_status IN (
                             'draft', 'planned', 'confirmed', 'completed', 'cancelled'
                           )),
  risk_notes               TEXT,
  travel_required          INTEGER NOT NULL DEFAULT 0,
  travel_hours_estimated   REAL DEFAULT 0,
  travel_notes             TEXT,
  source_note              TEXT,
  notes                    TEXT,
  status                   TEXT NOT NULL DEFAULT 'open'
                           CHECK (status IN (
                             'draft', 'open', 'allocated',
                             'in_progress', 'complete', 'cancelled'
                           )),
  created_by_user_id       TEXT NOT NULL REFERENCES users(id),
  created_at               TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at               TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Allocation
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS allocations (
  id                      TEXT PRIMARY KEY,
  job_id                  TEXT NOT NULL REFERENCES jobs(id),
  worker_id               TEXT NOT NULL REFERENCES workers(id),
  company_id              TEXT NOT NULL REFERENCES companies(id),
  allocated_by_user_id    TEXT NOT NULL REFERENCES users(id),
  smartrank_position      INTEGER NOT NULL,
  smartrank_score         REAL NOT NULL,
  smartrank_snapshot      TEXT NOT NULL,   -- JSON: full score breakdown at decision time
  active_warnings         TEXT NOT NULL DEFAULT '[]',         -- JSON
  active_blocks_on_others TEXT NOT NULL DEFAULT '[]',         -- JSON
  override_reason         TEXT,
  allocation_start_at_utc TEXT,
  allocation_end_at_utc   TEXT,
  allocation_timezone     TEXT,
  allocation_status       TEXT
                          CHECK (allocation_status IN ('draft', 'planned', 'confirmed', 'completed', 'cancelled')),
  status                  TEXT NOT NULL DEFAULT 'confirmed'
                          CHECK (status IN ('confirmed', 'changed', 'cancelled')),
  allocated_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Worker Task Preference
-- ─────────────────────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────────────────────
-- Crane model catalog and travel states
-- ─────────────────────────────────────────────────────────────────────────────
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

CREATE TABLE IF NOT EXISTS job_crane_requirements (
  id                                   INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id                           TEXT NOT NULL REFERENCES companies(id),
  job_id                               TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  crane_model_id                       INTEGER REFERENCES crane_models(id),
  crane_travel_state_id                INTEGER REFERENCES crane_model_travel_states(id),
  crane_class                          TEXT,
  required_capacity_tonnes             REAL,
  lift_weight_tonnes                   REAL,
  radius_m                             REAL,
  height_m                             REAL,
  counterweight_required_tonnes        REAL,
  counterweight_carried_on_crane_tonnes REAL,
  counterweight_to_transport_tonnes    REAL,
  requires_counterweight_transport     INTEGER NOT NULL DEFAULT 0,
  support_truck_required               INTEGER NOT NULL DEFAULT 0,
  estimated_transport_loads            INTEGER,
  transport_review_required            INTEGER NOT NULL DEFAULT 0,
  route_review_required                INTEGER NOT NULL DEFAULT 0,
  osom_review_required                 INTEGER NOT NULL DEFAULT 0,
  nhvr_review_required                 INTEGER NOT NULL DEFAULT 0,
  permit_review_required               INTEGER NOT NULL DEFAULT 0,
  manual_review_required               INTEGER NOT NULL DEFAULT 0,
  review_reason                        TEXT,
  site_access_notes                    TEXT,
  setup_notes                          TEXT,
  source_confidence                    TEXT,
  created_at                           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                           TEXT NOT NULL DEFAULT (datetime('now'))
);

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

-- ─────────────────────────────────────────────────────────────────────────────
-- Audit Event  (APPEND-ONLY — enforced by triggers below)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_events (
  id            TEXT PRIMARY KEY,
  company_id    TEXT NOT NULL REFERENCES companies(id),
  event_type    TEXT NOT NULL
                CHECK (event_type IN (
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
                  'worker_removed',
                  'job_created',
                  'job_brief_import_previewed',
                  'job_created_from_brief',
                  'job_counterweight_transport_assessed',
                  'job_schedule_changed',
                  'job_status_changed',
                  'transport_requirement_created',
                  'preference_signal_created',
                  'preference_signal_updated',
                  'learned_preference_applied'
                )),
  user_id       TEXT REFERENCES users(id),
  worker_id     TEXT REFERENCES workers(id),
  job_id        TEXT REFERENCES jobs(id),
  allocation_id TEXT REFERENCES allocations(id),
  payload       TEXT NOT NULL DEFAULT '{}',   -- JSON
  timestamp     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Enforce append-only at the database level
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

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes for common query patterns
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_company        ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_workers_company      ON workers(company_id);
CREATE INDEX IF NOT EXISTS idx_credentials_worker   ON credentials(worker_id);
CREATE INDEX IF NOT EXISTS idx_credentials_company  ON credentials(company_id);
CREATE INDEX IF NOT EXISTS idx_fatigue_worker       ON fatigue_records(worker_id);
CREATE INDEX IF NOT EXISTS idx_fatigue_company_date ON fatigue_records(company_id, shift_start);
CREATE INDEX IF NOT EXISTS idx_jobs_company         ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_allocations_job      ON allocations(job_id);
CREATE INDEX IF NOT EXISTS idx_allocations_worker   ON allocations(worker_id);
CREATE INDEX IF NOT EXISTS idx_allocations_company  ON allocations(company_id, allocated_at);
CREATE INDEX IF NOT EXISTS idx_job_imports_company  ON job_imports(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_job_imports_status   ON job_imports(company_id, status);
CREATE INDEX IF NOT EXISTS idx_preferences_worker   ON worker_task_preferences(worker_id);
CREATE INDEX IF NOT EXISTS idx_preferences_company  ON worker_task_preferences(company_id, task_tag);
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
CREATE INDEX IF NOT EXISTS idx_audit_company        ON audit_events(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_job            ON audit_events(job_id);
CREATE INDEX IF NOT EXISTS idx_audit_worker         ON audit_events(worker_id);
CREATE INDEX IF NOT EXISTS idx_audit_type           ON audit_events(company_id, event_type);
