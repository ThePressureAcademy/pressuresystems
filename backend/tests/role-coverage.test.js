'use strict';

const { describe, test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');

const {
  DISALLOWED,
  buildRoleCoveragePlan,
  evaluateWorkerRoleCoverage
} = require('../src/services/role-coverage');
const { rankWorkersForJob } = require('../src/services/smart-rank');
const {
  createTestDb,
  seedCompanyAndUser,
  seedCredential,
  seedJob,
  seedWorker
} = require('./helpers/db');
const { setDb } = require('../src/db');
const { signToken } = require('../src/middleware/auth');

let app;
let db;
let companyId;
let userId;
let token;

function auth(value = token) {
  return { Authorization: `Bearer ${value}` };
}

function worker(overrides = {}) {
  return {
    id: overrides.id || 'worker-1',
    name: overrides.name || 'Mason Reed',
    role: overrides.role || 'dogman',
    roles: overrides.roles || ['dogman'],
    status: overrides.status || 'available',
    employment_type: 'permanent',
    crane_classes: [],
    ...overrides
  };
}

function job(roleRequirements) {
  return {
    id: 'job-1',
    date: '2026-06-02',
    shift_type: 'day',
    shift_start_time: '07:00',
    required_credentials: [],
    crew_roles_required: roleRequirements.map((item) => item.role_key),
    role_requirements: roleRequirements,
    travel_required: 0,
    site_conditions: [],
    site_name: 'Export Yard',
    client_name: 'Test Client'
  };
}

function cred(workerId, type) {
  return {
    id: `${workerId}-${type}`,
    worker_id: workerId,
    type,
    expiry_date: '2028-01-01',
    status: 'valid'
  };
}

before(() => {
  app = require('../src/app');
});

beforeEach(() => {
  if (db) db.close();
  db = createTestDb();
  setDb(db);
  ({ companyId, userId } = seedCompanyAndUser(db, { role: 'dispatcher' }));
  token = signToken({ id: userId, company_id: companyId, role: 'dispatcher', name: 'Dispatcher' });
});

after(() => {
  if (db) db.close();
  setDb(null);
});

describe('role coverage planning', () => {
  test('worker with Dogman and Truck Driver can cover both roles with review', () => {
    const w = worker({ roles: ['dogman', 'truck_driver'] });
    const coverage = evaluateWorkerRoleCoverage(w, job([
      { role_key: 'dogman', required_count: 1 },
      { role_key: 'truck_driver', required_count: 1 }
    ]), [
      cred(w.id, 'hrwl_dg'),
      cred(w.id, 'heavy_vehicle_hr')
    ]);

    assert.deepEqual(coverage.suggested_roles, ['dogman', 'truck_driver']);
    assert.equal(coverage.review_required, true);
  });

  test('worker with Dogman and Rigger can cover both roles', () => {
    const w = worker({ roles: ['dogman', 'rigger'] });
    const coverage = evaluateWorkerRoleCoverage(w, job([
      { role_key: 'dogman', required_count: 1 },
      { role_key: 'rigger', required_count: 1 }
    ]), [
      cred(w.id, 'hrwl_dg'),
      cred(w.id, 'hrwl_rb')
    ]);

    assert.deepEqual(coverage.suggested_roles, ['dogman', 'rigger']);
    assert.equal(coverage.missing_roles.length, 0);
  });

  test('worker with Rigger and EWP Operator needs the EWP credential to cover both', () => {
    const w = worker({ roles: ['rigger', 'ewp_operator'] });
    const targetJob = job([
      { role_key: 'rigger', required_count: 1 },
      { role_key: 'ewp_operator', required_count: 1 }
    ]);

    const missingCredential = evaluateWorkerRoleCoverage(w, targetJob, [cred(w.id, 'hrwl_rb')]);
    assert.deepEqual(missingCredential.suggested_roles, ['rigger']);
    assert.equal(missingCredential.missing_roles[0].role_key, 'ewp_operator');

    const credentialed = evaluateWorkerRoleCoverage(w, targetJob, [cred(w.id, 'hrwl_rb'), cred(w.id, 'hrwl_wp')]);
    assert.deepEqual(credentialed.suggested_roles, ['rigger', 'ewp_operator']);
  });

  test('two Truck Driver slots require two distinct workers', () => {
    const targetJob = job([{ role_key: 'truck_driver', required_count: 2 }]);
    const mason = worker({ id: 'mason', name: 'Mason Reed', roles: ['truck_driver'] });
    const noah = worker({ id: 'noah', name: 'Noah Bennett', roles: ['truck_driver'] });
    const result = rankWorkersForJob(
      [mason, noah],
      targetJob,
      {
        mason: [cred('mason', 'heavy_vehicle_hr')],
        noah: [cred('noah', 'heavy_vehicle_hr')]
      },
      {},
      {},
      {},
      { now: new Date('2026-05-01T00:00:00Z') }
    );

    assert.equal(result.role_coverage_plan.conservative_headcount, 2);
    assert.equal(result.role_coverage_plan.suggested_minimum_headcount, 2);
    assert.equal(result.role_coverage_plan.assignments.length, 2);
  });

  test('Dogman and Truck Driver coverage can reduce headcount from two roles to one worker', () => {
    const targetJob = job([
      { role_key: 'dogman', required_count: 1 },
      { role_key: 'truck_driver', required_count: 1 }
    ]);
    const mason = worker({ id: 'mason', roles: ['dogman', 'truck_driver'] });
    const { ranked } = rankWorkersForJob(
      [mason],
      targetJob,
      { mason: [cred('mason', 'hrwl_dg'), cred('mason', 'heavy_vehicle_hr')] },
      {},
      {},
      {},
      { now: new Date('2026-05-01T00:00:00Z') }
    );
    const plan = buildRoleCoveragePlan(ranked, targetJob);

    assert.equal(plan.conservative_headcount, 2);
    assert.equal(plan.suggested_minimum_headcount, 1);
    assert.deepEqual(plan.assignments[0].roles_covered, ['dogman', 'truck_driver']);
  });

  test('two trucks plus dogman and rigger can resolve to two multi-skilled workers', () => {
    const targetJob = job([
      { role_key: 'truck_driver', required_count: 2 },
      { role_key: 'dogman', required_count: 1 },
      { role_key: 'rigger', required_count: 1 }
    ]);
    const mason = worker({ id: 'mason', name: 'Mason Reed', roles: ['truck_driver', 'dogman'] });
    const noah = worker({ id: 'noah', name: 'Noah Bennett', roles: ['truck_driver', 'rigger'] });
    const result = rankWorkersForJob(
      [mason, noah],
      targetJob,
      {
        mason: [cred('mason', 'heavy_vehicle_hr'), cred('mason', 'hrwl_dg')],
        noah: [cred('noah', 'heavy_vehicle_hr'), cred('noah', 'hrwl_rb')]
      },
      {},
      {},
      {},
      { now: new Date('2026-05-01T00:00:00Z') }
    );

    assert.equal(result.role_coverage_plan.conservative_headcount, 4);
    assert.equal(result.role_coverage_plan.suggested_minimum_headcount, 2);
    assert.equal(result.role_coverage_plan.unfilled_roles.length, 0);
  });

  test('separate-worker role is not combined with another role', () => {
    const w = worker({ roles: ['lift_supervisor', 'rigger'] });
    const coverage = evaluateWorkerRoleCoverage(w, job([
      { role_key: 'lift_supervisor', required_count: 1, requires_distinct_worker: true },
      { role_key: 'rigger', required_count: 1 }
    ]), [cred(w.id, 'hrwl_rb')]);

    assert.deepEqual(coverage.suggested_roles, ['lift_supervisor']);
    assert.equal(coverage.missing_roles[0].role_key, 'rigger');
    assert.match(coverage.missing_roles[0].reason, /separate-worker role/);
  });

  test('Crane Operator and Dogman creates a discouraged review warning, not a silent collapse', () => {
    const w = worker({ roles: ['crane_operator', 'dogman'] });
    const coverage = evaluateWorkerRoleCoverage(w, job([
      { role_key: 'crane_operator', required_count: 1 },
      { role_key: 'dogman', required_count: 1 }
    ]), [
      cred(w.id, 'hrwl_c6'),
      cred(w.id, 'hrwl_dg')
    ]);

    assert.equal(coverage.review_required, true);
    assert.ok(coverage.warnings.some((warning) => warning.type === 'role_combination_discouraged'));
  });

  test('Lift Supervisor and Rigger creates review warning', () => {
    const w = worker({ roles: ['lift_supervisor', 'rigger'] });
    const coverage = evaluateWorkerRoleCoverage(w, job([
      { role_key: 'lift_supervisor', required_count: 1 },
      { role_key: 'rigger', required_count: 1 }
    ]), [cred(w.id, 'hrwl_rb')]);

    assert.equal(coverage.review_required, true);
    assert.ok(coverage.warnings.some((warning) => warning.type === 'role_combination_review_required'));
  });

  test('disallowed role combination is not suggested as combined coverage', () => {
    const w = worker({ roles: ['dogman', 'truck_driver'] });
    const coverage = evaluateWorkerRoleCoverage(w, job([
      { role_key: 'dogman', required_count: 1 },
      { role_key: 'truck_driver', required_count: 1 }
    ]), [
      cred(w.id, 'hrwl_dg'),
      cred(w.id, 'heavy_vehicle_hr')
    ], {
      roleCompatibilityRules: [{
        role_a: 'dogman',
        role_b: 'truck_driver',
        compatibility_status: DISALLOWED,
        reason: 'Company policy requires separate workers.'
      }]
    });

    assert.deepEqual(coverage.suggested_roles, ['dogman']);
    assert.equal(coverage.missing_roles[0].role_key, 'truck_driver');
  });

  test('allocation confirmation stores role coverage, audit, and publish SMS role snapshot', async () => {
    const workerId = seedWorker(db, companyId, {
      name: 'Mason Reed',
      roles: ['dogman', 'truck_driver']
    });
    db.prepare(`UPDATE workers SET contact_number = ? WHERE id = ?`).run('+61400111222', workerId);
    seedCredential(db, workerId, companyId, { type: 'hrwl_dg' });
    seedCredential(db, workerId, companyId, { type: 'heavy_vehicle_hr' });
    const jobId = seedJob(db, companyId, userId, {
      crew_roles_required: ['dogman', 'truck_driver'],
      role_requirements: [
        { role_key: 'dogman', required_count: 1 },
        { role_key: 'truck_driver', required_count: 1 }
      ],
      scheduled_start_at_utc: '2026-06-01T22:00:00.000Z',
      scheduled_end_at_utc: '2026-06-02T02:00:00.000Z',
      scheduled_start_local: '2026-06-02 08:00',
      scheduled_end_local: '2026-06-02 12:00',
      schedule_status: 'planned'
    });

    const allocation = await supertest(app)
      .post(`/api/jobs/${jobId}/allocations`)
      .set(auth())
      .send({
        worker_id: workerId,
        role_coverage: ['dogman', 'truck_driver'],
        override_reason: 'Dispatcher confirmed combined role coverage is suitable for this test job.'
      });

    assert.equal(allocation.status, 201);
    assert.deepEqual(allocation.body.role_coverages.map((coverage) => coverage.role_key), ['dogman', 'truck_driver']);

    const coverageRows = db.prepare(`SELECT * FROM allocation_role_coverages WHERE company_id = ? AND job_id = ?`).all(companyId, jobId);
    assert.equal(coverageRows.length, 2);

    const auditEvents = db.prepare(`SELECT event_type FROM audit_events WHERE company_id = ? ORDER BY timestamp ASC`).all(companyId);
    assert.ok(auditEvents.some((event) => event.event_type === 'role_coverage_confirmed'));
    assert.ok(auditEvents.some((event) => event.event_type === 'role_coverage_review_required'));

    const preview = await supertest(app)
      .post(`/api/jobs/${jobId}/allocation-notifications/preview`)
      .set(auth())
      .send({ allocation_id: allocation.body.id });

    assert.equal(preview.status, 201);
    assert.match(preview.body.sms_preview, /Role: Dogman \/ Truck Driver/);
  });

  test('cross-tenant worker cannot be allocated for role coverage', async () => {
    const other = seedCompanyAndUser(db, {
      companyId: 'other-company',
      userId: 'other-user',
      email: 'other@example.com'
    });
    const otherWorker = seedWorker(db, other.companyId, { roles: ['dogman', 'truck_driver'] });
    const jobId = seedJob(db, companyId, userId, {
      crew_roles_required: ['dogman'],
      role_requirements: [{ role_key: 'dogman', required_count: 1 }]
    });

    const res = await supertest(app)
      .post(`/api/jobs/${jobId}/allocations`)
      .set(auth())
      .send({ worker_id: otherWorker, role_coverage: ['dogman'] });

    assert.equal(res.status, 404);
  });
});
