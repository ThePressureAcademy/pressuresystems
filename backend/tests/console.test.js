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
    assert.match(res.text, /DispatchTalon Pilot Console/);
    assert.match(res.text, /id="login-screen"/);
    assert.match(res.text, /id="password-change-screen"/);
    assert.match(res.text, /id="app-shell"/);
    assert.match(res.text, /\.\/app\.js/);
    assert.match(res.text, /\.\/styles\.css/);
    assert.match(res.text, /Pilot portal access is invite-only/i);
    assert.equal(/seed password|seeded admin|compromised|admin@example\.com|changeme123|bootstrap/i.test(res.text), false);
    assert.match(res.text, /href="#\/workers\/import"/);
    assert.match(res.text, />Import workers</);
    assert.match(res.text, /href="#\/schedule"/);
    assert.match(res.text, />Schedule</);
    assert.match(res.text, /href="#\/jobs"/);
    assert.match(res.text, /href="#\/our-business"/);
    assert.match(res.text, />Our Business</);
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
    assert.match(res.text, /renderSchedule/);
    assert.match(res.text, /renderWorkerImport/);
    assert.match(res.text, /renderJobBriefImport/);
    assert.match(res.text, /renderSmartRank/);
    assert.match(res.text, /renderAllocate/);
    assert.match(res.text, /renderAudit/);
    assert.match(res.text, /formatCompanyLabel/);
    assert.match(res.text, /Company:/);
    assert.match(res.text, /test portal/);
    assert.match(res.text, /Test portal expired/);
    assert.match(res.text, /Contact Pressure Systems to extend access/);
    assert.match(res.text, /Remove worker from active dispatch\?/);
    assert.match(res.text, /This will remove the worker from active dispatch and SmartRank recommendations\. Existing audit history will be kept\./);
    assert.match(res.text, /\/workers\/\$\{workerId\}\/remove/);
    assert.match(res.text, /Dispatch calendar/);
    assert.match(res.text, /Scheduled date/);
    assert.match(res.text, /Scheduled start time/);
    assert.match(res.text, /Scheduled end time/);
    assert.match(res.text, /Schedule status/);
    assert.match(res.text, /Apply timezone/);
    assert.match(res.text, /double-booking is blocked or warned in SmartRank/i);
    assert.match(res.text, /Import job brief/);
    assert.match(res.text, /Paste or upload job details/);
    assert.match(res.text, /Review extracted job details/);
    assert.match(res.text, /Create job from brief/);
    assert.match(res.text, /Cancel import/);
    assert.match(res.text, /DispatchTalon does not verify job details automatically/i);
    assert.match(res.text, /\/jobs\/import-brief\/\$\{preview\.import_id\}\/create-job/);
    assert.match(res.text, /Crane, counterweight and transport/);
    assert.match(res.text, /Select travel state/);
    assert.match(res.text, /Our Business/);
    assert.match(res.text, /Operating mode/);
    assert.match(res.text, /Labour only/);
    assert.match(res.text, /Plant \+ labour/);
    assert.match(res.text, /Labour-only mode/);
    assert.match(res.text, /Plant and asset register hidden/);
    assert.match(res.text, /Job requirements/);
    assert.match(res.text, /Asset Register/);
    assert.match(res.text, /Asset number \/ plant number/);
    assert.match(res.text, /No plant numbers added yet/);
    assert.match(res.text, /No assets added yet\. Add plant numbers under the equipment classes your business uses\./);
    assert.match(res.text, /Collapse reminder/);
    assert.match(res.text, /liftiq\.passwordReminderDismissed/);
    assert.match(res.text, /refreshAuthenticatedUser/);
    assert.match(res.text, /\/auth\/me/);
    assert.match(res.text, /Select asset \/ plant number/);
    assert.match(res.text, /Add one-off requirement/);
    assert.match(res.text, /Review required/);
    assert.match(res.text, /Counterweight transport may be required/);
    assert.match(res.text, /NHVR \/ state notice or permit check may be required/);
    assert.equal(/\bapproved\b|compliant|legal to travel|safe to dispatch|engineered lift confirmed/i.test(res.text), false);
  });

  test('GET /samples exposes the employee onboarding sample files', async () => {
    const csv = await supertest(app).get('/samples/employee-import-sample.csv');
    assert.equal(csv.status, 200);
    assert.match(csv.text, /first_name,last_name,email/);
    assert.match(csv.text, /jack\.thompson@example\.com/);

    const tsv = await supertest(app).get('/samples/employee-import-sample.tsv');
    assert.equal(tsv.status, 200);
    assert.match(tsv.text, /first_name\tlast_name\temail/);
    assert.match(tsv.text, /jack\.thompson@example\.com/);

    const briefTxt = await supertest(app).get('/samples/job-brief-sample.txt');
    assert.equal(briefTxt.status, 200);
    assert.match(briefTxt.text, /Client: Raymonds Lift & Shift/);
    assert.match(briefTxt.text, /Task tags: franna, critical_lift, short_notice/);

    const briefMd = await supertest(app).get('/samples/job-brief-sample.md');
    assert.equal(briefMd.status, 200);
    assert.match(briefMd.text, /# Client/);
    assert.match(briefMd.text, /# Required crew/);

    const counterweightTxt = await supertest(app).get('/samples/job-brief-counterweight-sample.txt');
    assert.equal(counterweightTxt.status, 200);
    assert.match(counterweightTxt.text, /Grove GMK5150L 150T crane required as a 100T setup/);
    assert.match(counterweightTxt.text, /Counterweight requires one semi trailer/);

    const counterweightMd = await supertest(app).get('/samples/job-brief-counterweight-sample.md');
    assert.equal(counterweightMd.status, 200);
    assert.match(counterweightMd.text, /# Crane/);
    assert.match(counterweightMd.text, /# Transport/);
  });

  test('GET /console/<arbitrary> falls back to index.html (SPA routing)', async () => {
    const res = await supertest(app).get('/console/jobs/some-id/smartrank');
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /html/);
    assert.match(res.text, /DispatchTalon Pilot Console/);
  });

  test('Console references all ten required screens', () => {
    const appJs = fs.readFileSync(
      path.join(__dirname, '../public/console/app.js'),
      'utf8'
    );
    // Each render function corresponds to one of the required screens
    for (const fn of [
      'renderDashboard',     // login screen is in DOMContentLoaded login-form handler
      'renderOurBusiness',   // company requirement catalogue setup
      'renderWorkersList',   // workers list
      'renderWorkerImport',  // CSV / TSV import flow
      'renderJobBriefImport',// job brief import flow
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
      'buildSecurityPanel',  // account security panel + optional password rotation
      'showPasswordChange',  // forced password rotation screen
      'submitPasswordChange',// password change submission flow
      'refreshAuthenticatedUser', // server auth state overrides stale localStorage
      'isPasswordChangeRequired', // required vs optional password state split
      'getHashState',        // audit filter hash routing
      'nextRenderCycle',     // async render guard
      'isStaleRender',       // async render guard
      'auditEventReason',    // audit summary
      'auditEventSignals',   // warning/block summary
    ]) {
      assert.match(appJs, new RegExp(`function ${fn}`),
        `Console must define ${fn}`);
    }
    assert.match(appJs, /\/auth\/change-password/);
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
