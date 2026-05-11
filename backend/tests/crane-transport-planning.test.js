'use strict';

const { describe, test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const supertest = require('supertest');

const { setDb } = require('../src/db');
const { signToken } = require('../src/middleware/auth');
const {
  createTestDb,
  seedCompanyAndUser
} = require('./helpers/db');
const {
  listCraneModels,
  listCraneTravelStates
} = require('../src/services/crane-model-catalog');
const {
  buildCraneTransportPlan
} = require('../src/services/crane-transport-planning');

const SAMPLE_COUNTERWEIGHT_TXT = fs.readFileSync(
  path.join(__dirname, '../samples/job-brief-counterweight-sample.txt'),
  'utf8'
);

let db;
let app;
let request;
let companyId;
let userId;
let token;

function auth() {
  return { Authorization: `Bearer ${token}` };
}

function getModelByName(name) {
  return listCraneModels(db).find((item) => item.model === name);
}

function getTravelState(modelName, label) {
  const model = getModelByName(modelName);
  return listCraneTravelStates(db, model.id).find((item) => item.state_label === label);
}

beforeEach(() => {
  db = createTestDb();
  setDb(db);
  app = require('../src/app');
  request = supertest(app);
  ({ companyId, userId } = seedCompanyAndUser(db, {
    email: 'dispatcher+crane@test.com',
    role: 'admin',
    timezone: 'Australia/Brisbane'
  }));
  token = signToken({
    id: userId,
    company_id: companyId,
    role: 'admin',
    name: 'Crane Planner Admin'
  });
});

afterEach(() => {
  if (db) {
    db.close();
    db = null;
  }
  setDb(null);
});

describe('Crane model catalog, planning rules, and job integration', () => {
  test('crane models endpoint returns seeded Grove GMK5150L', async () => {
    const res = await request.get('/api/crane-models').set(auth());
    assert.equal(res.status, 200);
    assert.ok(res.body.some((item) => item.manufacturer === 'Grove' && item.model === 'GMK5150L'));
  });

  test('crane model travel states endpoint returns multiple states', async () => {
    const gmk5150l = getModelByName('GMK5150L');
    const res = await request.get(`/api/crane-models/${gmk5150l.id}/travel-states`).set(auth());
    assert.equal(res.status, 200);
    assert.ok(res.body.length >= 4);
  });

  test('GMK5150L and GMK5150L-1 do not incorrectly share unsupported 24t assumptions', () => {
    const gmk5150l24 = getTravelState('GMK5150L', '24.0t at 16.5t/axle');
    const gmk5150l1_24 = getTravelState('GMK5150L-1', '24.0t heavy-roadable package');
    const gmk5150l1_309 = getTravelState('GMK5150L-1', '30.9t reduced heavy-roadable state');

    assert.ok(gmk5150l24);
    assert.equal(gmk5150l24.review_required, false);
    assert.ok(gmk5150l1_24);
    assert.equal(gmk5150l1_24.review_required, true);
    assert.ok(gmk5150l1_309);
    assert.equal(gmk5150l1_309.review_required, false);
  });

  test('counterweight less than selected travel-state carried amount does not require extra transport', () => {
    const gmk5150l = getModelByName('GMK5150L');
    const state24 = getTravelState('GMK5150L', '24.0t at 16.5t/axle');
    const plan = buildCraneTransportPlan(db, {
      crane_model_id: gmk5150l.id,
      crane_travel_state_id: state24.id,
      counterweight_required_tonnes: 20
    });

    assert.equal(plan.counterweight_to_transport_tonnes, 0);
    assert.equal(plan.requires_counterweight_transport, false);
    assert.equal(plan.support_truck_required, false);
  });

  test('counterweight greater than selected travel-state carried amount requires support transport', () => {
    const gmk5150l = getModelByName('GMK5150L');
    const state24 = getTravelState('GMK5150L', '24.0t at 16.5t/axle');
    const plan = buildCraneTransportPlan(db, {
      crane_model_id: gmk5150l.id,
      crane_travel_state_id: state24.id,
      counterweight_required_tonnes: 44.5
    });

    assert.equal(plan.requires_counterweight_transport, true);
    assert.equal(plan.support_truck_required, true);
    assert.equal(plan.transport_review_required, true);
  });

  test('44.5t required vs 24t carried calculates 20.5t counterweight to transport', () => {
    const gmk5150l = getModelByName('GMK5150L');
    const state24 = getTravelState('GMK5150L', '24.0t at 16.5t/axle');
    const plan = buildCraneTransportPlan(db, {
      crane_model_id: gmk5150l.id,
      crane_travel_state_id: state24.id,
      counterweight_required_tonnes: 44.5
    });

    assert.equal(plan.counterweight_to_transport_tonnes, 20.5);
  });

  test('missing crane model flags manual review', () => {
    const state24 = getTravelState('GMK5150L', '24.0t at 16.5t/axle');
    const plan = buildCraneTransportPlan(db, {
      crane_travel_state_id: state24.id,
      counterweight_required_tonnes: 24
    });

    assert.equal(plan.manual_review_required, true);
    assert.match(plan.review_reason, /Crane model unknown\./);
  });

  test('missing travel state flags manual review', () => {
    const gmk5150l = getModelByName('GMK5150L');
    const plan = buildCraneTransportPlan(db, {
      crane_model_id: gmk5150l.id,
      counterweight_required_tonnes: 24
    });

    assert.equal(plan.manual_review_required, true);
    assert.match(plan.review_reason, /Crane travel state not selected\./);
  });

  test('missing counterweight requirement flags manual review', () => {
    const gmk5150l = getModelByName('GMK5150L');
    const state24 = getTravelState('GMK5150L', '24.0t at 16.5t/axle');
    const plan = buildCraneTransportPlan(db, {
      crane_model_id: gmk5150l.id,
      crane_travel_state_id: state24.id
    });

    assert.equal(plan.manual_review_required, true);
    assert.match(plan.review_reason, /Counterweight not assessed\./);
  });

  test('NHVR and permit review wording uses review language, not approval language', () => {
    const gmk5150l = getModelByName('GMK5150L');
    const state24 = getTravelState('GMK5150L', '24.0t at 16.5t/axle');
    const plan = buildCraneTransportPlan(db, {
      crane_model_id: gmk5150l.id,
      crane_travel_state_id: state24.id,
      counterweight_required_tonnes: 24,
      site_access_notes: 'NHVR permit check required before travel. Restricted access on site.'
    });
    const summary = (plan.messages || []).join(' | ');

    assert.equal(plan.nhvr_review_required, true);
    assert.equal(plan.permit_review_required, true);
    assert.match(summary, /NHVR \/ state notice or permit check may be required/i);
    assert.equal(/approved|compliant|legal to travel|safe to dispatch/i.test(summary), false);
  });

  test('restricted access, low loader, and float notes set route and transport review', () => {
    const gmk5150l = getModelByName('GMK5150L');
    const state24 = getTravelState('GMK5150L', '24.0t at 16.5t/axle');
    const plan = buildCraneTransportPlan(db, {
      crane_model_id: gmk5150l.id,
      crane_travel_state_id: state24.id,
      counterweight_required_tonnes: 24,
      site_access_notes: 'Restricted access. Confirm low loader and float access before arrival.'
    });

    assert.equal(plan.transport_review_required, true);
    assert.equal(plan.route_review_required, true);
  });

  test('job creation stores crane requirement', async () => {
    const gmk5150l = getModelByName('GMK5150L');
    const state24 = getTravelState('GMK5150L', '24.0t at 16.5t/axle');
    const res = await request.post('/api/jobs').set(auth()).send({
      client_name: 'Counterweight Client',
      site_name: 'Counterweight Site',
      date: '2026-06-01',
      shift_type: 'day',
      shift_start_time: '06:00',
      scheduled_end_time: '13:00',
      job_timezone: 'Australia/Brisbane',
      schedule_status: 'planned',
      crane_model_id: gmk5150l.id,
      crane_travel_state_id: state24.id,
      required_capacity_tonnes: 100,
      counterweight_required_tonnes: 44.5,
      site_access_notes: 'Restricted access',
      setup_notes: 'Counterweight support load expected'
    });

    assert.equal(res.status, 201);
    assert.ok(res.body.crane_planning);
    const requirement = db.prepare(`
      SELECT *
      FROM job_crane_requirements
      WHERE job_id = ?
    `).get(res.body.id);
    assert.ok(requirement);
  });

  test('job creation creates transport requirement when needed', async () => {
    const gmk5150l = getModelByName('GMK5150L');
    const state24 = getTravelState('GMK5150L', '24.0t at 16.5t/axle');
    const res = await request.post('/api/jobs').set(auth()).send({
      client_name: 'Transport Client',
      site_name: 'Transport Site',
      date: '2026-06-02',
      shift_type: 'day',
      shift_start_time: '06:00',
      scheduled_end_time: '13:00',
      job_timezone: 'Australia/Brisbane',
      schedule_status: 'planned',
      crane_model_id: gmk5150l.id,
      crane_travel_state_id: state24.id,
      counterweight_required_tonnes: 44.5
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.crane_planning.requires_counterweight_transport, true);
    assert.ok((res.body.crane_planning.transport_requirements || []).length >= 1);
  });

  test('audit event records counterweight transport assessment', async () => {
    const gmk5150l = getModelByName('GMK5150L');
    const state24 = getTravelState('GMK5150L', '24.0t at 16.5t/axle');
    const res = await request.post('/api/jobs').set(auth()).send({
      client_name: 'Audit Crane Client',
      site_name: 'Audit Crane Site',
      date: '2026-06-03',
      shift_type: 'day',
      shift_start_time: '06:00',
      scheduled_end_time: '13:00',
      job_timezone: 'Australia/Brisbane',
      schedule_status: 'planned',
      crane_model_id: gmk5150l.id,
      crane_travel_state_id: state24.id,
      counterweight_required_tonnes: 44.5
    });

    assert.equal(res.status, 201);
    const event = db.prepare(`
      SELECT *
      FROM audit_events
      WHERE company_id = ? AND job_id = ? AND event_type = 'job_counterweight_transport_assessed'
    `).get(companyId, res.body.id);
    assert.ok(event);
  });

  test('import preview extracts GMK5150L and 24T counterweight from the sample brief', async () => {
    const res = await request.post('/api/jobs/import-brief/preview').set(auth()).send({
      source_type: 'txt',
      filename: 'job-brief-counterweight-sample.txt',
      content: SAMPLE_COUNTERWEIGHT_TXT
    });

    assert.equal(res.status, 200);
    assert.match(res.body.extracted.crane_model_name, /GMK5150L/);
    assert.equal(res.body.extracted.counterweight_required_tonnes, 24);
  });

  test('import preview extracts GMK5150L-1 distinctly', async () => {
    const res = await request.post('/api/jobs/import-brief/preview').set(auth()).send({
      source_type: 'pasted_text',
      content: [
        'Client: Variant Lift Co',
        'Site: Brisbane QLD',
        'Crane:',
        'Grove GMK5150L-1 required.',
        'Transport:',
        'Semi trailer access required.',
        'Timing:',
        'Tuesday 2 June 2026',
        'Start: 6:00 AM',
        'Finish: 1:00 PM',
        'Timezone: Australia/Brisbane'
      ].join('\n')
    });

    assert.equal(res.status, 200);
    assert.match(res.body.extracted.crane_model_name, /GMK5150L-1/);
    assert.ok(!/GMK5150L$/.test(res.body.extracted.crane_model_name));
  });

  test('import preview detects full 44.5T counterweight if explicitly present', async () => {
    const res = await request.post('/api/jobs/import-brief/preview').set(auth()).send({
      source_type: 'pasted_text',
      content: [
        'Client: Full Ballast Co',
        'Site: Brisbane QLD',
        'Crane:',
        'Grove GMK5150L-1 required with full 44.5T counterweight.',
        'Timing:',
        'Wednesday 3 June 2026',
        'Start: 6:00 AM',
        'Finish: 1:00 PM',
        'Timezone: Australia/Brisbane'
      ].join('\n')
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.extracted.counterweight_required_tonnes, 44.5);
  });

  test('import preview detects semi trailer, low loader, and float transport cues', async () => {
    const res = await request.post('/api/jobs/import-brief/preview').set(auth()).send({
      source_type: 'pasted_text',
      content: [
        'Client: Haulage Co',
        'Site: Restricted industrial site QLD',
        'Transport:',
        'Use one semi trailer. Confirm low loader and float access before arrival.',
        'Timing:',
        'Thursday 4 June 2026',
        'Start: 6:00 AM',
        'Finish: 1:00 PM',
        'Timezone: Australia/Brisbane'
      ].join('\n')
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.extracted.task_tags.includes('semi_trailer'));
    assert.ok(res.body.extracted.task_tags.includes('low_loader'));
    assert.match(res.body.extracted.site_access_notes, /low loader/i);
  });

  test('import preview flags inferred 100T setup as medium-confidence review', async () => {
    const res = await request.post('/api/jobs/import-brief/preview').set(auth()).send({
      source_type: 'txt',
      filename: 'job-brief-counterweight-sample.txt',
      content: SAMPLE_COUNTERWEIGHT_TXT
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.extracted.required_capacity_tonnes, 100);
    assert.equal(res.body.confidence.required_capacity_tonnes, 'medium');
    assert.ok(res.body.warnings.some((warning) => /Crane setup inferred/i.test(warning)));
  });
});
