PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ─────────────────────────────────────────────────────────────────────────────
-- Company
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  abn               TEXT,
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
  date                     TEXT NOT NULL,   -- YYYY-MM-DD
  shift_start_time         TEXT,            -- HH:MM
  shift_type               TEXT NOT NULL
                           CHECK (shift_type IN ('day', 'night', 'split')),
  estimated_duration_hours REAL,
  crane_class_required     TEXT,
  crew_roles_required      TEXT NOT NULL DEFAULT '[]',    -- JSON
  required_credentials     TEXT NOT NULL DEFAULT '[]',    -- JSON string[]
  site_conditions          TEXT NOT NULL DEFAULT '[]',    -- JSON string[]
  lift_risk_level          TEXT NOT NULL DEFAULT 'routine'
                           CHECK (lift_risk_level IN ('routine', 'complex', 'critical')),
  travel_required          INTEGER NOT NULL DEFAULT 0,
  travel_hours_estimated   REAL DEFAULT 0,
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
  status                  TEXT NOT NULL DEFAULT 'confirmed'
                          CHECK (status IN ('confirmed', 'changed', 'cancelled')),
  allocated_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT NOT NULL DEFAULT (datetime('now'))
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
                  'job_created',
                  'job_status_changed'
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
CREATE INDEX IF NOT EXISTS idx_audit_company        ON audit_events(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_job            ON audit_events(job_id);
CREATE INDEX IF NOT EXISTS idx_audit_worker         ON audit_events(worker_id);
CREATE INDEX IF NOT EXISTS idx_audit_type           ON audit_events(company_id, event_type);
