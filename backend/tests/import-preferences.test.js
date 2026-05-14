'use strict';

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const supertest = require('supertest');

const {
  createTestDb,
  seedCompanyAndUser,
  seedWorker,
  seedCredential,
  seedPreference
} = require('./helpers/db');
const { setDb } = require('../src/db');
const { signToken } = require('../src/middleware/auth');

const SAMPLE_CSV = fs.readFileSync(
  path.join(__dirname, '../samples/employee-import-sample.csv'),
  'utf8'
);
const SAMPLE_TSV = fs.readFileSync(
  path.join(__dirname, '../samples/employee-import-sample.tsv'),
  'utf8'
);

let db;
let app;
let request;
let companyId;
let userId;
let token;
let otherCompanyId;
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
    role: 'admin'
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
  db.close();
});

describe('Worker import, task preferences, and adaptive learning', () => {
  test('imports valid CSV rows from the sample file', async () => {
    const preview = await request.post('/api/workers/import').set(auth()).send({
      content: SAMPLE_CSV,
      mode: 'preview'
    });
    assert.equal(preview.status, 200);
    assert.equal(preview.body.delimiter, 'csv');
    assert.equal(preview.body.summary.total_rows, 10);
    assert.equal(preview.body.summary.ready_to_create, 10);

    const imported = await request.post('/api/workers/import').set(auth()).send({
      content: SAMPLE_CSV,
      mode: 'import'
    });
    assert.equal(imported.status, 201);
    assert.equal(imported.body.summary.workers_created, 10);
    assert.equal(imported.body.summary.workers_skipped, 0);
    assert.equal(imported.body.summary.rows_with_errors, 0);
    assert.ok(imported.body.summary.credentials_created >= 10);
    assert.ok(imported.body.summary.preferences_created >= 10);

    const workers = await request.get('/api/workers').set(auth());
    assert.equal(workers.status, 200);
    assert.equal(workers.body.length, 10);

    const jack = workers.body.find((worker) => worker.email === 'jack.thompson@example.com');
    assert.ok(jack, 'Jack Thompson should be present after sample CSV import');

    const credentials = await request.get(`/api/workers/${jack.id}/credentials`).set(auth());
    assert.equal(credentials.status, 200);
    assert.equal(credentials.body.length, 2);

    const preferences = await request.get(`/api/workers/${jack.id}/preferences`).set(auth());
    assert.equal(preferences.status, 200);
    assert.ok(
      preferences.body.some((preference) => preference.source === 'imported' && preference.task_tag === 'franna'),
      'Imported franna preference should be stored'
    );
  });

  test('imports valid TSV rows from the sample file for copy-paste onboarding', async () => {
    const preview = await request.post('/api/workers/import').set(auth()).send({
      content: SAMPLE_TSV,
      mode: 'preview'
    });
    assert.equal(preview.status, 200);
    assert.equal(preview.body.delimiter, 'tsv');
    assert.equal(preview.body.summary.total_rows, 10);

    const imported = await request.post('/api/workers/import').set(auth()).send({
      content: SAMPLE_TSV,
      mode: 'import'
    });
    assert.equal(imported.status, 201);
    assert.equal(imported.body.summary.workers_created, 10);

    const workers = await request.get('/api/workers').set(auth());
    assert.equal(workers.status, 200);
    assert.equal(workers.body.length, 10);
  });

  test('reports missing required fields and duplicate email rows clearly', async () => {
    const existingWorker = await request.post('/api/workers').set(auth()).send({
      name: 'Existing Worker',
      email: 'jack.thompson@example.com',
      role: 'crane_operator',
      employment_type: 'permanent'
    });
    assert.equal(existingWorker.status, 201);

    const mixedContent = [
      'first_name,last_name,email,phone,role,employment_type,base_location,availability_status,crane_classes,credential_types,credential_expiry_dates,preferred_task_tags,task_star_ratings,notes',
      'Missing,,missing@example.com,0400000011,Crane Operator,full_time,Brisbane,available,Franna,HRWL-C2,2027-06-30,franna,franna:4,Missing last name row',
      'Jack,Duplicate,jack.thompson@example.com,0400000012,Crane Operator,full_time,Brisbane,available,Franna,HRWL-C2,2027-06-30,franna,franna:5,Duplicate email row'
    ].join('\n');

    const preview = await request.post('/api/workers/import').set(auth()).send({
      content: mixedContent,
      mode: 'preview'
    });
    assert.equal(preview.status, 200);
    assert.equal(preview.body.summary.total_rows, 2);
    assert.equal(preview.body.summary.skipped, 1);
    assert.equal(preview.body.summary.rows_with_errors, 1);
    assert.match(preview.body.rows[0].errors.join(' '), /Last name is required/);
    assert.match(preview.body.rows[1].warnings.join(' '), /already exists/i);

    const imported = await request.post('/api/workers/import').set(auth()).send({
      content: mixedContent,
      mode: 'import'
    });
    assert.equal(imported.status, 201);
    assert.equal(imported.body.summary.workers_created, 0);
    assert.equal(imported.body.summary.workers_skipped, 1);
    assert.equal(imported.body.summary.rows_with_errors, 1);
  });

  test('imports worker while warning on mismatched credential expiry columns', async () => {
    const mismatchedContent = [
      'first_name,last_name,email,phone,role,employment_type,base_location,availability_status,crane_classes,credential_types,credential_expiry_dates,preferred_task_tags,task_star_ratings,notes',
      'Mia,Signals,mia.signals@example.com,0400000099,Crane Operator,full_time,Brisbane,available,Franna,HRWL-C2|White Card,2027-06-30,shutdown,shutdown:4,Mismatched credential demo'
    ].join('\n');

    const preview = await request.post('/api/workers/import').set(auth()).send({
      content: mismatchedContent,
      mode: 'preview'
    });
    assert.equal(preview.status, 200);
    assert.match(preview.body.rows[0].warnings.join(' '), /did not align/i);

    const imported = await request.post('/api/workers/import').set(auth()).send({
      content: mismatchedContent,
      mode: 'import'
    });
    assert.equal(imported.status, 201);
    assert.equal(imported.body.summary.workers_created, 1);
    assert.equal(imported.body.summary.credentials_created, 0);

    const workers = await request.get('/api/workers').set(auth());
    const mia = workers.body.find((worker) => worker.email === 'mia.signals@example.com');
    assert.ok(mia, 'Worker should still be created when credentials are skipped');

    const credentials = await request.get(`/api/workers/${mia.id}/credentials`).set(auth());
    assert.equal(credentials.status, 200);
    assert.equal(credentials.body.length, 0);
  });

  test('creates manual task preferences, rejects invalid ratings, and enforces company scope', async () => {
    const workerId = seedWorker(db, companyId, { name: 'Preference Worker', email: 'prefs@example.com' });
    const otherWorkerId = seedWorker(db, otherCompanyId, {
      name: 'Other Company Worker',
      email: 'other-worker@example.com'
    });

    const created = await request.post(`/api/workers/${workerId}/preferences`).set(auth()).send({
      task_tag: 'tower_crane',
      rating: 5,
      notes: 'Manual pilot preference'
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.source, 'manual');
    assert.equal(created.body.task_tag, 'tower_crane');
    assert.equal(created.body.rating, 5);

    const listed = await request.get(`/api/workers/${workerId}/preferences`).set(auth());
    assert.equal(listed.status, 200);
    assert.equal(listed.body.length, 1);
    assert.equal(listed.body[0].source, 'manual');

    const invalid = await request.post(`/api/workers/${workerId}/preferences`).set(auth()).send({
      task_tag: 'shutdown',
      rating: 6
    });
    assert.equal(invalid.status, 400);
    assert.match(invalid.body.error, /1 to 5/);

    const crossCompanyRead = await request.get(`/api/workers/${otherWorkerId}/preferences`).set(auth());
    assert.equal(crossCompanyRead.status, 404);

    const crossCompanyWrite = await request.post(`/api/workers/${otherWorkerId}/preferences`).set(auth()).send({
      task_tag: 'shutdown',
      rating: 4
    });
    assert.equal(crossCompanyWrite.status, 404);
  });

  test('confirmed lower-ranked allocations create and update learned preferences with audit trail', async () => {
    const topWorkerId = seedWorker(db, companyId, {
      name: 'Top Ranked',
      email: 'top@example.com',
      crane_classes: ['55T']
    });
    const overrideWorkerId = seedWorker(db, companyId, {
      name: 'Override Pick',
      email: 'override@example.com',
      crane_classes: []
    });
    seedCredential(db, topWorkerId, companyId);
    seedCredential(db, overrideWorkerId, companyId);

    const firstJob = await request.post('/api/jobs').set(auth()).send({
      client_name: 'Tower Projects',
      site_name: 'Alpha Site',
      site_location: 'Sydney',
      date: '2026-07-01',
      shift_start_time: '07:00',
      shift_type: 'day',
      crane_class_required: '55T',
      task_tags: ['tower_crane'],
      crew_roles_required: ['crane_operator'],
      required_credentials: ['high_risk_licence_crane'],
      lift_risk_level: 'routine',
      travel_required: false
    });
    assert.equal(firstJob.status, 201);

    const noReason = await request.post(`/api/jobs/${firstJob.body.id}/allocations`).set(auth()).send({
      worker_id: overrideWorkerId
    });
    assert.equal(noReason.status, 422);
    assert.match(noReason.body.error, /not top-ranked/i);

    const firstAllocation = await request.post(`/api/jobs/${firstJob.body.id}/allocations`).set(auth()).send({
      worker_id: overrideWorkerId,
      override_reason: 'Dispatcher selected the trusted tower backup'
    });
    assert.equal(firstAllocation.status, 201);

    let preferences = await request.get(`/api/workers/${overrideWorkerId}/preferences`).set(auth());
    assert.equal(preferences.status, 200);
    let learned = preferences.body.find((preference) =>
      preference.source === 'learned' && preference.task_tag === 'tower_crane'
    );
    assert.ok(learned, 'Learned tower_crane preference should be created');
    assert.equal(learned.approval_count, 1);
    assert.equal(learned.override_selection_count, 1);
    assert.ok(learned.confidence >= 0.5);

    const secondJob = await request.post('/api/jobs').set(auth()).send({
      client_name: 'Tower Projects',
      site_name: 'Beta Site',
      site_location: 'Sydney',
      date: '2026-07-02',
      shift_start_time: '07:00',
      shift_type: 'day',
      crane_class_required: '55T',
      task_tags: ['tower_crane'],
      crew_roles_required: ['crane_operator'],
      required_credentials: ['high_risk_licence_crane'],
      lift_risk_level: 'routine',
      travel_required: false
    });
    assert.equal(secondJob.status, 201);

    const secondAllocation = await request.post(`/api/jobs/${secondJob.body.id}/allocations`).set(auth()).send({
      worker_id: overrideWorkerId,
      override_reason: 'Dispatcher selected the same operator again'
    });
    assert.equal(secondAllocation.status, 201);

    preferences = await request.get(`/api/workers/${overrideWorkerId}/preferences`).set(auth());
    learned = preferences.body.find((preference) =>
      preference.source === 'learned' && preference.task_tag === 'tower_crane'
    );
    assert.equal(learned.approval_count, 2);
    assert.equal(learned.override_selection_count, 2);
    assert.equal(learned.rating, 4);
    assert.ok(learned.confidence >= 0.8);

    const thirdJob = await request.post('/api/jobs').set(auth()).send({
      client_name: 'Tower Projects',
      site_name: 'Gamma Site',
      site_location: 'Sydney',
      date: '2026-07-03',
      shift_start_time: '07:00',
      shift_type: 'day',
      crane_class_required: '55T',
      task_tags: ['tower_crane'],
      crew_roles_required: ['crane_operator'],
      required_credentials: ['high_risk_licence_crane'],
      lift_risk_level: 'routine',
      travel_required: false
    });
    assert.equal(thirdJob.status, 201);

    const rankRes = await request.get(`/api/jobs/${thirdJob.body.id}/smartrank`).set(auth());
    assert.equal(rankRes.status, 200);
    const overrideEntry = rankRes.body.ranked.find((entry) => entry.worker.id === overrideWorkerId);
    assert.ok(overrideEntry, 'Override worker should appear in future SmartRank results');
    assert.ok(
      overrideEntry.preference_signals.some((signal) => signal.source === 'learned' && signal.task_tag === 'tower_crane'),
      'Learned signal should be visible in SmartRank results'
    );
    assert.match(overrideEntry.score_breakdown.task_preference.detail, /Learned allocation preference/i);

    const auditRes = await request.get('/api/audit-events?limit=200').set(auth());
    assert.equal(auditRes.status, 200);
    const eventTypes = auditRes.body.events.map((event) => event.event_type);
    assert.ok(eventTypes.includes('preference_signal_created'));
    assert.ok(eventTypes.includes('preference_signal_updated'));
    assert.ok(eventTypes.includes('learned_preference_applied'));
  });

  test('hard-blocked workers stay blocked even with a five-star preference', async () => {
    const blockedWorkerId = seedWorker(db, companyId, {
      name: 'Blocked Favourite',
      email: 'blocked@example.com',
      crane_classes: ['55T']
    });
    seedPreference(db, companyId, blockedWorkerId, {
      task_tag: 'tower_crane',
      rating: 5,
      source: 'manual'
    });

    const jobRes = await request.post('/api/jobs').set(auth()).send({
      client_name: 'Critical Lift Client',
      site_name: 'Delta Site',
      site_location: 'Sydney',
      date: '2026-07-10',
      shift_start_time: '07:00',
      shift_type: 'day',
      crane_class_required: '55T',
      task_tags: ['tower_crane'],
      crew_roles_required: ['crane_operator'],
      required_credentials: ['high_risk_licence_crane'],
      lift_risk_level: 'critical',
      travel_required: false
    });
    assert.equal(jobRes.status, 201);

    const rankRes = await request.get(`/api/jobs/${jobRes.body.id}/smartrank`).set(auth());
    assert.equal(rankRes.status, 200);
    assert.ok(rankRes.body.ranked.every((entry) => entry.worker.id !== blockedWorkerId));

    const blockedEntry = rankRes.body.blocked.find((entry) => entry.worker.id === blockedWorkerId);
    assert.ok(blockedEntry, 'Worker with a five-star preference should still be hard-blocked');
    assert.ok(blockedEntry.blocks.some((block) => block.type === 'credential_missing'));
  });
});
