PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ─────────────────────────────────────────────────────────────────────────────
-- Company
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  slug              TEXT UNIQUE,
  display_name      TEXT,
  abn               TEXT,
  timezone          TEXT NOT NULL DEFAULT 'Australia/Brisbane',
  locations         TEXT NOT NULL DEFAULT '[]',       -- JSON string[]
  operating_regions TEXT NOT NULL DEFAULT '[]',       -- JSON string[]
  status            TEXT NOT NULL DEFAULT 'pilot'
                    CHECK (status IN ('active', 'pilot', 'suspended')),
  pilot_start_date  TEXT,
  access_status     TEXT NOT NULL DEFAULT 'active'
                    CHECK (access_status IN ('active', 'suspended', 'expired')),
  pilot_type        TEXT NOT NULL DEFAULT 'internal'
                    CHECK (pilot_type IN ('internal', 'testing_partner', 'founding_partner', 'commercial_pilot')),
  pilot_starts_at   TEXT,
  pilot_expires_at  TEXT,
  operating_mode    TEXT NOT NULL DEFAULT 'plant_and_labour'
                    CHECK (operating_mode IN ('labour_only', 'plant_and_labour')),
  notes             TEXT,
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
  is_internal_admin INTEGER NOT NULL DEFAULT 0,
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
  roles             TEXT NOT NULL DEFAULT '[]',  -- JSON string[] from intake role catalogue
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
  type         TEXT NOT NULL,
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
  crane_classes_required   TEXT NOT NULL DEFAULT '[]',    -- JSON string[]
  job_description          TEXT,
  task_tags                TEXT NOT NULL DEFAULT '[]',    -- JSON string[]
  crew_roles_required      TEXT NOT NULL DEFAULT '[]',    -- JSON
  role_requirements        TEXT NOT NULL DEFAULT '[]',    -- JSON [{ role_key, required_count, requires_distinct_worker }]
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
  archived_at              TEXT,
  archived_by_user_id      TEXT REFERENCES users(id),
  archive_reason           TEXT,
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

CREATE TABLE IF NOT EXISTS allocation_notifications (
  id                    TEXT PRIMARY KEY,
  company_id            TEXT NOT NULL REFERENCES companies(id),
  allocation_id         TEXT REFERENCES allocations(id),
  job_id                TEXT NOT NULL REFERENCES jobs(id),
  worker_id             TEXT NOT NULL REFERENCES workers(id),
  channel               TEXT NOT NULL DEFAULT 'sms',
  status                TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN (
                          'draft', 'previewed', 'published_manual',
                          'queued', 'sent', 'delivered', 'failed',
                          'acknowledged', 'declined', 'cancelled'
                        )),
  recipient_phone       TEXT,
  message_body_snapshot TEXT NOT NULL,
  provider              TEXT,
  provider_message_id   TEXT,
  sent_at               TEXT,
  delivered_at          TEXT,
  responded_at          TEXT,
  response_text         TEXT,
  created_by_user_id    TEXT REFERENCES users(id),
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Worker Task Preference
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_compatibility_rules (
  id                         INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id                 TEXT REFERENCES companies(id),
  role_a                     TEXT NOT NULL,
  role_b                     TEXT NOT NULL,
  compatibility_status       TEXT NOT NULL
                               CHECK (compatibility_status IN ('compatible', 'review_required', 'discouraged', 'disallowed')),
  reason                     TEXT,
  requires_credentials_json  TEXT NOT NULL DEFAULT '[]',
  is_active                  INTEGER NOT NULL DEFAULT 1,
  created_at                 TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                 TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(company_id, role_a, role_b)
);

CREATE TABLE IF NOT EXISTS job_role_requirements (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id               TEXT NOT NULL REFERENCES companies(id),
  job_id                   TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  role_key                 TEXT NOT NULL,
  role_label               TEXT NOT NULL,
  required_count           INTEGER NOT NULL DEFAULT 1,
  requires_distinct_worker INTEGER NOT NULL DEFAULT 0,
  notes                    TEXT,
  created_at               TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(company_id, job_id, role_key)
);

CREATE TABLE IF NOT EXISTS allocation_role_coverages (
  id              TEXT PRIMARY KEY,
  company_id      TEXT NOT NULL REFERENCES companies(id),
  job_id          TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  allocation_id   TEXT REFERENCES allocations(id) ON DELETE CASCADE,
  worker_id       TEXT NOT NULL REFERENCES workers(id),
  role_key        TEXT NOT NULL,
  source          TEXT NOT NULL
                  CHECK (source IN ('manual', 'smartrank_suggested', 'dispatcher_confirmed')),
  review_required INTEGER NOT NULL DEFAULT 0,
  review_reason   TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

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

CREATE TABLE IF NOT EXISTS audit_events (
  id            TEXT PRIMARY KEY,
  company_id    TEXT NOT NULL REFERENCES companies(id),
  event_type    TEXT NOT NULL
                CHECK (event_type IN (
                  'smartrank_generated',
                  'user_login_succeeded',
                  'user_login_failed',
                  'password_changed',
                  'protected_route_blocked_password_change',
                  'internal_pilot_monitor_viewed',
                  'credential_block_applied',
                  'fatigue_block_applied',
                  'fatigue_warning_triggered',
                  'availability_block_applied',
                  'allocation_confirmed',
                  'allocation_changed',
                  'allocation_rejected',
                  'allocation_publish_previewed',
                  'allocation_published_manual',
                  'role_coverage_suggested',
                  'role_coverage_confirmed',
                  'role_coverage_review_required',
                  'role_coverage_override_recorded',
                  'role_compatibility_rule_updated',
                  'warning_acknowledged',
                  'non_top_ranked_selected',
                  'credential_expiry_alert',
                  'worker_imported',
                  'worker_import_completed',
                  'worker_created',
                  'worker_archived',
                  'worker_removed',
                  'worker_updated',
                  'worker_roles_updated',
                  'worker_credentials_updated',
                  'worker_preferences_updated',
                  'job_created',
                  'job_updated',
                  'job_imported_from_brief',
                  'job_brief_import_previewed',
                  'job_created_from_brief',
                  'job_counterweight_transport_assessed',
                  'job_schedule_changed',
                  'job_status_changed',
                  'transport_requirement_created',
                  'company_catalogue_updated',
                  'company_operating_mode_updated',
                  'company_default_timezone_updated',
                  'company_asset_created',
                  'company_asset_updated',
                  'company_asset_archived',
                  'company_reset_previewed',
                  'job_requirements_updated',
                  'job_required_roles_updated',
                  'job_credentials_updated',
                  'job_equipment_requirements_updated',
                  'job_site_conditions_updated',
                  'job_additional_requirements_updated',
                  'job_custom_requirement_added',
                  'job_requirement_imported_from_brief',
                  'job_asset_selected',
                  'job_asset_changed',
                  'preference_signal_created',
                  'preference_signal_updated',
                  'learned_preference_applied',
                  'override_reason_recorded',
                  'credentialgate_block_created',
                  'fatigueguard_warning_created',
                  'company_reset_started',
                  'company_reset_completed'
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
CREATE INDEX IF NOT EXISTS idx_allocation_notifications_company ON allocation_notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_allocation_notifications_job     ON allocation_notifications(company_id, job_id);
CREATE INDEX IF NOT EXISTS idx_allocation_notifications_worker  ON allocation_notifications(company_id, worker_id);
CREATE INDEX IF NOT EXISTS idx_allocation_notifications_status  ON allocation_notifications(company_id, status);
CREATE INDEX IF NOT EXISTS idx_role_compatibility_company       ON role_compatibility_rules(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_job_role_requirements_job        ON job_role_requirements(company_id, job_id);
CREATE INDEX IF NOT EXISTS idx_allocation_role_coverages_job    ON allocation_role_coverages(company_id, job_id);
CREATE INDEX IF NOT EXISTS idx_allocation_role_coverages_alloc  ON allocation_role_coverages(company_id, allocation_id);
CREATE INDEX IF NOT EXISTS idx_allocation_role_coverages_worker ON allocation_role_coverages(company_id, worker_id);
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
CREATE INDEX IF NOT EXISTS idx_audit_company        ON audit_events(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_job            ON audit_events(job_id);
CREATE INDEX IF NOT EXISTS idx_audit_worker         ON audit_events(worker_id);
CREATE INDEX IF NOT EXISTS idx_audit_type           ON audit_events(company_id, event_type);
