'use strict';

const { describe, test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');

const { setDb } = require('../src/db');
const { signToken } = require('../src/middleware/auth');
const {
  createTestDb,
  seedCompanyAndUser,
  seedJob,
  seedWorker
} = require('./helpers/db');
const { provisionPilotTenants } = require('../src/scripts/provision-pilot-tenants');
const { runCleanup } = require('../src/scripts/clean-non-demo-sample-data');

let db;
let app;
let request;
let companyId;
let userId;
let token;

function auth() {
  return { Authorization: `Bearer ${token}` };
}

function countRows(database, table, companyIdValue) {
  return database.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE company_id = ?`).get(companyIdValue).n;
}

function itemByKey(key) {
  return db.prepare(`
    SELECT *
    FROM requirement_catalogue_items
    WHERE normalized_key = ?
  `).get(key);
}

function tempPassword(label) {
  return `${label}Temp!123`;
}

beforeEach(() => {
  db = createTestDb();
  setDb(db);
  app = require('../src/app');
  request = supertest(app);

  ({ companyId, userId } = seedCompanyAndUser(db, {
    email: 'clean-admin@test.com',
    role: 'admin'
  }));
  token = signToken({
    id: userId,
    company_id: companyId,
    role: 'admin',
    name: 'Clean Admin'
  });
});

afterEach(() => {
  if (db) {
    db.close();
    db = null;
  }
  setDb(null);
});

describe('clean tenant defaults', () => {
  test('provisioned pilot tenants start with no operational sample data', () => {
    const provisionDb = createTestDb();
    const results = provisionPilotTenants(provisionDb, {
      logger: { warn: () => {} },
      env: {
        BORGERS_ADMIN_EMAIL: 'admin@borgers.example',
        BORGERS_ADMIN_PASSWORD: tempPassword('Borgers'),
        SMITHBRIDGE_ADMIN_EMAIL: 'admin@smithbridge.example',
        SMITHBRIDGE_ADMIN_PASSWORD: tempPassword('Smithbridge'),
        GETSOME_ADMIN_EMAIL: 'admin@getsome.example',
        GETSOME_ADMIN_PASSWORD: tempPassword('Getsome')
      }
    });

    assert.equal(results.length, 3);
    const tables = [
      'workers',
      'jobs',
      'credentials',
      'fatigue_records',
      'company_assets',
      'allocations',
      'job_imports',
      'company_catalogue_selections'
    ];

    for (const result of results) {
      const company = provisionDb.prepare(`SELECT * FROM companies WHERE slug = ?`).get(result.company_slug);
      assert.ok(company);
      for (const table of tables) {
        assert.equal(countRows(provisionDb, table, company.id), 0, `${table} should be empty for ${result.company_slug}`);
      }
      const admin = provisionDb.prepare(`SELECT * FROM users WHERE company_id = ?`).get(company.id);
      assert.ok(admin);
      assert.equal(admin.must_change_password, 1);
    }

    assert.ok(provisionDb.prepare(`SELECT COUNT(*) AS n FROM requirement_catalogue_items`).get().n > 0);
    assert.ok(provisionDb.prepare(`SELECT COUNT(*) AS n FROM crane_models`).get().n > 0);
    provisionDb.close();
  });

  test('new company setup-state reports first run with zero operational records', async () => {
    const setup = await request.get('/api/company/setup-state').set(auth());
    assert.equal(setup.status, 200);
    assert.equal(setup.body.is_first_run, true);
    assert.equal(setup.body.catalogue_configured, false);
    assert.equal(setup.body.enabled_catalogue_count, 0);
    assert.equal(setup.body.counts.workers, 0);
    assert.equal(setup.body.counts.jobs, 0);
    assert.equal(setup.body.counts.credentials, 0);
    assert.equal(setup.body.counts.assets, 0);
    assert.equal(setup.body.counts.allocations, 0);

    const catalogue = await request.get('/api/company/catalogue-selections').set(auth());
    assert.equal(catalogue.status, 200);
    assert.equal(catalogue.body.configured, false);
    assert.equal(catalogue.body.enabled_count, 0);
    assert.ok(catalogue.body.common_default_count > 0);
    assert.equal(catalogue.body.items.some((item) => item.is_enabled), false);
    assert.ok(catalogue.body.items.some((item) => item.common_default));
  });

  test('asset creation requires Plant + labour mode and a selected equipment or transport class', async () => {
    const mobile20 = itemByKey('equipment_mobile_crane_20t_city');
    const c6 = itemByKey('credential_hrwl_c6');

    const unselected = await request.post('/api/company/assets').set(auth()).send({
      catalogue_item_id: mobile20.id,
      asset_number: 'MC20-001'
    });
    assert.equal(unselected.status, 400);
    assert.match(unselected.body.error, /Enable this equipment or transport class/i);

    const credentialAsset = await request.post('/api/company/assets').set(auth()).send({
      catalogue_item_id: c6.id,
      asset_number: 'C6-001'
    });
    assert.equal(credentialAsset.status, 400);
    assert.match(credentialAsset.body.error, /Only equipment or transport catalogue items/i);

    const labourMode = await request.patch('/api/company/profile').set(auth()).send({
      operating_mode: 'labour_only'
    });
    assert.equal(labourMode.status, 200);
    const saveWhileLabourOnly = await request.post('/api/company/catalogue-selections').set(auth()).send({
      catalogue_item_ids: [mobile20.id]
    });
    assert.equal(saveWhileLabourOnly.status, 200);
    const labourOnlyAsset = await request.post('/api/company/assets').set(auth()).send({
      catalogue_item_id: mobile20.id,
      asset_number: 'MC20-001'
    });
    assert.equal(labourOnlyAsset.status, 400);
    assert.match(labourOnlyAsset.body.error, /Plant \+ labour mode/i);

    const plantMode = await request.patch('/api/company/profile').set(auth()).send({
      operating_mode: 'plant_and_labour'
    });
    assert.equal(plantMode.status, 200);
    const selected = await request.post('/api/company/catalogue-selections').set(auth()).send({
      catalogue_item_ids: [mobile20.id]
    });
    assert.equal(selected.status, 200);

    for (const number of ['MC20-001', 'MC20-002']) {
      const created = await request.post('/api/company/assets').set(auth()).send({
        catalogue_item_id: mobile20.id,
        asset_number: number
      });
      assert.equal(created.status, 201);
      assert.equal(created.body.asset_number, number);
    }
  });

  test('sample-data cleanup is dry-run by default and skips demo tenants', () => {
    const realWorker = seedWorker(db, companyId, {
      name: 'DEMO_WORKER - non-demo tenant',
      email: 'operator@demo.dispatchtalon.local'
    });
    const realJob = seedJob(db, companyId, userId, {
      client_name: 'Smoke Test Client',
      site_name: 'Sample Site'
    });
    const demo = seedCompanyAndUser(db, {
      companyId: '11111111-1111-4111-8111-111111111111',
      userId: '22222222-2222-4222-8222-222222222222',
      companyName: 'DispatchTalon Demo Tenant',
      slug: 'dispatchtalon-demo',
      email: 'demo-admin@test.com'
    });
    seedWorker(db, demo.companyId, {
      name: 'DEMO_WORKER - demo tenant',
      email: 'operator@demo.dispatchtalon.local'
    });
    seedJob(db, demo.companyId, demo.userId, {
      client_name: 'Smoke Test Client',
      site_name: 'Sample Site'
    });

    const dryRun = runCleanup(db);
    assert.equal(dryRun.mode, 'dry-run');
    assert.deepEqual(dryRun.sample_jobs.map((job) => job.job_id), [realJob]);
    assert.deepEqual(dryRun.sample_workers.map((worker) => worker.worker_id), [realWorker]);
    assert.equal(db.prepare(`SELECT status FROM jobs WHERE id = ?`).get(realJob).status, 'open');
    assert.equal(db.prepare(`SELECT archived_at FROM workers WHERE id = ?`).get(realWorker).archived_at, null);

    const applied = runCleanup(db, { apply: true, now: '2026-06-01T00:00:00.000Z' });
    assert.equal(applied.mode, 'apply');
    assert.equal(db.prepare(`SELECT status FROM jobs WHERE id = ?`).get(realJob).status, 'cancelled');
    assert.equal(db.prepare(`SELECT status FROM workers WHERE id = ?`).get(realWorker).status, 'inactive');
    assert.equal(db.prepare(`SELECT archived_at FROM workers WHERE id = ?`).get(realWorker).archived_at, '2026-06-01T00:00:00.000Z');
  });
});
