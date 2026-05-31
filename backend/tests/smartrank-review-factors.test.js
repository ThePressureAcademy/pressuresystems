'use strict';

const { describe, test, before, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const { createTestDb, seedCompanyAndUser, seedWorker, seedCredential, seedJob } = require('./helpers/db');
const { setDb } = require('../src/db');
const { signToken } = require('../src/middleware/auth');

let db;
let app;
let request;
let companyId;
let adminId;
let adminToken;

before(() => {
  app = require('../src/app');
});

beforeEach(() => {
  db = createTestDb();
  setDb(db);
  request = supertest(app);
  ({ companyId, userId: adminId } = seedCompanyAndUser(db, {
    name: 'Review Admin',
    email: 'review-admin@example.com',
    role: 'admin'
  }));
  adminToken = signToken({ id: adminId });
});

afterEach(() => {
  db.close();
  setDb(null);
});

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

function reviewPayload(workerId, overrides = {}) {
  return {
    worker_id: workerId,
    category: 'operations_manager_review',
    severity: 'requires_review',
    summary: 'Confirm site-specific placement context before allocation.',
    applies_to_type: 'worker',
    confirm_review_boundary: true,
    ...overrides
  };
}

describe('SmartRank Review Factors v1', () => {
  test('admin can create, edit, archive, and audit metadata-only Review Factors', async () => {
    const workerId = seedWorker(db, companyId, { name: 'Review Worker' });
    const created = await request.post('/api/smartrank-review-factors').set(auth()).send(reviewPayload(workerId));

    assert.equal(created.status, 201);
    assert.equal(created.body.worker_id, workerId);
    assert.equal(created.body.category, 'operations_manager_review');
    assert.equal(created.body.severity, 'requires_review');
    assert.equal(created.body.active, true);
    assert.equal(created.body.worker_name, 'Review Worker');

    const edited = await request.patch(`/api/smartrank-review-factors/${created.body.id}`).set(auth()).send({
      ...reviewPayload(workerId),
      severity: 'caution',
      summary: 'Review crew pairing before this placement.'
    });
    assert.equal(edited.status, 200);
    assert.equal(edited.body.severity, 'caution');

    const archived = await request.post(`/api/smartrank-review-factors/${created.body.id}/archive`).set(auth()).send({});
    assert.equal(archived.status, 200);
    assert.equal(archived.body.active, false);

    const audit = db.prepare(`
      SELECT event_type, payload
      FROM audit_events
      WHERE company_id = ?
      ORDER BY timestamp ASC
    `).all(companyId);
    assert.equal(audit.some((event) => event.event_type === 'smartrank_review_factor_created'), true);
    assert.equal(audit.some((event) => event.event_type === 'smartrank_review_factor_updated'), true);
    assert.equal(audit.some((event) => event.event_type === 'smartrank_review_factor_archived'), true);
    assert.equal(audit.some((event) => /Confirm site-specific placement context/.test(event.payload)), false);
  });

  test('supervisor can manage Review Factors while dispatcher and viewer are read-only', async () => {
    const workerId = seedWorker(db, companyId, { name: 'Scoped Worker' });
    const supervisor = seedUser('supervisor');
    const dispatcher = seedUser('dispatcher');
    const viewer = seedUser('viewer');

    const supervisorCreate = await request.post('/api/smartrank-review-factors').set(auth(supervisor.token)).send(reviewPayload(workerId, {
      severity: 'info'
    }));
    assert.equal(supervisorCreate.status, 201);

    const dispatcherList = await request.get(`/api/smartrank-review-factors?worker_id=${workerId}`).set(auth(dispatcher.token));
    assert.equal(dispatcherList.status, 200);
    assert.equal(dispatcherList.body.review_factors.length, 1);

    const dispatcherCreate = await request.post('/api/smartrank-review-factors').set(auth(dispatcher.token)).send(reviewPayload(workerId));
    assert.equal(dispatcherCreate.status, 403);

    const viewerArchive = await request.post(`/api/smartrank-review-factors/${supervisorCreate.body.id}/archive`).set(auth(viewer.token)).send({});
    assert.equal(viewerArchive.status, 403);
  });

  test('rejects unsafe categories, unsupported hard blocks, missing confirmation, and forbidden wording', async () => {
    const workerId = seedWorker(db, companyId, { name: 'Validation Worker' });

    const missingConfirmation = await request.post('/api/smartrank-review-factors').set(auth()).send({
      ...reviewPayload(workerId),
      confirm_review_boundary: false
    });
    assert.equal(missingConfirmation.status, 400);
    assert.match(missingConfirmation.body.error, /placement-specific decision-support/i);

    const medical = await request.post('/api/smartrank-review-factors').set(auth()).send(reviewPayload(workerId, {
      category: 'medical_clearance_recorded'
    }));
    assert.equal(medical.status, 400);

    const broadHardBlock = await request.post('/api/smartrank-review-factors').set(auth()).send(reviewPayload(workerId, {
      category: 'operations_manager_review',
      severity: 'hard_block'
    }));
    assert.equal(broadHardBlock.status, 422);
    assert.match(broadHardBlock.body.error, /credential review/i);

    const forbidden = await request.post('/api/smartrank-review-factors').set(auth()).send(reviewPayload(workerId, {
      summary: 'Do not use this worker.'
    }));
    assert.equal(forbidden.status, 422);
    assert.match(forbidden.body.error, /placement-specific review context/i);
  });

  test('keeps Review Factors tenant-scoped', async () => {
    const workerId = seedWorker(db, companyId, { name: 'Tenant A Worker' });
    const created = await request.post('/api/smartrank-review-factors').set(auth()).send(reviewPayload(workerId));
    assert.equal(created.status, 201);

    const other = seedCompanyAndUser(db, {
      companyId: 'tenant-b',
      email: 'tenant-b@example.com',
      role: 'admin'
    });
    const otherWorkerId = seedWorker(db, other.companyId, { name: 'Tenant B Worker' });
    const otherToken = signToken({ id: other.userId });

    const otherList = await request.get('/api/smartrank-review-factors').set(auth(otherToken));
    assert.equal(otherList.status, 200);
    assert.equal(otherList.body.review_factors.some((factor) => factor.id === created.body.id), false);

    const crossTenantEdit = await request.patch(`/api/smartrank-review-factors/${created.body.id}`).set(auth(otherToken)).send(reviewPayload(otherWorkerId));
    assert.equal(crossTenantEdit.status, 404);

    const crossTenantWorker = await request.post('/api/smartrank-review-factors').set(auth()).send(reviewPayload(otherWorkerId));
    assert.equal(crossTenantWorker.status, 404);
  });

  test('requires override reason when a Review Factor moves placement into review required', async () => {
    const workerId = seedWorker(db, companyId, { name: 'Review Required Worker', crane_classes: ['55T'] });
    seedCredential(db, workerId, companyId);
    const jobId = seedJob(db, companyId, adminId, {
      crane_class_required: '55T',
      task_tags: ['panel_lift']
    });
    const created = await request.post('/api/smartrank-review-factors').set(auth()).send(reviewPayload(workerId, {
      severity: 'requires_review',
      job_type: 'panel_lift'
    }));
    assert.equal(created.status, 201);

    const smartrank = await request.get(`/api/jobs/${jobId}/smartrank`).set(auth());
    assert.equal(smartrank.status, 200);
    assert.equal(smartrank.body.groups.review_required.some((entry) => entry.worker.id === workerId), true);
    const rankedEntry = smartrank.body.ranked.find((entry) => entry.worker.id === workerId);
    assert.equal(rankedEntry.candidate_group, 'review_required');
    assert.equal(rankedEntry.manual_confirmation_required, true);
    assert.equal(rankedEntry.warnings.some((warning) => warning.type === 'placement_review_required'), true);

    const rejected = await request.post(`/api/jobs/${jobId}/allocations`).set(auth()).send({ worker_id: workerId });
    assert.equal(rejected.status, 422);
    assert.match(rejected.body.error, /override_reason/);

    const accepted = await request.post(`/api/jobs/${jobId}/allocations`).set(auth()).send({
      worker_id: workerId,
      override_reason: 'Supervisor confirmed placement review context before allocation.'
    });
    assert.equal(accepted.status, 201);
    assert.equal(accepted.body.smartrank_snapshot.candidate_group, 'review_required');
    assert.equal(accepted.body.smartrank_snapshot.review_factors[0].id, created.body.id);

    const audit = db.prepare(`SELECT event_type FROM audit_events WHERE company_id = ?`).all(companyId);
    assert.equal(audit.some((event) => event.event_type === 'smartrank_review_factor_applied'), true);
    assert.equal(audit.some((event) => event.event_type === 'smartrank_review_override_recorded'), true);
  });

  test('blocks allocation when an objective credential Review Factor is a hard block', async () => {
    const workerId = seedWorker(db, companyId, { name: 'Credential Review Worker', crane_classes: ['55T'] });
    seedCredential(db, workerId, companyId);
    const jobId = seedJob(db, companyId, adminId, {
      crane_class_required: '55T'
    });

    const created = await request.post('/api/smartrank-review-factors').set(auth()).send(reviewPayload(workerId, {
      category: 'credential_review',
      severity: 'hard_block',
      summary: 'Objective credential document requires operations review before assignment.'
    }));
    assert.equal(created.status, 201);

    const smartrank = await request.get(`/api/jobs/${jobId}/smartrank`).set(auth());
    assert.equal(smartrank.status, 200);
    assert.equal(smartrank.body.blocked.some((entry) =>
      entry.worker.id === workerId && entry.blocks.some((block) => block.type === 'placement_review_hard_block')
    ), true);

    const rejected = await request.post(`/api/jobs/${jobId}/allocations`).set(auth()).send({
      worker_id: workerId,
      override_reason: 'No override path for hard block'
    });
    assert.equal(rejected.status, 422);
    assert.equal(rejected.body.blocks.some((block) => block.type === 'placement_review_hard_block'), true);

    const audit = db.prepare(`SELECT event_type FROM audit_events WHERE company_id = ?`).all(companyId);
    assert.equal(audit.some((event) => event.event_type === 'smartrank_review_hard_block_attempted'), true);
  });

  test('does not apply archived Review Factors to SmartRank', async () => {
    const workerId = seedWorker(db, companyId, { name: 'Archived Factor Worker', crane_classes: ['55T'] });
    seedCredential(db, workerId, companyId);
    const jobId = seedJob(db, companyId, adminId, {
      crane_class_required: '55T'
    });
    const created = await request.post('/api/smartrank-review-factors').set(auth()).send(reviewPayload(workerId, {
      severity: 'requires_review'
    }));
    assert.equal(created.status, 201);
    const archived = await request.post(`/api/smartrank-review-factors/${created.body.id}/archive`).set(auth()).send({});
    assert.equal(archived.status, 200);

    const smartrank = await request.get(`/api/jobs/${jobId}/smartrank`).set(auth());
    assert.equal(smartrank.status, 200);
    const rankedEntry = smartrank.body.ranked.find((entry) => entry.worker.id === workerId);
    assert.equal(rankedEntry.review_factors.length, 0);
    assert.notEqual(rankedEntry.candidate_group, 'review_required');
  });
});
