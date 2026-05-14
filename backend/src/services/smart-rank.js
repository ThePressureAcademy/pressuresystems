'use strict';

const { computeCredentialStatus } = require('./credential-gate');
const { computeFatigueStatus } = require('./fatigue-guard');
const { computeTaskPreferenceFactor } = require('./preferences');
const { buildSchedulePayload, rangesOverlap } = require('./timezone');
const {
  formatDisplayLabel,
  normalizeWorkerRoles,
  siteConditionReviewLabels
} = require('./intake-catalogues');

const WEIGHTS = {
  credential_match: 0.25,
  crane_experience: 0.20,
  fatigue_risk: 0.20,
  availability: 0.15,
  site_familiarity: 0.10,
  fairness: 0.05,
  travel: 0.05,
  task_preference: 0.08
};

function evalAvailability(worker) {
  switch (worker.status) {
    case 'available':
      return { hardBlocked: false, score: 100, detail: 'Available' };
    case 'allocated':
      return {
        hardBlocked: false,
        score: 50,
        isWarning: true,
        detail: 'Currently allocated to another job - confirm availability before dispatch'
      };
    case 'unavailable':
      return { hardBlocked: true, detail: 'Marked as unavailable' };
    case 'on_leave':
      return { hardBlocked: true, detail: 'On leave' };
    case 'inactive':
      return { hardBlocked: true, detail: 'Inactive - not deployable' };
    default:
      return { hardBlocked: true, detail: `Unknown status: ${worker.status}` };
  }
}

function evalCraneExperience(worker, job) {
  const requiredClasses = Array.isArray(job.crane_classes_required) && job.crane_classes_required.length > 0
    ? job.crane_classes_required
    : (job.crane_class_required ? [job.crane_class_required] : []);
  if (requiredClasses.length === 0) {
    return { score: 100, detail: 'No specific crane class required' };
  }

  const craneClasses = Array.isArray(worker.crane_classes)
    ? worker.crane_classes
    : JSON.parse(worker.crane_classes || '[]');

  const matched = requiredClasses.find((required) => craneClasses.includes(required));
  if (matched) {
    return { score: 100, detail: `Experienced on ${matched}` };
  }

  const roles = normalizeWorkerRoles(worker.roles || worker.role);
  if (roles.includes('crane_operator') && craneClasses.length > 0) {
    return {
      score: 50,
      detail: `Crane operator - no selected crane class recorded (requires: ${requiredClasses.join(', ')}; has: ${craneClasses.join(', ')})`
    };
  }

  if (roles.includes('crane_operator')) {
    return { score: 30, detail: 'Crane operator - no crane class experience recorded' };
  }

  return { score: 20, detail: `Role (${roles.map(formatDisplayLabel).join(', ') || formatDisplayLabel(worker.role)}) - crane class match may not apply` };
}

function evalSiteFamiliarity(worker, job, recentAllocations) {
  const pastSites = recentAllocations.map((allocation) => allocation.site_name).filter(Boolean);
  const pastClients = recentAllocations.map((allocation) => allocation.client_name).filter(Boolean);

  if (pastSites.includes(job.site_name)) {
    return { score: 100, detail: `Previously worked at ${job.site_name}` };
  }
  if (pastClients.includes(job.client_name)) {
    return { score: 80, detail: `Previously worked for ${job.client_name}` };
  }
  return { score: 50, detail: 'No previous allocations to this site or client' };
}

function evalFairness(recentAllocations7d) {
  const count = recentAllocations7d.length;
  if (count === 0) return { score: 100, detail: 'No allocations in last 7 days' };
  if (count === 1) return { score: 85, detail: '1 allocation in last 7 days' };
  if (count === 2) return { score: 70, detail: '2 allocations in last 7 days' };
  if (count === 3) return { score: 55, detail: '3 allocations in last 7 days' };
  return { score: 40, detail: `${count} allocations in last 7 days - high load` };
}

function evalTravel(worker, job) {
  if (!job.travel_required) {
    return { score: 100, detail: 'No travel required' };
  }
  if (
    worker.usual_depot && job.site_location
    && worker.usual_depot.toLowerCase().trim() === job.site_location.toLowerCase().trim()
  ) {
    return { score: 90, detail: 'Worker depot matches job site' };
  }
  return { score: 60, detail: 'Additional travel over 100km flagged for review - worker is not local to site' };
}

function effectiveAllocationWindow(allocation) {
  return {
    start: allocation.allocation_start_at_utc || allocation.job_scheduled_start_at_utc || null,
    end: allocation.allocation_end_at_utc || allocation.job_scheduled_end_at_utc || null,
    timeZone: allocation.allocation_timezone || allocation.job_timezone || 'Australia/Brisbane',
    scheduleStatus: allocation.allocation_status || allocation.job_schedule_status || 'planned',
    jobId: allocation.job_id,
    reference: allocation.reference || allocation.job_reference || null,
    siteName: allocation.site_name || null,
    clientName: allocation.client_name || null
  };
}

function conflictLabel(allocationWindow) {
  return allocationWindow.reference
    || allocationWindow.siteName
    || allocationWindow.clientName
    || allocationWindow.jobId;
}

function evalScheduleConflicts(job, workerAllocations) {
  if (!job.scheduled_start_at_utc || !job.scheduled_end_at_utc) {
    return { hardBlocked: false, blocks: [], warnings: [] };
  }

  const blocks = [];
  const warnings = [];
  for (const allocation of workerAllocations || []) {
    if (allocation.job_id === job.id) continue;

    const window = effectiveAllocationWindow(allocation);
    if (!window.start || !window.end) continue;
    if (['cancelled', 'completed'].includes(window.scheduleStatus)) continue;

    if (!rangesOverlap(job.scheduled_start_at_utc, job.scheduled_end_at_utc, window.start, window.end)) {
      continue;
    }

    const display = buildSchedulePayload({
      scheduled_start_at_utc: window.start,
      scheduled_end_at_utc: window.end,
      job_timezone: window.timeZone,
      scheduled_start_local: null,
      scheduled_end_local: null,
      schedule_status: window.scheduleStatus
    }, job.job_timezone);

    const detail = `Overlaps with ${conflictLabel(window)} ${display.display_range}`;
    const payload = {
      type: 'schedule_conflict',
      detail,
      job_id: allocation.job_id,
      schedule_status: window.scheduleStatus,
      scheduled_start_at_utc: window.start,
      scheduled_end_at_utc: window.end,
      timezone: window.timeZone
    };

    if (window.scheduleStatus === 'confirmed') {
      blocks.push(payload);
    } else {
      warnings.push({
        ...payload,
        type: 'schedule_conflict_warning'
      });
    }
  }

  return {
    hardBlocked: blocks.length > 0,
    blocks,
    warnings
  };
}

function rankWorkersForJob(
  workers,
  job,
  credsByWorker,
  fatigueByWorker,
  allocsByWorker,
  preferencesByWorker = {},
  options = {}
) {
  if (preferencesByWorker && preferencesByWorker.now) {
    options = preferencesByWorker;
    preferencesByWorker = {};
  }

  const { now = new Date() } = options;
  const requiredCredentials = Array.isArray(job.required_credentials)
    ? job.required_credentials
    : JSON.parse(job.required_credentials || '[]');

  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const ranked = [];
  const blocked = [];

  for (const worker of workers) {
    if (worker.archived_at) continue;

    const workerBlocks = [];
    const workerWarnings = [];

    const availability = evalAvailability(worker);
    if (availability.hardBlocked) {
      workerBlocks.push({ type: 'availability', detail: availability.detail });
      blocked.push({ worker, blocks: workerBlocks, warnings: [] });
      continue;
    }
    if (availability.isWarning) {
      workerWarnings.push({ type: 'availability_warning', detail: availability.detail });
    }

    const credentials = credsByWorker[worker.id] || [];
    const credentialResult = computeCredentialStatus(credentials, requiredCredentials, now);
    if (credentialResult.hardBlocked) {
      workerBlocks.push(...credentialResult.blocks);
      blocked.push({ worker, blocks: workerBlocks, warnings: credentialResult.warnings });
      continue;
    }
    workerWarnings.push(...credentialResult.warnings);

    const fatigueRecords = fatigueByWorker[worker.id] || [];
    const fatigueResult = computeFatigueStatus(
      fatigueRecords,
      job.date,
      job.shift_type,
      { shiftStartTime: job.shift_start_time, now }
    );
    if (fatigueResult.hardBlocked) {
      workerBlocks.push(...fatigueResult.blocks);
      blocked.push({ worker, blocks: workerBlocks, warnings: fatigueResult.warnings });
      continue;
    }
    workerWarnings.push(...fatigueResult.warnings);

    const allAllocations = allocsByWorker[worker.id] || [];
    const scheduleConflict = evalScheduleConflicts(job, allAllocations);
    if (scheduleConflict.hardBlocked) {
      workerBlocks.push(...scheduleConflict.blocks);
      blocked.push({ worker, blocks: workerBlocks, warnings: [...workerWarnings, ...scheduleConflict.warnings] });
      continue;
    }
    workerWarnings.push(...scheduleConflict.warnings);

    const siteConditionLabels = siteConditionReviewLabels(job.site_conditions || []);
    if (siteConditionLabels.length > 0) {
      workerWarnings.push({
        type: 'site_condition_review',
        detail: `Site conditions selected for dispatcher review: ${siteConditionLabels.slice(0, 4).join(', ')}`
      });
    }
    if (job.travel_required) {
      workerWarnings.push({
        type: 'travel_review',
        detail: 'Additional travel over 100km flagged for review.'
      });
    }

    const allocations90d = allAllocations.filter((allocation) => new Date(allocation.allocated_at) >= ninetyDaysAgo);
    const allocations7d = allAllocations.filter((allocation) => new Date(allocation.allocated_at) >= sevenDaysAgo);

    const craneExperience = evalCraneExperience(worker, job);
    const siteFamiliarity = evalSiteFamiliarity(worker, job, allocations90d);
    const fairness = evalFairness(allocations7d);
    const travel = evalTravel(worker, job);
    const taskPreference = computeTaskPreferenceFactor(preferencesByWorker[worker.id] || [], job);

    const scoreBreakdown = {
      credential_match: {
        score: credentialResult.credentialScore,
        weight: WEIGHTS.credential_match,
        weighted: credentialResult.credentialScore * WEIGHTS.credential_match,
        detail: credentialResult.warnings.length > 0
          ? 'Credentials valid but some expiring soon'
          : (requiredCredentials.length === 0 ? 'No credentials required' : 'All required credentials valid')
      },
      crane_experience: {
        score: craneExperience.score,
        weight: WEIGHTS.crane_experience,
        weighted: craneExperience.score * WEIGHTS.crane_experience,
        detail: craneExperience.detail
      },
      fatigue_risk: {
        score: fatigueResult.fatigueScore,
        weight: WEIGHTS.fatigue_risk,
        weighted: fatigueResult.fatigueScore * WEIGHTS.fatigue_risk,
        detail: fatigueResult.restHours === Infinity
          ? 'No recent shifts recorded'
          : `Rest: ${fatigueResult.restHours.toFixed(1)}h | Week: ${fatigueResult.weeklyHours.toFixed(1)}h`
      },
      availability: {
        score: availability.score,
        weight: WEIGHTS.availability,
        weighted: availability.score * WEIGHTS.availability,
        detail: availability.detail
      },
      site_familiarity: {
        score: siteFamiliarity.score,
        weight: WEIGHTS.site_familiarity,
        weighted: siteFamiliarity.score * WEIGHTS.site_familiarity,
        detail: siteFamiliarity.detail
      },
      fairness: {
        score: fairness.score,
        weight: WEIGHTS.fairness,
        weighted: fairness.score * WEIGHTS.fairness,
        detail: fairness.detail
      },
      travel: {
        score: travel.score,
        weight: WEIGHTS.travel,
        weighted: travel.score * WEIGHTS.travel,
        detail: travel.detail
      },
      task_preference: {
        score: taskPreference.score,
        weight: WEIGHTS.task_preference,
        weighted: taskPreference.weighted,
        detail: taskPreference.detail,
        signals: taskPreference.signals,
        context_tags: taskPreference.context_tags
      }
    };

    const totalScore = Object.values(scoreBreakdown)
      .reduce((sum, factor) => sum + factor.weighted, 0);

    ranked.push({
      worker,
      score: Math.round(totalScore * 10) / 10,
      score_breakdown: scoreBreakdown,
      warnings: workerWarnings,
      preference_signals: taskPreference.signals
    });
  }

  ranked.sort((left, right) => right.score - left.score);
  ranked.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return { ranked, blocked };
}

module.exports = { rankWorkersForJob, WEIGHTS };
