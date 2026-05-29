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

async function createAsset(catalogueItem, assetNumber, overrides = {}, currentToken = token) {
  return request.post('/api/company/assets').set(auth(currentToken)).send({
    catalogue_item_id: catalogueItem.id,
    asset_number: assetNumber,
    display_name: overrides.display_name,
    asset_status: overrides.asset_status,
    home_location: overrides.home_location || 'Brisbane',
    notes: overrides.notes || 'Synthetic test asset'
  });
}

async function enableCatalogueItems(catalogueItems, currentToken = token) {
  return request.post('/api/company/catalogue-selections').set(auth(currentToken)).send({
    catalogue_item_ids: catalogueItems.map((item) => item.id)
  });
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
    assert.ok(keys.includes('credential_working_at_height_wah'));
    assert.ok(keys.includes('credential_site_induction'));
    assert.ok(keys.includes('credential_client_induction'));
    assert.ok(keys.includes('equipment_mobile_crane_100t'));
    assert.ok(keys.includes('equipment_crawler_crane_1650t'));
    assert.ok(keys.includes('equipment_articulated_crane_40t'));
    assert.equal(keys.includes('equipment_franna_pick_and_carry'), false);
    assert.ok(keys.includes('transport_low_loader'));
    assert.ok(keys.includes('transport_semi_trailer'));
    const articulated40 = res.body.items.find((item) => item.normalized_key === 'equipment_articulated_crane_40t');
    assert.equal(articulated40.group_label, 'Articulated / Pick-and-Carry');
    assert.equal(articulated40.label, '40T Articulated / Pick-and-Carry Crane');

    const legacyFranna = db.prepare(`
      SELECT is_active
      FROM requirement_catalogue_items
      WHERE normalized_key = 'equipment_franna_pick_and_carry'
    `).get();
    assert.equal(Boolean(legacyFranna?.is_active), false);
  });

  test('credential catalogue classifies HRWL and non-HRW credentials into one clean group taxonomy', async () => {
    const res = await request.get('/api/catalogue/requirements').set(auth());
    assert.equal(res.status, 200);

    const credentialGroups = res.body.grouped.credential || {};
    assert.deepEqual(Object.keys(credentialGroups).filter((group) => group === 'High Risk Work'), ['High Risk Work']);
    assert.ok((credentialGroups['High Risk Work'] || []).length > 0);
    assert.ok((credentialGroups['High Risk Work'] || []).every((item) => item.normalized_key.startsWith('credential_hrwl_')));

    const nonHrwExpectations = [
      ['credential_working_at_height_wah', 'Working at Height'],
      ['credential_first_aid', 'Safety / Site'],
      ['credential_white_card', 'Safety / Site'],
      ['credential_site_induction', 'Safety / Site'],
      ['credential_client_induction', 'Safety / Site'],
      ['credential_heavy_vehicle_mc', 'Heavy Vehicle'],
      ['credential_heavy_vehicle_hc', 'Heavy Vehicle'],
      ['credential_heavy_vehicle_hr', 'Heavy Vehicle']
    ];

    for (const [key, groupLabel] of nonHrwExpectations) {
      const catalogueItem = res.body.items.find((item) => item.normalized_key === key);
      assert.ok(catalogueItem, `missing ${key}`);
      assert.equal(catalogueItem.group_label, groupLabel);
      assert.notEqual(catalogueItem.group_label, 'High Risk Work');
    }

    for (const [key, groupLabel] of [
      ['rail_riw', 'Rail'],
      ['rail_sarc', 'Rail'],
      ['rail_wett', 'Rail'],
      ['energy_electrical_spotter', 'Energy / Electrical'],
      ['civil_excavator', 'Civil / Plant'],
      ['civil_front_end_loader', 'Civil / Plant'],
      ['civil_telehandler', 'Civil / Plant'],
      ['voc_c6', 'VOC']
    ]) {
      const catalogueItem = res.body.items.find((item) => item.normalized_key === key);
      assert.ok(catalogueItem, `missing ${key}`);
      assert.equal(catalogueItem.group_label, groupLabel);
    }
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
    assert.equal(other.body.enabled_count, 0);
    assert.equal(
      other.body.items.some((item) => item.normalized_key === 'transport_semi_trailer' && item.common_default && !item.is_enabled),
      true
    );
  });

  test('company operating mode defaults to plant and labour and can switch to labour only', async () => {
    const profile = await request.get('/api/company/profile').set(auth());
    assert.equal(profile.status, 200);
    assert.equal(profile.body.operating_mode, 'plant_and_labour');

    const invalid = await request.patch('/api/company/profile').set(auth()).send({
      operating_mode: 'plant_only'
    });
    assert.equal(invalid.status, 400);

    const updated = await request.patch('/api/company/profile').set(auth()).send({
      operating_mode: 'labour_only'
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.operating_mode, 'labour_only');

    const audit = await request.get('/api/audit-events?limit=20').set(auth());
    assert.equal(audit.status, 200);
    const modeEvent = audit.body.events.find((event) => event.event_type === 'company_operating_mode_updated');
    assert.ok(modeEvent);
    assert.equal(modeEvent.payload.old_mode, 'plant_and_labour');
    assert.equal(modeEvent.payload.new_mode, 'labour_only');

    const otherProfile = await request.get('/api/company/profile').set(auth(otherToken));
    assert.equal(otherProfile.status, 200);
    assert.equal(otherProfile.body.operating_mode, 'plant_and_labour');
  });

  test('fresh company receives common default catalogue markers without saved enabled selections', async () => {
    const before = await request.get('/api/company/catalogue-selections').set(auth());
    assert.equal(before.status, 200);
    assert.equal(before.body.operating_mode, 'plant_and_labour');
    assert.equal(before.body.configured, false);
    assert.equal(before.body.enabled_count, 0);
    assert.equal(before.body.items.find((item) => item.normalized_key === 'equipment_mobile_crane_100t').common_default, true);
    assert.equal(before.body.items.find((item) => item.normalized_key === 'equipment_mobile_crane_100t').is_enabled, false);
    assert.equal(before.body.items.find((item) => item.normalized_key === 'transport_low_loader').common_default, true);
    assert.equal(before.body.items.find((item) => item.normalized_key === 'transport_low_loader').is_enabled, false);

    const switched = await request.patch('/api/company/profile').set(auth()).send({
      operating_mode: 'labour_only'
    });
    assert.equal(switched.status, 200);

    const labour = await request.get('/api/company/catalogue-selections').set(auth());
    assert.equal(labour.status, 200);
    assert.equal(labour.body.operating_mode, 'labour_only');
    assert.equal(labour.body.configured, false);
    assert.equal(labour.body.enabled_count, 0);
    assert.equal(labour.body.items.find((item) => item.normalized_key === 'credential_hrwl_c6').common_default, true);
    assert.equal(labour.body.items.find((item) => item.normalized_key === 'credential_hrwl_c6').is_enabled, false);
    assert.equal(labour.body.items.find((item) => item.normalized_key === 'civil_telehandler').common_default, true);
    assert.equal(labour.body.items.find((item) => item.normalized_key === 'civil_telehandler').is_enabled, false);
    assert.equal(labour.body.items.find((item) => item.normalized_key === 'equipment_mobile_crane_100t').is_enabled, false);
    assert.equal(labour.body.items.find((item) => item.normalized_key === 'transport_low_loader').is_enabled, false);

    const other = await request.get('/api/company/catalogue-selections').set(auth(otherToken));
    assert.equal(other.status, 200);
    assert.equal(other.body.operating_mode, 'plant_and_labour');
    assert.equal(other.body.enabled_count, 0);
    assert.equal(other.body.items.find((item) => item.normalized_key === 'equipment_mobile_crane_100t').common_default, true);
    assert.equal(other.body.items.find((item) => item.normalized_key === 'equipment_mobile_crane_100t').is_enabled, false);
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
    assert.ok(created.body.required_credentials.includes('hrwl_c6'));

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

  test('company asset register supports multiple same-class assets with plant numbers', async () => {
    const mobile20 = itemByKey('equipment_mobile_crane_20t_city');
    const articulated25 = itemByKey('equipment_articulated_crane_25t');
    const lowLoader = itemByKey('transport_low_loader');
    const enable = await enableCatalogueItems([mobile20, articulated25, lowLoader]);
    assert.equal(enable.status, 200);

    const initialList = await request.get('/api/company/assets').set(auth());
    assert.equal(initialList.status, 200);
    assert.equal(initialList.body.assets.length, 0);

    for (const number of ['MC20-001', 'MC20-002', 'MC20-003', 'MC20-004']) {
      const created = await createAsset(mobile20, number);
      assert.equal(created.status, 201);
      assert.equal(created.body.catalogue_item.normalized_key, 'equipment_mobile_crane_20t_city');
      assert.equal(created.body.asset_number, number);
    }

    const fr25A = await createAsset(articulated25, 'FR25-001');
    const fr25B = await createAsset(articulated25, 'FR25-002');
    const ll = await createAsset(lowLoader, 'LL-001');
    assert.equal(fr25A.status, 201);
    assert.equal(fr25B.status, 201);
    assert.equal(ll.status, 201);

    const list = await request.get('/api/company/assets').set(auth());
    assert.equal(list.status, 200);
    assert.equal(list.body.grouped.equipment_mobile_crane_20t_city.assets.length, 4);
    assert.equal(list.body.grouped.equipment_articulated_crane_25t.assets.length, 2);
    assert.equal(list.body.grouped.transport_low_loader.assets.length, 1);
  });

  test('job brief import maps Franna capacity language to articulated pick-and-carry without standalone class duplication', async () => {
    const articulated40 = itemByKey('equipment_articulated_crane_40t');
    await request.post('/api/company/catalogue-selections').set(auth()).send({
      catalogue_item_ids: [articulated40.id]
    });

    const preview = await request.post('/api/jobs/import-brief/preview').set(auth()).send({
      source_type: 'pasted_text',
      content: [
        'Client: Synthetic Lift Co',
        'Site: Pinkenba QLD',
        'Job: 40T Franna required for restricted access.',
        'Timing:',
        'Monday 1 June 2026',
        'Start: 6:00 AM',
        'Finish: 1:00 PM',
        'Timezone: Australia/Brisbane'
      ].join('\n')
    });

    assert.equal(preview.status, 200);
    const selected = preview.body.extracted.structured_requirements.selected_catalogue_item_keys;
    assert.ok(selected.includes('equipment_articulated_crane_40t'));
    assert.equal(selected.includes('equipment_franna_pick_and_carry'), false);
    assert.equal(preview.body.extracted.custom_requirements.some((item) => /Franna/i.test(item.label)), false);

    const genericPreview = await request.post('/api/jobs/import-brief/preview').set(auth()).send({
      source_type: 'pasted_text',
      content: [
        'Client: Synthetic Lift Co',
        'Site: Pinkenba QLD',
        'Job: Franna or pick-and-carry crane may be needed, exact size TBC.',
        'Timing:',
        'Monday 1 June 2026',
        'Start: 6:00 AM',
        'Finish: 1:00 PM',
        'Timezone: Australia/Brisbane'
      ].join('\n')
    });

    assert.equal(genericPreview.status, 200);
    assert.ok(genericPreview.body.extracted.custom_requirements.some((item) =>
      item.label === 'Articulated / Pick-and-Carry Crane'
    ));
    assert.equal(genericPreview.body.extracted.requirement_item_ids.includes(articulated40.id), false);
  });

  test('asset validation rejects duplicates and non-asset catalogue items while keeping tenant scope', async () => {
    const mobile20 = itemByKey('equipment_mobile_crane_20t_city');
    const c6 = itemByKey('credential_hrwl_c6');
    const enable = await enableCatalogueItems([mobile20]);
    assert.equal(enable.status, 200);
    const enableOther = await enableCatalogueItems([mobile20], otherToken);
    assert.equal(enableOther.status, 200);

    const created = await createAsset(mobile20, 'MC20-001');
    assert.equal(created.status, 201);

    const duplicate = await createAsset(mobile20, 'MC20-001');
    assert.equal(duplicate.status, 409);

    const sameNumberOtherTenant = await createAsset(mobile20, 'MC20-001', {}, otherToken);
    assert.equal(sameNumberOtherTenant.status, 201);

    const credentialAsset = await createAsset(c6, 'C6-001');
    assert.equal(credentialAsset.status, 400);
    assert.match(credentialAsset.body.error, /Only equipment or transport catalogue items/i);

    const ownList = await request.get('/api/company/assets').set(auth());
    const otherList = await request.get('/api/company/assets').set(auth(otherToken));
    assert.equal(ownList.status, 200);
    assert.equal(otherList.status, 200);
    assert.equal(ownList.body.assets.length, 1);
    assert.equal(otherList.body.assets.length, 1);
    assert.equal(otherList.body.assets[0].company_id, otherCompanyId);
  });

  test('asset update and archive are company scoped and audited', async () => {
    const mobile20 = itemByKey('equipment_mobile_crane_20t_city');
    const enable = await enableCatalogueItems([mobile20]);
    assert.equal(enable.status, 200);
    const created = await createAsset(mobile20, 'MC20-010');
    assert.equal(created.status, 201);

    const crossTenantUpdate = await request.patch(`/api/company/assets/${created.body.id}`).set(auth(otherToken)).send({
      asset_status: 'unavailable'
    });
    assert.equal(crossTenantUpdate.status, 404);

    const updated = await request.patch(`/api/company/assets/${created.body.id}`).set(auth()).send({
      asset_status: 'unavailable',
      home_location: 'Gold Coast',
      notes: 'Held for demo readiness warning'
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.asset_status, 'unavailable');
    assert.ok(updated.body.warnings.includes('Selected asset is not active in dispatch.'));

    const archived = await request.post(`/api/company/assets/${created.body.id}/archive`).set(auth()).send({});
    assert.equal(archived.status, 200);
    assert.equal(archived.body.asset_status, 'retired');

    const activeOnly = await request.get('/api/company/assets').set(auth());
    assert.equal(activeOnly.status, 200);
    assert.equal(activeOnly.body.assets.length, 0);

    const includeArchived = await request.get('/api/company/assets?include_archived=true').set(auth());
    assert.equal(includeArchived.status, 200);
    assert.equal(includeArchived.body.assets.length, 1);

    const audit = await request.get('/api/audit-events?limit=50').set(auth());
    assert.equal(audit.status, 200);
    assert.ok(audit.body.events.some((event) => event.event_type === 'company_asset_created'));
    assert.ok(audit.body.events.some((event) => event.event_type === 'company_asset_updated'));
    assert.ok(audit.body.events.some((event) => event.event_type === 'company_asset_archived'));
  });

  test('job intake can reference a selected company asset without forcing fleet scheduling', async () => {
    const mobile100 = itemByKey('equipment_mobile_crane_100t');
    const c6 = itemByKey('credential_hrwl_c6');
    const enable = await enableCatalogueItems([mobile100]);
    assert.equal(enable.status, 200);
    const asset = await createAsset(mobile100, 'MC100-002', { asset_status: 'unavailable' });
    assert.equal(asset.status, 201);

    const created = await request.post('/api/jobs').set(auth()).send(createJobPayload({
      requirement_item_ids: [mobile100.id, c6.id],
      company_asset_ids: [asset.body.id]
    }));
    assert.equal(created.status, 201);
    assert.equal(created.body.asset_assignments.length, 1);
    assert.equal(created.body.asset_assignments[0].asset.asset_number, 'MC100-002');
    assert.ok(created.body.asset_assignment_warnings.includes('Selected asset is not active in dispatch.'));
    assert.ok(created.body.structured_requirements.some((item) => item.normalized_key === 'equipment_mobile_crane_100t'));

    const assets = await request.get(`/api/jobs/${created.body.id}/assets`).set(auth());
    assert.equal(assets.status, 200);
    assert.equal(assets.body.assignments[0].asset.asset_number, 'MC100-002');

    const crossTenant = await request.get(`/api/jobs/${created.body.id}/assets`).set(auth(otherToken));
    assert.equal(crossTenant.status, 404);

    const smartrank = await request.get(`/api/jobs/${created.body.id}/smartrank`).set(auth());
    assert.equal(smartrank.status, 200);
    assert.equal(smartrank.body.job.asset_assignments[0].asset.asset_number, 'MC100-002');
    assert.ok(smartrank.body.job.asset_assignment_warnings.includes('Selected asset is not active in dispatch.'));

    const audit = await request.get('/api/audit-events?limit=50').set(auth());
    assert.equal(audit.status, 200);
    assert.ok(audit.body.events.some((event) => event.event_type === 'job_asset_selected'));
  });

  test('job asset selection only accepts saved current-company assets', async () => {
    const mobile20 = itemByKey('equipment_mobile_crane_20t_city');
    await enableCatalogueItems([mobile20]);

    const requirementOnly = await request.post('/api/jobs').set(auth()).send(createJobPayload({
      reference: 'REQ-ONLY',
      requirement_item_ids: [mobile20.id]
    }));
    assert.equal(requirementOnly.status, 201);
    assert.equal(requirementOnly.body.asset_assignments.length, 0);

    const ownAssets = await request.get('/api/company/assets').set(auth());
    assert.equal(ownAssets.status, 200);
    assert.equal(ownAssets.body.assets.length, 0);

    await enableCatalogueItems([mobile20], otherToken);
    const otherAsset = await createAsset(mobile20, 'MC20-OTHER', {}, otherToken);
    assert.equal(otherAsset.status, 201);

    const blocked = await request.post('/api/jobs').set(auth()).send(createJobPayload({
      reference: 'CROSS-TENANT-ASSET',
      requirement_item_ids: [mobile20.id],
      company_asset_ids: [otherAsset.body.id]
    }));
    assert.equal(blocked.status, 400);
    assert.equal(blocked.body.error, 'Selected asset not found');

    const ownAssetsAfter = await request.get('/api/company/assets').set(auth());
    assert.equal(ownAssetsAfter.status, 200);
    assert.equal(ownAssetsAfter.body.assets.length, 0);
  });

  test('job brief import detects known and unknown asset numbers without creating unknown assets', async () => {
    const mobile20 = itemByKey('equipment_mobile_crane_20t_city');
    const enable = await enableCatalogueItems([mobile20]);
    assert.equal(enable.status, 200);
    const asset = await createAsset(mobile20, 'MC20-001');
    assert.equal(asset.status, 201);

    const preview = await request.post('/api/jobs/import-brief/preview').set(auth()).send({
      source_type: 'pasted_text',
      content: [
        'Client: Synthetic Lift Co',
        'Site: Pinkenba QLD',
        'Job: 20T mobile crane lift.',
        'Plant No. MC20-001 requested.',
        'Backup crane number FR25-999 mentioned but not confirmed.',
        'Timing:',
        'Monday 1 June 2026',
        'Start: 6:00 AM',
        'Finish: 1:00 PM',
        'Timezone: Australia/Brisbane'
      ].join('\n')
    });
    assert.equal(preview.status, 200);
    assert.equal(preview.body.extracted.suggested_assets.length, 1);
    assert.equal(preview.body.extracted.suggested_assets[0].asset_number, 'MC20-001');
    assert.deepEqual(preview.body.extracted.company_asset_ids, [asset.body.id]);
    assert.ok(preview.body.extracted.unknown_asset_numbers.includes('FR25-999'));
    assert.ok(preview.body.warnings.some((warning) => /not found in company asset register/i.test(warning)));

    const created = await request.post(`/api/jobs/import-brief/${preview.body.import_id}/create-job`).set(auth()).send({
      ...preview.body.extracted,
      schedule_status: 'planned'
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.asset_assignments.length, 1);
    assert.equal(created.body.asset_assignments[0].asset.asset_number, 'MC20-001');

    const unknownCreated = db.prepare(`
      SELECT COUNT(*) AS count
      FROM company_assets
      WHERE company_id = ? AND asset_number = 'FR25-999'
    `).get(companyId);
    assert.equal(unknownCreated.count, 0);
  });

  test('labour-only job brief import turns equipment mentions into review-only one-off requirements', async () => {
    const c6 = itemByKey('credential_hrwl_c6');
    const mobile100 = itemByKey('equipment_mobile_crane_100t');
    const lowLoader = itemByKey('transport_low_loader');
    await request.patch('/api/company/profile').set(auth()).send({
      operating_mode: 'labour_only'
    });
    const enable = await enableCatalogueItems([c6]);
    assert.equal(enable.status, 200);

    const preview = await request.post('/api/jobs/import-brief/preview').set(auth()).send({
      source_type: 'pasted_text',
      content: [
        'Client: Synthetic Labour Co',
        'Site: Brisbane QLD',
        'Job: Supply crane operator and dogman for 100T crane work with Low Loader access.',
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
    assert.ok(preview.body.warnings.some((warning) => /configured as labour-only/i.test(warning)));
    assert.ok(preview.body.extracted.requirement_item_ids.includes(c6.id));
    assert.equal(preview.body.extracted.requirement_item_ids.includes(mobile100.id), false);
    assert.equal(preview.body.extracted.requirement_item_ids.includes(lowLoader.id), false);
    assert.ok(preview.body.extracted.custom_requirements.some((item) => item.label === '100T Mobile Crane'));
    assert.ok(preview.body.extracted.custom_requirements.some((item) => item.label === 'Low Loader'));

    const created = await request.post(`/api/jobs/import-brief/${preview.body.import_id}/create-job`).set(auth()).send({
      ...preview.body.extracted,
      schedule_status: 'planned'
    });
    assert.equal(created.status, 201);
    assert.ok(created.body.structured_requirements.some((item) => item.normalized_key === 'credential_hrwl_c6'));
    assert.ok(created.body.structured_requirements.some((item) => item.is_custom && item.label === '100T Mobile Crane'));
    assert.ok(created.body.structured_requirements.some((item) => item.is_custom && item.label === 'Low Loader'));
    assert.equal(created.body.asset_assignments.length, 0);
    assert.equal(created.body.manual_requirement_review_required, true);
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
        'VOC-C6',
        'Working at Heights',
        'RIW',
        'SARC',
        'WETT',
        'MC',
        'HC',
        'HR',
        'Electrical Spotter',
        'Front End Loader'
      ].join('\n')
    });
    assert.equal(preview.status, 200);

    const selected = preview.body.extracted.structured_requirements.selected_catalogue_item_keys;
    const suggested = preview.body.extracted.structured_requirements.suggested_catalogue_item_keys;
    assert.ok(selected.includes('credential_hrwl_c6'));
    assert.ok(selected.includes('equipment_mobile_crane_100t'));
    assert.ok(selected.includes('transport_low_loader'));
    assert.ok(selected.includes('civil_telehandler'));
    assert.ok(suggested.includes('voc_c6'));
    assert.ok(suggested.includes('credential_working_at_height_wah'));
    assert.ok(suggested.includes('credential_white_card'));
    assert.ok(suggested.includes('rail_riw'));
    assert.ok(suggested.includes('rail_sarc'));
    assert.ok(suggested.includes('rail_wett'));
    assert.ok(suggested.includes('credential_heavy_vehicle_mc'));
    assert.ok(suggested.includes('credential_heavy_vehicle_hc'));
    assert.ok(suggested.includes('credential_heavy_vehicle_hr'));
    assert.ok(suggested.includes('energy_electrical_spotter'));
    assert.ok(suggested.includes('civil_front_end_loader'));
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

  test('SmartRank and CredentialGate still work in labour-only mode', async () => {
    await request.patch('/api/company/profile').set(auth()).send({
      operating_mode: 'labour_only'
    });

    const readyWorker = seedWorker(db, companyId, {
      name: 'Labour Ready Operator',
      email: 'labour-ready@example.com'
    });
    seedCredential(db, readyWorker, companyId, { type: 'high_risk_licence_crane' });

    const blockedWorker = seedWorker(db, companyId, {
      name: 'Labour Blocked Operator',
      email: 'labour-blocked@example.com'
    });
    seedCredential(db, blockedWorker, companyId, { type: 'white_card' });

    const c6 = itemByKey('credential_hrwl_c6');
    const created = await request.post('/api/jobs').set(auth()).send(createJobPayload({
      task_tags: ['dogman', 'shutdown'],
      crew_roles_required: ['crane_operator'],
      requirement_item_ids: [c6.id]
    }));
    assert.equal(created.status, 201);
    assert.equal(created.body.asset_assignments.length, 0);

    const smartrank = await request.get(`/api/jobs/${created.body.id}/smartrank`).set(auth());
    assert.equal(smartrank.status, 200);
    assert.ok(smartrank.body.ranked.some((entry) => entry.worker.id === readyWorker));
    const blocked = smartrank.body.blocked.find((entry) => entry.worker.id === blockedWorker);
    assert.ok(blocked);
    assert.ok(blocked.blocks.some((block) => block.type === 'credential_missing'));
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
    assert.ok(tables.includes('company_assets'));
    assert.ok(tables.includes('job_asset_assignments'));
    assert.ok(db.prepare(`PRAGMA table_info(companies)`).all().some((column) => column.name === 'operating_mode'));
    assert.ok(itemByKey('transport_low_loader'));
  });
});
