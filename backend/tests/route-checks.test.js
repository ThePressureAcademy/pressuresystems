'use strict';

const { describe, test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const { createTestDb, seedCompanyAndUser, seedJob } = require('./helpers/db');
const { setDb } = require('../src/db');
const { signToken } = require('../src/middleware/auth');

let db;
let app;
let request;
let companyId;
let adminId;
let adminToken;
let dispatcher;
let supervisor;
let viewer;

function auth(token = adminToken) {
  return { Authorization: `Bearer ${token}` };
}

function seedUser(role, overrides = {}) {
  const id = overrides.id || randomUUID();
  db.prepare(`
    INSERT INTO users (id, company_id, name, email, password_hash, role, status)
    VALUES (?, ?, ?, ?, ?, ?, 'active')
  `).run(
    id,
    overrides.companyId || companyId,
    overrides.name || `${role} user`,
    overrides.email || `${role}-${id}@example.com`,
    bcrypt.hashSync('testpass', 1),
    role
  );
  return { id, token: signToken({ id }) };
}

function catalogueItem(key, fallback = {}) {
  let item = db.prepare(`SELECT * FROM requirement_catalogue_items WHERE normalized_key = ?`).get(key);
  if (item) return item;
  const result = db.prepare(`
    INSERT INTO requirement_catalogue_items (category, group_label, code, label, normalized_key, description, source)
    VALUES (?, ?, ?, ?, ?, ?, 'test')
  `).run(
    fallback.category || 'equipment',
    fallback.group_label || 'Test equipment',
    fallback.code || key.toUpperCase(),
    fallback.label || key,
    key,
    fallback.description || null
  );
  return db.prepare(`SELECT * FROM requirement_catalogue_items WHERE id = ?`).get(result.lastInsertRowid);
}

function seedAsset(key, assetNumber, options = {}) {
  const item = catalogueItem(key, options.catalogue || {});
  db.prepare(`
    INSERT OR IGNORE INTO company_catalogue_selections (company_id, catalogue_item_id, is_enabled)
    VALUES (?, ?, 1)
  `).run(companyId, item.id);
  const result = db.prepare(`
    INSERT INTO company_assets (company_id, catalogue_item_id, asset_number, display_name, asset_status, home_location, notes)
    VALUES (?, ?, ?, ?, 'active', 'Brisbane', ?)
  `).run(
    companyId,
    item.id,
    assetNumber,
    options.display_name || `${item.label} / ${assetNumber}`,
    options.notes || null
  );
  if (options.profile) {
    db.prepare(`
      INSERT INTO vehicle_profiles (
        id, company_id, asset_id, width_m, height_m, length_m, gross_weight_kg,
        axle_config, vehicle_class, permit_category, default_route_check_required
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      companyId,
      result.lastInsertRowid,
      options.profile.width_m ?? null,
      options.profile.height_m ?? null,
      options.profile.length_m ?? null,
      options.profile.gross_weight_kg ?? null,
      options.profile.axle_config || null,
      options.profile.vehicle_class || null,
      options.profile.permit_category || null,
      options.profile.default_route_check_required ? 1 : 0
    );
  }
  return result.lastInsertRowid;
}

function assignAsset(jobId, assetId) {
  db.prepare(`
    INSERT INTO job_asset_assignments (company_id, job_id, company_asset_id, source, created_by_user_id)
    VALUES (?, ?, ?, 'manual', ?)
  `).run(companyId, jobId, assetId, adminId);
}

async function createRouteCheck(jobId, assetId, token = adminToken) {
  return request.post('/api/route-checks')
    .set(auth(token))
    .send({ job_id: jobId, asset_id: assetId });
}

beforeEach(() => {
  process.env.ROUTECHECK_ENABLED = 'true';
  process.env.ROUTECHECK_REQUIRE_ACKNOWLEDGEMENT = 'true';
  process.env.ROUTECHECK_BLOCK_DISPATCH_ON_CRITICAL = 'true';
  db = createTestDb();
  setDb(db);
  app = require('../src/app');
  request = supertest(app);
  ({ companyId, userId: adminId } = seedCompanyAndUser(db, {
    email: 'routecheck-admin@example.com',
    role: 'admin'
  }));
  adminToken = signToken({ id: adminId });
  dispatcher = seedUser('dispatcher');
  supervisor = seedUser('supervisor');
  viewer = seedUser('viewer');
});

afterEach(() => {
  delete process.env.ROUTECHECK_ENABLED;
  delete process.env.ROUTECHECK_REQUIRE_ACKNOWLEDGEMENT;
  delete process.env.ROUTECHECK_BLOCK_DISPATCH_ON_CRITICAL;
  db.close();
  setDb(null);
});

describe('RouteCheck MVP', () => {
  test('feature flag disabled hides API and trial route', async () => {
    process.env.ROUTECHECK_ENABLED = 'false';
    const config = await request.get('/api/route-checks/config').set(auth());
    assert.equal(config.status, 404);

    const route = await request.get('/routecheck');
    assert.equal(route.status, 404);
  });

  test('evaluates RouteCheck requirement from asset class and vehicle profile', async () => {
    const jobId = seedJob(db, companyId, adminId, { shift_type: 'night' });
    const craneId = seedAsset('equipment_mobile_crane_100t', 'MC100-001', {
      profile: { width_m: 3.1, height_m: 4.5, length_m: 13.2, gross_weight_kg: 18000 }
    });
    assignAsset(jobId, craneId);

    const evaluated = await request.post(`/api/jobs/${jobId}/route-check/evaluate`).set(auth()).send({});
    assert.equal(evaluated.status, 200);
    assert.equal(evaluated.body.route_required, true);
    assert.ok(evaluated.body.risk_score >= 4);
    assert.ok(['high', 'critical'].includes(evaluated.body.risk_level));

    const lowRiskJobId = seedJob(db, companyId, adminId);
    const generatorId = seedAsset('equipment_small_generator', 'GEN-001', {
      catalogue: { label: 'Small generator', category: 'equipment' },
      profile: { width_m: 1.2, height_m: 1.4, length_m: 2.1, gross_weight_kg: 1000 }
    });
    assignAsset(lowRiskJobId, generatorId);
    const lowRisk = await request.post(`/api/jobs/${lowRiskJobId}/route-check/evaluate`).set(auth()).send({});
    assert.equal(lowRisk.status, 200);
    assert.equal(lowRisk.body.route_required, false);
    assert.equal(lowRisk.body.risk_level, 'low');
  });

  test('creates RouteChecks, records notes, links, status changes, acknowledgements, and audit events', async () => {
    const jobId = seedJob(db, companyId, adminId);
    const assetId = seedAsset('transport_tilt_tray', 'TT-001', {
      catalogue: { label: 'Tilt Tray', category: 'transport' },
      profile: { width_m: 2.6, height_m: 3.4, length_m: 12.8, gross_weight_kg: 13000 }
    });
    const created = await createRouteCheck(jobId, assetId, dispatcher.token);
    assert.equal(created.status, 201);
    assert.equal(created.body.route_required, true);
    assert.equal(created.body.status, 'not_checked');

    const link = await request.post(`/api/route-checks/${created.body.id}/external-links`).set(auth(dispatcher.token)).send({
      provider_name: 'manual',
      route_url: 'https://routing.example/review/123',
      origin_address: 'Depot',
      destination_address: 'Site'
    });
    assert.equal(link.status, 201);
    assert.equal(link.body.external_links.length, 1);

    const note = await request.post(`/api/route-checks/${created.body.id}/notes`).set(auth(dispatcher.token)).send({
      note_type: 'site_access',
      note_text: 'Use eastern gate. Avoid residential street entry.'
    });
    assert.equal(note.status, 201);
    assert.equal(note.body.notes[0].note_type, 'site_access');

    const checked = await request.patch(`/api/route-checks/${created.body.id}/status`).set(auth(dispatcher.token)).send({
      status: 'checked',
      note: 'Manual route review recorded.'
    });
    assert.equal(checked.status, 200);
    assert.equal(checked.body.status, 'checked');
    assert.ok(checked.body.checked_at);

    const sent = await request.post(`/api/route-checks/${created.body.id}/send-to-operator`).set(auth(dispatcher.token)).send({
      message: 'Please review the route/access notes before departure.'
    });
    assert.equal(sent.status, 200);
    assert.equal(sent.body.status, 'sent_to_operator');

    const ack = await request.post(`/api/route-checks/${created.body.id}/operator-ack`).set(auth(supervisor.token)).send({
      ack_status: 'confirmed',
      ack_note: 'Confirmed route/access notes reviewed.'
    });
    assert.equal(ack.status, 200);
    assert.equal(ack.body.status, 'operator_acknowledged');
    assert.ok(ack.body.operator_acknowledged_at);

    const events = await request.get(`/api/route-checks/${created.body.id}/audit`).set(auth());
    assert.equal(events.status, 200);
    assert.ok(events.body.events.some((event) => event.event_type === 'route_check_created'));
    assert.ok(events.body.events.some((event) => event.event_type === 'operator_acknowledged'));

    const auditTypes = db.prepare(`SELECT event_type FROM audit_events WHERE company_id = ?`).all(companyId).map((row) => row.event_type);
    assert.ok(auditTypes.includes('route_check_created'));
    assert.ok(auditTypes.includes('route_check_note_added'));
    assert.ok(auditTypes.includes('route_check_operator_acknowledged'));
  });

  test('permissions keep viewer read-only and admin-only override for critical or permit blocked review', async () => {
    const jobId = seedJob(db, companyId, adminId);
    const assetId = seedAsset('transport_osom_prime_mover', 'OSOM-001', {
      catalogue: { label: 'OSOM Prime Mover', category: 'transport' },
      profile: {
        width_m: 3.4,
        height_m: 4.7,
        length_m: 18.2,
        gross_weight_kg: 30000,
        permit_category: 'oversize_overmass'
      }
    });
    const created = await createRouteCheck(jobId, assetId, dispatcher.token);
    assert.equal(created.status, 201);
    assert.equal(created.body.risk_level, 'critical');

    const viewerEdit = await request.patch(`/api/route-checks/${created.body.id}/status`).set(auth(viewer.token)).send({
      status: 'checked'
    });
    assert.equal(viewerEdit.status, 403);

    const checked = await request.patch(`/api/route-checks/${created.body.id}/status`).set(auth(dispatcher.token)).send({
      status: 'checked'
    });
    assert.equal(checked.status, 200);

    const dispatcherApprove = await request.post(`/api/route-checks/${created.body.id}/approve`).set(auth(dispatcher.token)).send({
      approval_note: 'Dispatcher attempted critical approval.'
    });
    assert.equal(dispatcherApprove.status, 403);

    const adminMissingReason = await request.post(`/api/route-checks/${created.body.id}/approve`).set(auth()).send({});
    assert.equal(adminMissingReason.status, 422);

    const adminOverride = await request.post(`/api/route-checks/${created.body.id}/approve`).set(auth()).send({
      override_reason: 'Admin confirmed permits and external route review before dispatch.'
    });
    assert.equal(adminOverride.status, 200);
    assert.equal(adminOverride.body.status, 'approved_for_dispatch');
    assert.equal(adminOverride.body.override_used, true);
  });

  test('permit required and operator issue_found block dispatch workflow until reviewed', async () => {
    const jobId = seedJob(db, companyId, adminId);
    const assetId = seedAsset('transport_semi_trailer', 'SEMI-001', {
      catalogue: { label: 'Semi Trailer', category: 'transport' },
      profile: { width_m: 2.55, height_m: 4.1, length_m: 14.5, gross_weight_kg: 15000 }
    });
    const created = await createRouteCheck(jobId, assetId);
    assert.equal(created.status, 201);

    const permit = await request.patch(`/api/route-checks/${created.body.id}/permit`).set(auth()).send({
      permit_required: true,
      permit_status: 'required',
      permit_notes: 'Permit/access condition must be confirmed before release.'
    });
    assert.equal(permit.status, 200);
    assert.equal(permit.body.status, 'permit_required');

    const blocked = await request.post(`/api/route-checks/${created.body.id}/approve`).set(auth()).send({
      override_reason: 'Missing confirmed permit should remain blocked.'
    });
    assert.equal(blocked.status, 200);
    assert.equal(blocked.body.override_used, true);

    const issue = await request.post(`/api/route-checks/${created.body.id}/operator-ack`).set(auth(supervisor.token)).send({
      ack_status: 'issue_found',
      ack_note: 'Operator found an access issue and needs dispatcher call.'
    });
    assert.equal(issue.status, 200);
    assert.equal(issue.body.status, 'issue_flagged');
  });

  test('tenant scoping blocks cross-tenant RouteCheck access', async () => {
    const jobId = seedJob(db, companyId, adminId);
    const assetId = seedAsset('transport_tilt_tray', 'TT-002', {
      catalogue: { label: 'Tilt Tray', category: 'transport' }
    });
    const created = await createRouteCheck(jobId, assetId);
    assert.equal(created.status, 201);

    const other = seedCompanyAndUser(db, {
      companyId: 'tenant-b',
      email: 'routecheck-other@example.com',
      role: 'admin'
    });
    const otherToken = signToken({ id: other.userId });

    const otherList = await request.get('/api/route-checks').set(auth(otherToken));
    assert.equal(otherList.status, 200);
    assert.equal(otherList.body.route_checks.some((routeCheck) => routeCheck.id === created.body.id), false);

    const otherDetail = await request.get(`/api/route-checks/${created.body.id}`).set(auth(otherToken));
    assert.equal(otherDetail.status, 404);
  });
});
