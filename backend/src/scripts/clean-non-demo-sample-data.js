'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { getDb } = require('../db');

const DEMO_COMPANY_PATTERN = /\b(demo|sample)\b|dispatchtalon-demo|liftiq-demo/i;
const SAMPLE_JOB_PATTERNS = [
  /\bsmoke\b/i,
  /\bsample\b/i,
  /\bdemo\b/i,
  /\bsynthetic\b/i,
  /Raymonds Lift & Shift/i,
  /Test Client/i,
  /Test Site/i
];
const SAMPLE_WORKER_PATTERNS = [
  /@demo\.dispatchtalon\.local$/i,
  /@demo\.liftiq\.local$/i,
  /\bDEMO_WORKER\b/i,
  /\bSAMPLE_WORKER\b/i,
  /\bsynthetic worker\b/i
];

function textFrom(row, fields) {
  return fields.map((field) => row[field]).filter(Boolean).join('\n');
}

function firstMatchingPattern(text, patterns) {
  const match = patterns.find((pattern) => pattern.test(text));
  return match ? String(match) : null;
}

function isDemoCompany(row) {
  return DEMO_COMPANY_PATTERN.test(textFrom(row, ['company_slug', 'company_name', 'company_display_name']));
}

function findSampleJobsOutsideDemo(db) {
  return db.prepare(`
    SELECT
      j.id,
      j.company_id,
      j.client_name,
      j.site_name,
      j.job_description,
      j.source_note,
      j.notes,
      j.status,
      c.slug AS company_slug,
      c.name AS company_name,
      c.display_name AS company_display_name
    FROM jobs j
    JOIN companies c ON c.id = j.company_id
    WHERE j.status != 'cancelled'
    ORDER BY c.slug, j.created_at, j.id
  `).all()
    .filter((row) => !isDemoCompany(row))
    .map((row) => ({
      ...row,
      marker: firstMatchingPattern(
        textFrom(row, ['client_name', 'site_name', 'job_description', 'source_note', 'notes']),
        SAMPLE_JOB_PATTERNS
      )
    }))
    .filter((row) => row.marker);
}

function findSampleWorkersOutsideDemo(db) {
  return db.prepare(`
    SELECT
      w.id,
      w.company_id,
      w.name,
      w.email,
      w.role,
      w.status,
      w.notes,
      c.slug AS company_slug,
      c.name AS company_name,
      c.display_name AS company_display_name
    FROM workers w
    JOIN companies c ON c.id = w.company_id
    WHERE w.archived_at IS NULL
    ORDER BY c.slug, w.created_at, w.id
  `).all()
    .filter((row) => !isDemoCompany(row))
    .map((row) => ({
      ...row,
      marker: firstMatchingPattern(
        textFrom(row, ['name', 'email', 'role', 'notes']),
        SAMPLE_WORKER_PATTERNS
      )
    }))
    .filter((row) => row.marker);
}

function runCleanup(db = getDb(), options = {}) {
  const apply = Boolean(options.apply);
  const now = options.now || new Date().toISOString();
  const jobs = findSampleJobsOutsideDemo(db);
  const workers = findSampleWorkersOutsideDemo(db);

  if (apply) {
    const cancelJob = db.prepare(`
      UPDATE jobs
      SET status = 'cancelled',
          schedule_status = 'cancelled',
          updated_at = ?
      WHERE id = ? AND company_id = ?
    `);
    const archiveWorker = db.prepare(`
      UPDATE workers
      SET status = 'inactive',
          archived_at = ?,
          archive_reason = COALESCE(archive_reason, 'Archived by non-demo sample-data cleanup script.'),
          updated_at = ?
      WHERE id = ? AND company_id = ?
    `);

    db.transaction(() => {
      for (const job of jobs) cancelJob.run(now, job.id, job.company_id);
      for (const worker of workers) archiveWorker.run(now, now, worker.id, worker.company_id);
    })();
  }

  return {
    mode: apply ? 'apply' : 'dry-run',
    sample_jobs: jobs.map((job) => ({
      company_slug: job.company_slug,
      job_id: job.id,
      client_name: job.client_name,
      site_name: job.site_name,
      marker: job.marker
    })),
    sample_workers: workers.map((worker) => ({
      company_slug: worker.company_slug,
      worker_id: worker.id,
      name: worker.name,
      marker: worker.marker
    }))
  };
}

function runCli() {
  const apply = process.argv.includes('--apply');
  const result = runCleanup(getDb(), { apply });
  console.log(JSON.stringify(result, null, 2));
  if (!apply) {
    console.log('Dry-run only. Re-run with --apply to cancel/archive clearly marked sample data.');
  }
}

if (require.main === module) {
  runCli();
}

module.exports = {
  findSampleJobsOutsideDemo,
  findSampleWorkersOutsideDemo,
  runCleanup
};
