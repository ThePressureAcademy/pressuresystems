'use strict';

const { randomUUID } = require('crypto');
const { appendAuditEvent } = require('./audit');
const { evaluateRouteCheckRequirement } = require('./routecheck-rules');
const { routeCheckSettings } = require('./routecheck-config');

const ROUTE_CHECK_STATUSES = [
  'not_required',
  'required',
  'not_checked',
  'opened_in_routing_tool',
  'checked',
  'issue_flagged',
  'permit_required',
  'approved_for_dispatch',
  'sent_to_operator',
  'operator_acknowledged',
  'blocked'
];

const PERMIT_STATUSES = ['unknown', 'not_required', 'required', 'confirmed'];
const NOTE_TYPES = ['route', 'permit', 'site_access', 'hazard', 'operator_feedback', 'management', 'override'];
const ACK_STATUSES = ['confirmed', 'issue_found', 'need_call', 'not_acknowledged'];

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function nowIso() {
  return new Date().toISOString();
}

function trimText(value) {
  const normalized = String(value || '').trim();
  return normalized ? normalized : null;
}

function parseInteger(value) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function roleCanEdit(user) {
  return ['admin', 'dispatcher'].includes(user?.role);
}

function roleCanOverride(user) {
  return user?.role === 'admin';
}

function roleCanAcknowledge(user) {
  return ['admin', 'dispatcher', 'supervisor'].includes(user?.role);
}

function assertCanEdit(user) {
  if (!roleCanEdit(user)) throw httpError(403, 'RouteCheck edit access requires admin or dispatcher access.');
}

function assertCanOverride(user) {
  if (!roleCanOverride(user)) throw httpError(403, 'RouteCheck override requires admin access.');
}

function assertCanAcknowledge(user) {
  if (!roleCanAcknowledge(user)) throw httpError(403, 'RouteCheck acknowledgement requires admin, dispatcher, or supervisor access.');
}

function getJob(db, companyId, jobId) {
  return db.prepare(`SELECT * FROM jobs WHERE id = ? AND company_id = ? AND archived_at IS NULL`).get(jobId, companyId);
}

function getAsset(db, companyId, assetId) {
  if (!assetId) return null;
  return db.prepare(`
    SELECT
      ca.*,
      rci.category AS catalogue_category,
      rci.group_label AS catalogue_group_label,
      rci.label AS catalogue_label,
      rci.normalized_key AS catalogue_normalized_key,
      vp.width_m,
      vp.height_m,
      vp.length_m,
      vp.gross_weight_kg,
      vp.axle_config,
      vp.vehicle_class,
      vp.permit_category,
      vp.default_route_check_required AS profile_default_route_check_required
    FROM company_assets ca
    JOIN requirement_catalogue_items rci ON rci.id = ca.catalogue_item_id
    LEFT JOIN vehicle_profiles vp ON vp.asset_id = ca.id AND vp.company_id = ca.company_id
    WHERE ca.id = ? AND ca.company_id = ?
  `).get(Number(assetId), companyId);
}

function firstAssignedAsset(db, companyId, jobId) {
  return db.prepare(`
    SELECT company_asset_id
    FROM job_asset_assignments
    WHERE company_id = ? AND job_id = ?
    ORDER BY id ASC
    LIMIT 1
  `).get(companyId, jobId);
}

function getNotes(db, routeCheckId) {
  return db.prepare(`
    SELECT *
    FROM route_notes
    WHERE route_check_id = ?
    ORDER BY created_at ASC
  `).all(routeCheckId);
}

function getEvents(db, routeCheckId) {
  return db.prepare(`
    SELECT *
    FROM route_check_events
    WHERE route_check_id = ?
    ORDER BY created_at ASC
  `).all(routeCheckId);
}

function getLinks(db, routeCheckId) {
  return db.prepare(`
    SELECT *
    FROM external_route_links
    WHERE route_check_id = ?
    ORDER BY created_at ASC
  `).all(routeCheckId);
}

function getPermitRecord(db, routeCheckId) {
  return db.prepare(`SELECT * FROM permit_records WHERE route_check_id = ? ORDER BY created_at DESC LIMIT 1`).get(routeCheckId) || null;
}

function getAcknowledgements(db, routeCheckId) {
  return db.prepare(`
    SELECT *
    FROM operator_acknowledgements
    WHERE route_check_id = ?
    ORDER BY acknowledged_at DESC, created_at DESC
  `).all(routeCheckId);
}

function serializeRouteCheck(row, details = {}) {
  if (!row) return null;
  return {
    ...row,
    route_required: Boolean(row.route_required),
    operator_ack_required: Boolean(row.operator_ack_required),
    override_used: Boolean(row.override_used),
    asset: details.asset || null,
    job: details.job || null,
    notes: details.notes || [],
    external_links: details.external_links || [],
    permit_record: details.permit_record || null,
    acknowledgements: details.acknowledgements || [],
    events: details.events || []
  };
}

function appendRouteCheckEvent(db, {
  routeCheckId,
  eventType,
  fromStatus = null,
  toStatus = null,
  userId = null,
  note = null,
  metadata = {}
}) {
  db.prepare(`
    INSERT INTO route_check_events (
      id, route_check_id, event_type, from_status, to_status, user_id,
      event_note, metadata_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    randomUUID(),
    routeCheckId,
    eventType,
    fromStatus,
    toStatus,
    userId,
    trimText(note),
    JSON.stringify(metadata || {}),
    nowIso()
  );
}

function appendRouteCheckAudit(db, user, eventType, routeCheck, payload = {}) {
  appendAuditEvent(db, {
    companyId: user.company_id,
    eventType,
    userId: user.id,
    jobId: routeCheck.job_id,
    payload: {
      route_check_id: routeCheck.id,
      status: routeCheck.status,
      risk_level: routeCheck.risk_level,
      ...payload
    }
  });
}

function evaluateJobRouteCheck(db, companyId, jobId, input = {}) {
  const job = getJob(db, companyId, jobId);
  if (!job) throw httpError(404, 'Job not found');
  const requestedAssetId = parseInteger(input.asset_id);
  const assigned = requestedAssetId ? { company_asset_id: requestedAssetId } : firstAssignedAsset(db, companyId, jobId);
  const asset = assigned ? getAsset(db, companyId, assigned.company_asset_id) : null;
  if (requestedAssetId && !asset) throw httpError(404, 'Selected asset not found');

  const evaluation = evaluateRouteCheckRequirement({
    job,
    asset,
    vehicleProfile: asset
  });
  if (asset?.profile_default_route_check_required) {
    evaluation.route_required = true;
    if (!evaluation.reasons.includes('Vehicle profile requires RouteCheck by default.')) {
      evaluation.reasons.push('Vehicle profile requires RouteCheck by default.');
    }
  }
  return {
    job,
    asset,
    ...evaluation
  };
}

function listRouteChecks(db, companyId, filters = {}) {
  const clauses = ['rc.company_id = ?'];
  const params = [companyId];
  if (filters.job_id) {
    clauses.push('rc.job_id = ?');
    params.push(filters.job_id);
  }
  if (filters.status) {
    clauses.push('rc.status = ?');
    params.push(filters.status);
  }
  if (filters.risk_level) {
    clauses.push('rc.risk_level = ?');
    params.push(filters.risk_level);
  }
  if (filters.asset_id) {
    clauses.push('rc.asset_id = ?');
    params.push(Number(filters.asset_id));
  }
  if (filters.operator_user_id) {
    clauses.push('rc.operator_user_id = ?');
    params.push(filters.operator_user_id);
  }
  if (filters.start_date) {
    clauses.push('j.date >= ?');
    params.push(filters.start_date);
  }
  if (filters.end_date) {
    clauses.push('j.date <= ?');
    params.push(filters.end_date);
  }

  return db.prepare(`
    SELECT
      rc.*,
      j.reference AS job_reference,
      j.client_name,
      j.site_name,
      j.site_location,
      j.date AS job_date,
      j.status AS job_status,
      ca.asset_number,
      COALESCE(ca.display_name, rci.label, ca.asset_number) AS asset_label
    FROM route_checks rc
    JOIN jobs j ON j.id = rc.job_id AND j.company_id = rc.company_id
    LEFT JOIN company_assets ca ON ca.id = rc.asset_id AND ca.company_id = rc.company_id
    LEFT JOIN requirement_catalogue_items rci ON rci.id = ca.catalogue_item_id
    WHERE ${clauses.join(' AND ')}
    ORDER BY
      CASE rc.risk_level WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
      j.date ASC,
      rc.updated_at DESC
  `).all(...params).map((row) => serializeRouteCheck(row));
}

function getRouteCheck(db, companyId, routeCheckId, options = {}) {
  const row = db.prepare(`SELECT * FROM route_checks WHERE id = ? AND company_id = ?`).get(routeCheckId, companyId);
  if (!row) return null;
  const job = getJob(db, companyId, row.job_id);
  const asset = row.asset_id ? getAsset(db, companyId, row.asset_id) : null;
  return serializeRouteCheck(row, {
    job,
    asset,
    notes: options.includeDetails === false ? [] : getNotes(db, row.id),
    external_links: options.includeDetails === false ? [] : getLinks(db, row.id),
    permit_record: options.includeDetails === false ? null : getPermitRecord(db, row.id),
    acknowledgements: options.includeDetails === false ? [] : getAcknowledgements(db, row.id),
    events: options.includeDetails === false ? [] : getEvents(db, row.id)
  });
}

function createRouteCheck(db, user, input = {}) {
  assertCanEdit(user);
  if (!input.job_id) throw httpError(400, 'job_id is required');
  const evaluation = evaluateJobRouteCheck(db, user.company_id, input.job_id, input);
  const id = randomUUID();
  const now = nowIso();
  const status = evaluation.route_required ? 'not_checked' : 'not_required';
  db.prepare(`
    INSERT INTO route_checks (
      id, company_id, job_id, asset_id, operator_user_id, status, risk_level,
      risk_score, route_required, permit_status, external_provider,
      operator_ack_required, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    user.company_id,
    evaluation.job.id,
    evaluation.asset?.id || null,
    input.operator_user_id || null,
    status,
    evaluation.risk_level,
    evaluation.risk_score,
    evaluation.route_required ? 1 : 0,
    input.permit_status && PERMIT_STATUSES.includes(input.permit_status) ? input.permit_status : 'unknown',
    'manual',
    routeCheckSettings().require_acknowledgement ? 1 : 0,
    now,
    now
  );
  const routeCheck = getRouteCheck(db, user.company_id, id);
  appendRouteCheckEvent(db, {
    routeCheckId: id,
    eventType: 'route_check_created',
    toStatus: status,
    userId: user.id,
    note: 'RouteCheck record created.',
    metadata: { reasons: evaluation.reasons, warnings: evaluation.warnings }
  });
  if (evaluation.route_required) {
    appendRouteCheckEvent(db, {
      routeCheckId: id,
      eventType: 'route_check_required',
      toStatus: status,
      userId: user.id,
      note: evaluation.reasons.join(' ') || 'RouteCheck required by job or asset rules.',
      metadata: { risk_level: evaluation.risk_level, risk_score: evaluation.risk_score }
    });
  }
  appendRouteCheckAudit(db, user, 'route_check_created', routeCheck, {
    route_required: routeCheck.route_required,
    risk_score: routeCheck.risk_score
  });
  return getRouteCheck(db, user.company_id, id);
}

function updateRouteCheckStatus(db, user, routeCheckId, input = {}) {
  assertCanEdit(user);
  const existing = getRouteCheck(db, user.company_id, routeCheckId);
  if (!existing) return null;
  const nextStatus = String(input.status || '').trim();
  if (!ROUTE_CHECK_STATUSES.includes(nextStatus)) {
    throw httpError(400, `status must be one of: ${ROUTE_CHECK_STATUSES.join(', ')}`);
  }
  if (nextStatus === 'blocked' && !trimText(input.note) && !trimText(input.blocked_reason)) {
    throw httpError(400, 'blocked status requires a reason');
  }
  const now = nowIso();
  const checkedBy = nextStatus === 'checked' ? user.id : existing.checked_by_user_id;
  const checkedAt = nextStatus === 'checked' ? now : existing.checked_at;
  const approvedBy = nextStatus === 'approved_for_dispatch' ? user.id : existing.approved_by_user_id;
  const approvedAt = nextStatus === 'approved_for_dispatch' ? now : existing.approved_at;

  db.prepare(`
    UPDATE route_checks
    SET status = ?,
        checked_by_user_id = ?,
        checked_at = ?,
        approved_by_user_id = ?,
        approved_at = ?,
        blocked_reason = COALESCE(?, blocked_reason),
        updated_at = ?
    WHERE id = ? AND company_id = ?
  `).run(
    nextStatus,
    checkedBy || null,
    checkedAt || null,
    approvedBy || null,
    approvedAt || null,
    trimText(input.blocked_reason || input.note),
    now,
    routeCheckId,
    user.company_id
  );

  appendRouteCheckEvent(db, {
    routeCheckId,
    eventType: nextStatus === 'opened_in_routing_tool' ? 'external_tool_opened' : 'status_changed',
    fromStatus: existing.status,
    toStatus: nextStatus,
    userId: user.id,
    note: input.note,
    metadata: { source: 'status_update' }
  });
  const updated = getRouteCheck(db, user.company_id, routeCheckId);
  appendRouteCheckAudit(db, user, nextStatus === 'issue_flagged' ? 'route_check_issue_flagged' : 'route_check_status_changed', updated, {
    from_status: existing.status,
    to_status: nextStatus
  });
  return updated;
}

function addRouteNote(db, user, routeCheckId, input = {}) {
  assertCanEdit(user);
  const routeCheck = getRouteCheck(db, user.company_id, routeCheckId);
  if (!routeCheck) return null;
  const noteType = String(input.note_type || 'route').trim();
  if (!NOTE_TYPES.includes(noteType)) throw httpError(400, `note_type must be one of: ${NOTE_TYPES.join(', ')}`);
  const noteText = trimText(input.note_text);
  if (!noteText) throw httpError(400, 'note_text is required');
  const id = randomUUID();
  db.prepare(`
    INSERT INTO route_notes (
      id, route_check_id, note_type, note_text, visibility, created_by_user_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    routeCheckId,
    noteType,
    noteText,
    trimText(input.visibility) || 'dispatcher_operator',
    user.id,
    nowIso()
  );
  appendRouteCheckEvent(db, {
    routeCheckId,
    eventType: 'note_added',
    userId: user.id,
    note: `${noteType} note added`,
    metadata: { note_type: noteType }
  });
  appendRouteCheckAudit(db, user, 'route_check_note_added', routeCheck, { note_type: noteType });
  return getRouteCheck(db, user.company_id, routeCheckId);
}

function addExternalRouteLink(db, user, routeCheckId, input = {}) {
  assertCanEdit(user);
  const settings = routeCheckSettings();
  if (!settings.allow_external_links) throw httpError(403, 'External RouteCheck links are disabled for this environment');
  const routeCheck = getRouteCheck(db, user.company_id, routeCheckId);
  if (!routeCheck) return null;
  const routeUrl = trimText(input.route_url);
  if (!routeUrl || !/^https?:\/\//i.test(routeUrl)) throw httpError(400, 'route_url must be an http or https URL');
  const provider = trimText(input.provider_name) || 'manual';
  db.prepare(`
    INSERT INTO external_route_links (
      id, route_check_id, provider_name, route_url, origin_address,
      destination_address, created_by_user_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    randomUUID(),
    routeCheckId,
    provider,
    routeUrl,
    trimText(input.origin_address),
    trimText(input.destination_address),
    user.id,
    nowIso()
  );
  appendRouteCheckEvent(db, {
    routeCheckId,
    eventType: 'external_link_added',
    userId: user.id,
    note: 'External route review link recorded.',
    metadata: { provider_name: provider }
  });
  appendRouteCheckAudit(db, user, 'route_check_external_link_added', routeCheck, { provider_name: provider });
  return getRouteCheck(db, user.company_id, routeCheckId);
}

function updatePermitStatus(db, user, routeCheckId, input = {}) {
  assertCanEdit(user);
  const routeCheck = getRouteCheck(db, user.company_id, routeCheckId);
  if (!routeCheck) return null;
  const permitRequired = Boolean(input.permit_required);
  const permitStatus = String(input.permit_status || (permitRequired ? 'required' : 'not_required')).trim();
  if (!PERMIT_STATUSES.includes(permitStatus)) throw httpError(400, `permit_status must be one of: ${PERMIT_STATUSES.join(', ')}`);
  const now = nowIso();
  db.prepare(`
    INSERT INTO permit_records (
      id, route_check_id, permit_required, permit_reference, permit_status,
      permit_expiry_at, permit_notes, confirmed_by_user_id, confirmed_at,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    randomUUID(),
    routeCheckId,
    permitRequired ? 1 : 0,
    trimText(input.permit_reference),
    permitStatus,
    trimText(input.permit_expiry_at),
    trimText(input.permit_notes),
    permitStatus === 'confirmed' ? user.id : null,
    permitStatus === 'confirmed' ? now : null,
    now,
    now
  );
  db.prepare(`
    UPDATE route_checks
    SET permit_status = ?,
        status = CASE WHEN ? = 'required' THEN 'permit_required' ELSE status END,
        updated_at = ?
    WHERE id = ? AND company_id = ?
  `).run(permitStatus, permitStatus, now, routeCheckId, user.company_id);
  appendRouteCheckEvent(db, {
    routeCheckId,
    eventType: 'permit_updated',
    userId: user.id,
    note: input.permit_notes,
    metadata: { permit_required: permitRequired, permit_status: permitStatus }
  });
  const updated = getRouteCheck(db, user.company_id, routeCheckId);
  appendRouteCheckAudit(db, user, 'route_check_permit_updated', updated, { permit_status: permitStatus });
  return updated;
}

function approvalBlockers(routeCheck) {
  const blockers = [];
  if (['not_checked', 'required', 'opened_in_routing_tool'].includes(routeCheck.status)) {
    blockers.push('RouteCheck has not been marked checked.');
  }
  if (['issue_flagged', 'blocked'].includes(routeCheck.status)) {
    blockers.push('RouteCheck has an unresolved route/access issue.');
  }
  if (routeCheck.permit_status === 'required') {
    blockers.push('Permit/access status is required but not confirmed.');
  }
  if (routeCheck.risk_level === 'critical' && routeCheckSettings().block_dispatch_on_critical) {
    blockers.push('Critical route risk requires admin override.');
  }
  return blockers;
}

function approveRouteCheck(db, user, routeCheckId, input = {}) {
  assertCanEdit(user);
  const existing = getRouteCheck(db, user.company_id, routeCheckId);
  if (!existing) return null;
  const blockers = approvalBlockers(existing);
  const overrideReason = trimText(input.override_reason);
  const needsOverride = blockers.length > 0;
  if (needsOverride) {
    assertCanOverride(user);
    if (!overrideReason) {
      throw httpError(422, 'RouteCheck override requires a written reason.');
    }
  }
  const now = nowIso();
  db.prepare(`
    UPDATE route_checks
    SET status = 'approved_for_dispatch',
        approved_by_user_id = ?,
        approved_at = ?,
        override_used = ?,
        override_reason = COALESCE(?, override_reason),
        updated_at = ?
    WHERE id = ? AND company_id = ?
  `).run(
    user.id,
    now,
    needsOverride ? 1 : existing.override_used ? 1 : 0,
    overrideReason,
    now,
    routeCheckId,
    user.company_id
  );
  appendRouteCheckEvent(db, {
    routeCheckId,
    eventType: needsOverride ? 'override_used' : 'route_check_approved',
    fromStatus: existing.status,
    toStatus: 'approved_for_dispatch',
    userId: user.id,
    note: input.approval_note || overrideReason,
    metadata: { blockers, override_used: needsOverride }
  });
  const updated = getRouteCheck(db, user.company_id, routeCheckId);
  appendRouteCheckAudit(db, user, needsOverride ? 'route_check_override_used' : 'route_check_approved', updated, {
    blockers,
    override_used: needsOverride
  });
  return updated;
}

function sendNotesToOperator(db, user, routeCheckId, input = {}) {
  assertCanEdit(user);
  const existing = getRouteCheck(db, user.company_id, routeCheckId);
  if (!existing) return null;
  db.prepare(`
    UPDATE route_checks
    SET status = 'sent_to_operator', updated_at = ?
    WHERE id = ? AND company_id = ?
  `).run(nowIso(), routeCheckId, user.company_id);
  appendRouteCheckEvent(db, {
    routeCheckId,
    eventType: 'sent_to_operator',
    fromStatus: existing.status,
    toStatus: 'sent_to_operator',
    userId: user.id,
    note: input.message || 'Route/access notes sent to operator.',
    metadata: { operator_user_id: input.operator_user_id || existing.operator_user_id || null }
  });
  const updated = getRouteCheck(db, user.company_id, routeCheckId);
  appendRouteCheckAudit(db, user, 'route_check_sent_to_operator', updated);
  return updated;
}

function recordOperatorAcknowledgement(db, user, routeCheckId, input = {}) {
  assertCanAcknowledge(user);
  const existing = getRouteCheck(db, user.company_id, routeCheckId);
  if (!existing) return null;
  const ackStatus = String(input.ack_status || '').trim();
  if (!ACK_STATUSES.includes(ackStatus)) throw httpError(400, `ack_status must be one of: ${ACK_STATUSES.join(', ')}`);
  const now = nowIso();
  db.prepare(`
    INSERT INTO operator_acknowledgements (
      id, route_check_id, operator_user_id, ack_status, ack_note, acknowledged_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    randomUUID(),
    routeCheckId,
    input.operator_user_id || existing.operator_user_id || user.id,
    ackStatus,
    trimText(input.ack_note),
    now,
    now
  );
  const nextStatus = ackStatus === 'issue_found' ? 'issue_flagged' : 'operator_acknowledged';
  db.prepare(`
    UPDATE route_checks
    SET status = ?,
        operator_acknowledged_at = CASE WHEN ? = 'operator_acknowledged' THEN ? ELSE operator_acknowledged_at END,
        updated_at = ?
    WHERE id = ? AND company_id = ?
  `).run(nextStatus, nextStatus, now, now, routeCheckId, user.company_id);
  appendRouteCheckEvent(db, {
    routeCheckId,
    eventType: ackStatus === 'issue_found' ? 'operator_issue_flagged' : 'operator_acknowledged',
    fromStatus: existing.status,
    toStatus: nextStatus,
    userId: user.id,
    note: input.ack_note,
    metadata: { ack_status: ackStatus }
  });
  const updated = getRouteCheck(db, user.company_id, routeCheckId);
  appendRouteCheckAudit(db, user, ackStatus === 'issue_found' ? 'route_check_operator_issue_flagged' : 'route_check_operator_acknowledged', updated, {
    ack_status: ackStatus
  });
  return updated;
}

function dashboardSummary(db, companyId) {
  const rows = db.prepare(`
    SELECT status, risk_level, COUNT(*) AS count
    FROM route_checks
    WHERE company_id = ?
    GROUP BY status, risk_level
  `).all(companyId);
  return {
    total: rows.reduce((sum, row) => sum + row.count, 0),
    unchecked: rows.filter((row) => ['required', 'not_checked', 'opened_in_routing_tool'].includes(row.status)).reduce((sum, row) => sum + row.count, 0),
    high_or_critical: rows.filter((row) => ['high', 'critical'].includes(row.risk_level)).reduce((sum, row) => sum + row.count, 0),
    blocked: rows.filter((row) => ['blocked', 'issue_flagged'].includes(row.status)).reduce((sum, row) => sum + row.count, 0),
    rows
  };
}

module.exports = {
  ACK_STATUSES,
  NOTE_TYPES,
  PERMIT_STATUSES,
  ROUTE_CHECK_STATUSES,
  addExternalRouteLink,
  addRouteNote,
  approveRouteCheck,
  createRouteCheck,
  dashboardSummary,
  evaluateJobRouteCheck,
  getRouteCheck,
  listRouteChecks,
  recordOperatorAcknowledgement,
  roleCanEdit,
  roleCanOverride,
  sendNotesToOperator,
  updatePermitStatus,
  updateRouteCheckStatus
};
