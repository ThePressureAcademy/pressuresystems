'use strict';

const { describe, test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');

const { setDb } = require('../src/db');
const { signToken } = require('../src/middleware/auth');
const {
  createTestDb,
  seedCompanyAndUser,
  seedCredential,
  seedWorker
} = require('./helpers/db');

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

function itemByKey(key) {
  return db.prepare(`
    SELECT *
    FROM requirement_catalogue_items
    WHERE normalized_key = ?
  `).get(key);
}

function createJobPayload(overrides = {}) {
  return {
    client_name: 'Catalogue Test Client',
    site_name: 'Catalogue Test Site',
    date: '2026-06-01',
    shift_start_time: '07:00',
    scheduled_end_time: '12:00',
    job_timezone: 'Australia/Brisbane',
    schedule_status: 'planned',
    shift_type: 'day',
    lift_risk_level: 'routine',
    ...overrides
  };
}

beforeEach(() => {
  db = createTestDb();
  setDb(db);
  app = require('../src/app');
  request = supertest(app);

  ({ companyId, userId } = seedCompanyAndUser(db, {
    email: 'catalogue-admin@test.com',
    role: 'admin'
  }));
  token = signToken({
    id: userId,
    company_id: companyId,
    role: 'admin',
    name: 'Catalogue Admin'
  });

  ({ companyId: otherCompanyId, userId: otherUserId } = seedCompanyAndUser(db, {
    companyId: '99999999-9999-4999-8999-999999999999',
    userId: '88888888-8888-4888-8888-888888888888',
    email: 'other-catalogue@test.com',
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

describe('Job intake requirement catalogue', () => {
  test('global catalogue seeds supplied credential, equipment, crane, and transport groups with unique keys', async () => {
    const res = await request.get('/api/catalogue/requirements').set(auth());
    assert.equal(res.status, 200);

    const keys = res.body.items.map((item) => item.normalized_key);
    assert.equal(keys.length, new Set(keys).size);
    assert.ok(keys.includes('credential_hrwl_c6'));
    assert.ok(keys.includes('credential_hrwl_dg'));
    assert.ok(keys.includes('credential_hrwl_rb'));
    assert.ok(keys.includes('credential_white_card'));
    assert.ok(keys.includes('equipment_mobile_crane_100t'));
    assert.ok(keys.includes('equipment_crawler_crane_1650t'));
    assert.ok(keys.includes('equipment_articulated_crane_40t'));
    assert.ok(keys.includes('equipment_franna_pick_and_carry'));
    assert.ok(keys.includes('transport_low_loader'));
    assert.ok(keys.includes('transport_semi_trailer'));
  });

  test('company setup enables selected items and stays tenant scoped', async () => {
    const c6 = itemByKey('credential_hrwl_c6');
    const lowLoader = itemByKey('transport_low_loader');
    const mobile100 = itemByKey('equipment_mobile_crane_100t');

    const save = await request.post('/api/company/catalogue-selections').set(auth()).send({
      catalogue_item_ids: [c6.id, lowLoader.id, mobile100.id]
    });
    assert.equal(save.status, 200);
    assert.equal(save.body.enabled_count, 3);

    const own = await request.get('/api/company/catalogue-selections').set(auth());
    assert.equal(own.status, 200);
    assert.equal(own.body.configured, true);
    assert.deepEqual(
      own.body.items.filter((item) => item.is_enabled).map((item) => item.normalized_key).sort(),
      ['credential_hrwl_c6', 'equipment_mobile_crane_100t', 'transport_low_loader']
    );

    const other = await request.get('/api/company/catalogue-selections').set(auth(otherToken));
    assert.equal(other.status, 200);
    assert.equal(other.body.configured, false);
    assert.ok(other.body.items.some((item) => item.normalized_key === 'transport_semi_trailer' && item.is_enabled));
  });

  test('job creation stores structured catalogue and one-off requirements', async () => {
    const c6 = itemByKey('credential_hrwl_c6');
    const mobile100 = itemByKey('equipment_mobile_crane_100t');
    const lowLoader = itemByKey('transport_low_loader');

    const created = await request.post('/api/jobs').set(auth()).send(createJobPayload({
      requirement_item_ids: [c6.id, mobile100.id, lowLoader.id],
      custom_requirements: [{ category: 'equipment', label: '40T Franna' }]
    }));
    assert.equal(created.status, 201);
    assert.equal(created.body.structured_requirements.length, 4);
    assert.equal(created.body.manual_requirement_review_required, true);
    assert.equal(created.body.transport_requirement_review_required, true);
    assert.ok(created.body.task_tags.includes('equipment_mobile_crane_100t'));
    assert.ok(created.body.required_credentials.includes('high_risk_licence_crane'));

    const requirements = await request.get(`/api/jobs/${created.body.id}/requirements`).set(auth());
    assert.equal(requirements.status, 200);
    assert.ok(requirements.body.items.some((item) => item.normalized_key === 'transport_low_loader'));
    assert.ok(requirements.body.items.some((item) => item.is_custom && item.label === '40T Franna'));

    const audit = await request.get('/api/audit-events?limit=50').set(auth());
    assert.equal(audit.status, 200);
    assert.ok(audit.body.events.some((event) => event.event_type === 'job_requirements_updated'));
  });

  test('one-off custom requirement endpoint is job scoped and tenant scoped', async () => {
    const created = await request.post('/api/jobs').set(auth()).send(createJobPayload());
    assert.equal(created.status, 201);

    const custom = await request.post(`/api/jobs/${created.body.id}/custom-requirements`).set(auth()).send({
      category: 'equipment',
      label: 'Client induction'
    });
    assert.equal(custom.status, 201);
    assert.ok(custom.body.items.some((item) => item.is_custom && item.label === 'Client induction'));

    const global = await request.get('/api/catalogue/requirements').set(auth());
    assert.equal(global.status, 200);
    assert.equal(global.body.items.some((item) => item.label === 'Client induction'), false);

    const crossTenant = await request.get(`/api/jobs/${created.body.id}/requirements`).set(auth(otherToken));
    assert.equal(crossTenant.status, 404);
  });

  test('job brief import maps common crane, credential, transport, and access terms to catalogue items', async () => {
    const c6 = itemByKey('credential_hrwl_c6');
    const mobile100 = itemByKey('equipment_mobile_crane_100t');
    const lowLoader = itemByKey('transport_low_loader');
    const telehandler = itemByKey('civil_telehandler');
    await request.post('/api/company/catalogue-selections').set(auth()).send({
      catalogue_item_ids: [c6.id, mobile100.id, lowLoader.id, telehandler.id]
    });

    const preview = await request.post('/api/jobs/import-brief/preview').set(auth()).send({
      source_type: 'pasted_text',
      content: [
        'Client: Synthetic Lift Co',
        'Site: Pinkenba QLD',
        'Job: 100T crane lift with Low Loader access and telehandler support.',
        'Timing:',
        'Monday 1 June 2026',
        'Start: 6:00 AM',
        'Finish: 1:00 PM',
        'Timezone: Australia/Brisbane',
        'Requirements:',
        'White Card',
        'C6',
        'RIW'
      ].join('\n')
    });
    assert.equal(preview.status, 200);

    const selected = preview.body.extracted.structured_requirements.selected_catalogue_item_keys;
    const suggested = preview.body.extracted.structured_requirements.suggested_catalogue_item_keys;
    assert.ok(selected.includes('credential_hrwl_c6'));
    assert.ok(selected.includes('equipment_mobile_crane_100t'));
    assert.ok(selected.includes('transport_low_loader'));
    assert.ok(selected.includes('civil_telehandler'));
    assert.ok(suggested.includes('credential_white_card'));
    assert.ok(suggested.includes('rail_riw'));
    assert.ok(preview.body.warnings.some((warning) => /not enabled in your company setup/i.test(warning)));
  });

  test('created job from brief stores parsed catalogue requirements', async () => {
    const c6 = itemByKey('credential_hrwl_c6');
    const mobile100 = itemByKey('equipment_mobile_crane_100t');
    const lowLoader = itemByKey('transport_low_loader');
    await request.post('/api/company/catalogue-selections').set(auth()).send({
      catalogue_item_ids: [c6.id, mobile100.id, lowLoader.id]
    });

    const preview = await request.post('/api/jobs/import-brief/preview').set(auth()).send({
      source_type: 'pasted_text',
      content: [
        'Client: Synthetic Lift Co',
        'Site: Pinkenba QLD',
        'Job: 100T crane lift using a Low Loader.',
        'Timing:',
        'Monday 1 June 2026',
        'Start: 6:00 AM',
        'Finish: 1:00 PM',
        'Timezone: Australia/Brisbane',
        'Requirements:',
        'C6'
      ].join('\n')
    });
    assert.equal(preview.status, 200);

    const created = await request.post(`/api/jobs/import-brief/${preview.body.import_id}/create-job`).set(auth()).send({
      ...preview.body.extracted,
      schedule_status: 'planned'
    });
    assert.equal(created.status, 201);
    assert.ok(created.body.structured_requirements.some((item) => item.normalized_key === 'credential_hrwl_c6'));
    assert.ok(created.body.structured_requirements.some((item) => item.normalized_key === 'equipment_mobile_crane_100t'));
    assert.ok(created.body.structured_requirements.some((item) => item.normalized_key === 'transport_low_loader'));

    const audit = await request.get('/api/audit-events?limit=50').set(auth());
    assert.equal(audit.status, 200);
    assert.ok(audit.body.events.some((event) => event.event_type === 'job_requirement_imported_from_brief'));
  });

  test('CredentialGate and SmartRank use structured credential requirements without replacing ranking', async () => {
    const readyWorker = seedWorker(db, companyId, {
      name: 'Ready Operator',
      email: 'ready@example.com'
    });
    seedCredential(db, readyWorker, companyId, { type: 'high_risk_licence_crane' });

    const blockedWorker = seedWorker(db, companyId, {
      name: 'Blocked Operator',
      email: 'blocked@example.com'
    });
    seedCredential(db, blockedWorker, companyId, { type: 'white_card' });

    const c6 = itemByKey('credential_hrwl_c6');
    const mobile100 = itemByKey('equipment_mobile_crane_100t');
    const created = await request.post('/api/jobs').set(auth()).send(createJobPayload({
      task_tags: ['mobile_crane'],
      requirement_item_ids: [c6.id, mobile100.id]
    }));
    assert.equal(created.status, 201);

    const smartrank = await request.get(`/api/jobs/${created.body.id}/smartrank`).set(auth());
    assert.equal(smartrank.status, 200);
    assert.ok(smartrank.body.ranked.some((entry) => entry.worker.id === readyWorker));
    const blocked = smartrank.body.blocked.find((entry) => entry.worker.id === blockedWorker);
    assert.ok(blocked);
    assert.ok(blocked.blocks.some((block) => block.type === 'credential_missing'));
    assert.ok(smartrank.body.job.task_tags.includes('equipment_mobile_crane_100t'));
  });

  test('legacy persisted databases migrate requirement catalogue tables safely', () => {
    const tables = db.prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
    `).all().map((row) => row.name);

    assert.ok(tables.includes('requirement_catalogue_items'));
    assert.ok(tables.includes('company_catalogue_selections'));
    assert.ok(tables.includes('job_requirement_items'));
    assert.ok(tables.includes('job_custom_requirements'));
    assert.ok(itemByKey('transport_low_loader'));
  });
});
