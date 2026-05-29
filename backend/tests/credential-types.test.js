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
    name: 'Credential Admin',
    email: 'credential-admin@example.com',
    role: 'admin'
  }));
  token = signToken({ id: userId, company_id: companyId, role: 'admin', name: 'Credential Admin' });
});

afterEach(() => {
  db.close();
  setDb(null);
});

const auth = () => ({ Authorization: `Bearer ${token}` });

function futureDate(daysAhead) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysAhead);
  return date.toISOString().slice(0, 10);
}

describe('Editable credential types and worker credential register', () => {
  test('lists defaults and manages tenant custom credential types', async () => {
    const defaults = await request.get('/api/credential-types').set(auth());
    assert.equal(defaults.status, 200);
    assert.ok(defaults.body.defaults.some((item) => item.value === 'white_card'));
    assert.equal(defaults.body.custom.length, 0);

    const created = await request.post('/api/credential-types').set(auth()).send({
      name: 'NZ SiteSafe',
      category: 'site_access',
      region: 'NZ',
      description: 'New Zealand site access card'
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.name, 'NZ SiteSafe');
    assert.equal(created.body.category, 'site_access');
    assert.equal(created.body.is_default, false);
    assert.equal(created.body.active, true);

    const duplicate = await request.post('/api/credential-types').set(auth()).send({
      name: 'NZ SiteSafe',
      category: 'site_access'
    });
    assert.equal(duplicate.status, 409);

    const edited = await request.patch(`/api/credential-types/${created.body.id}`).set(auth()).send({
      name: 'NZ SiteSafe Card',
      description: 'Updated pilot register label'
    });
    assert.equal(edited.status, 200);
    assert.equal(edited.body.name, 'NZ SiteSafe Card');
    assert.equal(edited.body.value, 'custom_nz_sitesafe_card');

    const archived = await request.post(`/api/credential-types/${created.body.id}/archive`).set(auth()).send({});
    assert.equal(archived.status, 200);
    assert.equal(archived.body.active, false);

    const hidden = await request.get('/api/credential-types').set(auth());
    assert.equal(hidden.body.custom.some((item) => item.id === created.body.id), false);

    const visibleWhenRequested = await request.get('/api/credential-types?include_inactive=1').set(auth());
    assert.equal(visibleWhenRequested.body.custom.some((item) => item.id === created.body.id && !item.active), true);
  });

  test('assigns custom credential types to workers and flags credential review status', async () => {
    const workerId = seedWorker(db, companyId, { name: 'Chantelle Operator', role: 'crane_operator' });
    const customType = await request.post('/api/credential-types').set(auth()).send({
      name: 'NZ SiteSafe',
      category: 'site_access',
      region: 'NZ'
    });
    assert.equal(customType.status, 201);

    const current = await request.post(`/api/workers/${workerId}/credentials`).set(auth()).send({
      credential_type_id: customType.body.id,
      identifier: 'SS-100',
      issuing_body: 'Site Safe NZ',
      expiry_date: '2099-01-01',
      notes: 'Pilot credential register record'
    });
    assert.equal(current.status, 201);
    assert.equal(current.body.type_label, 'NZ SiteSafe');
    assert.equal(current.body.credential_type_id, customType.body.id);
    assert.equal(current.body.status, 'valid');
    assert.equal(current.body.status_label, 'Current');

    const expired = await request.post(`/api/workers/${workerId}/credentials`).set(auth()).send({
      type: 'white_card',
      expiry_date: '2000-01-01'
    });
    assert.equal(expired.status, 201);
    assert.equal(expired.body.status, 'expired');
    assert.equal(expired.body.status_label, 'Expired');

    const expiring = await request.post(`/api/workers/${workerId}/credentials`).set(auth()).send({
      type: 'first_aid',
      expiry_date: futureDate(15)
    });
    assert.equal(expiring.status, 201);
    assert.equal(expiring.body.status, 'expiring_soon');
    assert.equal(expiring.body.status_label, 'Expiring Soon');

    const listed = await request.get(`/api/workers/${workerId}/credentials`).set(auth());
    assert.equal(listed.status, 200);
    assert.equal(listed.body.some((item) => item.type_label === 'NZ SiteSafe'), true);
    assert.equal(listed.body.some((item) => item.status === 'expired'), true);
    assert.equal(listed.body.some((item) => item.status === 'expiring_soon'), true);
  });

  test('keeps custom credential types tenant-scoped', async () => {
    const customType = await request.post('/api/credential-types').set(auth()).send({
      name: 'NZ SiteSafe',
      category: 'site_access',
      region: 'NZ'
    });
    assert.equal(customType.status, 201);

    const other = seedCompanyAndUser(db, {
      companyId: 'tenant-b',
      email: 'tenant-b@example.com',
      role: 'admin'
    });
    const otherWorkerId = seedWorker(db, other.companyId, { name: 'Tenant B Worker' });
    const otherToken = signToken({ id: other.userId, company_id: other.companyId, role: 'admin', name: 'Tenant B Admin' });
    const otherAuth = { Authorization: `Bearer ${otherToken}` };

    const otherList = await request.get('/api/credential-types').set(otherAuth);
    assert.equal(otherList.status, 200);
    assert.equal(otherList.body.custom.some((item) => item.id === customType.body.id), false);

    const crossTenantAssign = await request.post(`/api/workers/${otherWorkerId}/credentials`).set(otherAuth).send({
      credential_type_id: customType.body.id,
      expiry_date: '2099-01-01'
    });
    assert.equal(crossTenantAssign.status, 400);
    assert.match(crossTenantAssign.body.error, /not recognised/i);

    const rawCustomKey = await request.post(`/api/workers/${otherWorkerId}/credentials`).set(otherAuth).send({
      type: 'custom_nz_sitesafe',
      expiry_date: '2099-01-01'
    });
    assert.equal(rawCustomKey.status, 400);
    assert.match(rawCustomKey.body.error, /company register/i);
  });
});
