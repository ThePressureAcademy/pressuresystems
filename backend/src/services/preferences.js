'use strict';

const { randomUUID } = require('crypto');

const TASK_PREFERENCE_WEIGHT = 0.08;
const SOURCE_PRIORITY = {
  manual: 3,
  imported: 2,
  learned: 1
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeTaskTag(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function uniqueStrings(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function collectJobContextTags(job) {
  const tags = [];

  for (const tag of toArray(job.task_tags)) {
    tags.push(normalizeTaskTag(tag));
  }

  for (const role of toArray(job.crew_roles_required)) {
    tags.push(normalizeTaskTag(role));
  }

  if (job.crane_class_required) {
    tags.push(normalizeTaskTag(job.crane_class_required));
  }

  if (job.shift_type) {
    tags.push(normalizeTaskTag(`${job.shift_type}_shift`));
  }

  if (job.lift_risk_level === 'critical') {
    tags.push('critical_lift');
    tags.push('high_pressure');
  } else if (job.lift_risk_level === 'complex') {
    tags.push('complex_lift');
  }

  if (job.travel_required) {
    tags.push('long_travel');
  }

  if (job.client_name) {
    tags.push(`client_${normalizeTaskTag(job.client_name)}`);
  }

  if (job.site_name) {
    tags.push(`site_${normalizeTaskTag(job.site_name)}`);
  }

  return uniqueStrings(tags);
}

function describePreferenceSignal(signal) {
  const label = signal.task_tag;
  const ratingText = `★${signal.rating}`;

  if (signal.source === 'learned') {
    return `Learned allocation preference: ${label} ${ratingText} from ${signal.approval_count} confirmed allocation(s) (confidence ${Number(signal.confidence || 0).toFixed(2)})`;
  }

  if (signal.source === 'manual') {
    return `Manual task preference: ${label} ${ratingText}`;
  }

  return `Imported task preference: ${label} ${ratingText}`;
}

function ratingDelta(rating) {
  switch (Number(rating)) {
    case 5: return 40;
    case 4: return 25;
    case 3: return 10;
    case 2: return -10;
    case 1: return -25;
    default: return 0;
  }
}

function preferenceStrength(signal) {
  if (signal.source !== 'learned') return 1;
  return clamp(Number(signal.confidence || 0), 0.25, 1);
}

function buildRelevantPreferenceSignals(preferences, jobContextTags) {
  const context = new Set(jobContextTags.map(normalizeTaskTag));
  const selectedByTag = new Map();

  for (const preference of preferences || []) {
    const taskTag = normalizeTaskTag(preference.task_tag);
    if (!taskTag || !context.has(taskTag)) continue;

    const normalized = {
      ...preference,
      task_tag: taskTag,
      rating: Number(preference.rating),
      approval_count: Number(preference.approval_count || 0),
      override_selection_count: Number(preference.override_selection_count || 0),
      confidence: Number(preference.confidence || 0)
    };

    const existing = selectedByTag.get(taskTag);
    const incomingPriority = SOURCE_PRIORITY[normalized.source] || 0;
    const existingPriority = existing ? (SOURCE_PRIORITY[existing.source] || 0) : -1;

    if (!existing || incomingPriority > existingPriority) {
      selectedByTag.set(taskTag, normalized);
    }
  }

  return Array.from(selectedByTag.values()).sort((a, b) => {
    const priorityDiff = (SOURCE_PRIORITY[b.source] || 0) - (SOURCE_PRIORITY[a.source] || 0);
    if (priorityDiff !== 0) return priorityDiff;
    return b.rating - a.rating;
  });
}

function computeTaskPreferenceFactor(preferences, job) {
  const contextTags = collectJobContextTags(job);
  const signals = buildRelevantPreferenceSignals(preferences, contextTags);

  if (signals.length === 0) {
    return {
      score: 0,
      weight: TASK_PREFERENCE_WEIGHT,
      weighted: 0,
      detail: 'No relevant task preference signal recorded',
      signals: [],
      context_tags: contextTags
    };
  }

  const totalDelta = signals.reduce((sum, signal) => {
    return sum + ratingDelta(signal.rating) * preferenceStrength(signal);
  }, 0);

  const averagedDelta = totalDelta / Math.min(signals.length, 2);
  const score = Math.round(clamp(averagedDelta, -40, 40) * 10) / 10;

  return {
    score,
    weight: TASK_PREFERENCE_WEIGHT,
    weighted: Math.round(score * TASK_PREFERENCE_WEIGHT * 100) / 100,
    detail: signals.slice(0, 3).map(describePreferenceSignal).join(' | '),
    signals,
    context_tags: contextTags
  };
}

function groupPreferencesByWorker(rows) {
  const grouped = {};
  for (const row of rows || []) {
    (grouped[row.worker_id] = grouped[row.worker_id] || []).push(row);
  }
  return grouped;
}

function deriveLearnedRating(approvalCount, overrideSelectionCount = 0) {
  const weightedApprovals = Number(approvalCount || 0) + (Number(overrideSelectionCount || 0) * 0.5);
  if (weightedApprovals >= 4) return 5;
  if (weightedApprovals >= 2) return 4;
  if (weightedApprovals >= 1) return 3;
  return 1;
}

function deriveLearnedConfidence(approvalCount, overrideSelectionCount = 0) {
  return Math.round(clamp(
    0.2 + (Number(approvalCount || 0) * 0.2) + (Number(overrideSelectionCount || 0) * 0.1),
    0,
    1
  ) * 100) / 100;
}

function upsertLearnedPreferencesFromAllocation(db, appendAuditEvent, {
  companyId,
  workerId,
  job,
  userId,
  allocationId,
  selectedRank,
  overrideReason
}) {
  const contextTags = collectJobContextTags(job);
  if (contextTags.length === 0) return [];

  const now = new Date().toISOString();
  const strengthenedSelection = selectedRank > 1 && Boolean(overrideReason);
  const savedSignals = [];

  for (const taskTag of contextTags) {
    const existing = db.prepare(`
      SELECT *
      FROM worker_task_preferences
      WHERE company_id = ? AND worker_id = ? AND task_tag = ? AND source = 'learned'
    `).get(companyId, workerId, taskTag);

    const approvalCount = Number(existing?.approval_count || 0) + 1;
    const overrideSelectionCount = Number(existing?.override_selection_count || 0)
      + (strengthenedSelection ? 1 : 0);
    const rating = deriveLearnedRating(approvalCount, overrideSelectionCount);
    const confidence = deriveLearnedConfidence(approvalCount, overrideSelectionCount);

    let saved;
    if (existing) {
      db.prepare(`
        UPDATE worker_task_preferences
        SET rating = ?, approval_count = ?, override_selection_count = ?,
            confidence = ?, last_selected_at = ?, updated_at = ?
        WHERE id = ?
      `).run(
        rating,
        approvalCount,
        overrideSelectionCount,
        confidence,
        now,
        now,
        existing.id
      );

      saved = db.prepare(`SELECT * FROM worker_task_preferences WHERE id = ?`).get(existing.id);
      appendAuditEvent(db, {
        companyId,
        eventType: 'preference_signal_updated',
        userId,
        workerId,
        jobId: job.id,
        allocationId,
        payload: {
          task_tag: taskTag,
          source: 'learned',
          rating,
          approval_count: approvalCount,
          override_selection_count: overrideSelectionCount,
          confidence,
          selected_rank: selectedRank,
          override_reason: overrideReason || null
        }
      });
    } else {
      const id = randomUUID();
      db.prepare(`
        INSERT INTO worker_task_preferences (
          id, company_id, worker_id, task_tag, rating, source, notes,
          approval_count, override_selection_count, confidence, last_selected_at,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'learned', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        companyId,
        workerId,
        taskTag,
        rating,
        'Learned from confirmed allocations',
        approvalCount,
        overrideSelectionCount,
        confidence,
        now,
        now,
        now
      );

      saved = db.prepare(`SELECT * FROM worker_task_preferences WHERE id = ?`).get(id);
      appendAuditEvent(db, {
        companyId,
        eventType: 'preference_signal_created',
        userId,
        workerId,
        jobId: job.id,
        allocationId,
        payload: {
          task_tag: taskTag,
          source: 'learned',
          rating,
          approval_count: approvalCount,
          override_selection_count: overrideSelectionCount,
          confidence,
          selected_rank: selectedRank,
          override_reason: overrideReason || null
        }
      });
    }

    savedSignals.push(saved);
  }

  return savedSignals;
}

module.exports = {
  TASK_PREFERENCE_WEIGHT,
  normalizeTaskTag,
  collectJobContextTags,
  computeTaskPreferenceFactor,
  groupPreferencesByWorker,
  deriveLearnedRating,
  deriveLearnedConfidence,
  upsertLearnedPreferencesFromAllocation
};
