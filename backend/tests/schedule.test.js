'use strict';

const { describe, test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');

const { getDb, setDb } = require('../src/db');
const { signToken } = require('../src/middleware/auth');
const {
  localDateTimeToUtcIso
} = require('../src/services/timezone');
const {
  createTestDb,
  seedAllocation,
  seedCompanyAndUser,
  seedJob,
  seedWorker
} = require('./helpers/db');

let db;
let app;
let companyId;
let userId;
let token;
let request;

function auth() {
  return { Authorization: `Bearer ${token}` };
}

function scheduledFields(date, startTime, endTime, timeZone, scheduleStatus = 'planned') {
  return {
    date,
    shift_start_time: startTime,
    scheduled_start_at_utc: localDateTimeToUtcIso(date, startTime, timeZone),
    scheduled_end_at_utc: localDateTimeToUtcIso(date, endTime, timeZone),
    job_timezone: timeZone,
    scheduled_start_local: `${date} ${startTime}`,
    scheduled_end_local: `${date} ${endTime}`,
    schedule_status: scheduleStatus
  };
}

beforeEach(() => {
  db = createTestDb();
  setDb(db);
  app = require('../src/app');
  ({ companyId, userId } = seedCompanyAndUser(db, { timezone: 'Australia/Brisbane' }));
  token = signToken({
    id: userId,
    company_id: companyId,
    role: 'admin',
    name: 'Test Admin'
  });
  request = supertest(app);
});

afterEach(() => {
  if (db) {
    db.close();
    db = null;
  }
  setDb(null);
});

describe('Scheduled allocations and timezone-aware dispatch calendar', () => {
  test('valid IANA timezone is accepted on job creation', async () => {
    const res = await request.post('/api/jobs').set(auth()).send({
      client_name: 'Timezone Client',
      site_name: 'Timezone Site',
      date: '2026-06-10',
      shift_type: 'day',
      shift_start_time: '08:00',
      scheduled_end_time: '12:00',
      job_timezone: 'Australia/Brisbane',
      schedule_status: 'planned'
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.job_timezone, 'Australia/Brisbane');
    assert.equal(res.body.schedule.timezone, 'Australia/Brisbane');
    assert.equal(res.body.schedule.status, 'planned');
  });

  test('invalid timezone is rejected', async () => {
    const res = await request.post('/api/jobs').set(auth()).send({
      client_name: 'Bad TZ Client',
      site_name: 'Bad TZ Site',
      date: '2026-06-10',
      shift_type: 'day',
      shift_start_time: '08:00',
      scheduled_end_time: '12:00',
      job_timezone: 'Mars/Olympus',
      schedule_status: 'planned'
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'job_timezone must be a valid IANA timezone');
  });

  test('Brisbane local time converts to UTC correctly', () => {
    assert.equal(
      localDateTimeToUtcIso('2026-06-10', '08:00', 'Australia/Brisbane'),
      '2026-06-09T22:00:00.000Z'
    );
  });

  test('Sydney daylight-saving-sensitive conversion stays correct', () => {
    assert.equal(
      localDateTimeToUtcIso('2026-01-15', '09:00', 'Australia/Sydney'),
      '2026-01-14T22:00:00.000Z'
    );
  });

  test('job API response includes timezone and local display data', async () => {
    const res = await request.post('/api/jobs').set(auth()).send({
      client_name: 'Display Client',
      site_name: 'Display Site',
      date: '2026-06-11',
      shift_type: 'day',
      shift_start_time: '06:30',
      scheduled_end_time: '09:30',
      job_timezone: 'Australia/Brisbane',
      schedule_status: 'confirmed'
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.schedule.has_schedule, true);
    assert.equal(res.body.schedule.scheduled_start_local, '2026-06-11 06:30');
    assert.equal(res.body.schedule.display_timezone, 'Australia/Brisbane');
    assert.match(res.body.schedule.display_range, /Australia\/Brisbane/);
  });

  test('draft job can exist without a schedule window', async () => {
    const res = await request.post('/api/jobs').set(auth()).send({
      client_name: 'Draft Client',
      site_name: 'Draft Site',
      shift_type: 'day',
      schedule_status: 'draft'
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.schedule.status, 'draft');
    assert.equal(res.body.schedule.has_schedule, false);
  });

  test('planned jobs require start and end times', async () => {
    const res = await request.post('/api/jobs').set(auth()).send({
      client_name: 'Planned Client',
      site_name: 'Planned Site',
      date: '2026-06-12',
      shift_type: 'day',
      shift_start_time: '07:00',
      schedule_status: 'planned',
      job_timezone: 'Australia/Brisbane'
    });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /planned or confirmed jobs require/i);
  });

  test('end time before start time is rejected', async () => {
    const res = await request.post('/api/jobs').set(auth()).send({
      client_name: 'Backwards Client',
      site_name: 'Backwards Site',
      date: '2026-06-12',
      shift_type: 'day',
      shift_start_time: '14:00',
      scheduled_end_time: '10:00',
      job_timezone: 'Australia/Brisbane',
      schedule_status: 'planned'
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'scheduled_end_time must be after scheduled_start_time');
  });

  test('job update creates a schedule-change audit event', async () => {
    const jobId = seedJob(db, companyId, userId, {
      client_name: 'Audit Client',
      site_name: 'Audit Site',
      date: '2026-06-13',
      shift_type: 'day',
      schedule_status: 'draft'
    });

    const res = await request.patch(`/api/jobs/${jobId}`).set(auth()).send({
      date: '2026-06-13',
      shift_start_time: '08:00',
      scheduled_end_time: '12:00',
      job_timezone: 'Australia/Brisbane',
      schedule_status: 'planned'
    });

    assert.equal(res.status, 200);
    const event = db.prepare(`
      SELECT *
      FROM audit_events
      WHERE company_id = ? AND job_id = ? AND event_type = 'job_schedule_changed'
    `).get(companyId, jobId);
    assert.ok(event);
  });

  test('worker with overlapping confirmed allocation is hard-blocked in SmartRank', async () => {
    const workerId = seedWorker(db, companyId, { email: 'confirmed-conflict@example.com' });
    const existingJobId = seedJob(db, companyId, userId, {
      client_name: 'Existing Client',
      site_name: 'Existing Site',
      ...scheduledFields('2026-06-16', '08:00', '12:00', 'Australia/Brisbane', 'confirmed')
    });
    seedAllocation(db, companyId, existingJobId, workerId, userId, {
      allocation_start_at_utc: localDateTimeToUtcIso('2026-06-16', '08:00', 'Australia/Brisbane'),
      allocation_end_at_utc: localDateTimeToUtcIso('2026-06-16', '12:00', 'Australia/Brisbane'),
      allocation_timezone: 'Australia/Brisbane',
      allocation_status: 'confirmed'
    });

    const targetJobId = seedJob(db, companyId, userId, {
      client_name: 'Target Client',
      site_name: 'Target Site',
      ...scheduledFields('2026-06-16', '09:00', '11:00', 'Australia/Brisbane', 'confirmed')
    });

    const res = await request.get(`/api/jobs/${targetJobId}/smartrank`).set(auth());
    assert.equal(res.status, 200);
    const blocked = res.body.blocked.find((entry) => entry.worker.id === workerId);
    assert.ok(blocked);
    assert.ok(blocked.blocks.some((block) => block.type === 'schedule_conflict'));
  });

  test('worker with non-overlapping allocation remains eligible', async () => {
    const workerId = seedWorker(db, companyId, { email: 'non-overlap@example.com' });
    const existingJobId = seedJob(db, companyId, userId, {
      client_name: 'Existing Client',
      site_name: 'Existing Site',
      ...scheduledFields('2026-06-17', '05:00', '06:00', 'Australia/Brisbane', 'confirmed')
    });
    seedAllocation(db, companyId, existingJobId, workerId, userId, {
      allocation_start_at_utc: localDateTimeToUtcIso('2026-06-17', '05:00', 'Australia/Brisbane'),
      allocation_end_at_utc: localDateTimeToUtcIso('2026-06-17', '06:00', 'Australia/Brisbane'),
      allocation_timezone: 'Australia/Brisbane',
      allocation_status: 'confirmed'
    });

    const targetJobId = seedJob(db, companyId, userId, {
      client_name: 'Target Client',
      site_name: 'Target Site',
      ...scheduledFields('2026-06-17', '09:00', '11:00', 'Australia/Brisbane', 'confirmed')
    });

    const res = await request.get(`/api/jobs/${targetJobId}/smartrank`).set(auth());
    assert.equal(res.status, 200);
    assert.ok(res.body.ranked.some((entry) => entry.worker.id === workerId));
  });

  test('cancelled allocations do not block later jobs', async () => {
    const workerId = seedWorker(db, companyId, { email: 'cancelled-conflict@example.com' });
    const existingJobId = seedJob(db, companyId, userId, {
      client_name: 'Existing Client',
      site_name: 'Existing Site',
      ...scheduledFields('2026-06-18', '08:00', '10:00', 'Australia/Brisbane', 'cancelled')
    });
    seedAllocation(db, companyId, existingJobId, workerId, userId, {
      allocation_start_at_utc: localDateTimeToUtcIso('2026-06-18', '08:00', 'Australia/Brisbane'),
      allocation_end_at_utc: localDateTimeToUtcIso('2026-06-18', '10:00', 'Australia/Brisbane'),
      allocation_timezone: 'Australia/Brisbane',
      allocation_status: 'cancelled'
    });

    const targetJobId = seedJob(db, companyId, userId, {
      client_name: 'Target Client',
      site_name: 'Target Site',
      ...scheduledFields('2026-06-18', '08:30', '09:30', 'Australia/Brisbane', 'planned')
    });

    const res = await request.get(`/api/jobs/${targetJobId}/smartrank`).set(auth());
    assert.equal(res.status, 200);
    assert.ok(res.body.ranked.some((entry) => entry.worker.id === workerId));
  });

  test('schedule conflicts use UTC overlap logic across timezones', async () => {
    const workerId = seedWorker(db, companyId, { email: 'cross-timezone@example.com' });
    const existingJobId = seedJob(db, companyId, userId, {
      client_name: 'Sydney Client',
      site_name: 'Sydney Site',
      ...scheduledFields('2026-01-15', '09:00', '11:00', 'Australia/Sydney', 'confirmed')
    });
    seedAllocation(db, companyId, existingJobId, workerId, userId, {
      allocation_start_at_utc: localDateTimeToUtcIso('2026-01-15', '09:00', 'Australia/Sydney'),
      allocation_end_at_utc: localDateTimeToUtcIso('2026-01-15', '11:00', 'Australia/Sydney'),
      allocation_timezone: 'Australia/Sydney',
      allocation_status: 'confirmed'
    });

    const targetJobId = seedJob(db, companyId, userId, {
      client_name: 'Brisbane Client',
      site_name: 'Brisbane Site',
      ...scheduledFields('2026-01-15', '08:30', '10:30', 'Australia/Brisbane', 'planned')
    });

    const res = await request.get(`/api/jobs/${targetJobId}/smartrank`).set(auth());
    assert.equal(res.status, 200);
    const blocked = res.body.blocked.find((entry) => entry.worker.id === workerId);
    assert.ok(blocked, 'Worker should be blocked via UTC overlap even across timezones');
  });

  test('SmartRank warning explains planned overlap conflict', async () => {
    const workerId = seedWorker(db, companyId, { email: 'planned-warning@example.com' });
    const existingJobId = seedJob(db, companyId, userId, {
      client_name: 'Planned Client',
      site_name: 'Planned Site',
      ...scheduledFields('2026-06-19', '08:00', '10:00', 'Australia/Brisbane', 'planned')
    });
    seedAllocation(db, companyId, existingJobId, workerId, userId, {
      allocation_start_at_utc: localDateTimeToUtcIso('2026-06-19', '08:00', 'Australia/Brisbane'),
      allocation_end_at_utc: localDateTimeToUtcIso('2026-06-19', '10:00', 'Australia/Brisbane'),
      allocation_timezone: 'Australia/Brisbane',
      allocation_status: 'planned'
    });

    const targetJobId = seedJob(db, companyId, userId, {
      client_name: 'Target Client',
      site_name: 'Target Site',
      ...scheduledFields('2026-06-19', '09:00', '11:00', 'Australia/Brisbane', 'planned')
    });

    const res = await request.get(`/api/jobs/${targetJobId}/smartrank`).set(auth());
    assert.equal(res.status, 200);
    const ranked = res.body.ranked.find((entry) => entry.worker.id === workerId);
    assert.ok(ranked);
    assert.ok(ranked.warnings.some((warning) => warning.type === 'schedule_conflict_warning'));
  });

  test('schedule API returns jobs and allocations with timezone-correct display fields', async () => {
    const workerId = seedWorker(db, companyId, { email: 'schedule-view@example.com' });
    const jobId = seedJob(db, companyId, userId, {
      client_name: 'Calendar Client',
      site_name: 'Calendar Site',
      ...scheduledFields('2026-06-20', '08:00', '11:00', 'Australia/Brisbane', 'confirmed')
    });
    seedAllocation(db, companyId, jobId, workerId, userId, {
      allocation_start_at_utc: localDateTimeToUtcIso('2026-06-20', '08:00', 'Australia/Brisbane'),
      allocation_end_at_utc: localDateTimeToUtcIso('2026-06-20', '11:00', 'Australia/Brisbane'),
      allocation_timezone: 'Australia/Brisbane',
      allocation_status: 'confirmed'
    });

    const res = await request
      .get('/api/schedule?start=2026-06-15&end=2026-06-21&timezone=Australia/Sydney')
      .set(auth());

    assert.equal(res.status, 200);
    assert.equal(res.body.timezone, 'Australia/Sydney');
    assert.ok(res.body.jobs.some((job) => job.id === jobId));
    assert.ok(res.body.allocations.some((allocation) => allocation.job_id === jobId));
    assert.equal(res.body.jobs.find((job) => job.id === jobId).schedule.display_timezone, 'Australia/Sydney');
  });

  test('worker schedule endpoint returns upcoming allocations', async () => {
    const workerId = seedWorker(db, companyId, { email: 'worker-schedule@example.com' });
    const jobId = seedJob(db, companyId, userId, {
      client_name: 'Worker Schedule Client',
      site_name: 'Worker Schedule Site',
      ...scheduledFields('2026-06-21', '07:00', '09:00', 'Australia/Brisbane', 'planned')
    });
    seedAllocation(db, companyId, jobId, workerId, userId, {
      allocation_start_at_utc: localDateTimeToUtcIso('2026-06-21', '07:00', 'Australia/Brisbane'),
      allocation_end_at_utc: localDateTimeToUtcIso('2026-06-21', '09:00', 'Australia/Brisbane'),
      allocation_timezone: 'Australia/Brisbane',
      allocation_status: 'planned'
    });

    const res = await request
      .get(`/api/workers/${workerId}/schedule?start=2026-06-15&end=2026-06-21`)
      .set(auth());

    assert.equal(res.status, 200);
    assert.equal(res.body.worker.id, workerId);
    assert.equal(res.body.allocations.length, 1);
  });

  test('allocation snapshots scheduled time and timezone and audit records schedule context', async () => {
    const workerId = seedWorker(db, companyId, { email: 'snapshot-schedule@example.com' });
    const jobId = seedJob(db, companyId, userId, {
      client_name: 'Snapshot Client',
      site_name: 'Snapshot Site',
      ...scheduledFields('2026-06-22', '08:00', '10:00', 'Australia/Brisbane', 'confirmed')
    });

    const res = await request.post(`/api/jobs/${jobId}/allocations`).set(auth()).send({
      worker_id: workerId
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.schedule.timezone, 'Australia/Brisbane');
    assert.equal(res.body.schedule.status, 'confirmed');
    assert.equal(res.body.allocation_start_at_utc, '2026-06-21T22:00:00.000Z');

    const auditEvent = db.prepare(`
      SELECT payload
      FROM audit_events
      WHERE company_id = ? AND job_id = ? AND event_type = 'allocation_confirmed'
      ORDER BY timestamp DESC
      LIMIT 1
    `).get(companyId, jobId);
    assert.ok(auditEvent);
    const payload = JSON.parse(auditEvent.payload);
    assert.equal(payload.schedule.timezone, 'Australia/Brisbane');
    assert.equal(payload.schedule.status, 'confirmed');
  });

  test('allocation rejects a worker with a hard schedule conflict', async () => {
    const workerId = seedWorker(db, companyId, { email: 'reject-overlap@example.com' });
    const existingJobId = seedJob(db, companyId, userId, {
      client_name: 'Existing Client',
      site_name: 'Existing Site',
      ...scheduledFields('2026-06-23', '08:00', '10:00', 'Australia/Brisbane', 'confirmed')
    });
    seedAllocation(db, companyId, existingJobId, workerId, userId, {
      allocation_start_at_utc: localDateTimeToUtcIso('2026-06-23', '08:00', 'Australia/Brisbane'),
      allocation_end_at_utc: localDateTimeToUtcIso('2026-06-23', '10:00', 'Australia/Brisbane'),
      allocation_timezone: 'Australia/Brisbane',
      allocation_status: 'confirmed'
    });

    const targetJobId = seedJob(db, companyId, userId, {
      client_name: 'Target Client',
      site_name: 'Target Site',
      ...scheduledFields('2026-06-23', '09:00', '11:00', 'Australia/Brisbane', 'confirmed')
    });

    const res = await request.post(`/api/jobs/${targetJobId}/allocations`).set(auth()).send({
      worker_id: workerId
    });

    assert.equal(res.status, 422);
    assert.ok(res.body.blocks.some((block) => block.type === 'schedule_conflict'));
  });

  test('legacy Fly SQLite databases migrate schedule columns before schedule indexes are created', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'liftiq-legacy-schedule-'));
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
      const allocationColumns = migratedDb.prepare(`PRAGMA table_info(allocations)`).all().map((column) => column.name);
      const jobIndexes = migratedDb.prepare(`PRAGMA index_list(jobs)`).all().map((index) => index.name);
      const allocationIndexes = migratedDb.prepare(`PRAGMA index_list(allocations)`).all().map((index) => index.name);

      assert.ok(jobColumns.includes('scheduled_start_at_utc'));
      assert.ok(jobColumns.includes('scheduled_end_at_utc'));
      assert.ok(jobColumns.includes('job_timezone'));
      assert.ok(jobColumns.includes('schedule_status'));
      assert.ok(allocationColumns.includes('allocation_start_at_utc'));
      assert.ok(allocationColumns.includes('allocation_end_at_utc'));
      assert.ok(allocationColumns.includes('allocation_timezone'));
      assert.ok(allocationColumns.includes('allocation_status'));
      assert.ok(jobIndexes.includes('idx_jobs_company_schedule_start'));
      assert.ok(allocationIndexes.includes('idx_allocations_worker_schedule'));
    } finally {
      if (migratedDb) migratedDb.close();
      setDb(null);
      delete process.env.DB_PATH;
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
