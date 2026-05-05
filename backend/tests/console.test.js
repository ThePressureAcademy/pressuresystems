'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');
const fs = require('fs');
const path = require('path');

const { createTestDb, seedCompanyAndUser } = require('./helpers/db');
const { setDb } = require('../src/db');

let db, app;

before(() => {
  db = createTestDb();
  setDb(db);
  app = require('../src/app');
  seedCompanyAndUser(db);
});

after(() => {
  db.close();
});

describe('Pilot console — static asset serving', () => {

  test('GET / redirects to /console/', async () => {
    const res = await supertest(app).get('/');
    assert.equal(res.status, 302);
    assert.equal(res.headers.location, '/console/');
  });

  test('GET /console/ returns the SPA shell', async () => {
    const res = await supertest(app).get('/console/');
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /html/);
    assert.match(res.text, /LIFTIQ Pilot Console/);
    assert.match(res.text, /id="login-screen"/);
    assert.match(res.text, /id="app-shell"/);
    assert.match(res.text, /\.\/app\.js/);
    assert.match(res.text, /\.\/styles\.css/);
  });

  test('GET /console/styles.css returns CSS', async () => {
    const res = await supertest(app).get('/console/styles.css');
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /css/);
    assert.match(res.text, /metric-tile/);
  });

  test('GET /console/app.js returns the SPA bundle', async () => {
    const res = await supertest(app).get('/console/app.js');
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /javascript/);
    assert.match(res.text, /renderDashboard/);
    assert.match(res.text, /renderSmartRank/);
    assert.match(res.text, /renderAllocate/);
    assert.match(res.text, /renderAudit/);
  });

  test('GET /console/<arbitrary> falls back to index.html (SPA routing)', async () => {
    const res = await supertest(app).get('/console/jobs/some-id/smartrank');
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /html/);
    assert.match(res.text, /LIFTIQ Pilot Console/);
  });

  test('Console references all ten required screens', () => {
    const appJs = fs.readFileSync(
      path.join(__dirname, '../public/console/app.js'),
      'utf8'
    );
    // Each render function corresponds to one of the required screens
    for (const fn of [
      'renderDashboard',     // login screen is in DOMContentLoaded login-form handler
      'renderWorkersList',   // workers list
      'renderNewWorker',     // create worker
      'renderWorkerDetail',  // worker detail (also renders credentials + fatigue inline)
      'renderJobsList',      // jobs list
      'renderNewJob',        // create job
      'renderJobDetail',     // job detail
      'renderSmartRank',     // smartrank
      'renderAllocate',      // allocation confirmation
      'renderAudit',         // audit log
      'renderMetrics',       // pilot metrics
      'buildCredentialForm', // credential entry
      'buildFatigueForm',    // fatigue entry
    ]) {
      assert.match(appJs, new RegExp(`function ${fn}`),
        `Console must define ${fn}`);
    }
  });

  test('API 404 still works (does not collide with SPA)', async () => {
    const res = await supertest(app).get('/api/does-not-exist');
    assert.equal(res.status, 404);
    assert.equal(res.body.error, 'Not found');
  });

  test('Health check still works', async () => {
    const res = await supertest(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });

});
