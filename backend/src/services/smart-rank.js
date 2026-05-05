'use strict';

const { computeCredentialStatus } = require('./credential-gate');
const { computeFatigueStatus } = require('./fatigue-guard');

const WEIGHTS = {
  credential_match: 0.25,
  crane_experience: 0.20,
  fatigue_risk:     0.20,
  availability:     0.15,
  site_familiarity: 0.10,
  fairness:         0.05,
  travel:           0.05
};

// ─── Availability ─────────────────────────────────────────────────────────────

function evalAvailability(worker) {
  switch (worker.status) {
    case 'available':
      return { hardBlocked: false, score: 100, detail: 'Available' };
    case 'allocated':
      return {
        hardBlocked: false, score: 50, isWarning: true,
        detail: 'Currently allocated to another job — confirm availability before dispatch'
      };
    case 'unavailable':
      return { hardBlocked: true, detail: 'Marked as unavailable' };
    case 'on_leave':
      return { hardBlocked: true, detail: 'On leave' };
    case 'inactive':
      return { hardBlocked: true, detail: 'Inactive — not deployable' };
    default:
      return { hardBlocked: true, detail: `Unknown status: ${worker.status}` };
  }
}

// ─── Crane experience ─────────────────────────────────────────────────────────

function evalCraneExperience(worker, job) {
  if (!job.crane_class_required) {
    return { score: 100, detail: 'No specific crane class required' };
  }

  const craneClasses = Array.isArray(worker.crane_classes)
    ? worker.crane_classes
    : JSON.parse(worker.crane_classes || '[]');

  if (craneClasses.includes(job.crane_class_required)) {
    return { score: 100, detail: `Experienced on ${job.crane_class_required}` };
  }

  if (worker.role === 'crane_operator' && craneClasses.length > 0) {
    return {
      score: 50,
      detail: `Crane operator — no ${job.crane_class_required} class recorded (has: ${craneClasses.join(', ')})`
    };
  }

  if (worker.role === 'crane_operator') {
    return { score: 30, detail: 'Crane operator — no crane class experience recorded' };
  }

  return { score: 20, detail: `Role (${worker.role}) — crane class match may not apply` };
}

// ─── Site/client familiarity ──────────────────────────────────────────────────

function evalSiteFamiliarity(worker, job, recentAllocations) {
  const pastSites   = recentAllocations.map(a => a.site_name).filter(Boolean);
  const pastClients = recentAllocations.map(a => a.client_name).filter(Boolean);

  if (pastSites.includes(job.site_name)) {
    return { score: 100, detail: `Previously worked at ${job.site_name}` };
  }
  if (pastClients.includes(job.client_name)) {
    return { score: 80, detail: `Previously worked for ${job.client_name}` };
  }
  return { score: 50, detail: 'No previous allocations to this site or client' };
}

// ─── Fairness / load balance ──────────────────────────────────────────────────

function evalFairness(recentAllocations7d) {
  const n = recentAllocations7d.length;
  if (n === 0) return { score: 100, detail: 'No allocations in last 7 days' };
  if (n === 1) return { score: 85,  detail: '1 allocation in last 7 days' };
  if (n === 2) return { score: 70,  detail: '2 allocations in last 7 days' };
  if (n === 3) return { score: 55,  detail: '3 allocations in last 7 days' };
  return { score: 40, detail: `${n} allocations in last 7 days — high load` };
}

// ─── Travel burden ────────────────────────────────────────────────────────────

function evalTravel(worker, job) {
  if (!job.travel_required) {
    return { score: 100, detail: 'No travel required' };
  }
  if (
    worker.usual_depot && job.site_location &&
    worker.usual_depot.toLowerCase().trim() === job.site_location.toLowerCase().trim()
  ) {
    return { score: 90, detail: 'Worker depot matches job site' };
  }
  return { score: 60, detail: 'Travel required — worker is not local to site' };
}

// ─── Main ranking function ────────────────────────────────────────────────────

/**
 * Ranks all eligible workers for a job.
 *
 * @param {object[]} workers           All non-inactive workers for the company
 * @param {object}   job               Job record (required_credentials already parsed to array)
 * @param {object}   credsByWorker     Map<worker_id, Credential[]>
 * @param {object}   fatigueByWorker   Map<worker_id, FatigueRecord[]>
 * @param {object}   allocsByWorker    Map<worker_id, Allocation[]> (joined with job site/client)
 * @param {object}   options
 * @param {Date}     options.now       Injectable for testing
 *
 * @returns {{ ranked: object[], blocked: object[] }}
 */
function rankWorkersForJob(workers, job, credsByWorker, fatigueByWorker, allocsByWorker, options = {}) {
  const { now = new Date() } = options;

  const requiredCredentials = Array.isArray(job.required_credentials)
    ? job.required_credentials
    : JSON.parse(job.required_credentials || '[]');

  const now90dAgo = new Date(now); now90dAgo.setDate(now90dAgo.getDate() - 90);
  const now7dAgo  = new Date(now); now7dAgo.setDate(now7dAgo.getDate() - 7);

  const ranked  = [];
  const blocked = [];

  for (const worker of workers) {
    const workerBlocks   = [];
    const workerWarnings = [];

    // ── 1. Availability ──
    const avail = evalAvailability(worker);
    if (avail.hardBlocked) {
      workerBlocks.push({ type: 'availability', detail: avail.detail });
      blocked.push({ worker, blocks: workerBlocks, warnings: [] });
      continue;
    }
    if (avail.isWarning) {
      workerWarnings.push({ type: 'availability_warning', detail: avail.detail });
    }

    // ── 2. CredentialGate ──
    const credentials = credsByWorker[worker.id] || [];
    const credResult = computeCredentialStatus(credentials, requiredCredentials, now);
    if (credResult.hardBlocked) {
      workerBlocks.push(...credResult.blocks);
      blocked.push({ worker, blocks: workerBlocks, warnings: credResult.warnings });
      continue;
    }
    workerWarnings.push(...credResult.warnings);

    // ── 3. FatigueGuard ──
    const fatigueRecords = fatigueByWorker[worker.id] || [];
    const fatigueResult = computeFatigueStatus(
      fatigueRecords, job.date, job.shift_type,
      { shiftStartTime: job.shift_start_time, now }
    );
    if (fatigueResult.hardBlocked) {
      workerBlocks.push(...fatigueResult.blocks);
      blocked.push({ worker, blocks: workerBlocks, warnings: fatigueResult.warnings });
      continue;
    }
    workerWarnings.push(...fatigueResult.warnings);

    // ── 4. Score factors ──
    const allAllocs  = allocsByWorker[worker.id] || [];
    const allocs90d  = allAllocs.filter(a => new Date(a.allocated_at) >= now90dAgo);
    const allocs7d   = allAllocs.filter(a => new Date(a.allocated_at) >= now7dAgo);

    const craneExp       = evalCraneExperience(worker, job);
    const siteFamiliarity = evalSiteFamiliarity(worker, job, allocs90d);
    const fairness       = evalFairness(allocs7d);
    const travel         = evalTravel(worker, job);

    const scoreBreakdown = {
      credential_match: {
        score:    credResult.credentialScore,
        weight:   WEIGHTS.credential_match,
        weighted: credResult.credentialScore * WEIGHTS.credential_match,
        detail:   credResult.warnings.length > 0
          ? 'Credentials valid but some expiring soon'
          : (requiredCredentials.length === 0 ? 'No credentials required' : 'All required credentials valid')
      },
      crane_experience: {
        score:    craneExp.score,
        weight:   WEIGHTS.crane_experience,
        weighted: craneExp.score * WEIGHTS.crane_experience,
        detail:   craneExp.detail
      },
      fatigue_risk: {
        score:    fatigueResult.fatigueScore,
        weight:   WEIGHTS.fatigue_risk,
        weighted: fatigueResult.fatigueScore * WEIGHTS.fatigue_risk,
        detail:   fatigueResult.restHours === Infinity
          ? 'No recent shifts recorded'
          : `Rest: ${fatigueResult.restHours.toFixed(1)}h | Week: ${fatigueResult.weeklyHours.toFixed(1)}h`
      },
      availability: {
        score:    avail.score,
        weight:   WEIGHTS.availability,
        weighted: avail.score * WEIGHTS.availability,
        detail:   avail.detail
      },
      site_familiarity: {
        score:    siteFamiliarity.score,
        weight:   WEIGHTS.site_familiarity,
        weighted: siteFamiliarity.score * WEIGHTS.site_familiarity,
        detail:   siteFamiliarity.detail
      },
      fairness: {
        score:    fairness.score,
        weight:   WEIGHTS.fairness,
        weighted: fairness.score * WEIGHTS.fairness,
        detail:   fairness.detail
      },
      travel: {
        score:    travel.score,
        weight:   WEIGHTS.travel,
        weighted: travel.score * WEIGHTS.travel,
        detail:   travel.detail
      }
    };

    const totalScore = Object.values(scoreBreakdown)
      .reduce((sum, f) => sum + f.weighted, 0);

    ranked.push({
      worker,
      score:           Math.round(totalScore * 10) / 10,
      score_breakdown: scoreBreakdown,
      warnings:        workerWarnings
    });
  }

  ranked.sort((a, b) => b.score - a.score);
  ranked.forEach((r, i) => { r.rank = i + 1; });

  return { ranked, blocked };
}

module.exports = { rankWorkersForJob, WEIGHTS };
