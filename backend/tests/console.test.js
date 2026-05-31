'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('node:child_process');

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
    assert.match(res.text, /href="#\/site-log"/);
    assert.match(res.text, />Daily Site Log</);
    assert.match(res.text, /href="#\/jobs"/);
    assert.match(res.text, /href="#\/our-business"/);
    assert.match(res.text, />Our Business</);
    assert.match(res.text, /href="#\/source-uploads"/);
    assert.match(res.text, />Setup Uploads</);
    assert.match(res.text, /href="#\/exports"/);
    assert.match(res.text, />Exports</);
  });

  test('GET /console/styles.css returns CSS', async () => {
    const res = await supertest(app).get('/console/styles.css');
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /css/);
    assert.match(res.text, /metric-tile/);
    assert.match(res.text, /\.asset-tile/);
    assert.match(res.text, /\.credential-tile/);
    assert.match(res.text, /\.source-upload-card/);
    assert.match(res.text, /\.source-upload-boundary/);
    assert.match(res.text, /\.credential-type-manager/);
    assert.match(res.text, /\.daily-log-entry/);
    assert.match(res.text, /\.mode-card-title/);
    assert.match(res.text, /\.review-factor-card/);
    assert.match(res.text, /\.review-factor-form/);
  });

  test('GET /console/app.js returns the SPA bundle', async () => {
    const res = await supertest(app).get('/console/app.js');
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /javascript/);
    assert.match(res.text, /renderDashboard/);
    assert.match(res.text, /renderSchedule/);
    assert.match(res.text, /renderSiteLog/);
    assert.match(res.text, /renderWorkerImport/);
    assert.match(res.text, /renderJobBriefImport/);
    assert.match(res.text, /renderSmartRank/);
    assert.match(res.text, /renderAllocate/);
    assert.match(res.text, /SmartRank Review Factors/);
    assert.match(res.text, /Placement-specific decision support/);
    assert.match(res.text, /rank placement fit, not the person/i);
    assert.match(res.text, /canManageReviewFactors/);
    assert.match(res.text, /\/smartrank-review-factors/);
    assert.match(res.text, /Review Factors support placement review only/);
    assert.match(res.text, /admin or supervisor access/);
    assert.match(res.text, /renderAudit/);
    assert.match(res.text, /renderInternalPilotMonitor/);
    assert.match(res.text, /renderSourceUploads/);
    assert.match(res.text, /\/api\/source-uploads/);
    assert.match(res.text, /Assisted Source Document Upload/);
    assert.match(res.text, /Upload what you have/);
    assert.match(res.text, /CSV is fastest/);
    assert.match(res.text, /for pilot setup review/);
    assert.match(res.text, /No live records have been updated yet/);
    assert.match(res.text, /will not automatically update live records/);
    assert.match(res.text, /CSV, XLS, XLSX, PDF, DOC, DOCX, PNG, JPG, JPEG, WEBP/);
    assert.match(res.text, /SOURCE_UPLOAD_MAX_FILE_SIZE_BYTES/);
    assert.match(res.text, /SOURCE_UPLOAD_MAX_FILES/);
    assert.match(res.text, /Internal Pilot Monitor/);
    assert.match(res.text, /\/internal\/pilot-activity/);
    assert.match(res.text, /Assisted source uploads/);
    assert.match(res.text, /Updating status does not publish data into live records/);
    assert.match(res.text, /does not expose operational payloads or customer job content/);
    assert.match(res.text, /worker names, emails, phone numbers, job descriptions, client names, site addresses/i);
    assert.match(res.text, /Status \/ Result/);
    assert.match(res.text, /Technical details/);
    assert.match(res.text, /auditEventStatus/);
    assert.match(res.text, /auditEventTechnicalDetails/);
    assert.doesNotMatch(res.text, /el\('th',\s*\{\},\s*'User'\)/);
    assert.doesNotMatch(res.text, /el\('th',\s*\{\},\s*'Payload'\)/);
    assert.match(res.text, /formatCompanyLabel/);
    assert.match(res.text, /Company:/);
    assert.match(res.text, /test portal/);
    assert.match(res.text, /Test portal expired/);
    assert.match(res.text, /Contact Pressure Systems to extend access/);
    assert.match(res.text, /Remove worker from active dispatch\?/);
    assert.match(res.text, /This will remove the worker from active dispatch and SmartRank ranking\. Existing audit history will be kept\./);
    assert.match(res.text, /\/workers\/\$\{workerId\}\/remove/);
    assert.match(res.text, /Dispatch calendar/);
    assert.match(res.text, /Scheduled date/);
    assert.match(res.text, /Scheduled start time/);
    assert.match(res.text, /Scheduled end time/);
    assert.match(res.text, /Schedule status/);
    assert.match(res.text, /Apply timezone/);
    assert.match(res.text, /double-booking is blocked or warned in SmartRank/i);
    assert.match(res.text, /Daily Site Log/);
    assert.match(res.text, /Historical onsite lookup/);
    assert.match(res.text, /Print daily report/);
    assert.match(res.text, /Generated from DispatchTalon pilot records\. Review before operational use\./);
    assert.match(res.text, /No site log has been created for this date yet\./);
    assert.match(res.text, /Start by adding a site\/job, then add workers to the log\./);
    assert.match(res.text, /Sign in/);
    assert.match(res.text, /Sign out/);
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
    assert.match(res.text, /LABOUR ONLY/);
    assert.match(res.text, /PLANT \+ LABOUR/);
    assert.match(res.text, /Use DispatchTalon for people, credentials, VOCs, scheduling, SmartRank, and audit\. Hide plant and crane planning by default\./);
    assert.match(res.text, /Use DispatchTalon for workers, equipment, plant assets, crane planning, transport review, scheduling, SmartRank, and audit\./);
    assert.match(res.text, /OUR_BUSINESS_DISCLOSURE_KEY/);
    assert.match(res.text, /renderOurBusinessSection/);
    assert.match(res.text, /our-business-section/);
    assert.match(res.text, /Collapse all/);
    assert.match(res.text, /Expand all/);
    assert.match(res.text, /Jump to Asset Register/);
    assert.match(res.text, /Company requirement catalogue/);
    assert.match(res.text, /Credentials \/ VOCs/);
    assert.match(res.text, /Equipment classes/);
    assert.match(res.text, /Transport classes/);
    assert.doesNotMatch(res.text, /requirementMarkerLabel/);
    assert.doesNotMatch(res.text, /item\.common_default\s*\?\s*el\('span',\s*\{\s*class:\s*'pill pill-info'/);
    assert.match(res.text, /Common setup items/);
    assert.match(res.text, /Rail \/ energy \/ specialist requirements/);
    assert.match(res.text, /Labour-only mode/);
    assert.match(res.text, /Plant and asset register hidden/);
    assert.match(res.text, /Job requirements/);
    assert.match(res.text, /Asset Register/);
    assert.match(res.text, /renderAssetTile/);
    assert.match(res.text, /asset-tile/);
    assert.match(res.text, /asset-tile__meta/);
    assert.match(res.text, /Collapse asset groups/);
    assert.match(res.text, /Expand asset groups/);
    assert.match(res.text, /Reset company data/);
    assert.match(res.text, /CLEAR COMPANY DATA/);
    assert.match(res.text, /Asset number \/ plant number/);
    assert.match(res.text, /No plant numbers added yet/);
    assert.match(res.text, /Select equipment or transport classes before adding plant numbers\./);
    assert.match(res.text, /Build My Business/);
    assert.match(res.text, /Build Our Business: Tower Crane Asset Library/);
    assert.match(res.text, /Tower Crane Capability Summary/);
    assert.match(res.text, /Customer-Facing Output Preview/);
    assert.match(res.text, /Reference Asset Library/);
    assert.match(res.text, /Verification Status/);
    assert.match(res.text, /Flat Top Tower Cranes/);
    assert.match(res.text, /Luffing Jib Tower Cranes/);
    assert.match(res.text, /Hammerhead Tower Cranes/);
    assert.match(res.text, /Derrick Cranes/);
    assert.match(res.text, /Unverified reference asset/);
    assert.match(res.text, /Hold for verification/);
    assert.match(res.text, /This library is not a fleet claim/);
    assert.match(res.text, /Specs available on request/);
    assert.match(res.text, /Tower Crane Solutions for Complex Construction Sites/);
    assert.match(res.text, /renderTowerCraneBusinessBuilder/);
    assert.match(res.text, /renderTowerCraneVerificationTable/);
    assert.match(res.text, /No company requirements selected yet/);
    assert.match(res.text, /No workers added yet\. Import a spreadsheet or add your first worker\./);
    assert.match(res.text, /No jobs created yet\. Import a job brief or create a job manually\./);
    assert.match(res.text, /Metrics will appear after workers, jobs, allocations, and audit events are created\./);
    assert.match(res.text, /Collapse reminder/);
    assert.match(res.text, /liftiq\.passwordReminderDismissed/);
    assert.match(res.text, /refreshAuthenticatedUser/);
    assert.match(res.text, /\/auth\/me/);
    assert.match(res.text, /Select asset \/ plant number/);
    assert.match(res.text, /No specific saved asset selected/);
    assert.match(res.text, /No saved assets for/);
    assert.match(res.text, /Edit job/);
    assert.match(res.text, /Save job changes/);
    assert.match(res.text, /Crew roles/);
    assert.match(res.text, /Set count and separation rules for selected crew roles/);
    assert.match(res.text, /Separate worker only/);
    assert.match(res.text, /Role coverage suggestion/);
    assert.match(res.text, /Role coverage to confirm for this worker/);
    assert.match(res.text, /Combined-role allocation is decision support only/);
    assert.match(res.text, /Top-ranked/);
    assert.match(res.text, /Suitable/);
    assert.match(res.text, /Review required/);
    assert.match(res.text, /Required credentials and VOCs/);
    assert.match(res.text, /renderCredentialTile/);
    assert.match(res.text, /credential-tile/);
    assert.match(res.text, /credential-tile__meta/);
    assert.match(res.text, /Manage credential types/);
    assert.match(res.text, /Add custom credential type/);
    assert.match(res.text, /NZ SiteSafe/);
    assert.match(res.text, /Credential type added/);
    assert.match(res.text, /Add credential/);
    assert.match(res.text, /Crane \/ equipment classes/);
    assert.match(res.text, /Site conditions/);
    assert.match(res.text, /Additional job requirements \/ notes/);
    assert.match(res.text, /Additional travel required exceeding 100km/);
    assert.match(res.text, /Default timezone/);
    assert.match(res.text, /formatTimezoneLabel/);
    assert.match(res.text, /labelFormatter: formatTimezoneLabel/);
    assert.match(res.text, /option-picker/);
    assert.match(res.text, /formatDisplayLabel/);
    assert.match(res.text, /Worker update did not return the saved worker/);
    assert.match(res.text, /Job update did not return the saved job/);
    assert.match(res.text, /Publish allocation/);
    assert.match(res.text, /SMS preview/);
    assert.match(res.text, /Copy SMS/);
    assert.match(res.text, /Mark as manually published/);
    assert.match(res.text, /does not send SMS automatically/);
    assert.match(res.text, /\/jobs\/\$\{jobId\}\/allocation-notifications\/preview/);
    assert.match(res.text, /\/jobs\/\$\{jobId\}\/allocation-notifications\/publish-manual/);
    assert.match(res.text, /Reports & Exports/);
    assert.match(res.text, /Download payroll-prep CSV/);
    assert.match(res.text, /Exports are prepared for office review/);
    assert.match(res.text, /\/api\/exports\/\$\{encodeURIComponent\(type\)\}\.csv/);
    assert.match(res.text, /Add one-off requirement/);
    assert.match(res.text, /Review required/);
    assert.match(res.text, /Counterweight transport may be required/);
    assert.match(res.text, /NHVR \/ state notice or permit check may be required/);
    assert.doesNotMatch(res.text, /liability ranking|liability score|high liability|risk worker|risky worker|problem worker|blacklist|blacklisted|unsafe person|bad attitude|do not use|poor performer|unreliable|undesirable|troublemaker|difficult worker|avoid this worker/i);
    assert.equal(/Task tags:|tower_crane|night_shift/i.test(res.text), false);
    assert.equal(/\bapproved\b|compliant|legal to travel|safe to dispatch|engineered lift confirmed/i.test(res.text), false);
  });

  test('credential and requirement listing copy avoids recommendation language', () => {
    const appPath = path.join(__dirname, '../public/console/app.js');
    const appSource = fs.readFileSync(appPath, 'utf8');
    const sourceWithoutInternalMarker = appSource.replace(/recommended_default/g, 'setup_default_marker');
    const bannedListingCopy = [
      /Recommended credentials/i,
      /Recommended for this worker/i,
      /Recommended site licences/i,
      /Recommended for this job/i,
      /Recommended credential list/i,
      /Recommended custom licence/i,
      /\brecommended\b[\s\S]{0,120}\b(credential|licen[cs]e|ticket|site requirement|company requirement|requirement catalogue)\b/i,
      /\b(credential|licen[cs]e|ticket|site requirement|company requirement|requirement catalogue)\b[\s\S]{0,120}\brecommended\b/i
    ];
    for (const pattern of bannedListingCopy) {
      assert.doesNotMatch(sourceWithoutInternalMarker, pattern);
    }
    assert.match(appSource, /Credential type/);
    assert.doesNotMatch(appSource, /requirementMarkerLabel/);
    assert.doesNotMatch(appSource, /item\.common_default\s*\?\s*el\('span',\s*\{\s*class:\s*'pill pill-info'/);
    assert.match(appSource, /Common setup items/);
  });

  test('company requirement catalogue item rows do not render type pills', () => {
    const appPath = path.join(__dirname, '../public/console/app.js');
    const appSource = fs.readFileSync(appPath, 'utf8');
    const checklistSource = appSource.slice(
      appSource.indexOf('function renderRequirementChecklist'),
      appSource.indexOf('function optionLabelLookup')
    );

    assert.match(checklistSource, /class: 'check-row'/);
    assert.match(checklistSource, /item\.label/);
    assert.doesNotMatch(checklistSource, /pill pill-info/);
    assert.doesNotMatch(checklistSource, /Credential type|Site requirement|Requirement type|Setup item/);
  });

  test('our business timezone and operating mode display polish is render-only', () => {
    const appPath = path.join(__dirname, '../public/console/app.js');
    const cssPath = path.join(__dirname, '../public/console/styles.css');
    const appSource = fs.readFileSync(appPath, 'utf8');
    const cssSource = fs.readFileSync(cssPath, 'utf8');

    assert.match(appSource, /function formatTimezoneLabel/);
    assert.match(appSource, /split\('\/'\)/);
    assert.match(appSource, /join\(' \/ '\)/);
    assert.match(appSource, /labelFormatter: formatTimezoneLabel/);
    assert.match(appSource, /const currentTimezone = profile\.timezone \|\| 'Australia\/Brisbane'/);
    assert.match(appSource, /\[currentTimezone, \.\.\.configuredTimezones\]/);
    assert.match(appSource, /value:\s*currentTimezone/);
    assert.match(appSource, /countLabel: profile\.timezone \? formatTimezoneLabel\(profile\.timezone\) : 'No timezone saved'/);
    assert.match(appSource, /label: 'LABOUR ONLY'/);
    assert.match(appSource, /label: 'PLANT \+ LABOUR'/);
    assert.match(appSource, /Use DispatchTalon for people, credentials, VOCs, scheduling, SmartRank, and audit\. Hide plant and crane planning by default\./);
    assert.match(appSource, /Use DispatchTalon for workers, equipment, plant assets, crane planning, transport review, scheduling, SmartRank, and audit\./);
    assert.match(cssSource, /\.mode-card-title/);
    assert.match(cssSource, /font-weight:\s*800/);
    assert.match(cssSource, /text-transform:\s*uppercase/);
    assert.doesNotMatch(appSource, /timezone:\s*formatTimezoneLabel/);
  });

  test('console app bundle parses as JavaScript', () => {
    const appPath = path.join(__dirname, '../public/console/app.js');
    const result = spawnSync(process.execPath, ['--check', appPath], {
      encoding: 'utf8'
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
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
      'renderCompanyResetPanel', // guarded company-scoped reset controls
      'renderWorkersList',   // workers list
      'renderWorkerImport',  // CSV / TSV import flow
      'renderSiteLog',       // daily site log and historical onsite lookup
      'renderSiteLogEntry',  // sign in / sign out worker row cards
      'buildSiteLogEntryForm', // add worker to daily log
      'renderJobBriefImport',// job brief import flow
      'renderNewWorker',     // create worker
      'renderWorkerDetail',  // worker detail (also renders credentials + fatigue)
      'renderCredentialTile', // collapsible worker credential tiles
      'buildCredentialTypeManager', // tenant custom credential type manager
      'renderJobsList',      // jobs list
      'renderNewJob',        // create job
      'renderJobDetail',     // job detail
      'renderSmartRank',     // smartrank
      'renderAllocate',      // allocation confirmation
      'buildSmartRankReviewFactorPanel', // placement review factor management
      'openAllocationPublishModal', // controlled allocation publish preview
      'renderAudit',         // audit log
      'renderMetrics',       // pilot metrics
      'renderExports',       // CSV export centre
      'renderInternalPilotMonitor', // internal privacy-safe pilot activity monitor
      'downloadExportCsv',   // authenticated CSV downloads
      'renderAssetTile',     // collapsible asset register tiles
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
      'auditEventStatus',    // customer-facing audit status
      'auditEventTechnicalDetails', // internal-only collapsed technical detail
      'syncInternalNav',     // internal-only monitor navigation
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
