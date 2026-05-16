'use strict';

const { randomUUID } = require('crypto');
const {
  credentialDisplayLabel,
  credentialMatchesRequirement,
  formatDisplayLabel,
  normalizeCredentialType,
  normalizeWorkerRole,
  normalizeWorkerRoles,
  workerRoleLabel
} = require('./intake-catalogues');

const COMPATIBLE = 'compatible';
const REVIEW_REQUIRED = 'review_required';
const DISCOURAGED = 'discouraged';
const DISALLOWED = 'disallowed';

const ROLE_CREDENTIAL_ALTERNATIVES = {
  crane_operator: [
    ['high_risk_licence_crane'],
    ['hrwl_c0'],
    ['hrwl_c1'],
    ['hrwl_c2'],
    ['hrwl_c6'],
    ['hrwl_cn'],
    ['hrwl_cb'],
    ['hrwl_cd'],
    ['hrwl_cp'],
    ['hrwl_cv']
  ],
  dogman: [
    ['hrwl_dg'],
    ['high_risk_licence_dogging']
  ],
  rigger: [
    ['hrwl_rb'],
    ['hrwl_ri'],
    ['hrwl_ra'],
    ['high_risk_licence_rigging']
  ],
  truck_driver: [
    ['heavy_vehicle_mc'],
    ['heavy_vehicle_hc'],
    ['heavy_vehicle_hr'],
    ['drivers_licence']
  ],
  electrical_spotter: [
    ['electrical_spotter']
  ],
  ewp_operator: [
    ['hrwl_wp'],
    ['voc_wp']
  ],
  forklift_operator: [
    ['hrwl_lf'],
    ['machinery_forklift']
  ]
};

const DEFAULT_ROLE_COMPATIBILITY_RULES = [
  ['dogman', 'rigger', COMPATIBLE, 'Dogman and rigger duties are commonly planned together when the worker is competent and credentialed.'],
  ['dogman', 'truck_driver', COMPATIBLE, 'Dogman and truck driver can be combined when the job timing and site procedure allow it.'],
  ['rigger', 'truck_driver', COMPATIBLE, 'Rigger and truck driver can be combined when the worker is credentialed and duties do not conflict.'],
  ['dogman', 'electrical_spotter', REVIEW_REQUIRED, 'Electrical spotting combined with dogging needs dispatcher review against site procedure.'],
  ['rigger', 'electrical_spotter', REVIEW_REQUIRED, 'Electrical spotting combined with rigging needs dispatcher review against site procedure.'],
  ['dogman', 'ewp_operator', REVIEW_REQUIRED, 'Dogman and EWP operation can overlap only if job timing, plant use, and credentials support it.'],
  ['rigger', 'ewp_operator', REVIEW_REQUIRED, 'Rigger and EWP operation can overlap only if job timing, plant use, and credentials support it.'],
  ['truck_driver', 'ewp_operator', REVIEW_REQUIRED, 'Truck driver and EWP operation require review because transport and site duties may conflict.'],
  ['lift_supervisor', 'rigger', REVIEW_REQUIRED, 'Lift supervisor combined with rigging requires review because supervision independence may matter.'],
  ['lift_supervisor', 'truck_driver', REVIEW_REQUIRED, 'Lift supervisor combined with truck driving requires review of timing and supervision needs.'],
  ['lift_supervisor', 'dogman', REVIEW_REQUIRED, 'Lift supervisor combined with dogging requires review of role independence and site needs.'],
  ['crane_operator', 'dogman', DISCOURAGED, 'Crane operator combined with dogman is high-review and should not be silently collapsed.'],
  ['crane_operator', 'rigger', DISCOURAGED, 'Crane operator combined with rigger is high-review and should not be silently collapsed.'],
  ['crane_operator', 'electrical_spotter', DISCOURAGED, 'Crane operator combined with electrical spotter is high-review and should not be silently collapsed.'],
  ['crane_operator', 'lift_supervisor', DISCOURAGED, 'Crane operator combined with lift supervisor is high-review and should not be silently collapsed.'],
  ['lift_supervisor', 'electrical_spotter', DISCOURAGED, 'Lift supervisor combined with electrical spotter needs strong review of supervision and observation duties.']
].map(([roleA, roleB, compatibilityStatus, reason]) => ({
  role_a: roleA,
  role_b: roleB,
  compatibility_status: compatibilityStatus,
  reason,
  requires_credentials_json: '[]'
}));

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(value)
      .split(/[|,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function pairKey(roleA, roleB) {
  return [roleA, roleB].sort().join('::');
}

function bool(value) {
  return value === true || value === 1 || value === '1' || value === 'true' || value === 'on';
}

function clampCount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.min(20, Math.floor(parsed)));
}

function normalizeRoleRequirements(value, fallbackRoles = []) {
  const items = parseJsonArray(value);
  const normalized = [];

  for (const item of items) {
    const role = typeof item === 'string'
      ? normalizeWorkerRole(item)
      : normalizeWorkerRole(item.role_key || item.role || item.value || item.label);
    if (!role) continue;
    normalized.push({
      role_key: role,
      role_label: workerRoleLabel(role),
      required_count: clampCount(typeof item === 'string' ? 1 : item.required_count),
      requires_distinct_worker: bool(typeof item === 'string' ? false : item.requires_distinct_worker),
      notes: typeof item === 'string' ? null : (String(item.notes || '').trim() || null)
    });
  }

  for (const role of normalizeWorkerRoles(fallbackRoles)) {
    if (normalized.some((item) => item.role_key === role)) continue;
    normalized.push({
      role_key: role,
      role_label: workerRoleLabel(role),
      required_count: 1,
      requires_distinct_worker: false,
      notes: null
    });
  }

  return normalized;
}

function buildRuleMap(rules = DEFAULT_ROLE_COMPATIBILITY_RULES) {
  const map = new Map();
  for (const rule of rules || []) {
    const roleA = normalizeWorkerRole(rule.role_a);
    const roleB = normalizeWorkerRole(rule.role_b);
    if (!roleA || !roleB || roleA === roleB) continue;
    map.set(pairKey(roleA, roleB), {
      role_a: roleA,
      role_b: roleB,
      compatibility_status: rule.compatibility_status || REVIEW_REQUIRED,
      reason: rule.reason || 'Role combination requires dispatcher review.',
      requires_credentials_json: rule.requires_credentials_json || '[]'
    });
  }
  return map;
}

function ruleForPair(roleA, roleB, rules) {
  if (roleA === roleB) return { compatibility_status: COMPATIBLE, reason: 'Same role.' };
  const map = buildRuleMap(rules);
  return map.get(pairKey(roleA, roleB)) || {
    role_a: roleA,
    role_b: roleB,
    compatibility_status: REVIEW_REQUIRED,
    reason: 'Role combination is not in the default compatibility rules. Confirm company, site, and client suitability.'
  };
}

function normalizeCredentialList(credentials = []) {
  return (credentials || [])
    .map((credential) => normalizeCredentialType(credential.type || credential))
    .filter(Boolean);
}

function hasCredentialAlternative(workerCredentialTypes, alternative = []) {
  return alternative.every((required) =>
    workerCredentialTypes.some((workerType) => credentialMatchesRequirement(workerType, required))
  );
}

function roleCredentialStatus(role, credentials = []) {
  const alternatives = ROLE_CREDENTIAL_ALTERNATIVES[role] || [];
  if (alternatives.length === 0) {
    return { satisfied: true, required: [] };
  }

  const workerCredentialTypes = normalizeCredentialList(credentials);
  const satisfied = alternatives.some((alternative) => hasCredentialAlternative(workerCredentialTypes, alternative));
  return {
    satisfied,
    required: alternatives.map((alternative) => alternative.map(credentialDisplayLabel).join(' + '))
  };
}

function workerCanCoverRole(worker, role, credentials = []) {
  const workerRoles = normalizeWorkerRoles(worker.roles || worker.role);
  const credentialStatus = roleCredentialStatus(role, credentials);
  const roleKnown = workerRoles.includes(role);

  if (role === 'electrical_spotter' && credentialStatus.satisfied) {
    return { canCover: true, credentialStatus, roleKnown };
  }

  if (!roleKnown) {
    return { canCover: false, credentialStatus, roleKnown, reason: `Worker role profile does not include ${workerRoleLabel(role)}.` };
  }

  if (!credentialStatus.satisfied) {
    return {
      canCover: false,
      credentialStatus,
      roleKnown,
      reason: `Required role credential not recorded for ${workerRoleLabel(role)} (${credentialStatus.required.join(' or ')}).`
    };
  }

  return { canCover: true, credentialStatus, roleKnown };
}

function evaluateWorkerRoleCoverage(worker, job, credentials = [], options = {}) {
  const requirements = normalizeRoleRequirements(job.role_requirements, job.crew_roles_required);
  const requirementByRole = new Map(requirements.map((requirement) => [requirement.role_key, requirement]));
  const roleCompatibilityRules = options.roleCompatibilityRules || DEFAULT_ROLE_COMPATIBILITY_RULES;
  const warnings = [];
  const missingRoles = [];
  const selected = [];

  for (const requirement of requirements) {
    const capability = workerCanCoverRole(worker, requirement.role_key, credentials);
    if (!capability.canCover) {
      missingRoles.push({
        role_key: requirement.role_key,
        role_label: requirement.role_label,
        reason: capability.reason || `Worker cannot cover ${requirement.role_label}.`
      });
      continue;
    }

    const disallowed = selected.find((role) =>
      ruleForPair(role, requirement.role_key, roleCompatibilityRules).compatibility_status === DISALLOWED
    );
    if (disallowed) {
      missingRoles.push({
        role_key: requirement.role_key,
        role_label: requirement.role_label,
        reason: `${requirement.role_label} is disallowed with ${workerRoleLabel(disallowed)} by role compatibility rules.`
      });
      continue;
    }

    const selectedDistinctRole = selected.find((role) => requirementByRole.get(role)?.requires_distinct_worker);
    if (selectedDistinctRole) {
      missingRoles.push({
        role_key: requirement.role_key,
        role_label: requirement.role_label,
        reason: `${workerRoleLabel(selectedDistinctRole)} is marked as a separate-worker role for this job.`
      });
      continue;
    }

    if (requirement.requires_distinct_worker && selected.length > 0) {
      missingRoles.push({
        role_key: requirement.role_key,
        role_label: requirement.role_label,
        reason: `${requirement.role_label} is marked as a separate-worker role for this job.`
      });
      continue;
    }

    selected.push(requirement.role_key);
  }

  if (selected.length > 1) {
    warnings.push({
      type: 'multi_role_coverage_review',
      detail: `Worker covers multiple required roles: ${selected.map(workerRoleLabel).join(' / ')}. Dispatcher must confirm job, site, client, and company suitability.`
    });

    for (let left = 0; left < selected.length; left += 1) {
      for (let right = left + 1; right < selected.length; right += 1) {
        const rule = ruleForPair(selected[left], selected[right], roleCompatibilityRules);
        if ([REVIEW_REQUIRED, DISCOURAGED].includes(rule.compatibility_status)) {
          warnings.push({
            type: rule.compatibility_status === DISCOURAGED ? 'role_combination_discouraged' : 'role_combination_review_required',
            roles: [selected[left], selected[right]],
            detail: `${workerRoleLabel(selected[left])} + ${workerRoleLabel(selected[right])}: ${rule.reason}`
          });
        }
      }
    }
  }

  return {
    suggested_roles: selected,
    suggested_role_labels: selected.map(workerRoleLabel),
    can_cover_required_role: selected.length > 0 || requirements.length === 0,
    review_required: warnings.length > 0,
    warnings,
    missing_roles: missingRoles,
    requirement_count: requirements.reduce((sum, item) => sum + item.required_count, 0)
  };
}

function expandRoleSlots(requirements = []) {
  const slots = [];
  for (const requirement of requirements) {
    for (let index = 1; index <= requirement.required_count; index += 1) {
      slots.push({
        role_key: requirement.role_key,
        role_label: requirement.role_label,
        slot_number: index,
        requires_distinct_worker: requirement.requires_distinct_worker
      });
    }
  }
  return slots;
}

function buildRoleCoveragePlan(ranked = [], job = {}) {
  const requirements = normalizeRoleRequirements(job.role_requirements, job.crew_roles_required);
  const slots = expandRoleSlots(requirements);
  const remainingByRole = new Map();
  for (const slot of slots) {
    remainingByRole.set(slot.role_key, (remainingByRole.get(slot.role_key) || 0) + 1);
  }

  const assignments = [];
  for (const entry of ranked || []) {
    const covered = [];
    for (const role of entry.role_coverage?.suggested_roles || []) {
      if ((remainingByRole.get(role) || 0) <= 0) continue;
      covered.push(role);
      remainingByRole.set(role, remainingByRole.get(role) - 1);
    }
    if (covered.length === 0) continue;
    assignments.push({
      worker_id: entry.worker.id,
      worker_name: entry.worker.name,
      roles_covered: covered,
      role_labels: covered.map(workerRoleLabel),
      review_required: covered.length > 1 || Boolean(entry.role_coverage?.review_required),
      review_reasons: (entry.role_coverage?.warnings || []).map((warning) => warning.detail)
    });
    if (Array.from(remainingByRole.values()).every((count) => count <= 0)) break;
  }

  const unfilled_roles = Array.from(remainingByRole.entries())
    .filter(([, count]) => count > 0)
    .map(([role, count]) => ({
      role_key: role,
      role_label: workerRoleLabel(role),
      remaining_count: count
    }));

  return {
    requirements,
    conservative_headcount: slots.length,
    suggested_minimum_headcount: assignments.length,
    assignments,
    unfilled_roles,
    review_required: assignments.some((assignment) => assignment.review_required),
    boundary: 'Role coverage is decision support only. Dispatcher confirmation is required before combined-role allocation is used.'
  };
}

function validateRequestedRoleCoverage(worker, job, credentials, requestedRoles, options = {}) {
  const normalized = normalizeWorkerRoles(requestedRoles);
  if (normalized.length === 0) {
    return evaluateWorkerRoleCoverage(worker, job, credentials, options);
  }

  const coverage = evaluateWorkerRoleCoverage(worker, job, credentials, options);
  const allowed = new Set(coverage.suggested_roles);
  const invalid = normalized.filter((role) => !allowed.has(role));
  if (invalid.length > 0) {
    const error = new Error(`Worker cannot cover selected role(s): ${invalid.map(workerRoleLabel).join(', ')}`);
    error.status = 422;
    error.invalid_roles = invalid;
    throw error;
  }

  const allRequirements = normalizeRoleRequirements(job.role_requirements, job.crew_roles_required);
  const scopedJob = {
    ...job,
    crew_roles_required: normalized,
    role_requirements: normalized.map((role) => {
      const existing = allRequirements.find((requirement) => requirement.role_key === role);
      return {
        ...(existing || { role_key: role }),
        required_count: 1
      };
    })
  };
  return evaluateWorkerRoleCoverage(worker, scopedJob, credentials, options);
}

function insertAllocationRoleCoverages(db, { companyId, jobId, allocationId, workerId, roles, source, reviewRequired, reviewReason }) {
  const normalized = normalizeWorkerRoles(roles);
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO allocation_role_coverages (
      id, company_id, job_id, allocation_id, worker_id, role_key, source,
      review_required, review_reason, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const role of normalized) {
    stmt.run(
      randomUUID(),
      companyId,
      jobId,
      allocationId,
      workerId,
      role,
      source || 'dispatcher_confirmed',
      reviewRequired ? 1 : 0,
      reviewReason || null,
      now
    );
  }
  return normalized;
}

function listAllocationRoleCoverages(db, { companyId, jobId, allocationId }) {
  let sql = `
    SELECT *
    FROM allocation_role_coverages
    WHERE company_id = ? AND job_id = ?
  `;
  const params = [companyId, jobId];
  if (allocationId) {
    sql += ` AND allocation_id = ?`;
    params.push(allocationId);
  }
  sql += ` ORDER BY created_at ASC, role_key ASC`;
  return db.prepare(sql).all(...params).map((row) => ({
    ...row,
    role_label: workerRoleLabel(row.role_key),
    review_required: Boolean(row.review_required)
  }));
}

function seedRoleCompatibilityRules(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS role_compatibility_rules (
      id                         INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id                 TEXT REFERENCES companies(id),
      role_a                     TEXT NOT NULL,
      role_b                     TEXT NOT NULL,
      compatibility_status       TEXT NOT NULL
                                   CHECK (compatibility_status IN ('compatible', 'review_required', 'discouraged', 'disallowed')),
      reason                     TEXT,
      requires_credentials_json  TEXT NOT NULL DEFAULT '[]',
      is_active                  INTEGER NOT NULL DEFAULT 1,
      created_at                 TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at                 TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(company_id, role_a, role_b)
    );
  `);

  const existingRule = db.prepare(`
    SELECT id
    FROM role_compatibility_rules
    WHERE company_id IS NULL AND role_a = ? AND role_b = ?
  `);
  const stmt = db.prepare(`
    INSERT INTO role_compatibility_rules (
      company_id, role_a, role_b, compatibility_status, reason, requires_credentials_json
    ) VALUES (NULL, ?, ?, ?, ?, ?)
  `);
  for (const rule of DEFAULT_ROLE_COMPATIBILITY_RULES) {
    if (existingRule.get(rule.role_a, rule.role_b)) continue;
    stmt.run(rule.role_a, rule.role_b, rule.compatibility_status, rule.reason, rule.requires_credentials_json);
  }
}

function listRoleCompatibilityRules(db, companyId) {
  const rows = db.prepare(`
    SELECT *
    FROM role_compatibility_rules
    WHERE is_active = 1 AND (company_id IS NULL OR company_id = ?)
    ORDER BY CASE WHEN company_id IS NULL THEN 0 ELSE 1 END ASC, role_a ASC, role_b ASC
  `).all(companyId);

  const deduped = new Map();
  for (const row of rows) {
    deduped.set(pairKey(row.role_a, row.role_b), row);
  }
  return Array.from(deduped.values());
}

module.exports = {
  COMPATIBLE,
  DEFAULT_ROLE_COMPATIBILITY_RULES,
  DISALLOWED,
  DISCOURAGED,
  REVIEW_REQUIRED,
  buildRoleCoveragePlan,
  evaluateWorkerRoleCoverage,
  insertAllocationRoleCoverages,
  listAllocationRoleCoverages,
  listRoleCompatibilityRules,
  normalizeRoleRequirements,
  seedRoleCompatibilityRules,
  validateRequestedRoleCoverage,
  workerCanCoverRole,
  workerRoleLabel
};
