'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { computeFatigueStatus } = require('../src/services/fatigue-guard');

const JOB_DATE = '2026-05-05';
// NOW is end-of-week (Sunday) so all May 4–9 shifts have already ended and rest hours are computable
const NOW = new Date('2026-05-10T12:00:00Z');

function makeShift({ hoursAgo, durationHours = 8, shiftType = 'day', selfDeclaredFatigue = false }) {
  const end   = new Date(NOW.getTime() - hoursAgo * 3_600_000);
  const start = new Date(end.getTime() - durationHours * 3_600_000);
  return {
    shift_start:          start.toISOString(),
    shift_end:            end.toISOString(),
    shift_length_hours:   durationHours,
    shift_type:           shiftType,
    travel_hours:         0,
    self_declared_fatigue: selfDeclaredFatigue ? 1 : 0
  };
}

describe('computeFatigueStatus', () => {

  test('returns clean status when no records', () => {
    const result = computeFatigueStatus([], JOB_DATE, 'day', { now: NOW });
    assert.equal(result.hardBlocked, false);
    assert.equal(result.fatigueScore, 100);
    assert.equal(result.restHours, Infinity);
    assert.equal(result.weeklyHours, 0);
  });

  test('hard blocks when rest is below 10 hours', () => {
    const shift = makeShift({ hoursAgo: 8, durationHours: 9 }); // ended 8h ago
    const result = computeFatigueStatus([shift], JOB_DATE, 'day', { now: NOW });
    assert.equal(result.hardBlocked, true);
    assert.equal(result.blocks.some(b => b.type === 'insufficient_rest'), true);
    assert.ok(result.restHours < 10);
  });

  test('does not block when rest is exactly 10 hours', () => {
    const shift = makeShift({ hoursAgo: 10, durationHours: 8 }); // ended exactly 10h ago
    const result = computeFatigueStatus([shift], JOB_DATE, 'day', { now: NOW });
    assert.equal(result.hardBlocked, false);
    assert.ok(result.restHours >= 10);
  });

  test('hard blocks when weekly hours reach 48', () => {
    // Six 8h shifts on Mon–Sat of the May 4 week = 48h
    // All end by Sat May 9 15:00; NOW is Sun May 10 12:00 → rest = 21h (no rest block)
    const shifts = Array.from({ length: 6 }, (_, i) => ({
      shift_start:         `2026-05-0${4 + i}T07:00:00Z`,
      shift_end:           `2026-05-0${4 + i}T15:00:00Z`,
      shift_length_hours:  8,
      shift_type:          'day',
      travel_hours:        0,
      self_declared_fatigue: 0
    }));
    const result = computeFatigueStatus(shifts, JOB_DATE, 'day', { now: NOW });
    assert.equal(result.hardBlocked, true);
    assert.equal(result.blocks.some(b => b.type === 'weekly_hours_exceeded'), true);
    assert.ok(result.weeklyHours >= 48);
  });

  test('warns when weekly hours are between 44 and 48', () => {
    // Five 9h shifts on Mon–Fri May 4–8 = 45h
    // Last ends May 8 16:00; NOW May 10 12:00 → rest = 44h (no rest block)
    const shifts = Array.from({ length: 5 }, (_, i) => ({
      shift_start:         `2026-05-0${4 + i}T07:00:00Z`,
      shift_end:           `2026-05-0${4 + i}T16:00:00Z`,
      shift_length_hours:  9,
      shift_type:          'day',
      travel_hours:        0,
      self_declared_fatigue: 0
    }));
    const result = computeFatigueStatus(shifts, JOB_DATE, 'day', { now: NOW });
    assert.equal(result.hardBlocked, false);
    assert.equal(result.warnings.some(w => w.type === 'weekly_hours_warning'), true);
  });

  test('warns when consecutive working days threshold reached', () => {
    // Five 7h shifts on Mon–Fri May 4–8 = 35h (below warning threshold)
    // Five distinct working days → consecutive_days warning
    const shifts = Array.from({ length: 5 }, (_, i) => ({
      shift_start:         `2026-05-0${4 + i}T08:00:00Z`,
      shift_end:           `2026-05-0${4 + i}T15:00:00Z`,
      shift_length_hours:  7,
      shift_type:          'day',
      travel_hours:        0,
      self_declared_fatigue: 0
    }));
    const result = computeFatigueStatus(shifts, JOB_DATE, 'day', { now: NOW });
    assert.equal(result.hardBlocked, false);
    assert.equal(result.warnings.some(w => w.type === 'consecutive_days'), true);
  });

  test('warns on night-to-day shift gap under 12 hours', () => {
    const shift = makeShift({ hoursAgo: 10, durationHours: 10, shiftType: 'night' });
    const result = computeFatigueStatus([shift], JOB_DATE, 'day', { now: NOW });
    assert.equal(result.hardBlocked, false);
    assert.equal(result.warnings.some(w => w.type === 'night_to_day_shift'), true);
  });

  test('does not warn on night-to-day shift when gap exceeds 12 hours', () => {
    const shift = makeShift({ hoursAgo: 14, durationHours: 10, shiftType: 'night' });
    const result = computeFatigueStatus([shift], JOB_DATE, 'day', { now: NOW });
    assert.equal(result.hardBlocked, false);
    assert.equal(result.warnings.some(w => w.type === 'night_to_day_shift'), false);
  });

  test('warns when self-declared fatigue is true on last shift', () => {
    const shift = makeShift({ hoursAgo: 15, selfDeclaredFatigue: true });
    const result = computeFatigueStatus([shift], JOB_DATE, 'day', { now: NOW });
    assert.equal(result.hardBlocked, false);
    assert.equal(result.warnings.some(w => w.type === 'self_declared_fatigue'), true);
  });

  test('score is 100 for well-rested worker with low weekly hours', () => {
    const shift = makeShift({ hoursAgo: 30, durationHours: 8 });
    const result = computeFatigueStatus([shift], JOB_DATE, 'day', { now: NOW });
    assert.equal(result.hardBlocked, false);
    assert.equal(result.fatigueScore, 100);
  });

});
