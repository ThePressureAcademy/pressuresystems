'use strict';

const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');

const {
  createTestDb,
  seedAllocation,
  seedCompanyAndUser,
  seedCredential,
  seedJob,
  seedWorker
} = require('./helpers/db');
const { setDb } = require('../src/db');
const { signToken } = require('../src/middleware/auth');

let db;
let app;
let companyId;
let userId;
let token;

function auth(value = token) {
  return { Authorization: `Bearer ${value}` };
}

function auditEvents(type) {
  return db.prepare(`
    SELECT *
    FROM audit_events
    WHERE company_id = ? AND event_type = ?
    ORDER BY timestamp DESC
  `).all(companyId, type);
}

function seedAllocatedJob({ withPhone = true } = {}) {
  const workerId = seedWorker(db, companyId, { name: 'Taylor Rigger', roles: ['rigger'] });
  seedCredential(db, workerId, companyId);
  if (withPhone) {
    db.prepare(`UPDATE workers SET contact_number = ? WHERE id = ?`)
      .run('+61400111222', workerId);
  }
  const jobId = seedJob(db, companyId, userId, {
    client_name: 'Acme Lift',
    site_name: 'North Yard',
    site_location: 'Gate 4',
    date: '2026-06-14',
    crew_roles_required: ['rigger'],
    scheduled_start_at_utc: '2026-06-13T22:00:00.000Z',
    scheduled_end_at_utc: '2026-06-14T02:00:00.000Z',
    scheduled_start_local: '2026-06-14 08:00',
    scheduled_end_local: '2026-06-14 12:00',
    schedule_status: 'planned'
  });
  const allocationId = seedAllocation(db, companyId, jobId, workerId, userId);
  return { workerId, jobId, allocationId };
}

before(() => {
  app = require('../src/app');
});

beforeEach(() => {
  if (db) db.close();
  db = createTestDb();
  setDb(db);
  ({ companyId, userId } = seedCompanyAndUser(db, { role: 'dispatcher' }));
  token = signToken({ id: userId, company_id: companyId, role: 'dispatcher', name: 'Dispatcher' });
});

after(() => {
  db.close();
});

describe('Allocation notification publish workflow', () => {
  test('preview endpoint generates server-side SMS message for company allocation', async () => {
    const { jobId, allocationId } = seedAllocatedJob();

    const res = await supertest(app)
      .post(`/api/jobs/${jobId}/allocation-notifications/preview`)
      .set(auth())
      .send({
        allocation_id: allocationId,
        company_id: 'spoofed',
        message_body_snapshot: 'Spoofed client message'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.notification.status, 'previewed');
    assert.equal(res.body.notification.company_id, companyId);
    assert.match(res.body.sms_preview, /^DispatchTalon:/);
    assert.match(res.body.sms_preview, /North Yard/);
    assert.match(res.body.sms_preview, /08:00-12:00/);
    assert.match(res.body.sms_preview, /Role: Rigger/);
    assert.equal(res.body.sms_preview.includes('Spoofed client message'), false);
    assert.equal(/marketing|promotion|discount|offer/i.test(res.body.sms_preview), false);

    const events = auditEvents('allocation_publish_previewed');
    assert.equal(events.length, 1);
    assert.equal(events[0].allocation_id, allocationId);
  });

  test('preview fails for worker/allocation outside company', async () => {
    const { jobId } = seedAllocatedJob();
    const other = seedCompanyAndUser(db, {
      companyId: 'other-company',
      userId: 'other-user',
      email: 'other@example.com'
    });
    const otherWorkerId = seedWorker(db, other.companyId, { name: 'Other Worker' });
    const otherJobId = seedJob(db, other.companyId, other.userId);
    const otherAllocationId = seedAllocation(db, other.companyId, otherJobId, otherWorkerId, other.userId);

    const crossAllocation = await supertest(app)
      .post(`/api/jobs/${jobId}/allocation-notifications/preview`)
      .set(auth())
      .send({ allocation_id: otherAllocationId });

    assert.equal(crossAllocation.status, 404);

    const crossWorker = await supertest(app)
      .post(`/api/jobs/${jobId}/allocation-notifications/preview`)
      .set(auth())
      .send({ worker_id: otherWorkerId });

    assert.equal(crossWorker.status, 404);
  });

  test('publish manual updates notification row and creates audit event without marking provider sent', async () => {
    const { jobId, allocationId } = seedAllocatedJob();
    const preview = await supertest(app)
      .post(`/api/jobs/${jobId}/allocation-notifications/preview`)
      .set(auth())
      .send({ allocation_id: allocationId });

    const res = await supertest(app)
      .post(`/api/jobs/${jobId}/allocation-notifications/publish-manual`)
      .set(auth())
      .send({
        allocation_id: allocationId,
        notification_id: preview.body.notification.id
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.notification.status, 'published_manual');
    assert.equal(res.body.notification.provider, 'manual_copy');
    assert.equal(res.body.notification.sent_at, null);
    assert.match(res.body.notification.message_body_snapshot, /Reply directly to your dispatcher to confirm/);

    const rows = db.prepare(`SELECT * FROM allocation_notifications WHERE company_id = ?`).all(companyId);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, 'published_manual');

    const events = auditEvents('allocation_published_manual');
    assert.equal(events.length, 1);
    assert.equal(events[0].allocation_id, allocationId);
  });

  test('missing mobile produces warning and requires manual contact acknowledgement', async () => {
    const { jobId, allocationId } = seedAllocatedJob({ withPhone: false });

    const preview = await supertest(app)
      .post(`/api/jobs/${jobId}/allocation-notifications/preview`)
      .set(auth())
      .send({ allocation_id: allocationId });

    assert.equal(preview.status, 201);
    assert.match(preview.body.warning, /Worker mobile number required/i);

    const blocked = await supertest(app)
      .post(`/api/jobs/${jobId}/allocation-notifications/publish-manual`)
      .set(auth())
      .send({
        allocation_id: allocationId,
        notification_id: preview.body.notification.id
      });

    assert.equal(blocked.status, 400);
    assert.match(blocked.body.error, /Acknowledge manual contact/i);

    const allowed = await supertest(app)
      .post(`/api/jobs/${jobId}/allocation-notifications/publish-manual`)
      .set(auth())
      .send({
        allocation_id: allocationId,
        notification_id: preview.body.notification.id,
        manual_contact_acknowledged: true
      });

    assert.equal(allowed.status, 200);
    assert.equal(allowed.body.notification.status, 'published_manual');
    assert.equal(allowed.body.notification.recipient_phone, null);
    assert.equal(allowed.body.notification.sent_at, null);
  });

  test('GET notifications is job and company scoped', async () => {
    const { jobId, allocationId } = seedAllocatedJob();
    await supertest(app)
      .post(`/api/jobs/${jobId}/allocation-notifications/preview`)
      .set(auth())
      .send({ allocation_id: allocationId });

    const list = await supertest(app)
      .get(`/api/jobs/${jobId}/allocation-notifications`)
      .set(auth());

    assert.equal(list.status, 200);
    assert.equal(list.body.notifications.length, 1);
    assert.equal(list.body.notifications[0].company_id, companyId);

    const other = seedCompanyAndUser(db, {
      companyId: 'other-scope-company',
      userId: 'other-scope-user',
      email: 'scope@example.com'
    });
    const otherJobId = seedJob(db, other.companyId, other.userId);
    const forbidden = await supertest(app)
      .get(`/api/jobs/${otherJobId}/allocation-notifications`)
      .set(auth());

    assert.equal(forbidden.status, 404);
  });

  test('future send-sms endpoint is disabled by default', async () => {
    const { jobId, allocationId } = seedAllocatedJob();

    const res = await supertest(app)
      .post(`/api/jobs/${jobId}/allocation-notifications/send-sms`)
      .set(auth())
      .send({ allocation_id: allocationId });

    assert.equal(res.status, 501);
    assert.equal(res.body.provider_enabled, false);
    assert.match(res.body.error, /disabled/i);
  });
});
