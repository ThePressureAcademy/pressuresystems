'use strict';

const { test, describe, before, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');
const { randomUUID } = require('node:crypto');

const {
  createTestDb,
  seedCompanyAndUser,
  seedCredential,
  seedJob,
  seedWorker
} = require('./helpers/db');
const { setDb } = require('../src/db');
const { signToken } = require('../src/middleware/auth');
const {
  formatDisplayLabel,
  normalizeCredentialType,
  normalizeSiteConditions,
  normalizeWorkerRoles
} = require('../src/services/intake-catalogues');
const { computeCredentialStatus } = require('../src/services/credential-gate');

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
    companyName: 'Final Intake Usability Company',
    email: 'intake-admin@example.com',
    role: 'admin',
    timezone: 'Australia/Brisbane'
  });
  token = signToken({
    id: company.userId,
    company_id: company.companyId,
    role: 'admin',
    name: 'Intake Admin'
  });
});

afterEach(() => {
  db.close();
});

function auth(useToken = token) {
  return { Authorization: `Bearer ${useToken}` };
}

function flatOptions(groups) {
  return (groups || []).flatMap((group) => group.options || []);
}

function optionValuesByGroup(groups = []) {
  return Object.fromEntries((groups || []).map((group) => [
    group.group,
    (group.options || []).map((option) => option.value)
  ]));
}

describe('intake catalogue and display labels', () => {
  test('intake options expose structured roles credentials site conditions and timezones', async () => {
    const res = await request.get('/api/company/intake-options').set(auth());

    assert.equal(res.status, 200);
    const roleValues = flatOptions(res.body.worker_role_groups).map((option) => option.value);
    assert.ok(roleValues.includes('crane_operator'));
    assert.ok(roleValues.includes('dogman'));
    assert.ok(roleValues.includes('truck_driver'));
    assert.ok(roleValues.includes('welder'));
    assert.equal(roleValues.includes('weilder'), false);

    const credentialOptions = flatOptions(res.body.credential_groups);
    const credentialValues = credentialOptions.map((option) => option.value);
    const credentialGroups = optionValuesByGroup(res.body.credential_groups);
    assert.equal(res.body.credential_groups.filter((group) => group.group === 'High Risk Work').length, 1);
    for (const code of ['sb', 'si', 'sa', 'dg', 'rb', 'ri', 'ra', 'ct', 'cs', 'cd', 'cp', 'c2', 'c6', 'c1', 'c0', 'cb', 'cv', 'cn', 'lf', 'lo', 'es', 'ea', 'ai', 'pb', 'rs', 'wp']) {
      assert.ok(credentialValues.includes(`hrwl_${code}`), `missing HRWL ${code}`);
    }
    assert.ok(credentialGroups['High Risk Work'].every((value) => value.startsWith('hrwl_')));
    assert.ok(credentialGroups['Working at Height'].includes('working_at_height'));
    assert.ok(credentialGroups['Safety / Site'].includes('white_card'));
    assert.ok(credentialGroups['Safety / Site'].includes('first_aid'));
    assert.ok(credentialGroups['Heavy Vehicle'].includes('heavy_vehicle_mc'));
    assert.ok(credentialGroups.Rail.includes('rail_riw'));
    assert.ok(credentialGroups['Energy / Electrical'].includes('electrical_spotter'));
    assert.ok(credentialGroups['Civil / Plant'].includes('machinery_telehandler'));
    assert.ok(credentialGroups.VOC.includes('voc_c6'));
    for (const nonHrw of ['working_at_height', 'first_aid', 'white_card', 'rail_riw', 'rail_sarc', 'rail_wett', 'heavy_vehicle_mc', 'electrical_spotter', 'machinery_telehandler', 'voc_c6']) {
      assert.equal(credentialGroups['High Risk Work'].includes(nonHrw), false, `${nonHrw} must not appear under High Risk Work`);
    }
    for (const group of res.body.credential_groups) {
      assert.doesNotMatch(group.group, /_/);
      for (const option of group.options || []) assert.doesNotMatch(option.label, /_/);
    }
    assert.ok(credentialValues.includes('trade_certificate_carpentry'));
    assert.ok(credentialValues.includes('trade_certificate_electrical'));
    assert.ok(credentialValues.includes('rail_riw'));
    assert.ok(credentialValues.includes('working_at_height'));
    assert.ok(credentialValues.includes('first_aid'));
    assert.ok(credentialValues.includes('voc_c6'));
    assert.ok(credentialValues.includes('voc_excavator'));
    assert.ok(credentialValues.includes('machinery_excavator'));
    assert.equal(credentialOptions.find((option) => option.value === 'hrwl_c0').label, 'C0');

    const conditionValues = flatOptions(res.body.site_condition_groups).map((option) => option.value);
    assert.ok(conditionValues.includes('sloped_ground'));
    assert.ok(conditionValues.includes('underground_services'));
    assert.ok(conditionValues.includes('overhead_trees'));
    assert.ok(conditionValues.includes('poor_access_and_egress'));
    assert.ok(conditionValues.includes('overhead_powerlines'));

    assert.ok(res.body.timezones.includes('Australia/Brisbane'));
    assert.ok(res.body.timezones.includes('Australia/Sydney'));
    assert.ok(res.body.timezones.includes('Australia/Adelaide'));
    assert.ok(res.body.timezones.includes('Australia/Perth'));
  });

  test('normalizers keep internal keys while display labels remove underscores', () => {
    assert.equal(formatDisplayLabel('crane_operator'), 'Crane Operator');
    assert.equal(formatDisplayLabel('plant_and_labour'), 'Plant + labour');
    assert.equal(formatDisplayLabel('site_condition_poor_ground'), 'Site Condition Poor Ground');
    assert.deepEqual(normalizeWorkerRoles(['Crane Operator', 'Dogman', 'Truck Driver']), [
      'crane_operator',
      'dogman',
      'truck_driver'
    ]);
    assert.equal(normalizeCredentialType('CO'), 'hrwl_c0');
    assert.equal(normalizeCredentialType('C0'), 'hrwl_c0');
    assert.deepEqual(normalizeSiteConditions(['poor ground', 'underground services']), [
      'poor_ground_conditions',
      'underground_services'
    ]);
  });
});

describe('worker role and credential intake', () => {
  test('worker can be created and updated with multiple role chips', async () => {
    const created = await request
      .post('/api/workers')
      .set(auth())
      .send({
        name: 'Multi Role Worker',
        email: 'multi-role@example.com',
        roles: ['Crane Operator', 'Dogman', 'Truck Driver'],
        employment_type: 'casual',
        status: 'available'
      });

    assert.equal(created.status, 201);
    assert.deepEqual(created.body.roles, ['crane_operator', 'dogman', 'truck_driver']);
    assert.deepEqual(created.body.role_labels, ['Crane Operator', 'Dogman', 'Truck Driver']);
    assert.equal(created.body.role, 'crane_operator');

    const patched = await request
      .patch(`/api/workers/${created.body.id}`)
      .set(auth())
      .send({
        roles: ['Rigger', 'Traffic Controller']
      });

    assert.equal(patched.status, 200);
    assert.deepEqual(patched.body.roles, ['rigger', 'traffic_controller']);
    assert.deepEqual(patched.body.role_labels, ['Rigger', 'Traffic Controller']);

    const events = db.prepare(`
      SELECT event_type
      FROM audit_events
      WHERE company_id = ? AND worker_id = ?
    `).all(company.companyId, created.body.id).map((row) => row.event_type);
    assert.ok(events.includes('worker_roles_updated'));
  });

  test('worker credential uses expanded structured catalogue and CredentialGate matches job requirements', async () => {
    const workerId = seedWorker(db, company.companyId, {
      roles: ['crane_operator', 'dogman']
    });

    const credential = await request
      .post(`/api/workers/${workerId}/credentials`)
      .set(auth())
      .send({
        type: 'C6',
        identifier: 'HRWL-C6-123',
        expiry_date: '2029-01-01',
        verified: true
      });

    assert.equal(credential.status, 201);
    assert.equal(credential.body.type, 'hrwl_c6');
    assert.equal(credential.body.type_label, 'C6');

    const status = computeCredentialStatus(
      [{ id: credential.body.id, type: 'hrwl_c6', expiry_date: '2029-01-01', status: 'valid' }],
      ['hrwl_c6'],
      new Date('2026-05-15T00:00:00Z')
    );
    assert.equal(status.blocks.length, 0);
    assert.equal(status.credentialScore, 100);

    const legacyStatus = computeCredentialStatus(
      [{ id: 'legacy', type: 'high_risk_licence_crane', expiry_date: '2029-01-01', status: 'valid' }],
      ['hrwl_c6'],
      new Date('2026-05-15T00:00:00Z')
    );
    assert.equal(legacyStatus.blocks.length, 0);

    const reverseLegacyStatus = computeCredentialStatus(
      [{ id: 'specific', type: 'hrwl_c6', expiry_date: '2029-01-01', status: 'valid' }],
      ['high_risk_licence_crane'],
      new Date('2026-05-15T00:00:00Z')
    );
    assert.equal(reverseLegacyStatus.blocks.length, 0);

    const reclassifiedStatus = computeCredentialStatus(
      [
        { id: 'wah', type: 'working_at_height', expiry_date: '2029-01-01', status: 'valid' },
        { id: 'riw', type: 'rail_riw', expiry_date: '2029-01-01', status: 'valid' }
      ],
      ['working_at_height', 'rail_riw'],
      new Date('2026-05-15T00:00:00Z')
    );
    assert.equal(reclassifiedStatus.blocks.length, 0);
  });
});

describe('job intake roles credentials equipment site conditions and timezone', () => {
  test('job creation persists multi-select crew roles credentials equipment classes site conditions and notes', async () => {
    const res = await request
      .post('/api/jobs')
      .set(auth())
      .send({
        client_name: 'Structured Client',
        site_name: 'Structured Site',
        site_location: 'Brisbane Yard',
        date: '2026-06-20',
        shift_start_time: '07:00',
        scheduled_end_time: '15:00',
        shift_type: 'day',
        schedule_status: 'planned',
        crew_roles_required: ['Crane Operator', 'Dogman', 'Rigger'],
        required_credentials: ['C6', 'DG', 'Working at Height', 'First Aid'],
        crane_classes_required: ['50T Mobile Crane', '100T Mobile Crane'],
        site_conditions: ['Sloped ground', 'Overhead trees', 'Poor access and egress'],
        travel_required: true,
        notes: 'Spreader bar, extra timber, crane mats.'
      });

    assert.equal(res.status, 201);
    assert.deepEqual(res.body.crew_roles_required, ['crane_operator', 'dogman', 'rigger']);
    assert.deepEqual(res.body.required_credentials, ['hrwl_c6', 'hrwl_dg', 'working_at_height', 'first_aid']);
    assert.deepEqual(res.body.crane_classes_required, ['50T Mobile Crane', '100T Mobile Crane']);
    assert.deepEqual(res.body.site_conditions, ['sloped_ground', 'overhead_trees', 'poor_access_and_egress']);
    assert.equal(res.body.travel_required, 1);
    assert.match(res.body.notes, /Spreader bar/);

    const persisted = await request.get(`/api/jobs/${res.body.id}`).set(auth());
    assert.equal(persisted.status, 200);
    assert.deepEqual(persisted.body.required_credentials, ['hrwl_c6', 'hrwl_dg', 'working_at_height', 'first_aid']);
    assert.deepEqual(persisted.body.crane_classes_required, ['50T Mobile Crane', '100T Mobile Crane']);
  });

  test('job update audits role credential equipment site condition and notes changes', async () => {
    const jobId = seedJob(db, company.companyId, company.userId, {
      client_name: 'Before Client',
      site_name: 'Before Site'
    });

    const res = await request
      .patch(`/api/jobs/${jobId}`)
      .set(auth())
      .send({
        date: '2026-06-21',
        shift_start_time: '08:00',
        scheduled_end_time: '12:00',
        shift_type: 'day',
        schedule_status: 'planned',
        crew_roles_required: ['Truck Driver', 'Dogman'],
        required_credentials: ['C6', 'RIW'],
        crane_classes_required: ['20T Mobile Crane', 'Low Loader'],
        site_conditions: ['Poor ground', 'Underground services'],
        notes: 'Updated additional job requirements.'
      });

    assert.equal(res.status, 200);
    assert.deepEqual(res.body.crew_roles_required, ['truck_driver', 'dogman']);
    assert.deepEqual(res.body.required_credentials, ['hrwl_c6', 'rail_riw']);
    assert.deepEqual(res.body.site_conditions, ['poor_ground_conditions', 'underground_services']);

    const events = db.prepare(`
      SELECT event_type
      FROM audit_events
      WHERE company_id = ? AND job_id = ?
    `).all(company.companyId, jobId).map((row) => row.event_type);
    assert.ok(events.includes('job_required_roles_updated'));
    assert.ok(events.includes('job_credentials_updated'));
    assert.ok(events.includes('job_equipment_requirements_updated'));
    assert.ok(events.includes('job_site_conditions_updated'));
    assert.ok(events.includes('job_additional_requirements_updated'));
  });

  test('company default timezone is configurable and new jobs default from company timezone', async () => {
    const profile = await request
      .patch('/api/company/profile')
      .set(auth())
      .send({ timezone: 'Australia/Sydney' });

    assert.equal(profile.status, 200);
    assert.equal(profile.body.timezone, 'Australia/Sydney');

    const created = await request
      .post('/api/jobs')
      .set(auth())
      .send({
        client_name: 'Timezone Client',
        site_name: 'Timezone Site',
        date: '2026-06-20',
        shift_start_time: '07:00',
        scheduled_end_time: '15:00',
        shift_type: 'day',
        schedule_status: 'planned'
      });

    assert.equal(created.status, 201);
    assert.equal(created.body.job_timezone, 'Australia/Sydney');
    assert.equal(created.body.schedule.timezone, 'Australia/Sydney');

    const events = db.prepare(`
      SELECT event_type
      FROM audit_events
      WHERE company_id = ?
    `).all(company.companyId).map((row) => row.event_type);
    assert.ok(events.includes('company_default_timezone_updated'));
  });

  test('client and site suggestions are derived from same company history only', async () => {
    seedJob(db, company.companyId, company.userId, {
      client_name: 'Known Client',
      site_name: 'Known Site',
      site_conditions: ['poor_ground_conditions'],
      site_location: 'Known Yard'
    });
    const other = seedCompanyAndUser(db, {
      companyId: randomUUID(),
      userId: randomUUID(),
      email: 'other-intake-suggestions@example.com'
    });
    seedJob(db, other.companyId, other.userId, {
      client_name: 'Other Tenant Client',
      site_name: 'Other Tenant Site',
      site_location: 'Other Yard'
    });

    const res = await request.get('/api/jobs/suggestions').set(auth());

    assert.equal(res.status, 200);
    assert.deepEqual(res.body.client_names, ['Known Client']);
    assert.deepEqual(res.body.site_names, ['Known Site']);
    assert.deepEqual(res.body.site_locations, ['Known Yard']);
    assert.deepEqual(res.body.site_conditions_by_site['Known Site'], ['poor_ground_conditions']);
    assert.equal(res.body.client_names.includes('Other Tenant Client'), false);
  });
});
