'use strict';

const { describe, test, before, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');

const { createTestDb, seedCompanyAndUser, seedWorker } = require('./helpers/db');
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
    name: 'Site Log Admin',
    email: 'site-log@example.com',
    role: 'admin'
  }));
  token = signToken({ id: userId, company_id: companyId, role: 'admin', name: 'Site Log Admin' });
});

afterEach(() => {
  db.close();
  setDb(null);
});

const auth = () => ({ Authorization: `Bearer ${token}` });

describe('Daily Site Log', () => {
  test('creates a site log, adds a worker, then signs in and out', async () => {
    const workerId = seedWorker(db, companyId, { name: 'Tane Rigger', role: 'rigger', roles: ['rigger'] });

    const created = await request.post('/api/site-logs').set(auth()).send({
      date: '2026-06-01',
      site_name: 'Queen St shutdown',
      client_name: 'Pilot Client',
      location: 'Auckland',
      notes: 'Day shift diary'
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.site_name, 'Queen St shutdown');
    assert.deepEqual(created.body.entries, []);

    const entry = await request.post(`/api/site-logs/${created.body.id}/entries`).set(auth()).send({
      worker_id: workerId,
      role: 'rigger',
      notes: 'Assigned to rigging crew'
    });
    assert.equal(entry.status, 201);
    assert.equal(entry.body.worker_name, 'Tane Rigger');
    assert.equal(entry.body.status, 'scheduled');

    const signedIn = await request.post(`/api/site-logs/${created.body.id}/entries/${entry.body.id}/sign-in`).set(auth()).send({
      timestamp: '2026-06-01T08:00:00.000Z'
    });
    assert.equal(signedIn.status, 200);
    assert.equal(signedIn.body.status, 'signed_in');
    assert.equal(signedIn.body.sign_in_time, '2026-06-01T08:00:00.000Z');

    const signedOut = await request.post(`/api/site-logs/${created.body.id}/entries/${entry.body.id}/sign-out`).set(auth()).send({
      timestamp: '2026-06-01T16:00:00.000Z'
    });
    assert.equal(signedOut.status, 200);
    assert.equal(signedOut.body.status, 'signed_out');
    assert.equal(signedOut.body.sign_out_time, '2026-06-01T16:00:00.000Z');

    const listed = await request.get('/api/site-logs?date=2026-06-01&site=Queen').set(auth());
    assert.equal(listed.status, 200);
    assert.equal(listed.body.logs.length, 1);
    assert.equal(listed.body.logs[0].entries.length, 1);
  });

  test('rejects sign out before sign in', async () => {
    const workerId = seedWorker(db, companyId, { name: 'No Sign In Worker' });
    const created = await request.post('/api/site-logs').set(auth()).send({
      date: '2026-06-02',
      site_name: 'No Sign In Site'
    });
    const entry = await request.post(`/api/site-logs/${created.body.id}/entries`).set(auth()).send({
      worker_id: workerId
    });

    const signedOut = await request.post(`/api/site-logs/${created.body.id}/entries/${entry.body.id}/sign-out`).set(auth()).send({
      timestamp: '2026-06-02T12:00:00.000Z'
    });
    assert.equal(signedOut.status, 400);
    assert.match(signedOut.body.error, /signed in before sign out/i);
  });

  test('keeps site logs tenant-scoped', async () => {
    const workerId = seedWorker(db, companyId, { name: 'Tenant A Worker' });
    const created = await request.post('/api/site-logs').set(auth()).send({
      date: '2026-06-03',
      site_name: 'Tenant A Site'
    });
    await request.post(`/api/site-logs/${created.body.id}/entries`).set(auth()).send({ worker_id: workerId });

    const other = seedCompanyAndUser(db, {
      companyId: 'tenant-b',
      email: 'tenant-b@example.com',
      role: 'admin'
    });
    const otherToken = signToken({ id: other.userId, company_id: other.companyId, role: 'admin', name: 'Tenant B Admin' });
    const otherAuth = { Authorization: `Bearer ${otherToken}` };

    const hidden = await request.get('/api/site-logs?date=2026-06-03').set(otherAuth);
    assert.equal(hidden.status, 200);
    assert.equal(hidden.body.logs.length, 0);

    const crossTenantEntry = await request.post(`/api/site-logs/${created.body.id}/entries`).set(otherAuth).send({
      worker_id: workerId
    });
    assert.equal(crossTenantEntry.status, 404);
  });

  test('remove marks an entry removed without deleting the operational record', async () => {
    const workerId = seedWorker(db, companyId, { name: 'Removed Entry Worker' });
    const created = await request.post('/api/site-logs').set(auth()).send({
      date: '2026-06-04',
      site_name: 'Removal Site'
    });
    const entry = await request.post(`/api/site-logs/${created.body.id}/entries`).set(auth()).send({ worker_id: workerId });
    const removed = await request.post(`/api/site-logs/${created.body.id}/entries/${entry.body.id}/remove`).set(auth()).send({
      notes: 'Sent to another site'
    });

    assert.equal(removed.status, 200);
    assert.equal(removed.body.status, 'removed');
    const row = db.prepare(`SELECT status, notes FROM site_log_entries WHERE id = ?`).get(entry.body.id);
    assert.equal(row.status, 'removed');
    assert.equal(row.notes, 'Sent to another site');
  });

  test('removed entries cannot be accidentally resurrected through edit or sign-in actions', async () => {
    const workerId = seedWorker(db, companyId, { name: 'Locked Removed Worker' });
    const created = await request.post('/api/site-logs').set(auth()).send({
      date: '2026-06-05',
      site_name: 'Locked Removal Site'
    });
    const entry = await request.post(`/api/site-logs/${created.body.id}/entries`).set(auth()).send({ worker_id: workerId });
    await request.post(`/api/site-logs/${created.body.id}/entries/${entry.body.id}/remove`).set(auth()).send({
      notes: 'Cancelled before start'
    });

    const edit = await request.patch(`/api/site-logs/${created.body.id}/entries/${entry.body.id}`).set(auth()).send({
      status: 'scheduled',
      sign_in_time: '2026-06-05T08:00:00.000Z'
    });
    assert.equal(edit.status, 409);
    assert.match(edit.body.error, /removed site log entries cannot be edited/i);

    const signIn = await request.post(`/api/site-logs/${created.body.id}/entries/${entry.body.id}/sign-in`).set(auth()).send({
      timestamp: '2026-06-05T08:00:00.000Z'
    });
    assert.equal(signIn.status, 409);
    assert.match(signIn.body.error, /removed site log entries cannot be signed in/i);

    const row = db.prepare(`SELECT status, sign_in_time FROM site_log_entries WHERE id = ?`).get(entry.body.id);
    assert.equal(row.status, 'removed');
    assert.equal(row.sign_in_time, null);
  });
});
