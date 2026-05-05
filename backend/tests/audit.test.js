'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');
const { randomUUID } = require('crypto');

const { createTestDb, seedCompanyAndUser, seedWorker, seedCredential, seedJob } = require('./helpers/db');
const { setDb, getDb } = require('../src/db');
const { signToken } = require('../src/middleware/auth');
const { appendAuditEvent } = require('../src/services/audit');

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

describe('AuditIQ — append-only and event creation', () => {

  test('appendAuditEvent creates a record in audit_events', () => {
    const id = appendAuditEvent(db, {
      companyId,
      eventType: 'job_created',
      userId,
      payload:   { test: true }
    });

    const row = db.prepare(`SELECT * FROM audit_events WHERE id = ?`).get(id);
    assert.ok(row);
    assert.equal(row.event_type, 'job_created');
    assert.equal(row.company_id, companyId);
    assert.equal(row.user_id, userId);
    assert.deepEqual(JSON.parse(row.payload), { test: true });
  });

  test('audit_events cannot be updated (database trigger)', () => {
    const id = appendAuditEvent(db, {
      companyId,
      eventType: 'job_created',
      userId,
      payload:   { original: true }
    });

    assert.throws(() => {
      db.prepare(`UPDATE audit_events SET payload = '{"tampered":true}' WHERE id = ?`).run(id);
    }, /append-only/);

    // Confirm original data is unchanged
    const row = db.prepare(`SELECT payload FROM audit_events WHERE id = ?`).get(id);
    assert.deepEqual(JSON.parse(row.payload), { original: true });
  });

  test('audit_events cannot be deleted (database trigger)', () => {
    const id = appendAuditEvent(db, {
      companyId,
      eventType: 'job_created',
      userId,
      payload:   {}
    });

    assert.throws(() => {
      db.prepare(`DELETE FROM audit_events WHERE id = ?`).run(id);
    }, /append-only/);

    const row = db.prepare(`SELECT id FROM audit_events WHERE id = ?`).get(id);
    assert.ok(row); // still exists
  });

  test('allocation_confirmed event is created after a successful allocation', async () => {
    const workerId = seedWorker(db, companyId, { id: randomUUID() });
    seedCredential(db, workerId, companyId);
    const jobId = seedJob(db, companyId, userId, { id: randomUUID() });

    const countBefore = db.prepare(
      `SELECT COUNT(*) as n FROM audit_events WHERE company_id = ? AND event_type = 'allocation_confirmed'`
    ).get(companyId).n;

    const res = await supertest(app)
      .post(`/api/jobs/${jobId}/allocations`)
      .set('Authorization', `Bearer ${token}`)
      .send({ worker_id: workerId });

    assert.equal(res.status, 201);

    const countAfter = db.prepare(
      `SELECT COUNT(*) as n FROM audit_events WHERE company_id = ? AND event_type = 'allocation_confirmed'`
    ).get(companyId).n;

    assert.equal(countAfter, countBefore + 1);
  });

  test('smartrank_generated event is created when SmartRank is run', async () => {
    const jobId = seedJob(db, companyId, userId, { id: randomUUID() });

    const countBefore = db.prepare(
      `SELECT COUNT(*) as n FROM audit_events WHERE company_id = ? AND event_type = 'smartrank_generated'`
    ).get(companyId).n;

    const res = await supertest(app)
      .get(`/api/jobs/${jobId}/smartrank`)
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);

    const countAfter = db.prepare(
      `SELECT COUNT(*) as n FROM audit_events WHERE company_id = ? AND event_type = 'smartrank_generated'`
    ).get(companyId).n;

    assert.equal(countAfter, countBefore + 1);
  });

  test('warning_acknowledged event is created when override_reason is provided', async () => {
    const workerId = seedWorker(db, companyId, {
      id:     randomUUID(),
      status: 'allocated'  // triggers warning
    });
    seedCredential(db, workerId, companyId);
    const jobId = seedJob(db, companyId, userId, { id: randomUUID() });

    const countBefore = db.prepare(
      `SELECT COUNT(*) as n FROM audit_events WHERE company_id = ? AND event_type = 'warning_acknowledged'`
    ).get(companyId).n;

    const res = await supertest(app)
      .post(`/api/jobs/${jobId}/allocations`)
      .set('Authorization', `Bearer ${token}`)
      .send({ worker_id: workerId, override_reason: 'Supervisor confirmed available' });

    assert.equal(res.status, 201);

    const countAfter = db.prepare(
      `SELECT COUNT(*) as n FROM audit_events WHERE company_id = ? AND event_type = 'warning_acknowledged'`
    ).get(companyId).n;

    assert.equal(countAfter, countBefore + 1);
  });

  test('GET /api/audit-events returns events scoped to company', async () => {
    const res = await supertest(app)
      .get('/api/audit-events')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.events));
    assert.ok(typeof res.body.total === 'number');

    // All events should belong to this company
    for (const evt of res.body.events) {
      assert.equal(evt.company_id, companyId);
    }
  });

  test('allocation_rejected event is created when hard-blocked worker is attempted', async () => {
    const workerId = seedWorker(db, companyId, { id: randomUUID() });
    // No credential — will be hard-blocked
    const jobId = seedJob(db, companyId, userId, {
      id:                   randomUUID(),
      required_credentials: ['high_risk_licence_crane']
    });

    const countBefore = db.prepare(
      `SELECT COUNT(*) as n FROM audit_events WHERE company_id = ? AND event_type = 'allocation_rejected'`
    ).get(companyId).n;

    const res = await supertest(app)
      .post(`/api/jobs/${jobId}/allocations`)
      .set('Authorization', `Bearer ${token}`)
      .send({ worker_id: workerId });

    assert.equal(res.status, 422);

    const countAfter = db.prepare(
      `SELECT COUNT(*) as n FROM audit_events WHERE company_id = ? AND event_type = 'allocation_rejected'`
    ).get(companyId).n;

    assert.equal(countAfter, countBefore + 1);
  });

  test('payroll and invoicing fields are not present in any schema table', () => {
    // Confirm the schema has no payroll/invoicing columns
    const tables = ['companies', 'users', 'workers', 'credentials', 'fatigue_records',
                    'jobs', 'allocations', 'audit_events'];
    const forbidden = ['payroll', 'invoice', 'wage', 'pay_rate', 'xero', 'myob', 'quote_amount'];

    for (const table of tables) {
      const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name.toLowerCase());
      for (const bad of forbidden) {
        assert.equal(
          cols.some(c => c.includes(bad)), false,
          `Table '${table}' contains a forbidden column matching '${bad}'`
        );
      }
    }
  });

});
