'use strict';

const { test, describe, before, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');
const { randomUUID } = require('node:crypto');

const {
  createTestDb,
  seedCompanyAndUser,
  seedJob,
  seedWorker
} = require('./helpers/db');
const { setDb } = require('../src/db');
const { signToken } = require('../src/middleware/auth');

let db;
let app;
let request;
let internal;
let pilot;
let otherPilot;
let internalToken;
let pilotToken;

before(() => {
  app = require('../src/app');
});

beforeEach(() => {
  db = createTestDb();
  setDb(db);
  request = supertest(app);

  internal = seedCompanyAndUser(db, {
    companyName: 'Pressure Systems Internal',
    slug: 'pressure-systems-internal',
    email: 'internal-admin@test.com',
    role: 'admin',
    isInternalAdmin: true,
    pilotStartsAt: sqlDateTime(daysAgo(20)),
    pilotExpiresAt: sqlDateTime(daysFromNow(20))
  });
  pilot = seedCompanyAndUser(db, {
    companyName: 'Pilot Company',
    slug: 'pilot-company',
    email: 'pilot-admin@test.com',
    role: 'admin',
    pilotType: 'testing_partner',
    pilotStartsAt: sqlDateTime(daysAgo(10)),
    pilotExpiresAt: sqlDateTime(daysFromNow(4))
  });
  otherPilot = seedCompanyAndUser(db, {
    companyName: 'Other Pilot',
    slug: 'other-pilot',
    email: 'other-admin@test.com',
    role: 'admin',
    pilotType: 'commercial_pilot',
    pilotStartsAt: sqlDateTime(daysAgo(18)),
    pilotExpiresAt: sqlDateTime(daysFromNow(8))
  });

  internalToken = signToken({
    id: internal.userId,
    company_id: internal.companyId,
    role: 'admin',
    name: 'Internal Admin'
  });
  pilotToken = signToken({
    id: pilot.userId,
    company_id: pilot.companyId,
    role: 'admin',
    name: 'Pilot Admin'
  });
});

afterEach(() => {
  db.close();
});

function auth(token = internalToken) {
  return { Authorization: `Bearer ${token}` };
}

function daysAgo(days) {
  return new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
}

function daysFromNow(days) {
  return new Date(Date.now() + (days * 24 * 60 * 60 * 1000));
}

function sqlDateTime(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function seedAuditEvent(companyId, eventType, timestamp, overrides = {}) {
  const id = overrides.id || randomUUID();
  db.prepare(`
    INSERT INTO audit_events (
      id, company_id, event_type, user_id, worker_id, job_id, allocation_id, payload, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    companyId,
    eventType,
    overrides.userId || null,
    overrides.workerId || null,
    overrides.jobId || null,
    overrides.allocationId || null,
    JSON.stringify(overrides.payload || {}),
    timestamp
  );
  return id;
}

function seedCatalogueSelection(companyId) {
  const item = db.prepare(`
    SELECT id
    FROM requirement_catalogue_items
    WHERE is_active = 1
    ORDER BY id
    LIMIT 1
  `).get();
  db.prepare(`
    INSERT INTO company_catalogue_selections (company_id, catalogue_item_id, is_enabled)
    VALUES (?, ?, 1)
  `).run(companyId, item.id);
}

function seedCompanyAsset(companyId) {
  const item = db.prepare(`
    SELECT id
    FROM requirement_catalogue_items
    WHERE is_active = 1 AND category IN ('equipment', 'transport')
    ORDER BY id
    LIMIT 1
  `).get();
  if (!item) return null;
  return db.prepare(`
    INSERT INTO company_assets (company_id, catalogue_item_id, asset_number, display_name)
    VALUES (?, ?, ?, ?)
  `).run(companyId, item.id, `ASSET-${companyId.slice(0, 6)}`, 'Pilot asset').lastInsertRowid;
}

function seedSensitiveOperationalRows(companyId, userId) {
  const workerId = seedWorker(db, companyId, {
    name: 'Sensitive Worker Name',
    email: 'sensitive-worker@example.com'
  });
  const jobId = seedJob(db, companyId, userId, {
    client_name: 'Secret Client Name',
    site_name: 'Secret Site Name'
  });
  db.prepare(`
    UPDATE jobs
    SET site_location = ?, job_description = ?, notes = ?
    WHERE id = ?
  `).run(
    '1 Secret Road, Private Yard',
    'Private lift description',
    'Private operational note',
    jobId
  );
  seedAuditEvent(companyId, 'job_updated', sqlDateTime(daysAgo(1)), {
    userId,
    workerId,
    jobId,
    payload: {
      client_name: 'Secret Client Name',
      site_address: '1 Secret Road',
      worker_name: 'Sensitive Worker Name',
      notes: 'Private operational note'
    }
  });
  return { workerId, jobId };
}

describe('Privacy-safe pilot activity monitor', { concurrency: false }, () => {
  test('requires authentication and internal admin access', async () => {
    const unauth = await request.get('/api/internal/pilot-activity');
    assert.equal(unauth.status, 401);

    const normalAdmin = await request.get('/api/internal/pilot-activity').set(auth(pilotToken));
    assert.equal(normalAdmin.status, 403);

    const allowed = await request.get('/api/internal/pilot-activity').set(auth());
    assert.equal(allowed.status, 200);
    assert.equal(Array.isArray(allowed.body.companies), true);
  });

  test('response aggregates usage without exposing operational details or audit payloads', async () => {
    seedSensitiveOperationalRows(pilot.companyId, pilot.userId);
    seedAuditEvent(pilot.companyId, 'user_login_succeeded', sqlDateTime(daysAgo(2)), { userId: pilot.userId });
    seedAuditEvent(pilot.companyId, 'smartrank_generated', sqlDateTime(daysAgo(0)), { userId: pilot.userId });
    db.prepare(`UPDATE users SET last_login_at = ? WHERE id = ?`).run(sqlDateTime(daysAgo(1)), pilot.userId);

    const res = await request.get('/api/internal/pilot-activity?status=all&days=14').set(auth());
    assert.equal(res.status, 200);
    const body = JSON.stringify(res.body);
    assert.equal(body.includes('Sensitive Worker Name'), false);
    assert.equal(body.includes('sensitive-worker@example.com'), false);
    assert.equal(body.includes('Secret Client Name'), false);
    assert.equal(body.includes('Secret Site Name'), false);
    assert.equal(body.includes('1 Secret Road'), false);
    assert.equal(body.includes('Private lift description'), false);
    assert.equal(body.includes('Private operational note'), false);

    const company = res.body.companies.find((entry) => entry.company_id === pilot.companyId);
    assert.ok(company);
    assert.equal(company.company_name, 'Pilot Company');
    assert.equal(company.workers_count, 1);
    assert.equal(company.jobs_count, 1);
    assert.equal(company.smartrank_run_count, 1);
    assert.equal(company.last_activity_type, 'smartrank_generated');
    assert.equal(Object.prototype.hasOwnProperty.call(company, 'payload'), false);
  });

  test('calculates activity counts, days remaining, and strong adoption scoring per company', async () => {
    seedCatalogueSelection(pilot.companyId);
    seedCompanyAsset(pilot.companyId);
    seedWorker(db, pilot.companyId, { name: 'Aggregate Worker' });
    seedJob(db, pilot.companyId, pilot.userId);
    seedJob(db, pilot.companyId, pilot.userId, { client_name: 'Second Client', site_name: 'Second Site' });

    for (const [type, when] of [
      ['user_login_succeeded', 9],
      ['user_login_succeeded', 6],
      ['company_operating_mode_updated', 8],
      ['company_catalogue_updated', 8],
      ['worker_imported', 7],
      ['worker_updated', 6],
      ['job_brief_import_previewed', 5],
      ['job_updated', 4],
      ['smartrank_generated', 3],
      ['allocation_confirmed', 2],
      ['credential_block_applied', 2],
      ['fatigue_warning_triggered', 1]
    ]) {
      seedAuditEvent(pilot.companyId, type, sqlDateTime(daysAgo(when)), { userId: pilot.userId });
    }

    const res = await request.get('/api/internal/pilot-activity?status=all&days=14').set(auth());
    assert.equal(res.status, 200);
    const company = res.body.companies.find((entry) => entry.company_id === pilot.companyId);
    assert.ok(company);
    assert.equal(company.login_count, 2);
    assert.ok(company.active_days >= 2);
    assert.equal(company.workers_count, 1);
    assert.equal(company.jobs_count, 2);
    assert.equal(company.assets_count, 1);
    assert.equal(company.worker_import_count, 1);
    assert.equal(company.job_brief_import_count, 1);
    assert.equal(company.smartrank_run_count, 1);
    assert.equal(company.warning_count, 1);
    assert.equal(company.block_count, 1);
    assert.ok(company.days_remaining <= 4 && company.days_remaining >= 0);
    assert.ok(company.engagement_score >= 76);
    assert.equal(company.adoption_stage, 'strong adoption signal');
    assert.match(company.follow_up, /Pilot ending|Discuss paid pilot|midpoint/i);
  });

  test('not activated company gets low score and follow-up prompt', async () => {
    const res = await request.get('/api/internal/pilot-activity?status=all&days=14').set(auth());
    assert.equal(res.status, 200);
    const company = res.body.companies.find((entry) => entry.company_id === otherPilot.companyId);
    assert.ok(company);
    assert.equal(company.login_count, 0);
    assert.equal(company.active_days, 0);
    assert.equal(company.engagement_score, 0);
    assert.equal(company.adoption_stage, 'not activated');
    assert.equal(company.follow_up, 'Contact today');
  });

  test('tenant counts are isolated between pilot companies', async () => {
    seedWorker(db, pilot.companyId, { name: 'Pilot Worker' });
    seedWorker(db, otherPilot.companyId, { name: 'Other Worker A' });
    seedWorker(db, otherPilot.companyId, { name: 'Other Worker B' });
    seedJob(db, otherPilot.companyId, otherPilot.userId);
    seedAuditEvent(pilot.companyId, 'company_reset_completed', sqlDateTime(daysAgo(1)), { userId: pilot.userId });

    const res = await request.get('/api/internal/pilot-activity?status=all&days=14').set(auth());
    assert.equal(res.status, 200);
    const pilotEntry = res.body.companies.find((entry) => entry.company_id === pilot.companyId);
    const otherEntry = res.body.companies.find((entry) => entry.company_id === otherPilot.companyId);
    assert.equal(pilotEntry.workers_count, 1);
    assert.equal(pilotEntry.jobs_count, 0);
    assert.equal(pilotEntry.reset_count, 1);
    assert.equal(otherEntry.workers_count, 2);
    assert.equal(otherEntry.jobs_count, 1);
    assert.equal(otherEntry.reset_count, 0);
  });

  test('internal monitor view and reset preview are audited without sensitive payloads', async () => {
    const monitor = await request.get('/api/internal/pilot-activity?status=all').set(auth());
    assert.equal(monitor.status, 200);

    const preview = await request.get('/api/company/reset-preview?scope=jobs').set(auth(pilotToken));
    assert.equal(preview.status, 200);

    const eventTypes = db.prepare(`
      SELECT event_type, payload
      FROM audit_events
      WHERE event_type IN ('internal_pilot_monitor_viewed', 'company_reset_previewed')
      ORDER BY timestamp ASC
    `).all();
    assert.equal(eventTypes.some((event) => event.event_type === 'internal_pilot_monitor_viewed'), true);
    assert.equal(eventTypes.some((event) => event.event_type === 'company_reset_previewed'), true);
    const payloadText = JSON.stringify(eventTypes.map((event) => JSON.parse(event.payload)));
    assert.equal(/worker_name|client_name|site_address|notes|job_description/i.test(payloadText), false);
  });

  test('login success, login failure, password change, and forced-password block create telemetry events', async () => {
    const login = await request.post('/api/auth/login').send({
      email: 'pilot-admin@test.com',
      password: 'testpass'
    });
    assert.equal(login.status, 200);

    const failed = await request.post('/api/auth/login').send({
      email: 'pilot-admin@test.com',
      password: 'wrong-password'
    });
    assert.equal(failed.status, 401);

    db.prepare(`UPDATE users SET must_change_password = 1 WHERE id = ?`).run(pilot.userId);
    const activePilotToken = login.body.token;
    assert.ok(activePilotToken, 'login should return a token for the protected-route check');
    const protectedBlocked = await request.get('/api/jobs').set(auth(activePilotToken));
    assert.equal(protectedBlocked.status, 403, JSON.stringify(protectedBlocked.body));
    assert.equal(protectedBlocked.body.must_change_password, true);

    const change = await request.post('/api/auth/change-password').set(auth(activePilotToken)).send({
      current_password: 'testpass',
      new_password: 'NewSecurePass1!'
    });
    assert.equal(change.status, 200);

    const eventTypes = db.prepare(`
      SELECT event_type
      FROM audit_events
      WHERE company_id = ?
    `).all(pilot.companyId).map((row) => row.event_type);
    assert.ok(eventTypes.includes('user_login_succeeded'), eventTypes.join(', '));
    assert.ok(eventTypes.includes('user_login_failed'), eventTypes.join(', '));
    assert.ok(eventTypes.includes('protected_route_blocked_password_change'), eventTypes.join(', '));
    assert.ok(eventTypes.includes('password_changed'), eventTypes.join(', '));
  });
});
