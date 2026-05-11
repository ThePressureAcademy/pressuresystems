'use strict';

const {
  getCraneModelById,
  getCraneTravelStateById,
  normalizeConfidence
} = require('./crane-model-catalog');

const CONFIDENCE_ORDER = { low: 1, medium: 2, high: 3 };

const TRANSPORT_CUE_PATTERNS = [
  /\bcounterweight\b/i,
  /\bsupport truck\b/i,
  /\bsemi[\s-]*trailer\b/i,
  /\blow[\s-]*loader\b/i,
  /\bfloat\b/i,
  /\btransport\b/i
];

const ROUTE_REVIEW_PATTERNS = [
  /\brestricted access\b/i,
  /\bbridge\b/i,
  /\bescort\b/i,
  /\bpilot\b/i,
  /\blow[\s-]*loader\b/i,
  /\bfloat\b/i,
  /\bsemi[\s-]*trailer\b/i,
  /\bindivisible\b/i
];

const NHVR_REVIEW_PATTERNS = [
  /\bnhvr\b/i,
  /\bpermit\b/i,
  /\bosom\b/i,
  /\bstate notice\b/i
];

function toNumber(value) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundTonnage(value) {
  if (value == null) return null;
  return Math.round(value * 1000) / 1000;
}

function minConfidence(...values) {
  const normalized = values.map(normalizeConfidence).filter(Boolean);
  if (normalized.length === 0) return null;
  return normalized.reduce((lowest, current) => (
    CONFIDENCE_ORDER[current] < CONFIDENCE_ORDER[lowest] ? current : lowest
  ));
}

function unique(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

function extractTransportPlanningHints(text) {
  const body = String(text || '');
  const explicitLoadMatch = body.match(/\bone\s+(semi[\s-]*trailer|support truck|truck|float|low[\s-]*loader)\b/i);
  let vehicleType = null;
  if (/\bsemi[\s-]*trailer\b/i.test(body)) vehicleType = 'semi trailer';
  else if (/\blow[\s-]*loader\b/i.test(body)) vehicleType = 'low loader';
  else if (/\bfloat\b/i.test(body)) vehicleType = 'float';
  else if (/\bsupport truck\b/i.test(body)) vehicleType = 'support truck';
  else if (/\btruck\b/i.test(body) && /\bcounterweight\b/i.test(body)) vehicleType = 'support truck';

  return {
    hasTransportCue: TRANSPORT_CUE_PATTERNS.some((pattern) => pattern.test(body)),
    hasRouteCue: ROUTE_REVIEW_PATTERNS.some((pattern) => pattern.test(body)),
    hasNhvrCue: NHVR_REVIEW_PATTERNS.some((pattern) => pattern.test(body)),
    hasOsomCue: /\bosom\b/i.test(body),
    driverRequired: /\btruck driver required\b/i.test(body),
    riggerRequired: /\brigger required\b/i.test(body),
    vehicleType,
    explicitLoadCount: explicitLoadMatch ? 1 : null
  };
}

function buildPlanningMessages(plan) {
  const messages = [];
  if (plan.manual_review_required) messages.push('Manual crane configuration review required');
  if (plan.requires_counterweight_transport) messages.push('Counterweight transport likely required');
  if (plan.transport_review_required || plan.route_review_required) {
    messages.push('Road access review required');
  }
  if (plan.nhvr_review_required || plan.permit_review_required || plan.osom_review_required) {
    messages.push('NHVR / state notice or permit check may be required');
  }
  if (plan.transport_review_required || plan.route_review_required || plan.nhvr_review_required || plan.permit_review_required) {
    messages.push('Confirm route, vehicle combination, axle masses, dimensions, and permits before dispatch');
  }
  return unique(messages);
}

function buildCraneTransportPlan(db, input = {}) {
  const craneModelId = input.crane_model_id != null && input.crane_model_id !== ''
    ? Number(input.crane_model_id)
    : null;
  const craneTravelStateId = input.crane_travel_state_id != null && input.crane_travel_state_id !== ''
    ? Number(input.crane_travel_state_id)
    : null;
  const craneModel = craneModelId ? getCraneModelById(db, craneModelId) : null;
  const travelState = craneTravelStateId ? getCraneTravelStateById(db, craneTravelStateId) : null;
  const reasons = [];

  if (!craneModel) {
    reasons.push('Crane model unknown.');
  }
  if (!travelState) {
    reasons.push('Crane travel state not selected.');
  } else if (craneModel && Number(travelState.crane_model_id) !== Number(craneModel.id)) {
    reasons.push('Selected travel state does not match the selected crane model.');
  }

  const requiredCounterweight = toNumber(input.counterweight_required_tonnes);
  if (requiredCounterweight == null) {
    reasons.push('Counterweight not assessed.');
  }

  const carriedCounterweight = travelState ? toNumber(travelState.carried_counterweight_tonnes) : null;
  let counterweightToTransport = null;
  let requiresCounterweightTransport = false;
  let supportTruckRequired = false;

  if (requiredCounterweight != null && carriedCounterweight != null) {
    if (requiredCounterweight > carriedCounterweight) {
      counterweightToTransport = roundTonnage(requiredCounterweight - carriedCounterweight);
      requiresCounterweightTransport = counterweightToTransport > 0;
      supportTruckRequired = requiresCounterweightTransport;
    } else {
      counterweightToTransport = 0;
    }
  }

  const noteBundle = [
    input.site_access_notes,
    input.setup_notes,
    input.transport_notes,
    travelState?.notes,
    craneModel?.notes
  ].filter(Boolean).join(' ');
  const hints = extractTransportPlanningHints(noteBundle);

  let estimatedTransportLoads = input.estimated_transport_loads != null && input.estimated_transport_loads !== ''
    ? Number(input.estimated_transport_loads)
    : null;

  if (hints.explicitLoadCount != null) {
    estimatedTransportLoads = hints.explicitLoadCount;
  }

  if (!requiresCounterweightTransport && hints.hasTransportCue && hints.vehicleType) {
    requiresCounterweightTransport = true;
  }

  if (requiresCounterweightTransport) {
    supportTruckRequired = true;
  }

  let transportReviewRequired = requiresCounterweightTransport;
  let routeReviewRequired = false;
  let osomReviewRequired = false;
  let nhvrReviewRequired = false;
  let permitReviewRequired = false;

  if (hints.hasTransportCue) {
    transportReviewRequired = true;
  }
  if (hints.hasRouteCue) {
    transportReviewRequired = true;
    routeReviewRequired = true;
  }
  if (hints.hasOsomCue) {
    osomReviewRequired = true;
    transportReviewRequired = true;
    routeReviewRequired = true;
    nhvrReviewRequired = true;
    permitReviewRequired = true;
  }
  if (hints.hasNhvrCue) {
    nhvrReviewRequired = true;
    permitReviewRequired = true;
  }

  const mergedConfidence = minConfidence(
    input.source_confidence,
    craneModel?.source_confidence,
    travelState?.source_confidence
  );

  if (travelState?.review_required) {
    reasons.push('Selected crane travel state is review-gated.');
  }
  if (mergedConfidence === 'medium') {
    reasons.push('Source confidence is medium.');
  }
  if (mergedConfidence === 'low') {
    reasons.push('Source confidence is low.');
  }
  if (requiresCounterweightTransport && !hints.vehicleType) {
    reasons.push('Support vehicle combination not specified.');
    transportReviewRequired = true;
  }

  const manualReviewRequired = reasons.length > 0;
  const reviewReason = unique(reasons).join(' ');

  const plan = {
    crane_model_id: craneModel?.id || craneModelId || null,
    crane_travel_state_id: travelState?.id || craneTravelStateId || null,
    crane_class: input.crane_class || null,
    required_capacity_tonnes: toNumber(input.required_capacity_tonnes),
    lift_weight_tonnes: toNumber(input.lift_weight_tonnes),
    radius_m: toNumber(input.radius_m),
    height_m: toNumber(input.height_m),
    counterweight_required_tonnes: requiredCounterweight,
    counterweight_carried_on_crane_tonnes: carriedCounterweight,
    counterweight_to_transport_tonnes: counterweightToTransport,
    requires_counterweight_transport: requiresCounterweightTransport,
    support_truck_required: supportTruckRequired,
    estimated_transport_loads: estimatedTransportLoads,
    transport_review_required: transportReviewRequired,
    route_review_required: routeReviewRequired,
    osom_review_required: osomReviewRequired,
    nhvr_review_required: nhvrReviewRequired,
    permit_review_required: permitReviewRequired,
    manual_review_required: manualReviewRequired,
    review_reason: reviewReason || null,
    site_access_notes: input.site_access_notes || null,
    setup_notes: input.setup_notes || null,
    source_confidence: mergedConfidence || normalizeConfidence(input.source_confidence) || 'low',
    vehicle_type: hints.vehicleType || (requiresCounterweightTransport ? 'support truck' : null),
    driver_required: hints.driverRequired,
    rigger_required: hints.riggerRequired,
    selected_crane_model: craneModel,
    selected_travel_state: travelState
  };

  return {
    ...plan,
    messages: buildPlanningMessages(plan)
  };
}

module.exports = {
  buildCraneTransportPlan,
  buildPlanningMessages,
  extractTransportPlanningHints
};
