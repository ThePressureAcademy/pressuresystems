'use strict';

const {
  buildSchedulePayload,
  normalizeTimeZone
} = require('./timezone');
const { buildPlanningMessages } = require('./crane-transport-planning');
const { normalizeConfidence } = require('./crane-model-catalog');

function safeJsonParse(value, fallback = []) {
  try {
    const parsed = JSON.parse(value || JSON.stringify(fallback));
    return Array.isArray(parsed) || (fallback && !Array.isArray(fallback)) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function getCompanyTimeZone(db, companyId) {
  const row = db.prepare(`SELECT timezone FROM companies WHERE id = ?`).get(companyId);
  return normalizeTimeZone(row?.timezone);
}

function serializeTransportRequirement(row) {
  if (!row) return null;
  return {
    ...row,
    driver_required: Boolean(row.driver_required),
    rigger_required: Boolean(row.rigger_required),
    pilot_or_escort_review: Boolean(row.pilot_or_escort_review),
    nhvr_review_required: Boolean(row.nhvr_review_required),
    route_review_required: Boolean(row.route_review_required),
    permit_review_required: Boolean(row.permit_review_required)
  };
}

function loadJobCranePlanning(db, jobId) {
  if (!db || !jobId) return null;

  const row = db.prepare(`
    SELECT
      jcr.*,
      cm.manufacturer AS crane_model_manufacturer,
      cm.model AS crane_model_name,
      cm.nominal_capacity_tonnes AS crane_model_nominal_capacity_tonnes,
      cm.max_counterweight_tonnes AS crane_model_max_counterweight_tonnes,
      cm.transport_length_m AS crane_model_transport_length_m,
      cm.transport_width_m AS crane_model_transport_width_m,
      cm.transport_height_m AS crane_model_transport_height_m,
      cm.gross_vehicle_weight_tonnes AS crane_model_gvw_tonnes,
      cm.axle_configuration AS crane_model_axle_configuration,
      cm.source_url AS crane_model_source_url,
      cm.source_capture_date AS crane_model_source_capture_date,
      cm.source_confidence AS crane_model_source_confidence,
      cm.notes AS crane_model_notes,
      ts.state_label AS crane_travel_state_label,
      ts.carried_counterweight_tonnes AS crane_travel_state_carried_counterweight_tonnes,
      ts.axle_basis AS crane_travel_state_axle_basis,
      ts.roadability_basis AS crane_travel_state_roadability_basis,
      ts.gross_vehicle_weight_tonnes AS crane_travel_state_gvw_tonnes,
      ts.transport_width_m AS crane_travel_state_transport_width_m,
      ts.transport_height_m AS crane_travel_state_transport_height_m,
      ts.transport_length_m AS crane_travel_state_transport_length_m,
      ts.review_required AS crane_travel_state_review_required,
      ts.source_url AS crane_travel_state_source_url,
      ts.source_capture_date AS crane_travel_state_source_capture_date,
      ts.source_confidence AS crane_travel_state_source_confidence,
      ts.notes AS crane_travel_state_notes
    FROM job_crane_requirements jcr
    LEFT JOIN crane_models cm ON cm.id = jcr.crane_model_id
    LEFT JOIN crane_model_travel_states ts ON ts.id = jcr.crane_travel_state_id
    WHERE jcr.job_id = ?
  `).get(jobId);

  if (!row) return null;

  const transportRequirements = db.prepare(`
    SELECT *
    FROM transport_requirements
    WHERE job_id = ?
    ORDER BY id ASC
  `).all(jobId).map(serializeTransportRequirement);

  const planning = {
    id: row.id,
    crane_model_id: row.crane_model_id,
    crane_travel_state_id: row.crane_travel_state_id,
    crane_class: row.crane_class,
    required_capacity_tonnes: row.required_capacity_tonnes,
    lift_weight_tonnes: row.lift_weight_tonnes,
    radius_m: row.radius_m,
    height_m: row.height_m,
    counterweight_required_tonnes: row.counterweight_required_tonnes,
    counterweight_carried_on_crane_tonnes: row.counterweight_carried_on_crane_tonnes,
    counterweight_to_transport_tonnes: row.counterweight_to_transport_tonnes,
    requires_counterweight_transport: Boolean(row.requires_counterweight_transport),
    support_truck_required: Boolean(row.support_truck_required),
    estimated_transport_loads: row.estimated_transport_loads,
    transport_review_required: Boolean(row.transport_review_required),
    route_review_required: Boolean(row.route_review_required),
    osom_review_required: Boolean(row.osom_review_required),
    nhvr_review_required: Boolean(row.nhvr_review_required),
    permit_review_required: Boolean(row.permit_review_required),
    manual_review_required: Boolean(row.manual_review_required),
    review_reason: row.review_reason,
    site_access_notes: row.site_access_notes,
    setup_notes: row.setup_notes,
    source_confidence: normalizeConfidence(row.source_confidence) || 'low',
    selected_crane_model: row.crane_model_id ? {
      id: row.crane_model_id,
      manufacturer: row.crane_model_manufacturer,
      model: row.crane_model_name,
      nominal_capacity_tonnes: row.crane_model_nominal_capacity_tonnes,
      max_counterweight_tonnes: row.crane_model_max_counterweight_tonnes,
      transport_length_m: row.crane_model_transport_length_m,
      transport_width_m: row.crane_model_transport_width_m,
      transport_height_m: row.crane_model_transport_height_m,
      gross_vehicle_weight_tonnes: row.crane_model_gvw_tonnes,
      axle_configuration: row.crane_model_axle_configuration,
      source_url: row.crane_model_source_url,
      source_capture_date: row.crane_model_source_capture_date,
      source_confidence: normalizeConfidence(row.crane_model_source_confidence),
      notes: row.crane_model_notes
    } : null,
    selected_travel_state: row.crane_travel_state_id ? {
      id: row.crane_travel_state_id,
      crane_model_id: row.crane_model_id,
      state_label: row.crane_travel_state_label,
      carried_counterweight_tonnes: row.crane_travel_state_carried_counterweight_tonnes,
      axle_basis: row.crane_travel_state_axle_basis,
      roadability_basis: row.crane_travel_state_roadability_basis,
      gross_vehicle_weight_tonnes: row.crane_travel_state_gvw_tonnes,
      transport_width_m: row.crane_travel_state_transport_width_m,
      transport_height_m: row.crane_travel_state_transport_height_m,
      transport_length_m: row.crane_travel_state_transport_length_m,
      review_required: Boolean(row.crane_travel_state_review_required),
      source_url: row.crane_travel_state_source_url,
      source_capture_date: row.crane_travel_state_source_capture_date,
      source_confidence: normalizeConfidence(row.crane_travel_state_source_confidence),
      notes: row.crane_travel_state_notes
    } : null,
    transport_requirements: transportRequirements
  };

  return {
    ...planning,
    messages: buildPlanningMessages(planning)
  };
}

function serializeJob(row, displayTimeZone = null, db = null) {
  if (!row) return null;
  return {
    ...row,
    task_tags: safeJsonParse(row.task_tags, []),
    required_credentials: safeJsonParse(row.required_credentials, []),
    crew_roles_required: safeJsonParse(row.crew_roles_required, []),
    site_conditions: safeJsonParse(row.site_conditions, []),
    crane_planning: loadJobCranePlanning(db, row.id),
    schedule: buildSchedulePayload({
      scheduled_start_at_utc: row.scheduled_start_at_utc,
      scheduled_end_at_utc: row.scheduled_end_at_utc,
      job_timezone: row.job_timezone,
      scheduled_start_local: row.scheduled_start_local,
      scheduled_end_local: row.scheduled_end_local,
      schedule_status: row.schedule_status
    }, displayTimeZone)
  };
}

function serializeAllocation(row, displayTimeZone = null) {
  if (!row) return null;
  return {
    ...row,
    smartrank_snapshot: safeJsonParse(row.smartrank_snapshot, {}),
    active_warnings: safeJsonParse(row.active_warnings, []),
    active_blocks_on_others: safeJsonParse(row.active_blocks_on_others, []),
    schedule: buildSchedulePayload({
      scheduled_start_at_utc: row.allocation_start_at_utc || row.job_scheduled_start_at_utc,
      scheduled_end_at_utc: row.allocation_end_at_utc || row.job_scheduled_end_at_utc,
      job_timezone: row.allocation_timezone || row.job_timezone,
      scheduled_start_local: row.allocation_start_local || row.scheduled_start_local || null,
      scheduled_end_local: row.allocation_end_local || row.scheduled_end_local || null,
      schedule_status: row.allocation_status || row.job_schedule_status || 'planned'
    }, displayTimeZone)
  };
}

module.exports = {
  getCompanyTimeZone,
  serializeAllocation,
  serializeJob
};
