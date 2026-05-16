'use strict';

const { describe, test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');
const supertest = require('supertest');

const { getDb, setDb } = require('../src/db');
const { signToken } = require('../src/middleware/auth');
const {
  createTestDb,
  seedCompanyAndUser,
  seedCredential,
  seedWorker
} = require('./helpers/db');

const SAMPLE_TXT = fs.readFileSync(
  path.join(__dirname, '../samples/job-brief-sample.txt'),
  'utf8'
);
const SAMPLE_MD = fs.readFileSync(
  path.join(__dirname, '../samples/job-brief-sample.md'),
  'utf8'
);

let db;
let app;
let request;
let companyId;
let userId;
let token;
let otherCompanyId;

function rmTempDirWithRetry(tempDir) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      return;
    } catch (error) {
      if (error.code !== 'EBUSY') throw error;
      if (attempt === 4) return;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 75);
    }
  }
}
let otherUserId;
let otherToken;

function auth(currentToken = token) {
  return { Authorization: `Bearer ${currentToken}` };
}

beforeEach(() => {
  db = createTestDb();
  setDb(db);
  app = require('../src/app');
  request = supertest(app);

  ({ companyId, userId } = seedCompanyAndUser(db, {
    email: 'dispatcher@test.com',
    role: 'admin',
    timezone: 'Australia/Brisbane'
  }));
  token = signToken({
    id: userId,
    company_id: companyId,
    role: 'admin',
    name: 'Dispatcher Admin'
  });

  ({ companyId: otherCompanyId, userId: otherUserId } = seedCompanyAndUser(db, {
    companyId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    userId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    email: 'other@test.com',
    role: 'admin'
  }));
  otherToken = signToken({
    id: otherUserId,
    company_id: otherCompanyId,
    role: 'admin',
    name: 'Other Admin'
  });
});

afterEach(() => {
  if (db) {
    db.close();
    db = null;
  }
  setDb(null);
});

describe('Job brief import for assisted job creation', () => {
  test('preview accepts pasted text and extracts structured job fields', async () => {
    const res = await request.post('/api/jobs/import-brief/preview').set(auth()).send({
      source_type: 'pasted_text',
      content: SAMPLE_TXT
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.import_id);
    assert.equal(res.body.extracted.client_name, 'Raymonds Lift & Shift');
    assert.equal(res.body.extracted.scheduled_date, '2026-05-21');
    assert.equal(res.body.extracted.start_time, '07:00');
    assert.equal(res.body.extracted.end_time, '12:00');
    assert.equal(res.body.extracted.timezone, 'Australia/Brisbane');
    assert.deepEqual(res.body.extracted.required_roles, ['crane_operator', 'dogman', 'rigger']);
    assert.deepEqual(res.body.extracted.required_credentials, [
      'white_card',
      'hrwl_c2',
      'hrwl_dg',
      'hrwl_ri'
    ]);
    assert.ok(res.body.extracted.task_tags.includes('franna'));
    assert.ok(res.body.extracted.task_tags.includes('critical_lift'));
    assert.equal(res.body.confidence.scheduled_date, 'high');
    assert.equal(res.body.confidence.timezone, 'high');
  });

  test('preview accepts .txt and .md content, rejects unsupported types, and rejects oversized files', async () => {
    const txt = await request.post('/api/jobs/import-brief/preview').set(auth()).send({
      source_type: 'txt',
      filename: 'job-brief-sample.txt',
      content: SAMPLE_TXT
    });
    assert.equal(txt.status, 200);

    const md = await request.post('/api/jobs/import-brief/preview').set(auth()).send({
      source_type: 'markdown',
      filename: 'job-brief-sample.md',
      content: SAMPLE_MD
    });
    assert.equal(md.status, 200);

    const unsupported = await request.post('/api/jobs/import-brief/preview').set(auth()).send({
      filename: 'job-brief-sample.pdf',
      content: 'PDF export placeholder'
    });
    assert.equal(unsupported.status, 400);
    assert.match(unsupported.body.error, /Unsupported file type/i);

    const oversized = await request.post('/api/jobs/import-brief/preview').set(auth()).send({
      source_type: 'txt',
      filename: 'too-large.txt',
      content: 'A'.repeat((1024 * 1024) + 10)
    });
    assert.equal(oversized.status, 400);
    assert.match(oversized.body.error, /limited to 1MB/i);
  });

  test('ambiguous time creates warnings and timezone defaults or infers correctly', async () => {
    const ambiguous = await request.post('/api/jobs/import-brief/preview').set(auth()).send({
      source_type: 'pasted_text',
      content: [
        'Client: NSW Crane Hire',
        'Site: Sydney Olympic Park NSW',
        'Job:',
        'Shutdown lift on the northern gantry.',
        'Timing:',
        'Tuesday 21 May 2026'
      ].join('\n')
    });

    assert.equal(ambiguous.status, 200);
    assert.equal(ambiguous.body.extracted.timezone, 'Australia/Sydney');
    assert.equal(ambiguous.body.confidence.timezone, 'medium');
    assert.ok(ambiguous.body.warnings.some((warning) => /Date\/time could not be confidently extracted/i.test(warning)));
    assert.ok(ambiguous.body.warnings.some((warning) => /Timezone inferred from location/i.test(warning)));

    const defaulted = await request.post('/api/jobs/import-brief/preview').set(auth()).send({
      source_type: 'pasted_text',
      content: [
        'Client: Generic Lift Co',
        'Site: Industrial estate',
        'Job:',
        'General plant move.',
        'Timing:',
        'Friday 22 May 2026',
        'Start: 9:00 AM',
        'Finish: 11:00 AM'
      ].join('\n')
    });

    assert.equal(defaulted.status, 200);
    assert.equal(defaulted.body.extracted.timezone, 'Australia/Brisbane');
    assert.equal(defaulted.body.confidence.timezone, 'low');
    assert.ok(defaulted.body.warnings.some((warning) => /defaulted to Australia\/Brisbane/i.test(warning)));
  });

  test('preview maps combined role wording and role counts for coverage review', async () => {
    const res = await request.post('/api/jobs/import-brief/preview').set(auth()).send({
      source_type: 'pasted_text',
      content: [
        'Client: Coverage Test',
        'Site: Test Yard',
        'Required crew:',
        'Need dogman/rigger and 2 truck drivers. Electrical spotter and EWP operator also required.',
        'Timing:',
        'Friday 22 May 2026',
        'Start: 7:00 AM',
        'Finish: 3:00 PM'
      ].join('\n')
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.extracted.required_roles.includes('dogman'));
    assert.ok(res.body.extracted.required_roles.includes('rigger'));
    assert.ok(res.body.extracted.required_roles.includes('truck_driver'));
    assert.ok(res.body.extracted.required_roles.includes('electrical_spotter'));
    assert.ok(res.body.extracted.required_roles.includes('ewp_operator'));

    const byRole = Object.fromEntries(res.body.extracted.role_requirements.map((item) => [item.role_key, item]));
    assert.equal(byRole.truck_driver.required_count, 2);
    assert.equal(byRole.truck_driver.requires_distinct_worker, false);
    assert.match(byRole.dogman.notes, /combined-role/i);
    assert.ok(res.body.warnings.some((warning) => /Dogman\/Rigger combined wording/i.test(warning)));
  });

  test('create-job-from-import uses edited fields, does not auto-allocate, appears in jobs and schedule, and supports SmartRank', async () => {
    const workerId = seedWorker(db, companyId, {
      name: 'Import Ready Operator',
      email: 'import-ready@example.com',
      crane_classes: ['Franna']
    });
    seedCredential(db, workerId, companyId, { type: 'high_risk_licence_crane' });
    seedCredential(db, workerId, companyId, { type: 'high_risk_licence_dogging' });
    seedCredential(db, workerId, companyId, { type: 'high_risk_licence_rigging' });
    seedCredential(db, workerId, companyId, { type: 'white_card' });

    const preview = await request.post('/api/jobs/import-brief/preview').set(auth()).send({
      source_type: 'txt',
      filename: 'job-brief-sample.txt',
      content: SAMPLE_TXT
    });
    assert.equal(preview.status, 200);

    const created = await request.post(`/api/jobs/import-brief/${preview.body.import_id}/create-job`).set(auth()).send({
      ...preview.body.extracted,
      site_name: 'Hemmant Rooftop Plant Lift',
      schedule_status: 'planned'
    });

    assert.equal(created.status, 201);
    assert.equal(created.body.site_name, 'Hemmant Rooftop Plant Lift');
    assert.equal(created.body.site_location, '42 Industrial Avenue, Hemmant QLD');
    assert.equal(created.body.job_description, 'Install mechanical plant onto rooftop platform.');
    assert.equal(created.body.contact_name, 'Mark Stevens');
    assert.equal(created.body.contact_phone, '0412 345 678');
    assert.equal(created.body.schedule.timezone, 'Australia/Brisbane');
    assert.equal(created.body.schedule.has_schedule, true);

    const list = await request.get('/api/jobs').set(auth());
    assert.equal(list.status, 200);
    assert.ok(list.body.some((job) => job.id === created.body.id));

    const schedule = await request
      .get('/api/schedule?start=2026-05-18&end=2026-05-24&timezone=Australia/Brisbane')
      .set(auth());
    assert.equal(schedule.status, 200);
    assert.ok(schedule.body.jobs.some((job) => job.id === created.body.id));

    const allocations = await request.get(`/api/jobs/${created.body.id}/allocations`).set(auth());
    assert.equal(allocations.status, 200);
    assert.equal(allocations.body.length, 0);

    const smartrank = await request.get(`/api/jobs/${created.body.id}/smartrank`).set(auth());
    assert.equal(smartrank.status, 200);
    assert.ok(smartrank.body.ranked.some((entry) => entry.worker.id === workerId));
  });

  test('audit events are created and imports are company-scoped', async () => {
    const preview = await request.post('/api/jobs/import-brief/preview').set(auth()).send({
      source_type: 'pasted_text',
      content: SAMPLE_TXT
    });
    assert.equal(preview.status, 200);

    const created = await request.post(`/api/jobs/import-brief/${preview.body.import_id}/create-job`).set(auth()).send({
      ...preview.body.extracted,
      schedule_status: 'planned'
    });
    assert.equal(created.status, 201);

    const audit = await request.get('/api/audit-events?limit=100').set(auth());
    assert.equal(audit.status, 200);
    const eventTypes = audit.body.events.map((event) => event.event_type);
    assert.ok(eventTypes.includes('job_brief_import_previewed'));
    assert.ok(eventTypes.includes('job_created_from_brief'));

    const crossCompany = await request.post(`/api/jobs/import-brief/${preview.body.import_id}/create-job`).set(auth(otherToken)).send({
      ...preview.body.extracted,
      schedule_status: 'planned'
    });
    assert.equal(crossCompany.status, 404);
  });

  test('legacy persisted databases migrate job import fields safely on startup', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'liftiq-legacy-import-'));
    const legacyPath = path.join(tempDir, 'legacy.db');
    const legacyDb = new Database(legacyPath);

    legacyDb.exec(`
      CREATE TABLE companies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        locations TEXT NOT NULL DEFAULT '[]',
        operating_regions TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'pilot',
        pilot_start_date TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_login_at TEXT
      );
      CREATE TABLE workers (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        employment_type TEXT NOT NULL,
        crane_classes TEXT NOT NULL DEFAULT '[]',
        usual_depot TEXT,
        contact_number TEXT,
        status TEXT NOT NULL DEFAULT 'available',
        availability_note TEXT,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE jobs (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        client_name TEXT NOT NULL,
        site_name TEXT NOT NULL,
        date TEXT NOT NULL,
        shift_start_time TEXT,
        shift_type TEXT NOT NULL,
        estimated_duration_hours REAL,
        crane_class_required TEXT,
        task_tags TEXT NOT NULL DEFAULT '[]',
        crew_roles_required TEXT NOT NULL DEFAULT '[]',
        required_credentials TEXT NOT NULL DEFAULT '[]',
        site_conditions TEXT NOT NULL DEFAULT '[]',
        lift_risk_level TEXT NOT NULL DEFAULT 'routine',
        travel_required INTEGER NOT NULL DEFAULT 0,
        travel_hours_estimated REAL DEFAULT 0,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        created_by_user_id TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE allocations (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        worker_id TEXT NOT NULL,
        company_id TEXT NOT NULL,
        allocated_by_user_id TEXT NOT NULL,
        smartrank_position INTEGER NOT NULL,
        smartrank_score REAL NOT NULL,
        smartrank_snapshot TEXT NOT NULL,
        active_warnings TEXT NOT NULL DEFAULT '[]',
        active_blocks_on_others TEXT NOT NULL DEFAULT '[]',
        override_reason TEXT,
        status TEXT NOT NULL DEFAULT 'confirmed',
        allocated_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE audit_events (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        user_id TEXT,
        worker_id TEXT,
        job_id TEXT,
        allocation_id TEXT,
        payload TEXT NOT NULL DEFAULT '{}',
        timestamp TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    legacyDb.close();

    db.close();
    db = null;
    setDb(null);
    process.env.DB_PATH = legacyPath;

    let migratedDb;
    try {
      migratedDb = getDb();
      const jobColumns = migratedDb.prepare(`PRAGMA table_info(jobs)`).all().map((column) => column.name);
      const importTables = migratedDb.prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table' AND name = 'job_imports'
      `).all().map((row) => row.name);
      const auditRow = migratedDb.prepare(`
        SELECT sql
        FROM sqlite_master
        WHERE type = 'table' AND name = 'audit_events'
      `).get();

      assert.ok(jobColumns.includes('contact_name'));
      assert.ok(jobColumns.includes('job_description'));
      assert.ok(jobColumns.includes('risk_notes'));
      assert.ok(jobColumns.includes('source_note'));
      assert.deepEqual(importTables, ['job_imports']);
      assert.match(auditRow.sql, /job_brief_import_previewed/);
      assert.match(auditRow.sql, /job_created_from_brief/);
    } finally {
      if (migratedDb) migratedDb.close();
      setDb(null);
      delete process.env.DB_PATH;
      rmTempDirWithRetry(tempDir);
    }
  });
});
