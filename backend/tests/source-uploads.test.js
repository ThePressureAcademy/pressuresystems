'use strict';

const { test, describe, before, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const supertest = require('supertest');

const { createTestDb, seedCompanyAndUser } = require('./helpers/db');
const { setDb } = require('../src/db');
const { signToken } = require('../src/middleware/auth');

let app;
let db;
let request;
let uploadDir;
let pilot;
let otherPilot;
let internal;
let pilotToken;
let otherToken;
let internalToken;

before(() => {
  app = require('../src/app');
});

beforeEach(() => {
  uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-source-uploads-'));
  process.env.SOURCE_UPLOAD_DIR = uploadDir;
  db = createTestDb();
  setDb(db);
  request = supertest(app);

  pilot = seedCompanyAndUser(db, {
    companyName: 'Pilot Crane Co',
    email: 'pilot-admin@example.com',
    role: 'admin'
  });
  otherPilot = seedCompanyAndUser(db, {
    companyName: 'Other Crane Co',
    email: 'other-admin@example.com',
    role: 'admin'
  });
  internal = seedCompanyAndUser(db, {
    companyName: 'Pressure Systems Internal',
    email: 'internal-admin@example.com',
    role: 'admin',
    isInternalAdmin: true
  });

  pilotToken = tokenFor(pilot);
  otherToken = tokenFor(otherPilot);
  internalToken = tokenFor(internal);
});

afterEach(() => {
  db.close();
  delete process.env.SOURCE_UPLOAD_DIR;
  fs.rmSync(uploadDir, { recursive: true, force: true });
});

function tokenFor(user) {
  return signToken({
    id: user.userId,
    company_id: user.companyId,
    role: 'admin',
    name: 'Test Admin'
  });
}

function auth(token = pilotToken) {
  return { Authorization: `Bearer ${token}` };
}

function pdfBuffer() {
  return Buffer.from('%PDF-1.4\n% DispatchTalon source upload test\n');
}

function uploadHeaders(overrides = {}) {
  const category = Object.prototype.hasOwnProperty.call(overrides, 'category')
    ? overrides.category
    : 'worker_list';
  return {
    ...auth(overrides.token || pilotToken),
    'Content-Type': 'application/octet-stream',
    'X-Source-Upload-Filename': encodeURIComponent(overrides.filename || 'worker-list.pdf'),
    'X-Source-Upload-Mime-Type': overrides.mimeType || 'application/pdf',
    'X-Source-Upload-Category': encodeURIComponent(category || ''),
    'X-Source-Upload-Notes': encodeURIComponent(overrides.notes || 'Current worker list for pilot setup.'),
    'X-Source-Upload-Authorised': overrides.authorised ?? 'true',
    'X-Source-Upload-Review-Only': overrides.reviewOnly ?? 'true',
    'X-Source-Upload-Batch-Count': String(overrides.batchCount || 1)
  };
}

function uploadOne(overrides = {}) {
  return request
    .post('/api/source-uploads')
    .set(uploadHeaders(overrides))
    .send(overrides.buffer || pdfBuffer());
}

function countRows(table, companyId) {
  return db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE company_id = ?`).get(companyId).count;
}

describe('Assisted source document uploads', { concurrency: false }, () => {
  test('requires authentication, category, and consent', async () => {
    const unauth = await request
      .post('/api/source-uploads')
      .set({
        'Content-Type': 'application/octet-stream',
        'X-Source-Upload-Filename': encodeURIComponent('worker-list.pdf'),
        'X-Source-Upload-Mime-Type': 'application/pdf',
        'X-Source-Upload-Category': encodeURIComponent('worker_list'),
        'X-Source-Upload-Authorised': 'true',
        'X-Source-Upload-Review-Only': 'true'
      })
      .send(pdfBuffer());
    assert.equal(unauth.status, 401);

    const missingCategory = await request
      .post('/api/source-uploads')
      .set(uploadHeaders({ category: '' }))
      .send(pdfBuffer());
    assert.equal(missingCategory.status, 400);
    assert.match(missingCategory.body.error, /Select what this document contains/i);

    const missingConsent = await request
      .post('/api/source-uploads')
      .set(uploadHeaders({ authorised: 'false' }))
      .send(pdfBuffer());
    assert.equal(missingConsent.status, 400);
    assert.match(missingConsent.body.error, /authorised to share/i);
  });

  test('uploads private source documents as pending review without creating live records', async () => {
    const res = await uploadOne({
      filename: 'tickets-and-workers.pdf',
      category: 'credential_ticket_records',
      notes: 'PDF has tickets and expiry dates.'
    });
    assert.equal(res.status, 201);
    assert.match(res.body.message, /pilot setup review/i);
    assert.match(res.body.message, /No live records have been updated yet/i);
    assert.equal(res.body.upload.original_filename, 'tickets-and-workers.pdf');
    assert.equal(res.body.upload.review_status, 'pending_review');
    assert.equal(res.body.upload.category, 'credential_ticket_records');
    assert.equal(Object.prototype.hasOwnProperty.call(res.body.upload, 'stored_key'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(res.body.upload, 'company_id'), false);

    const row = db.prepare('SELECT * FROM source_uploads WHERE id = ?').get(res.body.upload.id);
    assert.ok(row);
    assert.equal(row.company_id, pilot.companyId);
    assert.equal(row.uploaded_by_email, 'pilot-admin@example.com');
    assert.equal(row.review_status, 'pending_review');
    assert.equal(fs.existsSync(path.join(uploadDir, row.stored_key)), true);

    assert.equal(countRows('workers', pilot.companyId), 0);
    assert.equal(countRows('jobs', pilot.companyId), 0);
    assert.equal(countRows('company_assets', pilot.companyId), 0);
    assert.equal(countRows('allocations', pilot.companyId), 0);
    assert.equal(countRows('company_catalogue_selections', pilot.companyId), 0);

    const audit = db.prepare(`
      SELECT event_type, payload
      FROM audit_events
      WHERE company_id = ? AND event_type = 'source_upload_created'
    `).get(pilot.companyId);
    assert.ok(audit);
    assert.match(audit.payload, /tickets-and-workers\.pdf/);
    assert.doesNotMatch(audit.payload, /stored_key/);

    const list = await request.get('/api/source-uploads').set(auth());
    assert.equal(list.status, 200);
    assert.equal(list.body.uploads.length, 1);
    assert.equal(list.body.limits.max_file_size_bytes, 10 * 1024 * 1024);
  });

  test('rejects unsupported file types, signature mismatches, and oversized files', async () => {
    const unsupported = await uploadOne({
      filename: 'script.exe',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from('MZ')
    });
    assert.equal(unsupported.status, 400);
    assert.match(unsupported.body.error, /not supported/i);

    const mismatch = await uploadOne({
      filename: 'credential.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('not a pdf')
    });
    assert.equal(mismatch.status, 400);
    assert.match(mismatch.body.error, /does not match/i);

    const oversized = await uploadOne({
      filename: 'large.csv',
      mimeType: 'text/csv',
      buffer: Buffer.alloc((10 * 1024 * 1024) + 1, 'a')
    });
    assert.equal(oversized.status, 413);
  });

  test('keeps tenant uploads isolated and exposes all uploads only to internal admin', async () => {
    const upload = await uploadOne({ filename: 'pilot-workers.pdf' });
    assert.equal(upload.status, 201);

    const otherList = await request.get('/api/source-uploads').set(auth(otherToken));
    assert.equal(otherList.status, 200);
    assert.equal(otherList.body.uploads.length, 0);

    const otherGet = await request.get(`/api/source-uploads/${upload.body.upload.id}`).set(auth(otherToken));
    assert.equal(otherGet.status, 404);

    const otherAll = await request.get('/api/source-uploads?scope=all').set(auth(otherToken));
    assert.equal(otherAll.status, 403);

    const internalAll = await request.get('/api/source-uploads?scope=all').set(auth(internalToken));
    assert.equal(internalAll.status, 200);
    assert.equal(internalAll.body.uploads.length, 1);
    assert.equal(internalAll.body.uploads[0].company_id, pilot.companyId);
    assert.ok(internalAll.body.uploads[0].stored_key);
  });

  test('allows internal review status updates and restricted download', async () => {
    const upload = await uploadOne({ filename: 'asset-register.pdf', category: 'asset_plant_list' });
    assert.equal(upload.status, 201);

    const normalPatch = await request
      .patch(`/api/source-uploads/${upload.body.upload.id}/status`)
      .set(auth())
      .send({ review_status: 'under_review', review_notes: 'Reviewing' });
    assert.equal(normalPatch.status, 403);

    const internalPatch = await request
      .patch(`/api/source-uploads/${upload.body.upload.id}/status`)
      .set(auth(internalToken))
      .send({ review_status: 'ready_for_structuring', review_notes: 'Assets found for confirmation.' });
    assert.equal(internalPatch.status, 200);
    assert.equal(internalPatch.body.upload.review_status, 'ready_for_structuring');
    assert.equal(internalPatch.body.upload.review_notes, 'Assets found for confirmation.');

    const normalDownload = await request
      .get(`/api/source-uploads/${upload.body.upload.id}/download`)
      .set(auth());
    assert.equal(normalDownload.status, 403);

    const internalDownload = await request
      .get(`/api/source-uploads/${upload.body.upload.id}/download`)
      .set(auth(internalToken));
    assert.equal(internalDownload.status, 200);
    assert.match(internalDownload.headers['content-disposition'], /asset-register\.pdf/);
    const downloadedText = internalDownload.text || internalDownload.body?.toString('utf8') || '';
    assert.match(downloadedText, /DispatchTalon source upload test/);
  });

  test('removes uploads from the active review queue without cross-tenant deletion', async () => {
    const upload = await uploadOne({ filename: 'roster.pdf', category: 'roster_allocation_sheet' });
    assert.equal(upload.status, 201);
    const row = db.prepare('SELECT stored_key FROM source_uploads WHERE id = ?').get(upload.body.upload.id);
    const storedPath = path.join(uploadDir, row.stored_key);
    assert.equal(fs.existsSync(storedPath), true);

    const otherDelete = await request.delete(`/api/source-uploads/${upload.body.upload.id}`).set(auth(otherToken));
    assert.equal(otherDelete.status, 404);

    const removed = await request.delete(`/api/source-uploads/${upload.body.upload.id}`).set(auth());
    assert.equal(removed.status, 200);
    assert.equal(removed.body.upload.review_status, 'deleted');
    assert.equal(fs.existsSync(storedPath), false);

    const list = await request.get('/api/source-uploads').set(auth());
    assert.equal(list.status, 200);
    assert.equal(list.body.uploads.length, 0);
  });
});
