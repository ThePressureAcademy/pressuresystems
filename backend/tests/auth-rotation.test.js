'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const { createTestDb, seedCompanyAndUser } = require('./helpers/db');
const { setDb, runMigrations } = require('../src/db');
const { rotateAdminCredentials } = require('../src/services/admin-rotation');

test('runMigrations adds must_change_password to a legacy users table', () => {
  const legacyDb = new Database(':memory:');
  const schema = fs.readFileSync(path.join(__dirname, '../src/schema.sql'), 'utf8')
    .replace(/\s*must_change_password INTEGER NOT NULL DEFAULT 0,\r?\n/, '\n');

  legacyDb.exec(schema);
  runMigrations(legacyDb);

  const columns = legacyDb.prepare(`PRAGMA table_info(users)`).all();
  assert.ok(columns.some((column) => column.name === 'must_change_password'));
  legacyDb.close();
});

describe('admin credential rotation', () => {
  let db;
  let request;
  let companyId;
  let oldAdminId;
  let operationsId;
  let forcedToken;

  before(() => {
    db = createTestDb();
    setDb(db);
    request = supertest(require('../src/app'));

    const seeded = seedCompanyAndUser(db, {
      name: 'Seeded Admin',
      email: 'admin@example.com',
      password: 'changeme123',
      role: 'admin'
    });
    companyId = seeded.companyId;
    oldAdminId = seeded.userId;
    operationsId = randomUUID();

    db.prepare(`
      INSERT INTO users (id, company_id, name, email, password_hash, role, status, must_change_password)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      operationsId,
      companyId,
      'Operations Bootstrap',
      'operations@raymonds.com.au',
      bcrypt.hashSync('OldPassword!1', 1),
      'viewer',
      'invited'
    );
  });

  after(() => {
    db.close();
  });

  test('rotation helper updates operations admin and disables the seeded admin', () => {
    const result = rotateAdminCredentials(db, {
      replacementEmail: 'operations@raymonds.com.au',
      replacementName: 'Operations Admin',
      bootstrapPassword: 'changeme123'
    });

    assert.equal(result.replacementAdminEmail, 'operations@raymonds.com.au');
    assert.equal(result.role, 'admin');
    assert.equal(result.status, 'active');
    assert.equal(result.mustChangePassword, true);
    assert.equal(result.oldAdminAction, 'disabled');

    const replacement = db.prepare(`
      SELECT *
      FROM users
      WHERE id = ?
    `).get(operationsId);
    assert.equal(replacement.role, 'admin');
    assert.equal(replacement.status, 'active');
    assert.equal(replacement.must_change_password, 1);
    assert.ok(bcrypt.compareSync('changeme123', replacement.password_hash));

    const oldAdmin = db.prepare(`
      SELECT *
      FROM users
      WHERE id = ?
    `).get(oldAdminId);
    assert.equal(oldAdmin.status, 'deactivated');
    assert.equal(oldAdmin.role, 'viewer');
    assert.notEqual(oldAdmin.email, 'admin@example.com');
  });

  test('admin@example.com can no longer authenticate after rotation', async () => {
    const res = await request.post('/api/auth/login').send({
      email: 'admin@example.com',
      password: 'changeme123'
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Invalid credentials');
  });

  test('operations bootstrap login succeeds but requires password rotation', async () => {
    const res = await request.post('/api/auth/login').send({
      email: 'operations@raymonds.com.au',
      password: 'changeme123'
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.equal(res.body.user.email, 'operations@raymonds.com.au');
    assert.equal(res.body.user.role, 'admin');
    assert.equal(res.body.user.must_change_password, true);
    assert.equal(res.body.must_change_password, true);
    forcedToken = res.body.token;
  });

  test('normal authenticated routes are blocked until password change completes', async () => {
    const res = await request
      .get('/api/metrics')
      .set('Authorization', `Bearer ${forcedToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.must_change_password, true);
  });

  test('change-password rejects the wrong current password', async () => {
    const res = await request
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${forcedToken}`)
      .send({
        current_password: 'WrongPassword!1',
        new_password: 'NewPassword!123'
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Current password is incorrect');
  });

  test('change-password rejects the same password', async () => {
    const res = await request
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${forcedToken}`)
      .send({
        current_password: 'changeme123',
        new_password: 'changeme123'
      });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /different from the current password/i);
  });

  test('change-password rejects weak passwords', async () => {
    const res = await request
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${forcedToken}`)
      .send({
        current_password: 'changeme123',
        new_password: 'weakpass123'
      });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /uppercase|symbol/i);
  });

  test('change-password accepts a valid new password and clears the forced flag', async () => {
    const res = await request
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${forcedToken}`)
      .send({
        current_password: 'changeme123',
        new_password: 'RotateMe!123'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const updated = db.prepare(`
      SELECT must_change_password
      FROM users
      WHERE id = ?
    `).get(operationsId);
    assert.equal(updated.must_change_password, 0);
  });

  test('bootstrap password becomes unusable after rotation', async () => {
    const res = await request.post('/api/auth/login').send({
      email: 'operations@raymonds.com.au',
      password: 'changeme123'
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Invalid credentials');
  });

  test('new password authenticates successfully after rotation', async () => {
    const res = await request.post('/api/auth/login').send({
      email: 'operations@raymonds.com.au',
      password: 'RotateMe!123'
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, 'operations@raymonds.com.au');
    assert.equal(res.body.user.must_change_password, false);
    assert.equal(res.body.must_change_password, false);
  });
});
