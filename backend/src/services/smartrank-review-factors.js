'use strict';

const { randomUUID } = require('crypto');

const REVIEW_FACTOR_CATEGORIES = Object.freeze({
  credential_review: 'Credential review',
  site_specific_review: 'Site-specific review',
  client_specific_review: 'Client-specific review',
  equipment_familiarity_review: 'Equipment familiarity review',
  role_experience_review: 'Role experience review',
  supervision_required: 'Supervision required',
  fatigue_workload_review: 'Fatigue / workload review',
  recent_incident_review: 'Recent incident review',
  crew_pairing_review: 'Crew pairing review',
  training_pathway: 'Training pathway',
  worker_preference_or_request: 'Worker preference or request',
  operations_manager_review: 'Operations manager review',
  other_documented_review: 'Other documented review'
});

const REVIEW_FACTOR_SEVERITIES = Object.freeze({
  info: 'Info',
  caution: 'Caution',
  requires_review: 'Manual review required',
  hard_block: 'Hard block'
});

const APPLY_TYPES = Object.freeze({
  worker: 'Worker',
  worker_site: 'Worker and site',
  worker_client: 'Worker and client',
  worker_role: 'Worker and role',
  worker_job_context: 'Worker and job context'
});

const FORBIDDEN_TEXT_PATTERNS = [
  /\bliability\s*(ranking|score)?\b/i,
  /\bhigh\s+liability\b/i,
  /\brisk\s+worker\b/i,
  /\brisky\s+worker\b/i,
  /\bproblem\s+worker\b/i,
  /\bblacklist(?:ed)?\b/i,
  /\bunsafe\s+person\b/i,
  /\bbad\s+attitude\b/i,
  /\bdo\s+not\s+use\b/i,
  /\bpoor\s+performer\b/i,
  /\bunreliable\b/i,
  /\bundesirable\b/i,
  /\btroublemaker\b/i,
  /\bdifficult\s+worker\b/i,
  /\bavoid\s+this\s+worker\b/i,
  /\bmedical\s+clearance\b/i,
  /\bmedical_clearance_recorded\b/i,
  /\bprotected\s+attribute\b/i,
  /\brace|religion|disability|pregnan(?:t|cy)|union\s+member|political\s+belief|gender|sexuality\b/i
];

function httpError(status, message, extra = {}) {
  const error = new Error(message);
  error.status = status;
  Object.assign(error, extra);
  return error;
}

function cleanText(value) {
  const text = String(value || '').trim();
  return text || null;
}

function normalizeForMatch(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function assertSafeReviewText(payload) {
  const fields = [
    'summary',
    'notes',
    'site_name',
    'client_name',
    'role_name',
    'job_type',
    'applies_to_value'
  ];
  for (const field of fields) {
    const value = payload[field];
    if (!value) continue;
    for (const pattern of FORBIDDEN_TEXT_PATTERNS) {
      if (pattern.test(String(value))) {
        throw httpError(422, 'Review factor wording must describe placement-specific review context, not personal judgement, medical clearance, or protected attributes.', {
          field
        });
      }
    }
  }
}

function parseReviewFactorPayload(input = {}, existing = null) {
  const category = cleanText(input.category !== undefined ? input.category : existing?.category);
  const severity = cleanText(input.severity !== undefined ? input.severity : existing?.severity) || 'info';
  const workerId = cleanText(input.worker_id !== undefined ? input.worker_id : existing?.worker_id);
  const summary = cleanText(input.summary !== undefined ? input.summary : existing?.summary);
  const appliesToType = cleanText(input.applies_to_type !== undefined ? input.applies_to_type : existing?.applies_to_type) || 'worker';

  if (!workerId) throw httpError(400, 'worker_id is required for SmartRank Review Factors v1.');
  if (!category || !REVIEW_FACTOR_CATEGORIES[category]) throw httpError(400, 'Review factor category is not supported.');
  if (!REVIEW_FACTOR_SEVERITIES[severity]) throw httpError(400, 'Review factor severity is not supported.');
  if (!summary) throw httpError(400, 'Review factor summary is required.');
  if (!APPLY_TYPES[appliesToType]) throw httpError(400, 'Review factor application type is not supported.');
  if (category === 'medical_clearance_recorded') throw httpError(400, 'Medical clearance review factors are not supported in v1.');
  if (severity === 'hard_block' && category !== 'credential_review') {
    throw httpError(422, 'Hard block review factors are limited to objective credential review in v1.');
  }

  const payload = {
    worker_id: workerId,
    category,
    severity,
    summary,
    notes: cleanText(input.notes !== undefined ? input.notes : existing?.notes),
    site_name: cleanText(input.site_name !== undefined ? input.site_name : existing?.site_name),
    client_name: cleanText(input.client_name !== undefined ? input.client_name : existing?.client_name),
    role_name: cleanText(input.role_name !== undefined ? input.role_name : existing?.role_name),
    job_type: cleanText(input.job_type !== undefined ? input.job_type : existing?.job_type),
    applies_to_type: appliesToType,
    applies_to_value: cleanText(input.applies_to_value !== undefined ? input.applies_to_value : existing?.applies_to_value),
    review_date: cleanText(input.review_date !== undefined ? input.review_date : existing?.review_date),
    expires_at: cleanText(input.expires_at !== undefined ? input.expires_at : existing?.expires_at)
  };
  assertSafeReviewText(payload);
  return payload;
}

function requireBoundaryConfirmation(input = {}) {
  if (input.confirm_review_boundary !== true) {
    throw httpError(400, 'Confirm this is placement-specific decision-support and not a personal, compliance, safety, or medical judgement.');
  }
}

function ensureWorkerInCompany(db, companyId, workerId) {
  const worker = db.prepare(`
    SELECT id, name, company_id
    FROM workers
    WHERE id = ? AND company_id = ? AND archived_at IS NULL
  `).get(workerId, companyId);
  if (!worker) throw httpError(404, 'Worker not found in this tenant.');
  return worker;
}

function serializeReviewFactor(row) {
  if (!row) return null;
  return {
    ...row,
    active: Boolean(row.active),
    category_label: REVIEW_FACTOR_CATEGORIES[row.category] || row.category,
    severity_label: REVIEW_FACTOR_SEVERITIES[row.severity] || row.severity,
    applies_to_label: APPLY_TYPES[row.applies_to_type] || row.applies_to_type
  };
}

function listReviewFactors(db, companyId, options = {}) {
  const where = ['f.company_id = ?'];
  const params = [companyId];
  if (!options.includeInactive) where.push('f.active = 1');
  if (options.workerId) {
    where.push('f.worker_id = ?');
    params.push(options.workerId);
  }

  return db.prepare(`
    SELECT
      f.*,
      w.name AS worker_name
    FROM smart_rank_review_factors f
    JOIN workers w ON w.id = f.worker_id AND w.company_id = f.company_id
    WHERE ${where.join(' AND ')}
    ORDER BY f.active DESC, f.updated_at DESC, f.created_at DESC
  `).all(...params).map(serializeReviewFactor);
}

function getReviewFactor(db, companyId, id) {
  return serializeReviewFactor(db.prepare(`
    SELECT
      f.*,
      w.name AS worker_name
    FROM smart_rank_review_factors f
    JOIN workers w ON w.id = f.worker_id AND w.company_id = f.company_id
    WHERE f.company_id = ? AND f.id = ?
  `).get(companyId, id));
}

function createReviewFactor(db, companyId, userId, input = {}) {
  requireBoundaryConfirmation(input);
  const payload = parseReviewFactorPayload(input);
  ensureWorkerInCompany(db, companyId, payload.worker_id);
  const id = randomUUID();
  db.prepare(`
    INSERT INTO smart_rank_review_factors (
      id, company_id, worker_id, category, severity, summary, notes,
      site_name, client_name, role_name, job_type, applies_to_type, applies_to_value,
      review_date, expires_at, active, created_by_user_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'), datetime('now'))
  `).run(
    id,
    companyId,
    payload.worker_id,
    payload.category,
    payload.severity,
    payload.summary,
    payload.notes,
    payload.site_name,
    payload.client_name,
    payload.role_name,
    payload.job_type,
    payload.applies_to_type,
    payload.applies_to_value,
    payload.review_date,
    payload.expires_at,
    userId
  );
  return getReviewFactor(db, companyId, id);
}

function updateReviewFactor(db, companyId, id, input = {}) {
  requireBoundaryConfirmation(input);
  const existing = getReviewFactor(db, companyId, id);
  if (!existing) return null;
  const payload = parseReviewFactorPayload(input, existing);
  ensureWorkerInCompany(db, companyId, payload.worker_id);
  db.prepare(`
    UPDATE smart_rank_review_factors
    SET
      worker_id = ?,
      category = ?,
      severity = ?,
      summary = ?,
      notes = ?,
      site_name = ?,
      client_name = ?,
      role_name = ?,
      job_type = ?,
      applies_to_type = ?,
      applies_to_value = ?,
      review_date = ?,
      expires_at = ?,
      updated_at = datetime('now')
    WHERE id = ? AND company_id = ?
  `).run(
    payload.worker_id,
    payload.category,
    payload.severity,
    payload.summary,
    payload.notes,
    payload.site_name,
    payload.client_name,
    payload.role_name,
    payload.job_type,
    payload.applies_to_type,
    payload.applies_to_value,
    payload.review_date,
    payload.expires_at,
    id,
    companyId
  );
  return getReviewFactor(db, companyId, id);
}

function archiveReviewFactor(db, companyId, id, userId) {
  const existing = getReviewFactor(db, companyId, id);
  if (!existing) return null;
  db.prepare(`
    UPDATE smart_rank_review_factors
    SET active = 0, archived_by_user_id = ?, archived_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ? AND company_id = ?
  `).run(userId, id, companyId);
  return getReviewFactor(db, companyId, id);
}

function listActiveReviewFactorsForSmartRank(db, companyId) {
  return db.prepare(`
    SELECT
      f.*,
      w.name AS worker_name
    FROM smart_rank_review_factors f
    JOIN workers w ON w.id = f.worker_id AND w.company_id = f.company_id
    WHERE f.company_id = ? AND f.active = 1 AND w.archived_at IS NULL
  `).all(companyId).map(serializeReviewFactor);
}

function factorStillCurrent(factor, now = new Date()) {
  if (!factor.expires_at) return true;
  const expiry = new Date(factor.expires_at);
  if (Number.isNaN(expiry.getTime())) return true;
  return expiry >= now;
}

function contextMatches(factor, job, worker) {
  if (factor.site_name && normalizeForMatch(factor.site_name) !== normalizeForMatch(job.site_name)) return false;
  if (factor.client_name && normalizeForMatch(factor.client_name) !== normalizeForMatch(job.client_name)) return false;

  if (factor.role_name) {
    const roleNeedle = normalizeForMatch(factor.role_name);
    const workerRoles = Array.isArray(worker.roles) ? worker.roles : [];
    const jobRoles = Array.isArray(job.crew_roles_required) ? job.crew_roles_required : [];
    const searchableRoles = [worker.role, ...workerRoles, ...jobRoles].map(normalizeForMatch);
    if (!searchableRoles.includes(roleNeedle)) return false;
  }

  if (factor.job_type) {
    const needle = normalizeForMatch(factor.job_type);
    const jobContext = [
      ...(Array.isArray(job.task_tags) ? job.task_tags : []),
      job.shift_type,
      job.lift_risk_level,
      job.crane_class_required,
      ...(Array.isArray(job.crane_classes_required) ? job.crane_classes_required : [])
    ].map(normalizeForMatch);
    if (!jobContext.includes(needle)) return false;
  }

  return true;
}

function buildReviewFactorMapForJob(job, workers, reviewFactors, options = {}) {
  const now = options.now || new Date();
  const map = {};
  const workerById = new Map((workers || []).map((worker) => [worker.id, worker]));
  for (const factor of reviewFactors || []) {
    const worker = workerById.get(factor.worker_id);
    if (!worker) continue;
    if (!factorStillCurrent(factor, now)) continue;
    if (!contextMatches(factor, job, worker)) continue;
    (map[factor.worker_id] = map[factor.worker_id] || []).push(factor);
  }
  return map;
}

module.exports = {
  APPLY_TYPES,
  REVIEW_FACTOR_CATEGORIES,
  REVIEW_FACTOR_SEVERITIES,
  archiveReviewFactor,
  buildReviewFactorMapForJob,
  createReviewFactor,
  getReviewFactor,
  listActiveReviewFactorsForSmartRank,
  listReviewFactors,
  updateReviewFactor
};
