'use strict';

const { describe, test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('crypto');

const {
  createTestDb,
  seedCompanyAndUser,
  seedJob
} = require('./helpers/db');
const { setDb } = require('../src/db');
const {
  DEMO_COMPANY,
  DEMO_DATASET_VERSION,
  DEMO_MARKER,
  JOBS,
  WORKERS,
  cleanupSmokeJobs,
  seedDemoDataset
} = require('../src/scripts/seed-demo-dataset');

let db;

const DEMO_ENV = {
  LIFTIQ_DEMO_EMAIL: 'demo.admin@demo.liftiq.local',
  LIFTIQ_DEMO_PASSWORD: 'DemoTenantTemp!123'
};

function getDemoCompany() {
  return db.prepare(`SELECT * FROM companies WHERE slug = ?`).get(DEMO_COMPANY.slug);
}

beforeEach(() => {
  db = createTestDb();
  setDb(db);
});

afterEach(() => {
  db.close();
  setDb(null);
});

describe('LIFTIQ demo dataset seed script', () => {
  test('creates or finds the demo tenant and demo admin from env secrets', () => {
    const summary = seedDemoDataset(db, { env: DEMO_ENV });
    const company = getDemoCompany();
    const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(DEMO_ENV.LIFTIQ_DEMO_EMAIL);

    assert.equal(summary.tenant.slug, 'liftiq-demo-internal');
    assert.equal(company.display_name, 'LIFTIQ Demo / Internal');
    assert.equal(company.pilot_type, 'internal');
    assert.equal(company.access_status, 'active');
    assert.equal(company.timezone, 'Australia/Brisbane');
    assert.ok(user);
    assert.equal(user.company_id, company.id);
    assert.equal(user.role, 'admin');
    assert.equal(user.must_change_password, 1);
    assert.notEqual(user.password_hash, DEMO_ENV.LIFTIQ_DEMO_PASSWORD);
    assert.equal(summary.admin.email_masked.includes(DEMO_ENV.LIFTIQ_DEMO_EMAIL), false);
  });

  test('creates 10 synthetic workers and 16 upcoming jobs', () => {
    const summary = seedDemoDataset(db, { env: DEMO_ENV });
    const company = getDemoCompany();

    assert.equal(summary.workers.expected, 10);
    assert.equal(summary.jobs.expected, 16);
    assert.equal(summary.counts.workers, 10);
    assert.equal(summary.counts.jobs, 16);
    assert.equal(summary.jobs.date_range.start, '2026-05-18');
    assert.equal(summary.jobs.date_range.end, '2026-06-12');

    const workers = db.prepare(`SELECT * FROM workers WHERE company_id = ?`).all(company.id);
    const jobs = db.prepare(`SELECT * FROM jobs WHERE company_id = ? AND status != 'cancelled'`).all(company.id);
    assert.equal(workers.length, WORKERS.length);
    assert.equal(jobs.length, JOBS.length);
    assert.ok(workers.every((worker) => worker.email.endsWith('@demo.liftiq.local')));
    assert.ok(workers.every((worker) => worker.notes.includes('DEMO_WORKER')));
    assert.ok(jobs.every((job) => job.notes.includes('DEMO_JOB')));
    assert.ok(jobs.every((job) => job.scheduled_start_at_utc && job.scheduled_end_at_utc));
    assert.ok(jobs.every((job) => job.job_timezone === 'Australia/Brisbane'));
  });

  test('is idempotent for workers, jobs, preferences, fatigue records, and job imports', () => {
    seedDemoDataset(db, { env: DEMO_ENV });
    const first = getDemoCounts();

    seedDemoDataset(db, { env: DEMO_ENV });
    const second = getDemoCounts();

    assert.deepEqual(second, first);
  });

  test('removes or archives smoke jobs only inside the demo tenant', () => {
    const demoSummary = seedDemoDataset(db, { env: DEMO_ENV });
    const company = getDemoCompany();
    const user = db.prepare(`SELECT id FROM users WHERE company_id = ? LIMIT 1`).get(company.id);
    const smokeJobId = seedJob(db, company.id, user.id, {
      id: randomUUID(),
      client_name: 'Smoke Test Client',
      site_name: 'Live Smoke Verification Job',
      date: '2026-05-30',
      scheduled_start_at_utc: '2026-05-29T20:00:00.000Z',
      scheduled_end_at_utc: '2026-05-30T02:00:00.000Z',
      scheduled_start_local: '2026-05-30 06:00',
      scheduled_end_local: '2026-05-30 12:00'
    });

    const other = seedCompanyAndUser(db, {
      companyName: 'Not Demo Company',
      slug: 'not-demo-company',
      email: 'admin@not-demo.test'
    });
    const otherSmokeId = seedJob(db, other.companyId, other.userId, {
      client_name: 'Smoke Test Client',
      site_name: 'Live Smoke Verification Job',
      date: '2026-05-30'
    });

    const cleanup = cleanupSmokeJobs(db, company.id, user.id);
    assert.equal(cleanup.scanned, 1);
    assert.equal(cleanup.removed.length + cleanup.archived.length, 1);

    const demoSmoke = db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(smokeJobId);
    const otherSmoke = db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(otherSmokeId);
    assert.equal(Boolean(demoSmoke), false);
    assert.ok(otherSmoke);
    assert.equal(otherSmoke.company_id, other.companyId);
    assert.equal(demoSummary.tenant.slug, 'liftiq-demo-internal');
  });

  test('does not delete smoke jobs with audit history; it cancels them instead', () => {
    seedDemoDataset(db, { env: DEMO_ENV });
    const company = getDemoCompany();
    const user = db.prepare(`SELECT id FROM users WHERE company_id = ? LIMIT 1`).get(company.id);
    const smokeJobId = seedJob(db, company.id, user.id, {
      client_name: 'Demo Smoke Client',
      site_name: 'Playwright Smoke Job',
      date: '2026-05-31'
    });
    db.prepare(`
      INSERT INTO audit_events (id, company_id, event_type, user_id, job_id, payload)
      VALUES (?, ?, 'job_created', ?, ?, '{}')
    `).run(randomUUID(), company.id, user.id, smokeJobId);

    const cleanup = cleanupSmokeJobs(db, company.id, user.id);
    const smokeJob = db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(smokeJobId);
    assert.equal(cleanup.archived.length, 1);
    assert.ok(smokeJob);
    assert.equal(smokeJob.status, 'cancelled');
    assert.equal(smokeJob.schedule_status, 'cancelled');
  });

  test('demo workers include credentials, task preferences, and fatigue demo records', () => {
    seedDemoDataset(db, { env: DEMO_ENV });
    const company = getDemoCompany();

    const credentialCount = db.prepare(`SELECT COUNT(*) AS n FROM credentials WHERE company_id = ?`).get(company.id).n;
    const preferenceCount = db.prepare(`SELECT COUNT(*) AS n FROM worker_task_preferences WHERE company_id = ?`).get(company.id).n;
    const fatigueCount = db.prepare(`SELECT COUNT(*) AS n FROM fatigue_records WHERE company_id = ?`).get(company.id).n;
    assert.ok(credentialCount >= 25);
    assert.ok(preferenceCount >= 30);
    assert.ok(fatigueCount >= 8);

    const unavailable = db.prepare(`SELECT * FROM workers WHERE company_id = ? AND status = 'unavailable'`).all(company.id);
    assert.ok(unavailable.length >= 1);
  });

  test('demo jobs include crane/counterweight planning and schedule conflict cases', () => {
    seedDemoDataset(db, { env: DEMO_ENV });
    const company = getDemoCompany();

    const craneJobs = db.prepare(`SELECT * FROM job_crane_requirements WHERE company_id = ?`).all(company.id);
    const transport = db.prepare(`SELECT * FROM transport_requirements WHERE company_id = ?`).all(company.id);
    assert.ok(craneJobs.length >= 4);
    assert.ok(transport.length >= 4);
    assert.ok(craneJobs.some((job) => Number(job.counterweight_to_transport_tonnes) === 20.5));
    assert.ok(craneJobs.some((job) => Number(job.nhvr_review_required) === 1));

    const conflictJob = db.prepare(`SELECT * FROM jobs WHERE company_id = ? AND reference = 'DEMO-LIQ-016'`).get(company.id);
    const allocatedWorker = db.prepare(`
      SELECT a.*
      FROM allocations a
      JOIN jobs j ON j.id = a.job_id
      WHERE a.company_id = ? AND j.reference = 'DEMO-LIQ-001'
    `).get(company.id);
    assert.ok(conflictJob);
    assert.ok(allocatedWorker);
    assert.equal(conflictJob.scheduled_start_at_utc < allocatedWorker.allocation_end_at_utc, true);
    assert.equal(conflictJob.scheduled_end_at_utc > allocatedWorker.allocation_start_at_utc, true);
  });

  test('dry-run reports planned changes without modifying the database', () => {
    const summary = seedDemoDataset(db, { env: DEMO_ENV, dryRun: true });
    assert.equal(summary.dry_run, true);
    assert.equal(summary.tenant.action, 'would_create');
    assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM companies WHERE slug = ?`).get(DEMO_COMPANY.slug).n, 0);
    assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM workers`).get().n, 0);
    assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM jobs`).get().n, 0);
  });

  test('generated operational data avoids real tenant names and stored secret values', () => {
    seedDemoDataset(db, { env: DEMO_ENV });
    const dump = JSON.stringify({
      companies: db.prepare(`SELECT name, slug, display_name, notes FROM companies`).all(),
      workers: db.prepare(`SELECT name, email, contact_number, notes FROM workers`).all(),
      jobs: db.prepare(`SELECT client_name, site_name, site_location, contact_name, contact_phone, source_note, notes FROM jobs`).all()
    });

    assert.equal(/borgers|smithbridge|getsome|raymonds/i.test(dump), false);
    assert.equal(dump.includes(DEMO_ENV.LIFTIQ_DEMO_PASSWORD), false);
    assert.ok(dump.includes(DEMO_MARKER));
  });
});

function getDemoCounts() {
  const company = getDemoCompany();
  return {
    companies: db.prepare(`SELECT COUNT(*) AS n FROM companies WHERE slug = ?`).get(DEMO_COMPANY.slug).n,
    users: db.prepare(`SELECT COUNT(*) AS n FROM users WHERE company_id = ?`).get(company.id).n,
    workers: db.prepare(`SELECT COUNT(*) AS n FROM workers WHERE company_id = ?`).get(company.id).n,
    credentials: db.prepare(`SELECT COUNT(*) AS n FROM credentials WHERE company_id = ?`).get(company.id).n,
    preferences: db.prepare(`SELECT COUNT(*) AS n FROM worker_task_preferences WHERE company_id = ?`).get(company.id).n,
    fatigue: db.prepare(`SELECT COUNT(*) AS n FROM fatigue_records WHERE company_id = ?`).get(company.id).n,
    jobs: db.prepare(`SELECT COUNT(*) AS n FROM jobs WHERE company_id = ? AND status != 'cancelled'`).get(company.id).n,
    imports: db.prepare(`SELECT COUNT(*) AS n FROM job_imports WHERE company_id = ?`).get(company.id).n,
    craneRequirements: db.prepare(`SELECT COUNT(*) AS n FROM job_crane_requirements WHERE company_id = ?`).get(company.id).n,
    transportRequirements: db.prepare(`SELECT COUNT(*) AS n FROM transport_requirements WHERE company_id = ?`).get(company.id).n,
    allocations: db.prepare(`SELECT COUNT(*) AS n FROM allocations WHERE company_id = ?`).get(company.id).n,
    auditEvents: db.prepare(`SELECT COUNT(*) AS n FROM audit_events WHERE company_id = ?`).get(company.id).n
  };
}
