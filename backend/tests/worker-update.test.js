'use strict';

const { test, describe, before, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');
const { randomUUID } = require('node:crypto');

const { createTestDb, seedCompanyAndUser, seedWorker } = require('./helpers/db');
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
    companyName: 'Worker Update Company',
    email: 'worker-update-admin@example.com',
    role: 'admin'
  });
  token = signToken({
    id: company.userId,
    company_id: company.companyId,
    role: 'admin',
    name: 'Worker Update Admin'
  });
});

afterEach(() => {
  db.close();
});

const auth = () => ({ Authorization: `Bearer ${token}` });

describe('worker detail updates', () => {
  test('PATCH /api/workers/:id persists supported worker detail fields and returns the updated worker', async () => {
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
    assert.equal(res.body.id, workerId);
    assert.equal(res.body.name, 'After Update');
    assert.equal(res.body.email, 'after-update@example.com');
    assert.equal(res.body.role, 'rigger');
    assert.equal(res.body.employment_type, 'contractor');
    assert.equal(res.body.status, 'unavailable');
    assert.equal(res.body.contact_number, '0400 000 111');
    assert.equal(res.body.usual_depot, 'Brisbane Yard');
    assert.deepEqual(res.body.crane_classes, ['25T Articulated / Pick-and-Carry']);

    const persisted = await request.get(`/api/workers/${workerId}`).set(auth());
    assert.equal(persisted.status, 200);
    assert.equal(persisted.body.name, 'After Update');
    assert.equal(persisted.body.email, 'after-update@example.com');
    assert.equal(persisted.body.contact_number, '0400 000 111');
  });

  test('worker updates can clear nullable detail fields', async () => {
    const workerId = seedWorker(db, company.companyId, {
      name: 'Clearable Worker',
      email: 'clearable@example.com'
    });
    db.prepare(`
      UPDATE workers
      SET contact_number = '0400 000 222',
          usual_depot = 'North Yard',
          availability_note = 'Call before dispatch',
          notes = 'Initial notes'
      WHERE id = ?
    `).run(workerId);

    const res = await request
      .patch(`/api/workers/${workerId}`)
      .set(auth())
      .send({
        email: null,
        contact_number: null,
        usual_depot: '',
        availability_note: null,
        notes: ''
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.email, null);
    assert.equal(res.body.contact_number, null);
    assert.equal(res.body.usual_depot, null);
    assert.equal(res.body.availability_note, null);
    assert.equal(res.body.notes, null);
  });

  test('worker updates refresh updated_at and create a worker_updated audit event', async () => {
    const workerId = seedWorker(db, company.companyId, {
      name: 'Audit Worker',
      email: 'audit-worker@example.com'
    });
    db.prepare(`UPDATE workers SET updated_at = ? WHERE id = ?`).run('2026-01-01T00:00:00.000Z', workerId);

    const res = await request
      .patch(`/api/workers/${workerId}`)
      .set(auth())
      .send({ name: 'Audit Worker Updated', status: 'allocated' });

    assert.equal(res.status, 200);
    assert.notEqual(res.body.updated_at, '2026-01-01T00:00:00.000Z');

    const event = db.prepare(`
      SELECT *
      FROM audit_events
      WHERE company_id = ? AND worker_id = ? AND event_type = 'worker_updated'
    `).get(company.companyId, workerId);
    assert.ok(event);
    assert.equal(event.user_id, company.userId);
    const payload = JSON.parse(event.payload);
    assert.deepEqual(payload.changed_fields.sort(), ['name', 'status']);
    assert.ok(payload.updated_at);
  });

  test('worker update rejects duplicate email within the same company', async () => {
    seedWorker(db, company.companyId, { email: 'duplicate@example.com' });
    const workerId = seedWorker(db, company.companyId, { email: 'unique@example.com' });

    const res = await request
      .patch(`/api/workers/${workerId}`)
      .set(auth())
      .send({ email: 'duplicate@example.com' });

    assert.equal(res.status, 409);
    assert.match(res.body.error, /already exists/);
  });

  test('worker update rejects invalid detail values without persisting them', async () => {
    const workerId = seedWorker(db, company.companyId, {
      name: 'Validation Worker',
      email: 'validation@example.com'
    });

    const res = await request
      .patch(`/api/workers/${workerId}`)
      .set(auth())
      .send({ name: '', email: 'not-an-email' });

    assert.equal(res.status, 400);
    const persisted = db.prepare(`SELECT name, email FROM workers WHERE id = ?`).get(workerId);
    assert.equal(persisted.name, 'Validation Worker');
    assert.equal(persisted.email, 'validation@example.com');
  });

  test('worker update is company-scoped and cannot update another tenant worker', async () => {
    const other = seedCompanyAndUser(db, {
      companyId: randomUUID(),
      userId: randomUUID(),
      email: 'other-worker-update-admin@example.com'
    });
    const otherWorkerId = seedWorker(db, other.companyId, {
      name: 'Other Tenant Worker',
      email: 'other-tenant-worker@example.com'
    });

    const res = await request
      .patch(`/api/workers/${otherWorkerId}`)
      .set(auth())
      .send({ name: 'Cross Tenant Update' });

    assert.equal(res.status, 404);
    const otherWorker = db.prepare(`SELECT name FROM workers WHERE id = ?`).get(otherWorkerId);
    assert.equal(otherWorker.name, 'Other Tenant Worker');
  });

  test('worker update does not allow client payload to mutate id or company_id', async () => {
    const workerId = seedWorker(db, company.companyId, {
      name: 'Immutable Identity Worker',
      email: 'immutable-worker@example.com'
    });
    const attemptedCompanyId = randomUUID();

    const res = await request
      .patch(`/api/workers/${workerId}`)
      .set(auth())
      .send({
        id: randomUUID(),
        company_id: attemptedCompanyId,
        name: 'Identity Still Scoped'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.id, workerId);
    assert.equal(res.body.company_id, company.companyId);

    const row = db.prepare(`SELECT id, company_id, name FROM workers WHERE id = ?`).get(workerId);
    assert.equal(row.id, workerId);
    assert.equal(row.company_id, company.companyId);
    assert.equal(row.name, 'Identity Still Scoped');
  });

  test('worker update rejects archived workers from the active edit flow', async () => {
    const workerId = seedWorker(db, company.companyId, {
      name: 'Archived Worker',
      email: 'archived-worker@example.com',
      archivedAt: '2026-05-10T00:00:00.000Z',
      archivedByUserId: company.userId,
      archiveReason: 'No longer active',
      status: 'inactive'
    });

    const res = await request
      .patch(`/api/workers/${workerId}`)
      .set(auth())
      .send({ name: 'Should Not Persist' });

    assert.equal(res.status, 409);
    assert.equal(res.body.error, 'Worker has been removed from active dispatch.');
    const row = db.prepare(`SELECT name FROM workers WHERE id = ?`).get(workerId);
    assert.equal(row.name, 'Archived Worker');
  });
});
