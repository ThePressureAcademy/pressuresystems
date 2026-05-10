'use strict';

const { test, describe, before, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');
const { randomUUID } = require('crypto');

const { createTestDb, seedCompanyAndUser, seedWorker, seedCredential, seedJob } = require('./helpers/db');
const { setDb } = require('../src/db');
const { signToken } = require('../src/middleware/auth');

let db;
let app;
let request;
let companyId;
let userId;
let token;

before(() => {
  app = require('../src/app');
});

beforeEach(() => {
  db = createTestDb();
  setDb(db);
  request = supertest(app);

  ({ companyId, userId } = seedCompanyAndUser(db, {
    name: 'Dispatch Admin',
    email: 'dispatch@example.com',
    role: 'admin'
  }));
  token = signToken({ id: userId, company_id: companyId, role: 'admin', name: 'Dispatch Admin' });
});

afterEach(() => {
  db.close();
});

const auth = () => ({ Authorization: `Bearer ${token}` });

describe('Worker removal', () => {
  test('remove worker endpoint archives the worker instead of deleting it', async () => {
    const workerId = seedWorker(db, companyId, { email: 'archive-me@example.com' });

    const res = await request
      .post(`/api/workers/${workerId}/remove`)
      .set(auth())
      .send({ reason: 'Duplicate sample worker' });

    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.worker_id, workerId);
    assert.equal(res.body.message, 'Worker removed from active dispatch.');
    assert.ok(res.body.archived_at);

    const row = db.prepare(`
      SELECT status, archived_at, archived_by_user_id, archive_reason
      FROM workers
      WHERE id = ?
    `).get(workerId);
    assert.equal(row.status, 'inactive');
    assert.ok(row.archived_at);
    assert.equal(row.archived_by_user_id, userId);
    assert.equal(row.archive_reason, 'Duplicate sample worker');
  });

  test('removed worker disappears from the active worker list but direct history lookup still works', async () => {
    const workerId = seedWorker(db, companyId, { email: 'history@example.com' });

    await request.post(`/api/workers/${workerId}/remove`).set(auth()).send({});

    const activeList = await request.get('/api/workers').set(auth());
    assert.equal(activeList.status, 200);
    assert.equal(activeList.body.some((worker) => worker.id === workerId), false);

    const detail = await request.get(`/api/workers/${workerId}`).set(auth());
    assert.equal(detail.status, 200);
    assert.equal(detail.body.id, workerId);
    assert.equal(detail.body.is_archived, true);
    assert.ok(detail.body.archived_at);
  });

  test('removing a worker creates a worker_removed audit event', async () => {
    const workerId = seedWorker(db, companyId, {
      name: 'Archive Audit Worker',
      email: 'archive-audit@example.com'
    });

    await request
      .post(`/api/workers/${workerId}/remove`)
      .set(auth())
      .send({ reason: 'Left pilot roster' });

    const event = db.prepare(`
      SELECT *
      FROM audit_events
      WHERE company_id = ? AND worker_id = ? AND event_type = 'worker_removed'
    `).get(companyId, workerId);

    assert.ok(event);
    const payload = JSON.parse(event.payload);
    assert.equal(payload.worker_name, 'Archive Audit Worker');
    assert.equal(payload.worker_email, 'archive-audit@example.com');
    assert.equal(payload.reason, 'Left pilot roster');
    assert.equal(payload.removed_by, userId);
    assert.ok(payload.archived_at);
  });

  test('removing an already removed worker is handled safely without duplicating audit history', async () => {
    const workerId = seedWorker(db, companyId, { email: 'repeat-remove@example.com' });

    const first = await request.post(`/api/workers/${workerId}/remove`).set(auth()).send({});
    const second = await request.post(`/api/workers/${workerId}/remove`).set(auth()).send({});

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(second.body.already_removed, true);
    assert.equal(second.body.message, 'Worker already removed from active dispatch.');

    const count = db.prepare(`
      SELECT COUNT(*) AS n
      FROM audit_events
      WHERE company_id = ? AND worker_id = ? AND event_type = 'worker_removed'
    `).get(companyId, workerId).n;
    assert.equal(count, 1);
  });

  test('SmartRank excludes removed workers from ranked and blocked results', async () => {
    const activeWorkerId = seedWorker(db, companyId, {
      name: 'Active Operator',
      email: 'active-operator@example.com',
      crane_classes: ['55T']
    });
    seedCredential(db, activeWorkerId, companyId, {
      type: 'high_risk_licence_crane',
      expiry_date: '2028-01-01',
      status: 'valid'
    });

    const removedWorkerId = seedWorker(db, companyId, {
      name: 'Removed Operator',
      email: 'removed-operator@example.com',
      crane_classes: ['55T'],
      archivedAt: new Date('2026-05-10T00:00:00Z').toISOString(),
      archivedByUserId: userId,
      archiveReason: 'No longer dispatchable',
      status: 'inactive'
    });
    seedCredential(db, removedWorkerId, companyId, {
      type: 'high_risk_licence_crane',
      expiry_date: '2028-01-01',
      status: 'valid'
    });

    const jobId = seedJob(db, companyId, userId, {
      required_credentials: ['high_risk_licence_crane'],
      crane_class_required: '55T'
    });

    const res = await request.get(`/api/jobs/${jobId}/smartrank`).set(auth());

    assert.equal(res.status, 200);
    assert.equal(res.body.ranked.some((entry) => entry.worker.id === removedWorkerId), false);
    assert.equal(res.body.blocked.some((entry) => entry.worker.id === removedWorkerId), false);
    assert.equal(res.body.ranked.some((entry) => entry.worker.id === activeWorkerId), true);
  });

  test('allocation rejects removed workers with a clear message', async () => {
    const workerId = seedWorker(db, companyId, {
      name: 'Removed Allocation Worker',
      email: 'removed-allocation@example.com'
    });
    seedCredential(db, workerId, companyId, {
      type: 'high_risk_licence_crane',
      expiry_date: '2028-01-01',
      status: 'valid'
    });
    const jobId = seedJob(db, companyId, userId, {
      required_credentials: ['high_risk_licence_crane']
    });

    await request.post(`/api/workers/${workerId}/remove`).set(auth()).send({});

    const res = await request
      .post(`/api/jobs/${jobId}/allocations`)
      .set(auth())
      .send({ worker_id: workerId });

    assert.equal(res.status, 422);
    assert.equal(res.body.error, 'Worker has been removed from active dispatch.');

    const rejectedCount = db.prepare(`
      SELECT COUNT(*) AS n
      FROM audit_events
      WHERE company_id = ? AND worker_id = ? AND event_type = 'allocation_rejected'
    `).get(companyId, workerId).n;
    assert.equal(rejectedCount, 1);
  });

  test('existing allocation history and audit events remain intact after worker removal', async () => {
    const workerId = seedWorker(db, companyId, { email: 'history-keep@example.com' });
    seedCredential(db, workerId, companyId, {
      type: 'high_risk_licence_crane',
      expiry_date: '2028-01-01',
      status: 'valid'
    });
    const jobId = seedJob(db, companyId, userId, {
      required_credentials: ['high_risk_licence_crane']
    });

    const allocation = await request
      .post(`/api/jobs/${jobId}/allocations`)
      .set(auth())
      .send({ worker_id: workerId });

    assert.equal(allocation.status, 201);

    const allocationCountBefore = db.prepare(`
      SELECT COUNT(*) AS n
      FROM allocations
      WHERE worker_id = ?
    `).get(workerId).n;
    const auditCountBefore = db.prepare(`
      SELECT COUNT(*) AS n
      FROM audit_events
      WHERE worker_id = ?
    `).get(workerId).n;

    await request.post(`/api/workers/${workerId}/remove`).set(auth()).send({ reason: 'Retired from active pool' });

    const allocationCountAfter = db.prepare(`
      SELECT COUNT(*) AS n
      FROM allocations
      WHERE worker_id = ?
    `).get(workerId).n;
    const auditCountAfter = db.prepare(`
      SELECT COUNT(*) AS n
      FROM audit_events
      WHERE worker_id = ?
    `).get(workerId).n;

    assert.equal(allocationCountAfter, allocationCountBefore);
    assert.equal(auditCountAfter, auditCountBefore + 1);
  });

  test('company scoping prevents removing another company worker', async () => {
    const { companyId: otherCompanyId } = seedCompanyAndUser(db, {
      companyId: randomUUID(),
      userId: randomUUID(),
      email: 'other-admin@example.com'
    });
    const otherWorkerId = seedWorker(db, otherCompanyId, {
      email: 'other-worker@example.com'
    });

    const res = await request
      .post(`/api/workers/${otherWorkerId}/remove`)
      .set(auth())
      .send({});

    assert.equal(res.status, 404);
    assert.equal(res.body.error, 'Worker not found');
  });
});
