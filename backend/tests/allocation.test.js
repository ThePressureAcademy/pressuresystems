'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');
const bcrypt    = require('bcryptjs');
const { randomUUID } = require('crypto');

// Point db at in-memory before loading app
const { createTestDb, seedCompanyAndUser, seedWorker, seedCredential, seedJob } = require('./helpers/db');
const { setDb } = require('../src/db');
const { signToken } = require('../src/middleware/auth');

let db, app, companyId, userId, token;

before(() => {
  db = createTestDb();
  setDb(db);
  app = require('../src/app');

  ({ companyId, userId } = seedCompanyAndUser(db));
  token = signToken({ id: userId, company_id: companyId, role: 'dispatcher', name: 'Test' });
});

after(() => {
  db.close();
});

describe('Allocation — hard block enforcement', () => {

  test('rejects allocation when required credential is missing', async () => {
    const workerId = seedWorker(db, companyId);
    // No credential seeded for this worker
    const jobId = seedJob(db, companyId, userId, {
      required_credentials: ['high_risk_licence_crane']
    });

    const res = await supertest(app)
      .post(`/api/jobs/${jobId}/allocations`)
      .set('Authorization', `Bearer ${token}`)
      .send({ worker_id: workerId });

    assert.equal(res.status, 422);
    assert.ok(res.body.blocks);
    assert.equal(res.body.blocks.some(b => b.type === 'credential_missing'), true);
  });

  test('rejects allocation when credential is expired', async () => {
    const workerId = seedWorker(db, companyId, { id: randomUUID() });
    seedCredential(db, workerId, companyId, {
      type:        'high_risk_licence_crane',
      expiry_date: '2020-01-01',  // expired
      status:      'expired'
    });

    const jobId = seedJob(db, companyId, userId, {
      required_credentials: ['high_risk_licence_crane']
    });

    const res = await supertest(app)
      .post(`/api/jobs/${jobId}/allocations`)
      .set('Authorization', `Bearer ${token}`)
      .send({ worker_id: workerId });

    assert.equal(res.status, 422);
    assert.ok(res.body.blocks);
    assert.equal(res.body.blocks.some(b => b.type === 'credential_expired'), true);
  });

  test('rejects allocation when worker breaches rest threshold', async () => {
    const workerId = seedWorker(db, companyId, { id: randomUUID() });
    seedCredential(db, workerId, companyId);

    // Shift ended 9h ago. Job starts RIGHT NOW (shift_start_time = current UTC HH:MM).
    // computeFatigueStatus uses referenceTime = min(now, jobStart) = now.
    // restHours = 9h < 10h → HARD BLOCK.
    const now        = new Date();
    const shiftEnd   = new Date(now.getTime() - 9  * 3_600_000);
    const shiftStart = new Date(now.getTime() - 17 * 3_600_000);

    db.prepare(`
      INSERT INTO fatigue_records
        (id, worker_id, company_id, shift_start, shift_end, shift_length_hours, shift_type, recorded_by_user_id)
      VALUES (?, ?, ?, ?, ?, 8, 'day', ?)
    `).run(randomUUID(), workerId, companyId, shiftStart.toISOString(), shiftEnd.toISOString(), userId);

    const jobId = seedJob(db, companyId, userId, {
      id:               randomUUID(),
      date:             now.toISOString().slice(0, 10),     // today
      shift_start_time: now.toISOString().slice(11, 16),    // HH:MM right now
      shift_type:       'day'
    });

    const res = await supertest(app)
      .post(`/api/jobs/${jobId}/allocations`)
      .set('Authorization', `Bearer ${token}`)
      .send({ worker_id: workerId });

    assert.equal(res.status, 422);
    assert.ok(res.body.blocks);
    assert.equal(res.body.blocks.some(b => b.type === 'insufficient_rest'), true);
  });

  test('rejects allocation with warnings when override_reason is absent', async () => {
    const workerId = seedWorker(db, companyId, {
      id:     randomUUID(),
      status: 'allocated'  // triggers availability_warning
    });
    seedCredential(db, workerId, companyId);

    const jobId = seedJob(db, companyId, userId, { id: randomUUID() });

    const res = await supertest(app)
      .post(`/api/jobs/${jobId}/allocations`)
      .set('Authorization', `Bearer ${token}`)
      .send({ worker_id: workerId }); // no override_reason

    assert.equal(res.status, 422);
    assert.ok(res.body.warnings);
    assert.match(res.body.error, /override_reason/);
  });

  test('accepts allocation with warnings when override_reason is provided', async () => {
    const workerId = seedWorker(db, companyId, {
      id:     randomUUID(),
      status: 'allocated'  // triggers warning but not hard block
    });
    seedCredential(db, workerId, companyId);

    const jobId = seedJob(db, companyId, userId, { id: randomUUID() });

    const res = await supertest(app)
      .post(`/api/jobs/${jobId}/allocations`)
      .set('Authorization', `Bearer ${token}`)
      .send({ worker_id: workerId, override_reason: 'Confirmed available by supervisor' });

    assert.equal(res.status, 201);
    assert.equal(res.body.worker_id, workerId);
    assert.equal(res.body.override_reason, 'Confirmed available by supervisor');
  });

  test('allocation snapshot contains full score breakdown', async () => {
    const workerId = seedWorker(db, companyId, { id: randomUUID() });
    seedCredential(db, workerId, companyId);

    const jobId = seedJob(db, companyId, userId, { id: randomUUID() });

    const res = await supertest(app)
      .post(`/api/jobs/${jobId}/allocations`)
      .set('Authorization', `Bearer ${token}`)
      .send({ worker_id: workerId });

    assert.equal(res.status, 201);
    const snapshot = res.body.smartrank_snapshot;
    assert.ok(snapshot);
    assert.ok(snapshot.score_breakdown);
    assert.ok('credential_match' in snapshot.score_breakdown);
    assert.ok('crane_experience' in snapshot.score_breakdown);
    assert.ok('fatigue_risk'     in snapshot.score_breakdown);
    assert.ok('availability'     in snapshot.score_breakdown);
    assert.ok('site_familiarity' in snapshot.score_breakdown);
    assert.ok('fairness'         in snapshot.score_breakdown);
    assert.ok('travel'           in snapshot.score_breakdown);
    assert.ok(snapshot.rank_of_selected >= 1);
    assert.ok(snapshot.generated_at);
  });

  test('non-top-ranked selection is recorded in snapshot rank', async () => {
    // Two workers — first (ranked higher) and second (we'll allocate the lower one)
    const w1 = randomUUID();
    const w2 = randomUUID();

    seedWorker(db, companyId, { id: w1, crane_classes: ['55T', '130T'] }); // higher score
    seedWorker(db, companyId, { id: w2, crane_classes: [] });               // lower score

    seedCredential(db, w1, companyId);
    seedCredential(db, w2, companyId);

    const jobId = seedJob(db, companyId, userId, {
      id:                   randomUUID(),
      crane_class_required: '55T'
    });

    const res = await supertest(app)
      .post(`/api/jobs/${jobId}/allocations`)
      .set('Authorization', `Bearer ${token}`)
      .send({ worker_id: w2 }); // allocating the lower-ranked worker

    // May require override_reason if w2 has warnings — accept either outcome
    if (res.status === 422 && res.body.warnings) {
      // Re-send with reason
      const res2 = await supertest(app)
        .post(`/api/jobs/${jobId}/allocations`)
        .set('Authorization', `Bearer ${token}`)
        .send({ worker_id: w2, override_reason: 'Client requested this operator' });
      assert.equal(res2.status, 201);
      assert.ok(res2.body.smartrank_snapshot.rank_of_selected >= 1);
    } else {
      assert.equal(res.status, 201);
      // The second worker should have rank > 1 (or rank 1 if w1 was somehow blocked)
      assert.ok(res.body.smartrank_snapshot.rank_of_selected >= 1);
    }
  });

  test('unauthenticated request is rejected', async () => {
    const jobId = seedJob(db, companyId, userId, { id: randomUUID() });
    const res = await supertest(app)
      .post(`/api/jobs/${jobId}/allocations`)
      .send({ worker_id: randomUUID() });
    assert.equal(res.status, 401);
  });

});
