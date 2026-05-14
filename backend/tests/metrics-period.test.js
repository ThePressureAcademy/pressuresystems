'use strict';

const { test, describe, before, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');
const { randomUUID } = require('node:crypto');

const { createTestDb, seedCompanyAndUser, seedJob, seedWorker } = require('./helpers/db');
const { setDb } = require('../src/db');
const { signToken } = require('../src/middleware/auth');
const { appendAuditEvent } = require('../src/services/audit');

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
    companyName: 'Metrics Company',
    email: 'metrics-admin@example.com',
    pilotStartsAt: null
  });
  token = signToken({
    id: company.userId,
    company_id: company.companyId,
    role: 'admin',
    name: 'Metrics Admin'
  });
});

afterEach(() => {
  db.close();
});

const auth = () => ({ Authorization: `Bearer ${token}` });

describe('metrics default period', () => {
  test('default period does not expose epoch or far-future placeholders', async () => {
    const res = await request.get('/api/metrics').set(auth());

    assert.equal(res.status, 200);
    assert.notEqual(res.body.period.from.slice(0, 10), '1970-01-01');
    assert.notEqual(res.body.period.to.slice(0, 10), '9999-12-31');
    assert.equal(/1970-01-01|9999-12-31/.test(JSON.stringify(res.body)), false);
    assert.equal(res.body.period_label, 'Initial setup to today');
  });

  test('default period uses company pilot_starts_at when available', async () => {
    db.prepare(`
      UPDATE companies
      SET pilot_starts_at = ?, created_at = ?
      WHERE id = ?
    `).run('2026-05-01T08:00:00.000Z', '2026-04-01T08:00:00.000Z', company.companyId);

    const res = await request.get('/api/metrics').set(auth());

    assert.equal(res.status, 200);
    assert.equal(res.body.period.from, '2026-05-01T08:00:00.000Z');
    assert.equal(res.body.period_label, 'Pilot start to today');
  });

  test('default period falls back to company created_at', async () => {
    db.prepare(`
      UPDATE companies
      SET pilot_starts_at = NULL, created_at = ?
      WHERE id = ?
    `).run('2026-05-03T09:30:00.000Z', company.companyId);

    const res = await request.get('/api/metrics').set(auth());

    assert.equal(res.status, 200);
    assert.equal(res.body.period.from, '2026-05-03T09:30:00.000Z');
    assert.equal(res.body.period_label, 'Initial setup to today');
  });

  test('default period falls back to earliest company activity when setup dates are placeholders', async () => {
    db.prepare(`
      UPDATE companies
      SET pilot_starts_at = NULL, created_at = '1970-01-01'
      WHERE id = ?
    `).run(company.companyId);
    db.prepare(`
      INSERT INTO audit_events (
        id, company_id, event_type, user_id, payload, timestamp
      ) VALUES (?, ?, 'worker_imported', ?, '{}', ?)
    `).run(randomUUID(), company.companyId, company.userId, '2026-05-04T02:00:00.000Z');

    const res = await request.get('/api/metrics').set(auth());

    assert.equal(res.status, 200);
    assert.equal(res.body.period.from, '2026-05-04T02:00:00.000Z');
    assert.match(res.body.period_label, /2026 to today$/);
  });

  test('empty company with only placeholder dates returns a clean Today period', async () => {
    db.prepare(`
      UPDATE companies
      SET pilot_starts_at = NULL, created_at = '1970-01-01'
      WHERE id = ?
    `).run(company.companyId);

    const res = await request.get('/api/metrics').set(auth());

    assert.equal(res.status, 200);
    assert.equal(res.body.period_label, 'Today');
    assert.equal(/1970-01-01|9999-12-31/.test(JSON.stringify(res.body)), false);
  });

  test('metrics remain company-scoped within the resolved default period', async () => {
    const other = seedCompanyAndUser(db, {
      companyName: 'Other Company',
      email: 'other-metrics-admin@example.com'
    });
    const workerId = seedWorker(db, company.companyId, { email: 'metrics-worker@example.com' });
    seedJob(db, company.companyId, company.userId, { client_name: 'Metrics Client' });
    seedJob(db, other.companyId, other.userId, { client_name: 'Other Client' });
    appendAuditEvent(db, {
      companyId: company.companyId,
      eventType: 'worker_imported',
      userId: company.userId,
      workerId,
      payload: { tenant: 'current' }
    });
    appendAuditEvent(db, {
      companyId: other.companyId,
      eventType: 'worker_imported',
      userId: other.userId,
      payload: { tenant: 'other' }
    });

    const res = await request.get('/api/metrics').set(auth());

    assert.equal(res.status, 200);
    assert.equal(res.body.total_jobs, 1);
    assert.equal(res.body.workers_imported, 1);
  });

  test('explicit ranges return a formatted range label and preserve metric counts', async () => {
    seedJob(db, company.companyId, company.userId, { client_name: 'Explicit Range Client' });

    const res = await request
      .get('/api/metrics?from=2026-01-01&to=2026-12-31')
      .set(auth());

    assert.equal(res.status, 200);
    assert.match(res.body.period_label, /2026 to .*2026/);
    assert.equal(res.body.total_jobs, 1);
  });
});
