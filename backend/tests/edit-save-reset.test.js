'use strict';

const { test, describe, before, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');
const { randomUUID } = require('node:crypto');

const {
  createTestDb,
  seedAllocation,
  seedCompanyAndUser,
  seedCredential,
  seedJob,
  seedPreference,
  seedWorker
} = require('./helpers/db');
const { setDb } = require('../src/db');
const { signToken } = require('../src/middleware/auth');

let db;
let app;
let request;
let company;
let token;

before(() => {
  app = require('../src/app');
});

beforeEach(() => {
  db = createTestDb();
  setDb(db);
  request = supertest(app);
  company = seedCompanyAndUser(db, {
    companyName: 'Edit Save Reset Company',
    email: 'edit-save-reset-admin@example.com',
    role: 'admin'
  });
  token = signToken({
    id: company.userId,
    company_id: company.companyId,
    role: 'admin',
    name: 'Edit Save Reset Admin'
  });
});

afterEach(() => {
  db.close();
});

function auth(useToken = token) {
  return { Authorization: `Bearer ${useToken}` };
}

function seedDispatcherUser(companyId) {
  const userId = randomUUID();
  db.prepare(`
    INSERT INTO users (id, company_id, name, email, password_hash, role, status)
    VALUES (?, ?, 'Dispatcher User', ?, 'not-used-in-token-tests', 'dispatcher', 'active')
  `).run(userId, companyId, `dispatcher-${userId}@example.com`);
  return {
    userId,
    token: signToken({
      id: userId,
      company_id: companyId,
      role: 'dispatcher',
      name: 'Dispatcher User'
    })
  };
}

function seedEnabledAsset(companyId) {
  const item = db.prepare(`
    SELECT id
    FROM requirement_catalogue_items
    WHERE is_active = 1 AND category IN ('equipment', 'transport')
    ORDER BY category, id
    LIMIT 1
  `).get();
  assert.ok(item, 'expected seeded equipment or transport catalogue item');
  db.prepare(`
    INSERT INTO company_catalogue_selections (company_id, catalogue_item_id, is_enabled)
    VALUES (?, ?, 1)
  `).run(companyId, item.id);
  const asset = db.prepare(`
    INSERT INTO company_assets (
      company_id, catalogue_item_id, asset_number, display_name, asset_status
    ) VALUES (?, ?, 'MC20-001', '20T Mobile Crane / MC20-001', 'active')
  `).run(companyId, item.id);
  return { catalogueItemId: item.id, assetId: asset.lastInsertRowid };
}

describe('job edit save behaviour', () => {
  test('PATCH /api/jobs/:id persists basic, schedule, requirement, and asset changes', async () => {
    const jobId = seedJob(db, company.companyId, company.userId, {
      client_name: 'Original Client',
      site_name: 'Original Site'
    });
    const { catalogueItemId, assetId } = seedEnabledAsset(company.companyId);

    const res = await request
      .patch(`/api/jobs/${jobId}`)
      .set(auth())
      .send({
        client_name: 'Updated Client',
        site_name: 'Updated Site',
        job_description: 'Updated lift and rigging description',
        date: '2026-06-15',
        shift_start_time: '08:00',
        scheduled_end_time: '14:00',
        job_timezone: 'Australia/Brisbane',
        schedule_status: 'planned',
        shift_type: 'day',
        task_tags: ['rigging', 'shutdown'],
        requirement_item_ids: [catalogueItemId],
        custom_requirements: [{ category: 'custom', label: 'Client induction' }],
        company_asset_ids: [assetId]
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.id, jobId);
    assert.equal(res.body.client_name, 'Updated Client');
    assert.equal(res.body.site_name, 'Updated Site');
    assert.equal(res.body.schedule.has_schedule, true);
    assert.equal(res.body.schedule.status, 'planned');
    assert.ok(res.body.structured_requirements.some((item) => item.catalogue_item_id === catalogueItemId));
    assert.ok(res.body.structured_requirements.some((item) => item.label === 'Client induction'));
    assert.equal(res.body.asset_assignments[0].asset.id, assetId);

    const persisted = await request.get(`/api/jobs/${jobId}`).set(auth());
    assert.equal(persisted.status, 200);
    assert.equal(persisted.body.job_description, 'Updated lift and rigging description');
    assert.equal(persisted.body.asset_assignments[0].asset.asset_number, 'MC20-001');

    const events = db.prepare(`
      SELECT event_type
      FROM audit_events
      WHERE company_id = ? AND job_id = ?
      ORDER BY timestamp ASC
    `).all(company.companyId, jobId).map((row) => row.event_type);
    assert.ok(events.includes('job_updated'));
    assert.ok(events.includes('job_schedule_changed'));
    assert.ok(events.includes('job_requirements_updated'));
    assert.ok(events.includes('job_asset_selected'));
  });

  test('job update rejects invalid schedule and does not persist it', async () => {
    const jobId = seedJob(db, company.companyId, company.userId, {
      client_name: 'Schedule Client',
      site_name: 'Schedule Site'
    });

    const res = await request
      .patch(`/api/jobs/${jobId}`)
      .set(auth())
      .send({
        date: '2026-06-15',
        shift_start_time: '15:00',
        scheduled_end_time: '14:00',
        job_timezone: 'Australia/Brisbane',
        schedule_status: 'planned',
        shift_type: 'day'
      });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /after scheduled_start_time/);
    const row = db.prepare(`SELECT scheduled_start_at_utc FROM jobs WHERE id = ?`).get(jobId);
    assert.equal(row.scheduled_start_at_utc, null);
  });

  test('job update is tenant-scoped', async () => {
    const other = seedCompanyAndUser(db, {
      companyId: randomUUID(),
      userId: randomUUID(),
      email: 'other-job-edit@example.com'
    });
    const otherJobId = seedJob(db, other.companyId, other.userId, {
      client_name: 'Other Tenant Client'
    });

    const res = await request
      .patch(`/api/jobs/${otherJobId}`)
      .set(auth())
      .send({ client_name: 'Cross Tenant Change' });

    assert.equal(res.status, 404);
    const row = db.prepare(`SELECT client_name FROM jobs WHERE id = ?`).get(otherJobId);
    assert.equal(row.client_name, 'Other Tenant Client');
  });
});

describe('worker edit save behaviour', () => {
  test('PATCH /api/workers/:id persists worker details and creates worker_updated audit', async () => {
    const workerId = seedWorker(db, company.companyId, {
      name: 'Before Update',
      email: 'before-update@example.com',
      role: 'crane_operator'
    });

    const res = await request
      .patch(`/api/workers/${workerId}`)
      .set(auth())
      .send({
        name: 'After Update',
        email: 'after-update@example.com',
        role: 'rigger',
        employment_type: 'contractor',
        status: 'unavailable',
        contact_number: '0400 000 111',
        usual_depot: 'Brisbane Yard',
        availability_note: 'Unavailable until Monday',
        notes: 'Updated from worker detail form',
        crane_classes: ['25T Articulated / Pick-and-Carry']
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.name, 'After Update');
    assert.equal(res.body.email, 'after-update@example.com');
    assert.equal(res.body.contact_number, '0400 000 111');
    assert.deepEqual(res.body.crane_classes, ['25T Articulated / Pick-and-Carry']);

    const persisted = await request.get(`/api/workers/${workerId}`).set(auth());
    assert.equal(persisted.body.name, 'After Update');

    const event = db.prepare(`
      SELECT payload
      FROM audit_events
      WHERE company_id = ? AND worker_id = ? AND event_type = 'worker_updated'
    `).get(company.companyId, workerId);
    assert.ok(event);
    assert.ok(JSON.parse(event.payload).changed_fields.includes('name'));
  });

  test('worker update can clear nullable fields and rejects duplicate email', async () => {
    seedWorker(db, company.companyId, { email: 'duplicate@example.com' });
    const workerId = seedWorker(db, company.companyId, { email: 'clearable@example.com' });
    db.prepare(`
      UPDATE workers
      SET contact_number = '0400 000 222', usual_depot = 'North Yard', notes = 'Initial'
      WHERE id = ?
    `).run(workerId);

    const duplicate = await request
      .patch(`/api/workers/${workerId}`)
      .set(auth())
      .send({ email: 'duplicate@example.com' });
    assert.equal(duplicate.status, 409);

    const cleared = await request
      .patch(`/api/workers/${workerId}`)
      .set(auth())
      .send({ email: null, contact_number: null, usual_depot: '', notes: '' });
    assert.equal(cleared.status, 200);
    assert.equal(cleared.body.email, null);
    assert.equal(cleared.body.contact_number, null);
    assert.equal(cleared.body.usual_depot, null);
    assert.equal(cleared.body.notes, null);
  });

  test('worker credential and manual preference updates are audited', async () => {
    const workerId = seedWorker(db, company.companyId, { name: 'Credential Worker' });
    const credentialId = seedCredential(db, workerId, company.companyId);
    const preferenceId = seedPreference(db, company.companyId, workerId, { task_tag: 'rigging', rating: 3 });

    const cred = await request
      .patch(`/api/workers/${workerId}/credentials/${credentialId}`)
      .set(auth())
      .send({ identifier: 'HRW-123', expiry_date: '2029-05-01', verified: true, notes: 'Verified by admin' });
    assert.equal(cred.status, 200);
    assert.equal(cred.body.identifier, 'HRW-123');

    const pref = await request
      .patch(`/api/workers/${workerId}/preferences/${preferenceId}`)
      .set(auth())
      .send({ rating: 5, notes: 'Preferred for shutdown work' });
    assert.equal(pref.status, 200);
    assert.equal(pref.body.rating, 5);

    const events = db.prepare(`
      SELECT event_type
      FROM audit_events
      WHERE company_id = ? AND worker_id = ?
    `).all(company.companyId, workerId).map((row) => row.event_type);
    assert.ok(events.includes('worker_credentials_updated'));
    assert.ok(events.includes('worker_preferences_updated'));
  });

  test('worker update is tenant-scoped and archived workers stay read-only', async () => {
    const other = seedCompanyAndUser(db, {
      companyId: randomUUID(),
      userId: randomUUID(),
      email: 'other-worker-edit@example.com'
    });
    const otherWorkerId = seedWorker(db, other.companyId, { name: 'Other Tenant Worker' });
    const archivedWorkerId = seedWorker(db, company.companyId, {
      name: 'Archived Worker',
      archivedAt: '2026-05-10T00:00:00.000Z',
      archivedByUserId: company.userId,
      status: 'inactive'
    });

    const crossTenant = await request
      .patch(`/api/workers/${otherWorkerId}`)
      .set(auth())
      .send({ name: 'Cross Tenant Change' });
    assert.equal(crossTenant.status, 404);

    const archived = await request
      .patch(`/api/workers/${archivedWorkerId}`)
      .set(auth())
      .send({ name: 'Should Not Persist' });
    assert.equal(archived.status, 409);
  });
});

describe('company data reset controls', () => {
  test('reset preview returns tenant-scoped counts', async () => {
    const workerId = seedWorker(db, company.companyId);
    seedJob(db, company.companyId, company.userId);
    seedCredential(db, workerId, company.companyId);
    const other = seedCompanyAndUser(db, {
      companyId: randomUUID(),
      userId: randomUUID(),
      email: 'other-reset-preview@example.com'
    });
    seedWorker(db, other.companyId);

    const res = await request
      .get('/api/company/reset-preview?scope=all')
      .set(auth());

    assert.equal(res.status, 200);
    assert.equal(res.body.counts.workers, 1);
    assert.equal(res.body.counts.jobs, 1);
    assert.equal(res.body.counts.credentials, 1);
    assert.equal(res.body.counts.users, 1);
  });

  test('clear jobs archives jobs, cancels allocations, and keeps workers', async () => {
    const workerId = seedWorker(db, company.companyId);
    const jobId = seedJob(db, company.companyId, company.userId);
    seedAllocation(db, company.companyId, jobId, workerId, company.userId);

    const res = await request
      .post('/api/company/reset')
      .set(auth())
      .send({ scope: 'jobs', confirmation: 'CLEAR JOBS' });

    assert.equal(res.status, 200);
    assert.equal(res.body.after_counts.jobs, 0);
    assert.equal(res.body.after_counts.workers, 1);
    assert.equal(res.body.after_counts.active_allocations, 0);

    const jobs = await request.get('/api/jobs').set(auth());
    assert.deepEqual(jobs.body, []);
    const workers = await request.get('/api/workers').set(auth());
    assert.equal(workers.body.length, 1);

    const archived = db.prepare(`SELECT archived_at, status FROM jobs WHERE id = ?`).get(jobId);
    assert.ok(archived.archived_at);
    assert.equal(archived.status, 'cancelled');
  });

  test('clear workers archives workers and keeps jobs unallocated', async () => {
    const workerId = seedWorker(db, company.companyId);
    const jobId = seedJob(db, company.companyId, company.userId);
    seedCredential(db, workerId, company.companyId);
    seedPreference(db, company.companyId, workerId);
    seedAllocation(db, company.companyId, jobId, workerId, company.userId);

    const res = await request
      .post('/api/company/reset')
      .set(auth())
      .send({ scope: 'workers', confirmation: 'CLEAR WORKERS' });

    assert.equal(res.status, 200);
    assert.equal(res.body.after_counts.workers, 0);
    assert.equal(res.body.after_counts.jobs, 1);
    assert.equal(res.body.after_counts.credentials, 0);
    assert.equal(res.body.after_counts.worker_preferences, 0);
    assert.equal(res.body.after_counts.active_allocations, 0);

    const workers = await request.get('/api/workers').set(auth());
    assert.deepEqual(workers.body, []);
    const jobs = await request.get('/api/jobs').set(auth());
    assert.equal(jobs.body.length, 1);
  });

  test('clear setup removes company selections and assets but keeps users jobs and workers', async () => {
    seedWorker(db, company.companyId);
    seedJob(db, company.companyId, company.userId);
    seedEnabledAsset(company.companyId);

    const res = await request
      .post('/api/company/reset')
      .set(auth())
      .send({ scope: 'setup', confirmation: 'CLEAR SETUP' });

    assert.equal(res.status, 200);
    assert.equal(res.body.after_counts.company_assets, 0);
    assert.equal(res.body.after_counts.catalogue_selections, 0);
    assert.equal(res.body.after_counts.workers, 1);
    assert.equal(res.body.after_counts.jobs, 1);
    assert.equal(res.body.after_counts.users, 1);
  });

  test('clear all company operational data preserves users, company, global catalogue, and reset audit', async () => {
    const workerId = seedWorker(db, company.companyId);
    const jobId = seedJob(db, company.companyId, company.userId);
    seedCredential(db, workerId, company.companyId);
    seedPreference(db, company.companyId, workerId);
    seedAllocation(db, company.companyId, jobId, workerId, company.userId);
    seedEnabledAsset(company.companyId);
    const sourceUploadId = randomUUID();
    db.prepare(`
      INSERT INTO source_uploads (
        id, tenant_id, company_id, uploaded_by_user_id, uploaded_by_email,
        original_filename, stored_key, file_size_bytes, mime_type, extension, category
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sourceUploadId,
      company.companyId,
      company.companyId,
      company.userId,
      'edit-save-reset-admin@example.com',
      'worker-list.csv',
      `${randomUUID()}.csv`,
      12,
      'text/csv',
      'csv',
      'worker_list'
    );
    const siteLogId = randomUUID();
    db.prepare(`
      INSERT INTO site_logs (
        id, company_id, date, site_name, created_by_user_id, updated_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(siteLogId, company.companyId, '2026-06-06', 'Reset test site', company.userId, company.userId);

    const res = await request
      .post('/api/company/reset')
      .set(auth())
      .send({ scope: 'all', confirmation: 'CLEAR COMPANY DATA' });

    assert.equal(res.status, 200);
    assert.equal(res.body.after_counts.jobs, 0);
    assert.equal(res.body.after_counts.workers, 0);
    assert.equal(res.body.after_counts.company_assets, 0);
    assert.equal(res.body.after_counts.catalogue_selections, 0);
    assert.equal(res.body.after_counts.site_logs, 0);
    assert.equal(res.body.after_counts.source_uploads, 1);
    assert.equal(res.body.after_counts.users, 1);
    assert.ok(db.prepare(`SELECT id FROM companies WHERE id = ?`).get(company.companyId));
    assert.ok(db.prepare(`SELECT id FROM requirement_catalogue_items LIMIT 1`).get());
    assert.ok(db.prepare(`SELECT id FROM source_uploads WHERE id = ? AND deleted_at IS NULL`).get(sourceUploadId));

    const events = db.prepare(`
      SELECT event_type
      FROM audit_events
      WHERE company_id = ?
    `).all(company.companyId).map((row) => row.event_type);
    assert.ok(events.includes('company_reset_started'));
    assert.ok(events.includes('company_reset_completed'));
  });

  test('reset requires admin role and exact confirmation phrase', async () => {
    const dispatcher = seedDispatcherUser(company.companyId);

    const wrongPhrase = await request
      .post('/api/company/reset')
      .set(auth())
      .send({ scope: 'jobs', confirmation: 'CLEAR ALL JOBS' });
    assert.equal(wrongPhrase.status, 400);

    const nonAdmin = await request
      .post('/api/company/reset')
      .set(auth(dispatcher.token))
      .send({ scope: 'jobs', confirmation: 'CLEAR JOBS' });
    assert.equal(nonAdmin.status, 403);
  });

  test('reset is tenant-scoped and does not affect another tenant', async () => {
    const other = seedCompanyAndUser(db, {
      companyId: randomUUID(),
      userId: randomUUID(),
      email: 'other-reset-isolation@example.com'
    });
    const otherWorkerId = seedWorker(db, other.companyId, { name: 'Other Worker' });
    const otherJobId = seedJob(db, other.companyId, other.userId, { site_name: 'Other Site' });
    seedWorker(db, company.companyId);
    seedJob(db, company.companyId, company.userId);

    const res = await request
      .post('/api/company/reset')
      .set(auth())
      .send({ scope: 'all', confirmation: 'CLEAR COMPANY DATA' });

    assert.equal(res.status, 200);
    assert.equal(db.prepare(`SELECT archived_at FROM workers WHERE id = ?`).get(otherWorkerId).archived_at, null);
    assert.equal(db.prepare(`SELECT archived_at FROM jobs WHERE id = ?`).get(otherJobId).archived_at, null);
  });
});
