'use strict';

const DEFAULT_TIMEZONE = 'Australia/Brisbane';
const COMMON_TIMEZONES = [
  'Australia/Brisbane',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Perth',
  'Pacific/Auckland'
];
const VALID_SCHEDULE_STATUSES = ['draft', 'planned', 'confirmed', 'completed', 'cancelled'];

function pad2(value) {
  return String(value).padStart(2, '0');
}

function isValidTimeZone(timeZone) {
  if (!timeZone || typeof timeZone !== 'string') return false;
  try {
    new Intl.DateTimeFormat('en-AU', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function normalizeTimeZone(timeZone, fallback = DEFAULT_TIMEZONE) {
  if (isValidTimeZone(timeZone)) return timeZone;
  if (isValidTimeZone(fallback)) return fallback;
  return DEFAULT_TIMEZONE;
}

function ensureValidTimeZone(timeZone) {
  if (!isValidTimeZone(timeZone)) {
    throw new Error('job_timezone must be a valid IANA timezone');
  }
  return timeZone;
}

function parseDateInput(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr || ''))) {
    throw new Error('date must use YYYY-MM-DD');
  }

  const [year, month, day] = String(dateStr).split('-').map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year
    || probe.getUTCMonth() !== month - 1
    || probe.getUTCDate() !== day
  ) {
    throw new Error('date is invalid');
  }

  return { year, month, day };
}

function parseTimeInput(timeStr, fieldName = 'time') {
  if (!/^\d{2}:\d{2}$/.test(String(timeStr || ''))) {
    throw new Error(`${fieldName} must use HH:MM`);
  }

  const [hour, minute] = String(timeStr).split(':').map(Number);
  if (
    !Number.isInteger(hour)
    || !Number.isInteger(minute)
    || hour < 0
    || hour > 23
    || minute < 0
    || minute > 59
  ) {
    throw new Error(`${fieldName} is invalid`);
  }

  return { hour, minute };
}

function formatterFor(timeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });
}

function formatUtcToZonedParts(utcIso, timeZone) {
  ensureValidTimeZone(timeZone);
  const date = new Date(utcIso);
  if (Number.isNaN(date.getTime())) {
    throw new Error('UTC datetime is invalid');
  }

  const parts = formatterFor(timeZone).formatToParts(date);
  const lookup = Object.fromEntries(parts
    .filter((part) => part.type !== 'literal')
    .map((part) => [part.type, part.value]));

  const datePart = `${lookup.year}-${lookup.month}-${lookup.day}`;
  const timePart = `${lookup.hour}:${lookup.minute}`;
  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: Number(lookup.hour),
    minute: Number(lookup.minute),
    second: Number(lookup.second),
    date: datePart,
    time: timePart,
    localDateTime: `${datePart} ${timePart}`,
    display: `${datePart} ${timePart}`
  };
}

function getOffsetMsForUtc(utcMs, timeZone) {
  const parts = formatUtcToZonedParts(new Date(utcMs).toISOString(), timeZone);
  const localAsUtcMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return localAsUtcMs - utcMs;
}

function localDateTimeToUtcIso(dateStr, timeStr, timeZone) {
  const { year, month, day } = parseDateInput(dateStr);
  const { hour, minute } = parseTimeInput(timeStr, 'scheduled time');
  ensureValidTimeZone(timeZone);

  const localAsUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let guessMs = localAsUtcMs;

  for (let index = 0; index < 4; index += 1) {
    const offsetMs = getOffsetMsForUtc(guessMs, timeZone);
    const nextGuessMs = localAsUtcMs - offsetMs;
    if (Math.abs(nextGuessMs - guessMs) < 1000) {
      guessMs = nextGuessMs;
      break;
    }
    guessMs = nextGuessMs;
  }

  const iso = new Date(guessMs).toISOString();
  const roundTrip = formatUtcToZonedParts(iso, timeZone);
  const expectedTime = `${pad2(hour)}:${pad2(minute)}`;
  if (roundTrip.date !== dateStr || roundTrip.time !== expectedTime) {
    throw new Error('The scheduled local date/time is invalid for the selected timezone');
  }

  return iso;
}

function normalizeScheduleStatus(value, fallback = 'planned') {
  const candidate = String(value || fallback).trim().toLowerCase();
  if (!VALID_SCHEDULE_STATUSES.includes(candidate)) {
    throw new Error(`schedule_status must be one of: ${VALID_SCHEDULE_STATUSES.join(', ')}`);
  }
  return candidate;
}

function buildJobScheduleFields({
  date,
  scheduled_start_time,
  shift_start_time,
  scheduled_end_time,
  job_timezone,
  company_timezone,
  schedule_status
}) {
  const normalizedStatus = normalizeScheduleStatus(schedule_status, 'planned');
  if (job_timezone !== undefined && job_timezone !== null && String(job_timezone).trim() !== '' && !isValidTimeZone(job_timezone)) {
    throw new Error('job_timezone must be a valid IANA timezone');
  }
  const normalizedTimeZone = ensureValidTimeZone(
    normalizeTimeZone(job_timezone, company_timezone || DEFAULT_TIMEZONE)
  );
  const startTime = scheduled_start_time || shift_start_time || null;
  const endTime = scheduled_end_time || null;

  if ((normalizedStatus === 'planned' || normalizedStatus === 'confirmed') && (!date || !startTime || !endTime)) {
    throw new Error('planned or confirmed jobs require date, start time, end time, and timezone');
  }

  if (!date && (startTime || endTime)) {
    throw new Error('date is required when scheduled times are provided');
  }

  let scheduledStartUtc = null;
  let scheduledEndUtc = null;
  let scheduledStartLocal = null;
  let scheduledEndLocal = null;

  if (date && startTime && endTime) {
    parseDateInput(date);
    parseTimeInput(startTime, 'scheduled_start_time');
    parseTimeInput(endTime, 'scheduled_end_time');

    scheduledStartUtc = localDateTimeToUtcIso(date, startTime, normalizedTimeZone);
    scheduledEndUtc = localDateTimeToUtcIso(date, endTime, normalizedTimeZone);
    if (new Date(scheduledEndUtc).getTime() <= new Date(scheduledStartUtc).getTime()) {
      throw new Error('scheduled_end_time must be after scheduled_start_time');
    }

    scheduledStartLocal = `${date} ${startTime}`;
    scheduledEndLocal = `${date} ${endTime}`;
  } else if (normalizedStatus !== 'draft') {
    throw new Error('planned or confirmed jobs require a complete scheduled time window');
  }

  return {
    scheduled_start_at_utc: scheduledStartUtc,
    scheduled_end_at_utc: scheduledEndUtc,
    job_timezone: normalizedTimeZone,
    scheduled_start_local: scheduledStartLocal,
    scheduled_end_local: scheduledEndLocal,
    schedule_status: normalizedStatus,
    shift_start_time: startTime
  };
}

function buildSchedulePayload({
  scheduled_start_at_utc,
  scheduled_end_at_utc,
  job_timezone,
  scheduled_start_local,
  scheduled_end_local,
  schedule_status
}, displayTimeZone = null) {
  const scheduleTimeZone = normalizeTimeZone(job_timezone);
  const timezoneForDisplay = normalizeTimeZone(displayTimeZone, scheduleTimeZone);

  if (!scheduled_start_at_utc || !scheduled_end_at_utc) {
    return {
      timezone: scheduleTimeZone,
      display_timezone: timezoneForDisplay,
      status: normalizeScheduleStatus(schedule_status || 'draft', 'draft'),
      has_schedule: false,
      scheduled_start_at_utc: null,
      scheduled_end_at_utc: null,
      scheduled_start_local: scheduled_start_local || null,
      scheduled_end_local: scheduled_end_local || null,
      display_start_local: null,
      display_end_local: null,
      display_range: 'Draft - schedule not set'
    };
  }

  const startInDisplayZone = formatUtcToZonedParts(scheduled_start_at_utc, timezoneForDisplay);
  const endInDisplayZone = formatUtcToZonedParts(scheduled_end_at_utc, timezoneForDisplay);
  return {
    timezone: scheduleTimeZone,
    display_timezone: timezoneForDisplay,
    status: normalizeScheduleStatus(schedule_status || 'planned', 'planned'),
    has_schedule: true,
    scheduled_start_at_utc,
    scheduled_end_at_utc,
    scheduled_start_local: scheduled_start_local || formatUtcToZonedParts(scheduled_start_at_utc, scheduleTimeZone).localDateTime,
    scheduled_end_local: scheduled_end_local || formatUtcToZonedParts(scheduled_end_at_utc, scheduleTimeZone).localDateTime,
    display_start_local: startInDisplayZone.localDateTime,
    display_end_local: endInDisplayZone.localDateTime,
    display_range: `${startInDisplayZone.localDateTime} -> ${endInDisplayZone.localDateTime} (${timezoneForDisplay})`
  };
}

function rangesOverlap(startA, endA, startB, endB) {
  if (!startA || !endA || !startB || !endB) return false;
  return new Date(startA).getTime() < new Date(endB).getTime()
    && new Date(endA).getTime() > new Date(startB).getTime();
}

function startOfLocalWeek(dateStr) {
  const { year, month, day } = parseDateInput(dateStr);
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  const dayOfWeek = probe.getUTCDay();
  const daysToMonday = (dayOfWeek + 6) % 7;
  probe.setUTCDate(probe.getUTCDate() - daysToMonday);
  return `${probe.getUTCFullYear()}-${pad2(probe.getUTCMonth() + 1)}-${pad2(probe.getUTCDate())}`;
}

function addDays(dateStr, days) {
  const { year, month, day } = parseDateInput(dateStr);
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  probe.setUTCDate(probe.getUTCDate() + days);
  return `${probe.getUTCFullYear()}-${pad2(probe.getUTCMonth() + 1)}-${pad2(probe.getUTCDate())}`;
}

function currentLocalDate(timeZone, now = new Date()) {
  return formatUtcToZonedParts(now.toISOString(), normalizeTimeZone(timeZone)).date;
}

function resolveScheduleRange({ start, end, timezone }, now = new Date()) {
  if (timezone !== undefined && timezone !== null && String(timezone).trim() !== '' && !isValidTimeZone(timezone)) {
    throw new Error('timezone must be a valid IANA timezone');
  }
  const normalizedTimeZone = normalizeTimeZone(timezone);
  const defaultWeekStart = startOfLocalWeek(currentLocalDate(normalizedTimeZone, now));
  const startDate = start || defaultWeekStart;
  const endDate = end || addDays(startDate, 6);

  parseDateInput(startDate);
  parseDateInput(endDate);

  const startUtc = localDateTimeToUtcIso(startDate, '00:00', normalizedTimeZone);
  const endUtc = localDateTimeToUtcIso(addDays(endDate, 1), '00:00', normalizedTimeZone);
  return {
    timezone: normalizedTimeZone,
    start_date: startDate,
    end_date: endDate,
    start_at_utc: startUtc,
    end_at_utc: endUtc
  };
}

module.exports = {
  DEFAULT_TIMEZONE,
  COMMON_TIMEZONES,
  VALID_SCHEDULE_STATUSES,
  addDays,
  buildJobScheduleFields,
  buildSchedulePayload,
  currentLocalDate,
  ensureValidTimeZone,
  formatUtcToZonedParts,
  isValidTimeZone,
  localDateTimeToUtcIso,
  normalizeScheduleStatus,
  normalizeTimeZone,
  parseDateInput,
  parseTimeInput,
  rangesOverlap,
  resolveScheduleRange,
  startOfLocalWeek
};
