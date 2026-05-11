'use strict';

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const supertest = require('supertest');

const {
  createTestDb,
  seedCompanyAndUser,
  seedJob,
  seedWorker
} = require('./helpers/db');
const { setDb } = require('../src/db');
const { signToken } = require('../src/middleware/auth');
const { appendAuditEvent } = require('../src/services/audit');
const { daysRemaining } = require('../src/services/company-access');
const { provisionPilotTenants } = require('../src/scripts/provision-pilot-tenants');

let db;
let request;
let borgers;
let smithbridge;

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

function tokenFor(user) {
  return signToken({
    id: user.userId,
    company_id: user.companyId,
    role: 'admin',
    name: 'Tenant Admin'
  });
}

const SINGLE_WORKER_CSV = [
  'first_name,last_name,email,phone,role,employment_type,base_location,availability_status,crane_classes,credential_types,credential_expiry_dates,preferred_task_tags,task_star_ratings,notes',
  'Tenant,Worker,tenant.worker@example.com,0400000000,Crane Operator,full_time,Brisbane,available,Franna,HRWL-C2,2027-06-30,counterweight,counterweight:5,Tenant isolation import'
].join('\n');

const BRIEF_TEXT = [
  'Client: Tenant Test',
  'Site: Test Yard',
  'Job: Lift test load.',
  'Crane: Grove GMK5150L 150T crane required as a 100T setup.',
  'Use 24T counterweight.',
  'Timing: Monday 1 June 2026',
  'Start: 6:00 AM',
  'Finish: 1:00 PM'
].join('\n');

beforeEach(() => {
  db = createTestDb();
  setDb(db);
  request = supertest(require('../src/app'));

  borgers = seedCompanyAndUser(db, {
    companyId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    companyName: 'Borgers Cranes & Rigging',
    slug: 'borgers-cranes-rigging',
    email: 'admin@borgers.test',
    password: 'TenantPass!1',
    role: 'admin'
  });
  borgers.token = tokenFor(borgers);

  smithbridge = seedCompanyAndUser(db, {
    companyId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    companyName: 'Smithbridge Group / Universal Cranes',
    slug: 'smithbridge-universal-cranes',
    email: 'admin@smithbridge.test',
    password: 'TenantPass!1',
    role: 'admin'
  });
  smithbridge.token = tokenFor(smithbridge);
});

afterEach(() => {
  db.close();
});

describe('pilot tenant provisioning', () => {
  test('creates Borgers, Smithbridge / Universal, and Getsome tenants with bootstrap admins', () => {
    const now = new Date('2026-05-12T00:00:00.000Z');
    const provisionDb = createTestDb();
    const warnings = [];

    const results = provisionPilotTenants(provisionDb, {
      now,
      logger: { warn: (message) => warnings.push(message) },
      env: {
        BORGERS_ADMIN_EMAIL: 'admin@borgers.example',
        BORGERS_ADMIN_PASSWORD: 'BorgersTemp!123',
        SMITHBRIDGE_ADMIN_EMAIL: 'admin@smithbridge.example',
        SMITHBRIDGE_ADMIN_PASSWORD: 'SmithbridgeTemp!123',
        GETSOME_ADMIN_EMAIL: 'admin@getsome.example',
        GETSOME_ADMIN_PASSWORD: 'GetsomeTemp!123'
      }
    });

    assert.equal(results.length, 3);
    assert.deepEqual(results.map((result) => result.company_slug), [
      'borgers-cranes-rigging',
      'smithbridge-universal-cranes',
      'getsome-hire-test'
    ]);

    const borgersCompany = provisionDb.prepare(`SELECT * FROM companies WHERE slug = ?`).get('borgers-cranes-rigging');
    const smithbridgeCompany = provisionDb.prepare(`SELECT * FROM companies WHERE slug = ?`).get('smithbridge-universal-cranes');
    const getsomeCompany = provisionDb.prepare(`SELECT * FROM companies WHERE slug = ?`).get('getsome-hire-test');
    assert.equal(borgersCompany.display_name, 'Borgers Cranes & Rigging');
    assert.equal(smithbridgeCompany.display_name, 'Smithbridge Group / Universal Cranes');
    assert.equal(getsomeCompany.pilot_type, 'testing_partner');
    assert.equal(daysRemaining(getsomeCompany, now), 14);

    for (const email of ['admin@borgers.example', 'admin@smithbridge.example', 'admin@getsome.example']) {
      const user = provisionDb.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
      assert.ok(user, `${email} should be created`);
      assert.equal(user.role, 'admin');
      assert.equal(user.must_change_password, 1);
      assert.notEqual(user.password_hash, 'BorgersTemp!123');
      assert.notEqual(user.password_hash, 'SmithbridgeTemp!123');
      assert.notEqual(user.password_hash, 'GetsomeTemp!123');
      assert.ok(bcrypt.compareSync(email.includes('borgers') ? 'BorgersTemp!123' : email.includes('smithbridge') ? 'SmithbridgeTemp!123' : 'GetsomeTemp!123', user.password_hash));
    }

    assert.equal(warnings.length, 0);
    provisionDb.close();
  });

  test('skips missing admin variables without printing or storing plaintext passwords', () => {
    const provisionDb = createTestDb();
    const warnings = [];

    const results = provisionPilotTenants(provisionDb, {
      logger: { warn: (message) => warnings.push(message) },
      env: {
        BORGERS_ADMIN_EMAIL: 'admin@borgers.example',
        BORGERS_ADMIN_PASSWORD: 'BorgersTemp!123'
      }
    });

    assert.equal(results.find((result) => result.company_slug === 'borgers-cranes-rigging').admin_action, 'created');
    assert.equal(results.find((result) => result.company_slug === 'smithbridge-universal-cranes').admin_action, 'skipped');
    assert.equal(results.find((result) => result.company_slug === 'getsome-hire-test').admin_action, 'skipped');
    assert.equal(warnings.length, 2);
    provisionDb.close();
  });
});

describe('tenant isolation', () => {
  test('workers, removed workers, jobs, audit, metrics, and schedule are company-scoped', async () => {
    const borgersWorker = seedWorker(db, borgers.companyId, { name: 'Borgers Worker', email: 'borgers.worker@example.com' });
    const smithbridgeWorker = seedWorker(db, smithbridge.companyId, { name: 'Smithbridge Worker', email: 'smithbridge.worker@example.com' });
    const borgersJob = seedJob(db, borgers.companyId, borgers.userId, {
      client_name: 'Borgers Client',
      scheduled_start_at_utc: '2026-06-01T20:00:00.000Z',
      scheduled_end_at_utc: '2026-06-02T04:00:00.000Z'
    });
    const smithbridgeJob = seedJob(db, smithbridge.companyId, smithbridge.userId, {
      client_name: 'Smithbridge Client',
      scheduled_start_at_utc: '2026-06-02T20:00:00.000Z',
      scheduled_end_at_utc: '2026-06-03T04:00:00.000Z'
    });
    appendAuditEvent(db, {
      companyId: borgers.companyId,
      eventType: 'worker_imported',
      userId: borgers.userId,
      workerId: borgersWorker,
      payload: { tenant: 'borgers' }
    });
    const smithbridgeAuditId = appendAuditEvent(db, {
      companyId: smithbridge.companyId,
      eventType: 'job_created',
      userId: smithbridge.userId,
      jobId: smithbridgeJob,
      payload: { tenant: 'smithbridge' }
    });

    const workers = await request.get('/api/workers').set(auth(borgers.token));
    assert.equal(workers.status, 200);
    assert.ok(workers.body.some((worker) => worker.id === borgersWorker));
    assert.equal(workers.body.some((worker) => worker.id === smithbridgeWorker), false);

    const otherWorker = await request.get(`/api/workers/${smithbridgeWorker}`).set(auth(borgers.token));
    assert.equal(otherWorker.status, 404);

    const removeOtherWorker = await request.post(`/api/workers/${smithbridgeWorker}/remove`).set(auth(borgers.token)).send({ reason: 'Isolation check' });
    assert.equal(removeOtherWorker.status, 404);

    const otherJob = await request.get(`/api/jobs/${smithbridgeJob}`).set(auth(borgers.token));
    assert.equal(otherJob.status, 404);

    const auditList = await request.get('/api/audit-events').set(auth(borgers.token));
    assert.equal(auditList.status, 200);
    assert.equal(auditList.body.events.some((event) => event.id === smithbridgeAuditId), false);

    const auditLookup = await request.get(`/api/audit-events/${smithbridgeAuditId}`).set(auth(borgers.token));
    assert.equal(auditLookup.status, 404);

    const metrics = await request.get('/api/metrics').set(auth(borgers.token));
    assert.equal(metrics.status, 200);
    assert.equal(metrics.body.total_jobs, 1);
    assert.equal(metrics.body.workers_imported, 1);

    const schedule = await request.get('/api/schedule?start=2026-06-01&end=2026-06-04').set(auth(borgers.token));
    assert.equal(schedule.status, 200);
    assert.ok(schedule.body.jobs.some((job) => job.id === borgersJob));
    assert.equal(schedule.body.jobs.some((job) => job.id === smithbridgeJob), false);
  });

  test('job brief imports and worker imports remain company-scoped', async () => {
    const smithbridgePreview = await request.post('/api/jobs/import-brief/preview').set(auth(smithbridge.token)).send({
      source_type: 'pasted_text',
      content: BRIEF_TEXT
    });
    assert.equal(smithbridgePreview.status, 200);

    const borgersCreateFromSmithbridgeImport = await request
      .post(`/api/jobs/import-brief/${smithbridgePreview.body.import_id}/create-job`)
      .set(auth(borgers.token))
      .send({});
    assert.equal(borgersCreateFromSmithbridgeImport.status, 404);

    const borgersImport = await request.post('/api/workers/import').set(auth(borgers.token)).send({
      content: SINGLE_WORKER_CSV,
      mode: 'import'
    });
    assert.equal(borgersImport.status, 201);

    const smithbridgeImport = await request.post('/api/workers/import').set(auth(smithbridge.token)).send({
      content: SINGLE_WORKER_CSV,
      mode: 'import'
    });
    assert.equal(smithbridgeImport.status, 201);

    const borgersWorkers = await request.get('/api/workers').set(auth(borgers.token));
    const smithbridgeWorkers = await request.get('/api/workers').set(auth(smithbridge.token));
    assert.equal(borgersWorkers.body.filter((worker) => worker.email === 'tenant.worker@example.com').length, 1);
    assert.equal(smithbridgeWorkers.body.filter((worker) => worker.email === 'tenant.worker@example.com').length, 1);
  });

  test('shared crane model catalog contains sourced catalog data only, not company operational data', async () => {
    const borgersCatalog = await request.get('/api/crane-models').set(auth(borgers.token));
    const smithbridgeCatalog = await request.get('/api/crane-models').set(auth(smithbridge.token));

    assert.equal(borgersCatalog.status, 200);
    assert.equal(smithbridgeCatalog.status, 200);
    assert.deepEqual(
      borgersCatalog.body.map((model) => `${model.manufacturer} ${model.model}`),
      smithbridgeCatalog.body.map((model) => `${model.manufacturer} ${model.model}`)
    );
    assert.ok(borgersCatalog.body.some((model) => model.model === 'GMK5150L'));
    assert.equal(Object.prototype.hasOwnProperty.call(borgersCatalog.body[0], 'company_id'), false);
  });
});

describe('pilot access expiry and suspension', () => {
  test('active company can access protected routes', async () => {
    const res = await request.get('/api/workers').set(auth(borgers.token));
    assert.equal(res.status, 200);
  });

  test('expired company can rotate password but cannot access protected operational routes', async () => {
    const expired = seedCompanyAndUser(db, {
      companyId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      companyName: 'Getsome Hire',
      slug: 'getsome-hire-test',
      email: 'admin@getsome.test',
      password: 'TempPass!123',
      role: 'admin',
      mustChangePassword: true,
      accessStatus: 'active',
      pilotType: 'testing_partner',
      pilotExpiresAt: '2026-01-01T00:00:00.000Z'
    });

    const login = await request.post('/api/auth/login').send({
      email: 'admin@getsome.test',
      password: 'TempPass!123'
    });
    assert.equal(login.status, 200);
    assert.equal(login.body.user.company.effective_access_status, 'expired');

    const passwordChange = await request.post('/api/auth/change-password')
      .set(auth(login.body.token))
      .send({
        current_password: 'TempPass!123',
        new_password: 'NewTempPass!1234'
      });
    assert.equal(passwordChange.status, 200);

    const protectedRoute = await request.get('/api/workers').set(auth(signToken({
      id: expired.userId,
      company_id: expired.companyId,
      role: 'admin',
      name: 'Getsome Admin'
    })));
    assert.equal(protectedRoute.status, 403);
    assert.equal(protectedRoute.body.error, 'Pilot access expired');
    assert.match(protectedRoute.body.message, /test portal has expired/i);
  });

  test('suspended company is blocked at login and protected route middleware', async () => {
    const suspended = seedCompanyAndUser(db, {
      companyId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      companyName: 'Suspended Pilot',
      slug: 'suspended-pilot',
      email: 'admin@suspended.test',
      password: 'TempPass!123',
      role: 'admin',
      accessStatus: 'suspended'
    });

    const login = await request.post('/api/auth/login').send({
      email: 'admin@suspended.test',
      password: 'TempPass!123'
    });
    assert.equal(login.status, 403);
    assert.equal(login.body.error, 'Pilot access suspended');

    const protectedRoute = await request.get('/api/workers').set(auth(signToken({
      id: suspended.userId,
      company_id: suspended.companyId,
      role: 'admin',
      name: 'Suspended Admin'
    })));
    assert.equal(protectedRoute.status, 403);
    assert.equal(protectedRoute.body.company_access_status, 'suspended');
  });
});
