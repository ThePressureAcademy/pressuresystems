'use strict';

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const supertest = require('supertest');
const { randomUUID } = require('crypto');

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
const { appendAuditEvent } = require('../src/services/audit');
const { sanitizedCell } = require('../src/services/csv-export');

let db, app, request, companyId, userId, token, otherCompanyId, otherUserId;

function auth(useToken = token) {
  return { Authorization: `Bearer ${useToken}` };
}

beforeEach(() => {
  db = createTestDb();
  setDb(db);
  app = require('../src/app');
  request = supertest(app);
  ({ companyId, userId } = seedCompanyAndUser(db, {
    companyName: 'Formula Hire',
    displayName: 'Formula Hire'
  }));
  ({ companyId: otherCompanyId, userId: otherUserId } = seedCompanyAndUser(db, {
    companyName: 'Other Tenant',
    displayName: 'Other Tenant',
    email: 'other-admin@test.com'
  }));
  token = signToken({ id: userId, company_id: companyId, role: 'admin', name: 'Admin' });
});

afterEach(() => {
  db.close();
});

describe('CSV exports', () => {
  test('export endpoints reject unauthenticated users and forced password users', async () => {
    const unauthenticated = await request.get('/api/exports/workers.csv');
    assert.equal(unauthenticated.status, 401);

    const forced = seedCompanyAndUser(db, {
      companyName: 'Forced Rotation',
      email: 'forced@test.com',
      mustChangePassword: true
    });
    const forcedToken = signToken({
      id: forced.userId,
      company_id: forced.companyId,
      role: 'admin',
      name: 'Forced'
    });
    const res = await request.get('/api/exports/workers.csv').set(auth(forcedToken));
    assert.equal(res.status, 403);
    assert.equal(res.body.must_change_password, true);
  });

  test('workers CSV exports company workers only with stable headers and archived opt-in', async () => {
    const workerId = seedWorker(db, companyId, {
      name: 'Alex Operator',
      email: 'alex@example.com',
      roles: ['crane_operator', 'dogman']
    });
    db.prepare(`UPDATE workers SET contact_number = ?, created_at = ?, updated_at = ? WHERE id = ?`)
      .run('0400 000 000', '2026-05-01T08:00:00.000Z', '2026-05-02T08:00:00.000Z', workerId);
    seedCredential(db, workerId, companyId, { type: 'hrwl_c6', status: 'valid', expiry_date: '2028-01-01' });
    seedWorker(db, otherCompanyId, { name: 'Other Tenant Worker', email: 'leak@example.com' });
    seedWorker(db, companyId, { name: 'Archived Worker', archivedAt: '2026-05-03T00:00:00.000Z' });

    const res = await request.get('/api/exports/workers.csv').set(auth());
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /text\/csv/);
    assert.match(res.headers['content-disposition'], /dispatchtalon-workers-export-/);
    assert.equal(
      res.text.split(/\r?\n/)[0],
      'company_name,worker_id,worker_name,email,phone,roles,status,credentials,created_at,updated_at'
    );
    assert.match(res.text, /Alex Operator/);
    assert.match(res.text, /Crane Operator; Dogman/);
    assert.match(res.text, /C6 - Valid - expires 2028-01-01/);
    assert.doesNotMatch(res.text, /Other Tenant Worker|Archived Worker|leak@example\.com/);

    const withArchived = await request.get('/api/exports/workers.csv?include_archived=true').set(auth());
    assert.match(withArchived.text, /Archived Worker/);
  });

  test('jobs CSV exports tenant jobs, stable headers, date filters, and neutralised formulas', async () => {
    const jobId = seedJob(db, companyId, userId, {
      client_name: '=Formula Client',
      site_name: '@Formula Site',
      site_location: '+Brisbane',
      date: '2026-05-20',
      scheduled_start_at_utc: '2026-05-20T22:00:00.000Z',
      scheduled_end_at_utc: '2026-05-21T04:00:00.000Z',
      crew_roles_required: ['crane_operator', 'dogman'],
      required_credentials: ['hrwl_c6', 'working_at_height'],
      crane_classes_required: ['50T Mobile Crane'],
      site_conditions: ['sloped_ground']
    });
    db.prepare(`UPDATE jobs SET notes = ? WHERE id = ?`).run('-crane mats required', jobId);
    seedJob(db, otherCompanyId, otherUserId, { client_name: 'Other Client', site_name: 'Other Site' });

    const res = await request.get('/api/exports/jobs.csv?start_date=2026-05-01&end_date=2026-05-31').set(auth());
    assert.equal(res.status, 200);
    assert.equal(
      res.text.split(/\r?\n/)[0],
      'company_name,job_id,job_title,client,site,location,job_date,start_time,end_time,timezone,required_roles,required_credentials,equipment_requirements,site_conditions,additional_notes,created_at'
    );
    assert.match(res.text, /'=Formula Client/);
    assert.match(res.text, /'@Formula Site/);
    assert.match(res.text, /'\+Brisbane/);
    assert.match(res.text, /'-crane mats required/);
    assert.match(res.text, /C6; Working at Height/);
    assert.match(res.text, /Sloped ground/);
    assert.doesNotMatch(res.text, /Other Client|Other Site/);

    const filteredOut = await request.get('/api/exports/jobs.csv?start_date=2026-06-01').set(auth());
    assert.equal(filteredOut.text.trim(), 'company_name,job_id,job_title,client,site,location,job_date,start_time,end_time,timezone,required_roles,required_credentials,equipment_requirements,site_conditions,additional_notes,created_at');
  });

  test('allocations, payroll-prep, and invoice-prep exports are tenant-scoped review handoffs', async () => {
    const workerId = seedWorker(db, companyId, { name: 'Mia Dogman', roles: ['dogman'] });
    const jobId = seedJob(db, companyId, userId, {
      client_name: 'Review Client',
      site_name: 'North Yard',
      date: '2026-05-22',
      scheduled_start_at_utc: '2026-05-21T22:00:00.000Z',
      scheduled_end_at_utc: '2026-05-22T04:00:00.000Z'
    });
    const allocationId = seedAllocation(db, companyId, jobId, workerId, userId, {
      allocation_start_at_utc: '2026-05-21T22:00:00.000Z',
      allocation_end_at_utc: '2026-05-22T04:00:00.000Z',
      override_reason: 'Dispatcher reviewed warning'
    });
    db.prepare(`
      INSERT INTO allocation_notifications (
        id, company_id, allocation_id, job_id, worker_id, status, message_body_snapshot, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, 'published_manual', 'Operational allocation message', ?)
    `).run(randomUUID(), companyId, allocationId, jobId, workerId, userId);
    const otherWorkerId = seedWorker(db, otherCompanyId, { name: 'Other Allocation Worker' });
    const otherJobId = seedJob(db, otherCompanyId, otherUserId, { client_name: 'Other Client', site_name: 'Other Site' });
    seedAllocation(db, otherCompanyId, otherJobId, otherWorkerId, otherUserId);

    const allocations = await request.get('/api/exports/allocations.csv').set(auth());
    assert.equal(allocations.status, 200);
    assert.match(allocations.text, /Published manual/);
    assert.match(allocations.text, /Dispatcher reviewed warning/);
    assert.doesNotMatch(allocations.text, /Other Allocation Worker/);

    const payroll = await request.get('/api/exports/payroll-prep.csv').set(auth());
    assert.equal(payroll.status, 200);
    assert.match(payroll.text, /Scheduled allocation export only/);
    assert.match(payroll.text, /6/);
    assert.doesNotMatch(payroll.text, /award rate|invoice total|ATO|BAS/i);

    const invoice = await request.get('/api/exports/invoice-prep.csv').set(auth());
    assert.equal(invoice.status, 200);
    assert.match(invoice.text, /Invoice preparation export only/);
    assert.match(invoice.text, /Mia Dogman/);
    assert.doesNotMatch(invoice.text, /invoice_total|GST total|sync to Xero/i);
  });

  test('audit and metrics CSVs omit raw payloads and expose aggregate counts only', async () => {
    const workerId = seedWorker(db, companyId, { name: 'Private Worker' });
    const jobId = seedJob(db, companyId, userId, { client_name: 'Private Client', site_name: 'Private Site' });
    seedAllocation(db, companyId, jobId, workerId, userId);
    appendAuditEvent(db, {
      companyId,
      eventType: 'job_created',
      userId,
      workerId,
      jobId,
      payload: {
        client_name: 'Sensitive Client Payload',
        private_note: 'Do not export this note'
      }
    });
    appendAuditEvent(db, {
      companyId,
      eventType: 'fatigue_warning_triggered',
      userId,
      workerId,
      jobId,
      payload: { note: 'Sensitive warning payload' }
    });

    const audit = await request.get('/api/exports/audit.csv').set(auth());
    assert.equal(audit.status, 200);
    assert.match(audit.text.split(/\r?\n/)[0], /event_id,event_type,job_id,worker_id,actor_user_id,event_time,summary/);
    assert.match(audit.text, /job_created/);
    assert.doesNotMatch(audit.text, /Sensitive Client Payload|Do not export this note|private_note/);

    const metrics = await request.get('/api/exports/metrics.csv').set(auth());
    assert.equal(metrics.status, 200);
    assert.match(metrics.text.split(/\r?\n/)[0], /company_name,period_start,period_end,jobs_created,workers_added,allocations_confirmed,warnings,blocks,overrides,manual_notifications_published/);
    assert.match(metrics.text, /Formula Hire/);
    assert.doesNotMatch(metrics.text, /Private Worker|Private Client|Private Site|Sensitive warning payload/);
  });

  test('CSV escaping handles quotes, commas, newlines, and formula-leading cells', () => {
    assert.equal(sanitizedCell('=SUM(A1:A2)'), "'=SUM(A1:A2)");
    assert.equal(sanitizedCell('+61 400'), "'+61 400");
    assert.equal(sanitizedCell('-rate'), "'-rate");
    assert.equal(sanitizedCell('@handle'), "'@handle");
  });

  test('console exposes Export Centre nav, cards, download endpoints, and accounting boundary copy', async () => {
    const html = await request.get('/console/');
    assert.equal(html.status, 200);
    assert.match(html.text, /href="#\/exports"/);
    assert.match(html.text, />Exports</);

    const appJs = fs.readFileSync(path.join(__dirname, '../public/console/app.js'), 'utf8');
    assert.match(appJs, /function renderExports/);
    assert.match(appJs, /function downloadExportCsv/);
    assert.match(appJs, /\/api\/exports\/\$\{encodeURIComponent\(type\)\}\.csv/);
    assert.match(appJs, /Download workers CSV/);
    assert.match(appJs, /Download payroll-prep CSV/);
    assert.match(appJs, /Exports are prepared for office review/);
    assert.match(appJs, /does not calculate payroll, tax, super, award rates, or invoice totals/);
    assert.match(appJs, /Direct Xero\/MYOB integration is future roadmap work/);
    assert.doesNotMatch(appJs, /Xero integrated|MYOB integrated|payroll-ready|invoice-ready|automatic payroll|automatic invoicing/i);
  });
});
