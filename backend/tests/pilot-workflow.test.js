'use strict';

/**
 * Integration test mirroring the exact dispatcher flow the pilot UI walks through:
 *   Login → Worker → Credential → Fatigue → Job → SmartRank → Allocation → Audit → Metrics
 *
 * Hits each endpoint via HTTP exactly as the SPA does, asserting the responses
 * the UI relies on (block/warning shape, snapshot fields, audit/metric counts).
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const { createTestDb } = require('./helpers/db');
const { setDb } = require('../src/db');

let db, app, request;
let token, userId, companyId;

before(() => {
  db = createTestDb();
  setDb(db);
  app = require('../src/app');
  request = supertest(app);

  // Seed company + admin user so login works
  companyId = randomUUID();
  userId = randomUUID();
  db.prepare(`
    INSERT INTO companies (id, name, locations, operating_regions, status, pilot_start_date)
    VALUES (?, 'Pilot Co.', '[]', '[]', 'pilot', '2026-01-01')
  `).run(companyId);
  db.prepare(`
    INSERT INTO users (id, company_id, name, email, password_hash, role)
    VALUES (?, ?, 'Pilot Admin', 'pilot@example.com', ?, 'admin')
  `).run(userId, companyId, bcrypt.hashSync('pilotpass', 1));
});

after(() => {
  db.close();
});

const auth = () => ({ Authorization: `Bearer ${token}` });

describe('Pilot workflow — full UI walkthrough', () => {

  test('1. Login flow: POST /api/auth/login returns token', async () => {
    const res = await request.post('/api/auth/login').send({
      email: 'pilot@example.com',
      password: 'pilotpass',
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.equal(res.body.user.email, 'pilot@example.com');
    assert.equal(res.body.user.role, 'admin');
    token = res.body.token;
  });

  test('1b. Login rejects bad credentials with 401', async () => {
    const res = await request.post('/api/auth/login').send({
      email: 'pilot@example.com',
      password: 'wrong',
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Invalid credentials');
  });

  let workerAId, workerBId;

  test('2. Worker can be created through the UI flow', async () => {
    const resA = await request.post('/api/workers').set(auth()).send({
      name: 'Alex Operator',
      role: 'crane_operator',
      employment_type: 'permanent',
      crane_classes: ['25T', '55T'],
      usual_depot: 'Sydney',
    });
    assert.equal(resA.status, 201);
    assert.equal(resA.body.name, 'Alex Operator');
    assert.deepEqual(resA.body.crane_classes, ['25T', '55T']);
    workerAId = resA.body.id;

    // Second worker — used for non-top-ranked override path
    const resB = await request.post('/api/workers').set(auth()).send({
      name: 'Blake Backup',
      role: 'crane_operator',
      employment_type: 'casual',
      crane_classes: [],
      usual_depot: 'Newcastle',
    });
    assert.equal(resB.status, 201);
    workerBId = resB.body.id;

    // GET /api/workers should list both
    const list = await request.get('/api/workers').set(auth());
    assert.equal(list.status, 200);
    assert.equal(list.body.length, 2);
  });

  test('3. Credential can be added through the UI flow', async () => {
    const future = new Date(); future.setFullYear(future.getFullYear() + 2);
    const expiry = future.toISOString().slice(0, 10);

    const resA = await request.post(`/api/workers/${workerAId}/credentials`).set(auth()).send({
      type: 'high_risk_licence_crane',
      identifier: 'CN-12345',
      expiry_date: expiry,
      verified: true,
    });
    assert.equal(resA.status, 201);
    assert.equal(resA.body.type, 'high_risk_licence_crane');
    assert.equal(resA.body.status, 'valid');

    const resB = await request.post(`/api/workers/${workerBId}/credentials`).set(auth()).send({
      type: 'high_risk_licence_crane',
      expiry_date: expiry,
    });
    assert.equal(resB.status, 201);

    // Worker C gets NO credential (used to prove credential blocks)
    const resC = await request.post('/api/workers').set(auth()).send({
      name: 'Casey Uncertified',
      role: 'crane_operator',
      employment_type: 'permanent',
    });
    assert.equal(resC.status, 201);

    const list = await request.get(`/api/workers/${workerAId}/credentials`).set(auth());
    assert.equal(list.status, 200);
    assert.equal(list.body.length, 1);
  });

  test('4. Fatigue record can be added through the UI flow', async () => {
    const startsAt = new Date(Date.now() - 30 * 3_600_000); // 30h ago
    const endsAt = new Date(Date.now() - 22 * 3_600_000);   // 22h ago — plenty of rest

    const res = await request.post(`/api/workers/${workerAId}/fatigue-records`).set(auth()).send({
      shift_start: startsAt.toISOString(),
      shift_end: endsAt.toISOString(),
      shift_type: 'day',
      travel_hours: 1,
      self_declared_fatigue: false,
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.shift_type, 'day');
    assert.ok(res.body.shift_length_hours > 7.5);

    const list = await request.get(`/api/workers/${workerAId}/fatigue-records`).set(auth());
    assert.equal(list.status, 200);
    assert.equal(list.body.length, 1);
  });

  let jobId;

  test('5. Job can be created through the UI flow', async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 3_600_000).toISOString().slice(0, 10);
    const res = await request.post('/api/jobs').set(auth()).send({
      client_name: 'Acme Builders',
      site_name: 'Main Tower Site',
      site_location: 'Sydney',
      date: futureDate,
      shift_start_time: '07:00',
      shift_type: 'day',
      crane_class_required: '55T',
      crew_roles_required: ['crane_operator'],
      required_credentials: ['high_risk_licence_crane'],
      lift_risk_level: 'routine',
      travel_required: false,
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.client_name, 'Acme Builders');
    assert.equal(res.body.status, 'open');
    assert.deepEqual(res.body.required_credentials, ['high_risk_licence_crane']);
    jobId = res.body.id;

    const list = await request.get('/api/jobs').set(auth());
    assert.equal(list.status, 200);
    assert.equal(list.body.length, 1);
  });

  test('6. SmartRank result renders score breakdown, warnings, and blocks', async () => {
    const res = await request.get(`/api/jobs/${jobId}/smartrank`).set(auth());
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.ranked));
    assert.ok(Array.isArray(res.body.blocked));

    // Worker A (with crane class + credential) should be ranked top
    const top = res.body.ranked[0];
    assert.equal(top.rank, 1);
    assert.equal(top.worker.id, workerAId);

    // Score breakdown must contain all 7 factors the UI renders
    const factors = ['credential_match', 'crane_experience', 'fatigue_risk',
      'availability', 'site_familiarity', 'fairness', 'travel'];
    for (const f of factors) {
      assert.ok(f in top.score_breakdown, `score_breakdown missing ${f}`);
      assert.ok('score' in top.score_breakdown[f]);
      assert.ok('weight' in top.score_breakdown[f]);
      assert.ok('weighted' in top.score_breakdown[f]);
      assert.ok('detail' in top.score_breakdown[f]);
    }

    // Worker C (no credential) must be hard-blocked
    const blockedC = res.body.blocked.find(b => b.worker.name === 'Casey Uncertified');
    assert.ok(blockedC, 'Casey Uncertified should be in blocked list');
    assert.ok(blockedC.blocks.some(b => b.type === 'credential_missing'));
  });

  test('7. Hard-blocked allocation returns 422 with blocks', async () => {
    const blockedWorkers = (await request.get('/api/workers').set(auth())).body
      .filter(w => w.name === 'Casey Uncertified');
    assert.equal(blockedWorkers.length, 1);

    const res = await request.post(`/api/jobs/${jobId}/allocations`).set(auth()).send({
      worker_id: blockedWorkers[0].id,
    });
    assert.equal(res.status, 422);
    assert.ok(res.body.blocks);
    assert.ok(res.body.blocks.some(b => b.type === 'credential_missing'),
      'response must include credential_missing block so UI can display it');
    // No allocation row should have been created
    const allocs = await request.get(`/api/jobs/${jobId}/allocations`).set(auth());
    assert.equal(allocs.body.length, 0);
  });

  test('8. Allocation with warnings requires override_reason', async () => {
    // Mark worker B as 'allocated' to trigger an availability warning
    await request.patch(`/api/workers/${workerBId}`).set(auth()).send({
      status: 'allocated',
    });

    const noReason = await request.post(`/api/jobs/${jobId}/allocations`).set(auth()).send({
      worker_id: workerBId,
    });
    assert.equal(noReason.status, 422);
    assert.ok(noReason.body.warnings);
    assert.match(noReason.body.error, /override_reason/);

    // Restore worker B before next test
    await request.patch(`/api/workers/${workerBId}`).set(auth()).send({
      status: 'available',
    });
  });

  let allocationId;

  test('9. Successful allocation returns snapshot the UI renders', async () => {
    const res = await request.post(`/api/jobs/${jobId}/allocations`).set(auth()).send({
      worker_id: workerAId,
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.worker_id, workerAId);
    assert.equal(res.body.status, 'confirmed');
    assert.equal(res.body.smartrank_position, 1);
    assert.ok(res.body.smartrank_snapshot);
    assert.ok(res.body.smartrank_snapshot.score_breakdown);
    assert.ok(res.body.smartrank_snapshot.ranking_summary);
    allocationId = res.body.id;

    // Job moves to 'allocated'
    const jobRes = await request.get(`/api/jobs/${jobId}`).set(auth());
    assert.equal(jobRes.body.status, 'allocated');
  });

  test('10. Audit log lists events created by the workflow (read-only)', async () => {
    const res = await request.get('/api/audit-events?limit=100').set(auth());
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.events));
    assert.ok(res.body.total > 0);

    const eventTypes = res.body.events.map(e => e.event_type);
    assert.ok(eventTypes.includes('job_created'),         'job_created event missing');
    assert.ok(eventTypes.includes('smartrank_generated'), 'smartrank_generated event missing');
    assert.ok(eventTypes.includes('allocation_rejected'), 'allocation_rejected event missing');
    assert.ok(eventTypes.includes('allocation_confirmed'),'allocation_confirmed event missing');

    // Filter by type works (UI uses this filter)
    const filtered = await request.get('/api/audit-events?event_type=allocation_confirmed').set(auth());
    assert.equal(filtered.status, 200);
    for (const e of filtered.body.events) {
      assert.equal(e.event_type, 'allocation_confirmed');
    }
  });

  test('10b. Audit events cannot be modified (UI must surface this as read-only)', () => {
    // The schema trigger enforces this; we re-assert from the test side
    // so the SPA contract is documented in tests.
    assert.throws(() => {
      db.prepare(`UPDATE audit_events SET payload = '{}' LIMIT 1`).run();
    }, /append-only/);
    assert.throws(() => {
      db.prepare(`DELETE FROM audit_events LIMIT 1`).run();
    }, /append-only/);
  });

  test('11. Pilot metrics view reflects the workflow', async () => {
    const res = await request.get('/api/metrics').set(auth());
    assert.equal(res.status, 200);
    assert.equal(res.body.total_jobs, 1);
    assert.equal(res.body.total_allocations, 1);
    assert.equal(res.body.top_ranked_selections, 1);
    assert.equal(res.body.lower_ranked_selections, 0);
    // The hard-blocked attempt should have produced 1 allocation_rejected event
    assert.ok(res.body.allocation_rejections >= 1,
      'allocation_rejections should count the hard-blocked attempt');
    assert.ok(res.body.total_audit_events > 0);
  });

});
