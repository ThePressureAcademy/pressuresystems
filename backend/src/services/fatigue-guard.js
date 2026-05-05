'use strict';

const REST_HARD_BLOCK_HOURS = 10;
const WEEKLY_HARD_BLOCK_HOURS = 48;
const WEEKLY_WARNING_HOURS = 44;
const DEFAULT_CONSECUTIVE_DAYS_THRESHOLD = 5;
const NIGHT_TO_DAY_GAP_HOURS = 12;

/**
 * Returns the Monday 00:00:00 UTC of the calendar week containing dateStr (YYYY-MM-DD).
 */
function weekStartFor(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const dow = d.getUTCDay(); // 0 = Sun
  const daysToMonday = (dow + 6) % 7;
  d.setUTCDate(d.getUTCDate() - daysToMonday);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Combines a date string (YYYY-MM-DD) and optional time string (HH:MM) into a Date.
 * Falls back to 06:00 UTC if no time provided.
 */
function jobStartDatetime(jobDate, shiftStartTime) {
  const time = shiftStartTime ? shiftStartTime.slice(0, 5) : '06:00';
  return new Date(`${jobDate}T${time}:00Z`);
}

/**
 * Evaluates fatigue risk for a single worker given their recent shift records.
 *
 * restHours is computed relative to job start time (if job is in the future)
 * or current time (if job has already started), whichever is earlier.
 *
 * Returns:
 *   hardBlocked   — true if worker cannot be allocated
 *   blocks        — array of block reasons
 *   warnings      — array of warning reasons
 *   fatigueScore  — 0–100 factor for SmartRank
 *   restHours     — computed rest since last shift end
 *   weeklyHours   — hours worked in job's calendar week
 *
 * @param {object[]} fatigueRecords  FatigueRecord rows for this worker
 * @param {string}   jobDate         YYYY-MM-DD
 * @param {string}   jobShiftType    'day' | 'night' | 'split'
 * @param {object}   options
 * @param {number}   options.consecutiveDaysThreshold
 * @param {string}   options.shiftStartTime  HH:MM (for rest-to-job-start calc)
 * @param {Date}     options.now             Injectable for testing
 */
function computeFatigueStatus(fatigueRecords, jobDate, jobShiftType, options = {}) {
  const {
    consecutiveDaysThreshold = DEFAULT_CONSECUTIVE_DAYS_THRESHOLD,
    shiftStartTime = null,
    now = new Date()
  } = options;

  const blocks = [];
  const warnings = [];

  if (!fatigueRecords || fatigueRecords.length === 0) {
    return {
      hardBlocked: false, blocks, warnings,
      fatigueScore: 100, restHours: Infinity, weeklyHours: 0
    };
  }

  // Sort descending by shift_end to find the most recent shift
  const sorted = [...fatigueRecords].sort(
    (a, b) => new Date(b.shift_end) - new Date(a.shift_end)
  );
  const lastRecord = sorted[0];
  const lastShiftEnd = new Date(lastRecord.shift_end);

  // Compute rest relative to earlier of now and job start
  const jobStart = jobStartDatetime(jobDate, shiftStartTime);
  const referenceTime = jobStart < now ? now : jobStart;
  const restHours = (referenceTime - lastShiftEnd) / 3_600_000;

  // Weekly hours: sum shift_length_hours for records starting in job's calendar week
  const weekStart = weekStartFor(jobDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  let weeklyHours = 0;
  const workingDaysInWeek = new Set();

  for (const r of fatigueRecords) {
    const s = new Date(r.shift_start);
    if (s >= weekStart && s < weekEnd) {
      weeklyHours += r.shift_length_hours;
      workingDaysInWeek.add(s.toISOString().slice(0, 10));
    }
  }

  // ── Hard blocks ──────────────────────────────────────────────────────────
  if (restHours < REST_HARD_BLOCK_HOURS) {
    blocks.push({
      type: 'insufficient_rest',
      detail: `${restHours.toFixed(1)}h rest since last shift (minimum ${REST_HARD_BLOCK_HOURS}h required)`
    });
  }

  if (weeklyHours >= WEEKLY_HARD_BLOCK_HOURS) {
    blocks.push({
      type: 'weekly_hours_exceeded',
      detail: `${weeklyHours.toFixed(1)}h worked this week (maximum ${WEEKLY_HARD_BLOCK_HOURS}h)`
    });
  }

  if (blocks.length > 0) {
    return { hardBlocked: true, blocks, warnings, fatigueScore: 0, restHours, weeklyHours };
  }

  // ── Warnings ─────────────────────────────────────────────────────────────
  if (weeklyHours >= WEEKLY_WARNING_HOURS) {
    warnings.push({
      type: 'weekly_hours_warning',
      detail: `${weeklyHours.toFixed(1)}h this week — approaching ${WEEKLY_HARD_BLOCK_HOURS}h limit`
    });
  }

  if (workingDaysInWeek.size >= consecutiveDaysThreshold) {
    warnings.push({
      type: 'consecutive_days',
      detail: `${workingDaysInWeek.size} working days this week (threshold: ${consecutiveDaysThreshold})`
    });
  }

  if (lastRecord.shift_type === 'night' && jobShiftType === 'day') {
    if (restHours < NIGHT_TO_DAY_GAP_HOURS) {
      warnings.push({
        type: 'night_to_day_shift',
        detail: `${restHours.toFixed(1)}h gap from night shift to day shift (${NIGHT_TO_DAY_GAP_HOURS}h recommended)`
      });
    }
  }

  if (lastRecord.self_declared_fatigue) {
    warnings.push({
      type: 'self_declared_fatigue',
      detail: 'Worker self-declared fatigue on their most recent shift'
    });
  }

  // ── Score ─────────────────────────────────────────────────────────────────
  let restScore;
  if (restHours === Infinity || restHours >= 24) restScore = 100;
  else if (restHours >= 11) restScore = 80;
  else restScore = 50; // 10–11h: allowed but borderline

  let weekScore;
  if (weeklyHours >= WEEKLY_WARNING_HOURS) weekScore = 40;
  else if (weeklyHours >= 35) weekScore = 75;
  else weekScore = 100;

  const fatigueScore = Math.min(restScore, weekScore);

  return { hardBlocked: false, blocks, warnings, fatigueScore, restHours, weeklyHours };
}

module.exports = {
  computeFatigueStatus,
  REST_HARD_BLOCK_HOURS,
  WEEKLY_HARD_BLOCK_HOURS,
  WEEKLY_WARNING_HOURS
};
