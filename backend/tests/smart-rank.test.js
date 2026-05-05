'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { rankWorkersForJob, WEIGHTS } = require('../src/services/smart-rank');

// End of the May 4–10 week so all test shifts have already ended
const NOW = new Date('2026-05-10T12:00:00Z');

const JOB = {
  id:                    'job-1',
  date:                  '2026-05-06',
  shift_type:            'day',
  shift_start_time:      '07:00',
  crane_class_required:  '55T',
  required_credentials:  ['high_risk_licence_crane'],
  site_name:             'Test Site',
  client_name:           'Test Client',
  travel_required:       0,
  site_location:         null
};

function worker(overrides = {}) {
  return {
    id:              overrides.id    || 'w1',
    name:            overrides.name  || 'Worker One',
    role:            overrides.role  || 'crane_operator',
    status:          overrides.status || 'available',
    crane_classes:   overrides.crane_classes || ['55T'],
    usual_depot:     overrides.usual_depot   || null,
    ...overrides
  };
}

function validCred(workerId) {
  return [{
    id:          'cred-1',
    worker_id:   workerId,
    type:        'high_risk_licence_crane',
    expiry_date: '2028-01-01',
    status:      'valid'
  }];
}

describe('rankWorkersForJob', () => {

  test('worker with all credentials and correct crane class is ranked', () => {
    const w = worker();
    const { ranked, blocked } = rankWorkersForJob(
      [w], JOB,
      { [w.id]: validCred(w.id) }, {}, {},
      { now: NOW }
    );
    assert.equal(ranked.length, 1);
    assert.equal(blocked.length, 0);
    assert.equal(ranked[0].worker.id, w.id);
    assert.ok(ranked[0].score > 0);
  });

  test('worker missing required credential is blocked', () => {
    const w = worker({ id: 'w-blocked' });
    const { ranked, blocked } = rankWorkersForJob(
      [w], JOB,
      { [w.id]: [] },  // no credentials
      {}, {},
      { now: NOW }
    );
    assert.equal(ranked.length, 0);
    assert.equal(blocked.length, 1);
    assert.equal(blocked[0].blocks.some(b => b.type === 'credential_missing'), true);
  });

  test('unavailable worker is blocked', () => {
    const w = worker({ id: 'w-unavail', status: 'unavailable' });
    const { blocked } = rankWorkersForJob(
      [w], JOB,
      { [w.id]: validCred(w.id) }, {}, {},
      { now: NOW }
    );
    assert.equal(blocked.length, 1);
    assert.equal(blocked[0].blocks[0].type, 'availability');
  });

  test('two workers ranked differently based on crane experience', () => {
    const wExperienced = worker({ id: 'w-exp',    crane_classes: ['55T', '130T'] });
    const wInexperienced = worker({ id: 'w-inexp', crane_classes: [] });

    const credsMap = {
      [wExperienced.id]:   validCred(wExperienced.id),
      [wInexperienced.id]: validCred(wInexperienced.id)
    };

    const { ranked } = rankWorkersForJob(
      [wExperienced, wInexperienced], JOB, credsMap, {}, {}, { now: NOW }
    );

    assert.equal(ranked.length, 2);
    // Experienced worker should rank higher
    assert.equal(ranked[0].worker.id, wExperienced.id);
    assert.ok(ranked[0].score > ranked[1].score);
  });

  test('fatigued worker scores lower than rested worker', () => {
    const wRested  = worker({ id: 'w-rested'  });
    const wTired   = worker({ id: 'w-tired'   });

    const credsMap = {
      [wRested.id]: validCred(wRested.id),
      [wTired.id]:  validCred(wTired.id)
    };

    // Tired worker: 5 × 9h shifts in the May 4–8 window = 45h (warning territory)
    // JOB_DATE is '2026-05-06' → week starts May 4; all shifts end before NOW (May 10 12:00)
    const fatigueMap = {
      [wTired.id]: Array.from({ length: 5 }, (_, i) => ({
        shift_start:        `2026-05-0${4 + i}T07:00:00Z`,
        shift_end:          `2026-05-0${4 + i}T16:00:00Z`,
        shift_length_hours: 9,
        shift_type:         'day',
        travel_hours:       0,
        self_declared_fatigue: 0
      }))
    };

    const { ranked } = rankWorkersForJob(
      [wRested, wTired], JOB, credsMap, fatigueMap, {}, { now: NOW }
    );

    assert.equal(ranked.length, 2);
    assert.equal(ranked[0].worker.id, wRested.id);
    assert.ok(ranked[0].score > ranked[1].score);
  });

  test('score_breakdown contains all seven factors', () => {
    const w = worker();
    const { ranked } = rankWorkersForJob(
      [w], JOB, { [w.id]: validCred(w.id) }, {}, {}, { now: NOW }
    );
    const breakdown = ranked[0].score_breakdown;
    const expectedFactors = Object.keys(WEIGHTS);
    for (const factor of expectedFactors) {
      assert.ok(factor in breakdown, `Missing factor: ${factor}`);
      assert.ok('score'    in breakdown[factor]);
      assert.ok('weight'   in breakdown[factor]);
      assert.ok('weighted' in breakdown[factor]);
      assert.ok('detail'   in breakdown[factor]);
    }
  });

  test('weighted scores sum to the total score', () => {
    const w = worker();
    const { ranked } = rankWorkersForJob(
      [w], JOB, { [w.id]: validCred(w.id) }, {}, {}, { now: NOW }
    );
    const breakdown = ranked[0].score_breakdown;
    const expectedTotal = Object.values(breakdown).reduce((s, f) => s + f.weighted, 0);
    assert.ok(Math.abs(ranked[0].score - Math.round(expectedTotal * 10) / 10) < 0.01);
  });

  test('allocated worker shows warning not hard block', () => {
    const w = worker({ status: 'allocated' });
    const { ranked, blocked } = rankWorkersForJob(
      [w], JOB, { [w.id]: validCred(w.id) }, {}, {}, { now: NOW }
    );
    assert.equal(blocked.length, 0);
    assert.equal(ranked.length, 1);
    assert.equal(ranked[0].warnings.some(wn => wn.type === 'availability_warning'), true);
  });

  test('workers with higher recent allocation load score lower on fairness', () => {
    const wFresh   = worker({ id: 'w-fresh'   });
    const wOverused = worker({ id: 'w-overused' });

    const credsMap = {
      [wFresh.id]:    validCred(wFresh.id),
      [wOverused.id]: validCred(wOverused.id)
    };

    const recentTime = new Date(NOW.getTime() - 2 * 86_400_000).toISOString();
    const allocMap = {
      [wOverused.id]: Array.from({ length: 4 }, (_, i) => ({
        allocated_at: recentTime,
        site_name:    'Other Site',
        client_name:  'Other Client'
      }))
    };

    const { ranked } = rankWorkersForJob(
      [wFresh, wOverused], JOB, credsMap, {}, allocMap, { now: NOW }
    );

    assert.equal(ranked[0].worker.id, wFresh.id);
    assert.ok(
      ranked[0].score_breakdown.fairness.score >
      ranked[1].score_breakdown.fairness.score
    );
  });

});
