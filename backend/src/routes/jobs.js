'use strict';

const express = require('express');
const { randomUUID } = require('crypto');
const { getDb } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { rankWorkersForJob } = require('../services/smart-rank');
const { appendAuditEvent } = require('../services/audit');
const {
  groupPreferencesByWorker,
  upsertLearnedPreferencesFromAllocation
} = require('../services/preferences');
const {
  buildJobScheduleFields,
  currentLocalDate,
  normalizeScheduleStatus
} = require('../services/timezone');
const {
  parseJobBrief,
  validateJobBriefImportPayload
} = require('../services/job-brief-parser');
const {
  findTravelStateByCarriedCounterweight,
  listCraneModels
} = require('../services/crane-model-catalog');
const {
  buildCraneTransportPlan
} = require('../services/crane-transport-planning');
const {
  addCustomRequirementToJob,
  getCompanyOperatingMode,
  hasRequirementPayload,
  listJobRequirements,
  mapParsedTermsToCatalogue,
  persistJobRequirements
} = require('../services/job-requirement-catalogue');
const {
  getCompanyTimeZone,
  serializeAllocation,
  serializeJob
} = require('../services/schedule');
const {
  createPreviewNotification,
  listAllocationNotifications,
  publishManualNotification
} = require('../services/allocation-notifications');
const {
  hasAssetPayload,
  listJobAssetAssignments,
  mapAssetReferencesFromText,
  parseAssetIds,
  persistJobAssetAssignments
} = require('../services/company-assets');
const {
  credentialDisplayLabel,
  formatDisplayLabel,
  normalizeCredentialTypes,
  normalizeSiteConditions,
  normalizeWorkerRoles,
  siteConditionReviewLabels
} = require('../services/intake-catalogues');
const {
  insertAllocationRoleCoverages,
  listRoleCompatibilityRules,
  normalizeRoleRequirements,
  validateRequestedRoleCoverage
} = require('../services/role-coverage');

const router = express.Router();

const VALID_JOB_STATUSES = ['draft', 'open', 'allocated', 'in_progress', 'complete', 'cancelled'];
const VALID_RISK_LEVELS = ['routine', 'complex', 'critical'];
const VALID_SHIFT_TYPES = ['day', 'night', 'split'];
const VALID_JOB_IMPORT_STATUSES = ['parsed', 'job_created', 'cancelled', 'failed'];

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

function normalizeTextList(value) {
  return Array.from(new Set(parseJsonArray(value)
    .map((item) => String(item || '').trim())
    .filter(Boolean)));
}

function normalizeCraneClasses(value) {
  return normalizeTextList(value);
}

function persistJobRoleRequirements(db, user, jobId, roleRequirements) {
  const requirements = normalizeRoleRequirements(roleRequirements);
  db.prepare(`DELETE FROM job_role_requirements WHERE company_id = ? AND job_id = ?`)
    .run(user.company_id, jobId);

  const stmt = db.prepare(`
    INSERT INTO job_role_requirements (
      company_id, job_id, role_key, role_label, required_count,
      requires_distinct_worker, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const requirement of requirements) {
    stmt.run(
      user.company_id,
      jobId,
      requirement.role_key,
      requirement.role_label,
      requirement.required_count,
      requirement.requires_distinct_worker ? 1 : 0,
      requirement.notes || null
    );
  }
  return requirements;
}

function storedLocalTime(localDateTime) {
  if (!localDateTime || !String(localDateTime).includes(' ')) return null;
  return String(localDateTime).split(' ')[1] || null;
}

function fetchSmartRankData(db, companyId) {
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const workers = db.prepare(
    `SELECT * FROM workers WHERE company_id = ? AND status != 'inactive' AND archived_at IS NULL`
  ).all(companyId);
  workers.forEach((worker) => {
    worker.crane_classes = parseJsonArray(worker.crane_classes);
    const roles = normalizeWorkerRoles(worker.roles);
    worker.roles = roles.length > 0
      ? roles
      : normalizeWorkerRoles(worker.role);
  });

  const allCredentials = db.prepare(
    `SELECT * FROM credentials WHERE company_id = ?`
  ).all(companyId);
  const credentialsByWorker = {};
  for (const credential of allCredentials) {
    (credentialsByWorker[credential.worker_id] = credentialsByWorker[credential.worker_id] || []).push(credential);
  }

  const fatigueRecords = db.prepare(
    `SELECT * FROM fatigue_records WHERE company_id = ? AND shift_start >= ?`
  ).all(companyId, twoWeeksAgo.toISOString());
  const fatigueByWorker = {};
  for (const record of fatigueRecords) {
    (fatigueByWorker[record.worker_id] = fatigueByWorker[record.worker_id] || []).push(record);
  }

  const allocations = db.prepare(`
    SELECT
      a.*,
      j.reference AS job_reference,
      j.site_name,
      j.client_name,
      j.job_timezone,
      j.schedule_status AS job_schedule_status,
      j.scheduled_start_at_utc AS job_scheduled_start_at_utc,
      j.scheduled_end_at_utc AS job_scheduled_end_at_utc
    FROM allocations a
    JOIN jobs j ON a.job_id = j.id
    WHERE a.company_id = ? AND a.status = 'confirmed' AND j.archived_at IS NULL
  `).all(companyId);
  const allocationsByWorker = {};
  for (const allocation of allocations) {
    (allocationsByWorker[allocation.worker_id] = allocationsByWorker[allocation.worker_id] || []).push(allocation);
  }

  const preferenceRows = db.prepare(`
    SELECT *
    FROM worker_task_preferences
    WHERE company_id = ?
  `).all(companyId);

  return {
    workers,
    credsByWorker: credentialsByWorker,
    fatigueByWorker,
    allocsByWorker: allocationsByWorker,
    preferencesByWorker: groupPreferencesByWorker(preferenceRows)
  };
}

function buildJobFields(input, companyTimeZone, existing = null) {
  const date = input.date !== undefined
    ? (input.date || null)
    : (existing?.date || null);
  const existingIsScheduled = Boolean(existing?.scheduled_start_at_utc && existing?.scheduled_end_at_utc);
  const requestedStartTime = input.scheduled_start_time !== undefined
    ? (input.scheduled_start_time || null)
    : input.shift_start_time;
  const requestedEndTime = input.scheduled_end_time !== undefined
    ? (input.scheduled_end_time || null)
    : null;
  const inferredStatus = input.schedule_status !== undefined
    ? input.schedule_status
    : (
        existing
          ? (existing.schedule_status || (existingIsScheduled ? 'planned' : 'draft'))
          : ((date && requestedStartTime && requestedEndTime) ? 'planned' : 'draft')
      );
  const scheduleStatus = normalizeScheduleStatus(inferredStatus, existing?.schedule_status || 'draft');
  const resolvedDate = date || (scheduleStatus === 'draft' ? currentLocalDate(companyTimeZone) : null);

  return buildJobScheduleFields({
    date: resolvedDate,
    scheduled_start_time: input.scheduled_start_time !== undefined
      ? (input.scheduled_start_time || null)
      : undefined,
    shift_start_time: input.shift_start_time !== undefined
      ? (input.shift_start_time || null)
      : (existing ? (storedLocalTime(existing.scheduled_start_local) || existing.shift_start_time || null) : null),
    scheduled_end_time: input.scheduled_end_time !== undefined
      ? (input.scheduled_end_time || null)
      : (existing ? storedLocalTime(existing.scheduled_end_local) : null),
    job_timezone: input.job_timezone !== undefined ? input.job_timezone : existing?.job_timezone,
    company_timezone: companyTimeZone,
    schedule_status: scheduleStatus
  });
}

function parseJsonObject(value) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function trimText(value) {
  const normalized = String(value || '').trim();
  return normalized ? normalized : null;
}

function toNumberOrNull(value) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const PLANNING_FIELDS = [
  'crane_model_id',
  'crane_travel_state_id',
  'crane_class',
  'required_capacity_tonnes',
  'lift_weight_tonnes',
  'radius_m',
  'height_m',
  'counterweight_required_tonnes',
  'site_access_notes',
  'setup_notes',
  'source_confidence',
  'estimated_transport_loads'
];

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj || {}, key);
}

function planningValue(input, key, existing = null) {
  if (hasOwn(input, key)) {
    return input[key] === '' ? null : input[key];
  }
  return existing ? existing[key] : null;
}

function shouldAssessPlanning(input, existingRequirement = null) {
  if (PLANNING_FIELDS.some((field) => hasOwn(input, field))) return true;
  if (!existingRequirement) return false;
  return hasOwn(input, 'travel_notes')
    || hasOwn(input, 'source_note')
    || hasOwn(input, 'crane_class_required')
    || hasOwn(input, 'crane_classes_required');
}

function getJobCraneRequirementRow(db, jobId) {
  return db.prepare(`
    SELECT *
    FROM job_crane_requirements
    WHERE job_id = ?
  `).get(jobId);
}

function buildPlanningAssessmentInput(input, existingRequirement = null) {
  const requestedCraneClasses = normalizeCraneClasses(input.crane_classes_required);
  return {
    crane_model_id: planningValue(input, 'crane_model_id', existingRequirement),
    crane_travel_state_id: planningValue(input, 'crane_travel_state_id', existingRequirement),
    crane_class: planningValue(input, 'crane_class', existingRequirement)
      || (requestedCraneClasses.length > 0
        ? requestedCraneClasses[0]
        : null)
      || (hasOwn(input, 'crane_class_required')
        ? (input.crane_class_required || null)
        : (existingRequirement?.crane_class || null)),
    required_capacity_tonnes: planningValue(input, 'required_capacity_tonnes', existingRequirement),
    lift_weight_tonnes: planningValue(input, 'lift_weight_tonnes', existingRequirement),
    radius_m: planningValue(input, 'radius_m', existingRequirement),
    height_m: planningValue(input, 'height_m', existingRequirement),
    counterweight_required_tonnes: planningValue(input, 'counterweight_required_tonnes', existingRequirement),
    site_access_notes: planningValue(input, 'site_access_notes', existingRequirement),
    setup_notes: planningValue(input, 'setup_notes', existingRequirement),
    source_confidence: planningValue(input, 'source_confidence', existingRequirement),
    estimated_transport_loads: planningValue(input, 'estimated_transport_loads', existingRequirement),
    transport_notes: [input.travel_notes, input.source_note].filter(Boolean).join(' ')
  };
}

function transportRequirementNotes(plan) {
  return [plan.review_reason, ...(plan.messages || [])]
    .filter(Boolean)
    .join(' ');
}

function persistJobCraneAssessment(db, user, jobId, input) {
  const existingRequirement = getJobCraneRequirementRow(db, jobId);
  if (!shouldAssessPlanning(input, existingRequirement)) {
    return existingRequirement ? serializeJob(
      db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(jobId),
      null,
      db
    ).crane_planning : null;
  }

  const currentJobRow = db.prepare(`
    SELECT travel_notes, source_note
    FROM jobs
    WHERE id = ?
  `).get(jobId) || {};
  const assessmentInput = buildPlanningAssessmentInput(input, existingRequirement);
  assessmentInput.transport_notes = [
    currentJobRow.travel_notes,
    currentJobRow.source_note,
    assessmentInput.transport_notes
  ].filter(Boolean).join(' ');
  const plan = buildCraneTransportPlan(db, assessmentInput);
  const now = new Date().toISOString();
  let requirementId = existingRequirement?.id || null;

  if (existingRequirement) {
    db.prepare(`
      UPDATE job_crane_requirements
      SET crane_model_id = ?,
          crane_travel_state_id = ?,
          crane_class = ?,
          required_capacity_tonnes = ?,
          lift_weight_tonnes = ?,
          radius_m = ?,
          height_m = ?,
          counterweight_required_tonnes = ?,
          counterweight_carried_on_crane_tonnes = ?,
          counterweight_to_transport_tonnes = ?,
          requires_counterweight_transport = ?,
          support_truck_required = ?,
          estimated_transport_loads = ?,
          transport_review_required = ?,
          route_review_required = ?,
          osom_review_required = ?,
          nhvr_review_required = ?,
          permit_review_required = ?,
          manual_review_required = ?,
          review_reason = ?,
          site_access_notes = ?,
          setup_notes = ?,
          source_confidence = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      plan.crane_model_id,
      plan.crane_travel_state_id,
      plan.crane_class,
      plan.required_capacity_tonnes,
      plan.lift_weight_tonnes,
      plan.radius_m,
      plan.height_m,
      plan.counterweight_required_tonnes,
      plan.counterweight_carried_on_crane_tonnes,
      plan.counterweight_to_transport_tonnes,
      plan.requires_counterweight_transport ? 1 : 0,
      plan.support_truck_required ? 1 : 0,
      plan.estimated_transport_loads,
      plan.transport_review_required ? 1 : 0,
      plan.route_review_required ? 1 : 0,
      plan.osom_review_required ? 1 : 0,
      plan.nhvr_review_required ? 1 : 0,
      plan.permit_review_required ? 1 : 0,
      plan.manual_review_required ? 1 : 0,
      plan.review_reason,
      plan.site_access_notes,
      plan.setup_notes,
      plan.source_confidence,
      now,
      existingRequirement.id
    );
  } else {
    const result = db.prepare(`
      INSERT INTO job_crane_requirements (
        company_id, job_id, crane_model_id, crane_travel_state_id, crane_class,
        required_capacity_tonnes, lift_weight_tonnes, radius_m, height_m,
        counterweight_required_tonnes, counterweight_carried_on_crane_tonnes,
        counterweight_to_transport_tonnes, requires_counterweight_transport,
        support_truck_required, estimated_transport_loads, transport_review_required,
        route_review_required, osom_review_required, nhvr_review_required,
        permit_review_required, manual_review_required, review_reason,
        site_access_notes, setup_notes, source_confidence, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      user.company_id,
      jobId,
      plan.crane_model_id,
      plan.crane_travel_state_id,
      plan.crane_class,
      plan.required_capacity_tonnes,
      plan.lift_weight_tonnes,
      plan.radius_m,
      plan.height_m,
      plan.counterweight_required_tonnes,
      plan.counterweight_carried_on_crane_tonnes,
      plan.counterweight_to_transport_tonnes,
      plan.requires_counterweight_transport ? 1 : 0,
      plan.support_truck_required ? 1 : 0,
      plan.estimated_transport_loads,
      plan.transport_review_required ? 1 : 0,
      plan.route_review_required ? 1 : 0,
      plan.osom_review_required ? 1 : 0,
      plan.nhvr_review_required ? 1 : 0,
      plan.permit_review_required ? 1 : 0,
      plan.manual_review_required ? 1 : 0,
      plan.review_reason,
      plan.site_access_notes,
      plan.setup_notes,
      plan.source_confidence,
      now,
      now
    );
    requirementId = result.lastInsertRowid;
  }

  const needsTransportRequirement = plan.requires_counterweight_transport
    || plan.transport_review_required
    || plan.route_review_required
    || plan.nhvr_review_required
    || plan.permit_review_required
    || Boolean(plan.vehicle_type);

  const existingTransportRequirement = requirementId
    ? db.prepare(`
        SELECT *
        FROM transport_requirements
        WHERE job_crane_requirement_id = ? AND transport_type = 'counterweight_support'
      `).get(requirementId)
    : null;

  if (needsTransportRequirement && requirementId) {
    const transportVehicleType = plan.vehicle_type || 'unknown_manual_review';
    const loadDescription = plan.counterweight_to_transport_tonnes > 0
      ? 'Counterweight package support load'
      : 'Counterweight support transport review';

    if (existingTransportRequirement) {
      db.prepare(`
        UPDATE transport_requirements
        SET company_id = ?,
            job_id = ?,
            load_description = ?,
            estimated_tonnes = ?,
            vehicle_type = ?,
            driver_required = ?,
            rigger_required = ?,
            pilot_or_escort_review = ?,
            nhvr_review_required = ?,
            route_review_required = ?,
            permit_review_required = ?,
            notes = ?
        WHERE id = ?
      `).run(
        user.company_id,
        jobId,
        loadDescription,
        plan.counterweight_to_transport_tonnes,
        transportVehicleType,
        plan.driver_required ? 1 : 0,
        plan.rigger_required ? 1 : 0,
        plan.osom_review_required || plan.route_review_required ? 1 : 0,
        plan.nhvr_review_required ? 1 : 0,
        plan.route_review_required ? 1 : 0,
        plan.permit_review_required ? 1 : 0,
        transportRequirementNotes(plan),
        existingTransportRequirement.id
      );
    } else {
      const transportResult = db.prepare(`
        INSERT INTO transport_requirements (
          company_id, job_id, job_crane_requirement_id, transport_type,
          load_description, estimated_tonnes, vehicle_type, driver_required,
          rigger_required, pilot_or_escort_review, nhvr_review_required,
          route_review_required, permit_review_required, notes, created_at
        ) VALUES (?, ?, ?, 'counterweight_support', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        user.company_id,
        jobId,
        requirementId,
        loadDescription,
        plan.counterweight_to_transport_tonnes,
        transportVehicleType,
        plan.driver_required ? 1 : 0,
        plan.rigger_required ? 1 : 0,
        plan.osom_review_required || plan.route_review_required ? 1 : 0,
        plan.nhvr_review_required ? 1 : 0,
        plan.route_review_required ? 1 : 0,
        plan.permit_review_required ? 1 : 0,
        transportRequirementNotes(plan),
        now
      );

      appendAuditEvent(db, {
        companyId: user.company_id,
        eventType: 'transport_requirement_created',
        userId: user.id,
        jobId,
        payload: {
          job_id: jobId,
          job_crane_requirement_id: requirementId,
          transport_requirement_id: transportResult.lastInsertRowid,
          transport_type: 'counterweight_support',
          vehicle_type: transportVehicleType,
          estimated_tonnes: plan.counterweight_to_transport_tonnes,
          driver_required: plan.driver_required,
          rigger_required: plan.rigger_required,
          nhvr_review_required: plan.nhvr_review_required,
          route_review_required: plan.route_review_required,
          permit_review_required: plan.permit_review_required,
          review_reason: plan.review_reason
        }
      });
    }
  } else if (existingTransportRequirement) {
    db.prepare(`
      DELETE FROM transport_requirements
      WHERE id = ?
    `).run(existingTransportRequirement.id);
  }

  appendAuditEvent(db, {
    companyId: user.company_id,
    eventType: 'job_counterweight_transport_assessed',
    userId: user.id,
    jobId,
    payload: {
      job_id: jobId,
      crane_model_id: plan.crane_model_id,
      crane_travel_state_id: plan.crane_travel_state_id,
      counterweight_required_tonnes: plan.counterweight_required_tonnes,
      counterweight_carried_on_crane_tonnes: plan.counterweight_carried_on_crane_tonnes,
      counterweight_to_transport_tonnes: plan.counterweight_to_transport_tonnes,
      requires_counterweight_transport: plan.requires_counterweight_transport,
      support_truck_required: plan.support_truck_required,
      transport_review_required: plan.transport_review_required,
      nhvr_review_required: plan.nhvr_review_required,
      permit_review_required: plan.permit_review_required,
      manual_review_required: plan.manual_review_required,
      source_confidence: plan.source_confidence,
      review_reason: plan.review_reason
    }
  });

  return plan;
}

function validateShiftType(shiftType) {
  if (!shiftType) {
    throw new Error('shift_type is required');
  }
  if (!VALID_SHIFT_TYPES.includes(shiftType)) {
    throw new Error(`shift_type must be one of: ${VALID_SHIFT_TYPES.join(', ')}`);
  }
  return shiftType;
}

function validateLiftRiskLevel(value) {
  const normalized = value || 'routine';
  if (!VALID_RISK_LEVELS.includes(normalized)) {
    throw new Error(`lift_risk_level must be one of: ${VALID_RISK_LEVELS.join(', ')}`);
  }
  return normalized;
}

function durationHoursFromTimes(startTime, endTime) {
  if (!startTime || !endTime) return null;
  const [startHour, startMinute] = String(startTime).split(':').map(Number);
  const [endHour, endMinute] = String(endTime).split(':').map(Number);
  if ([startHour, startMinute, endHour, endMinute].some((value) => Number.isNaN(value))) {
    return null;
  }
  const minutes = ((endHour * 60) + endMinute) - ((startHour * 60) + startMinute);
  if (minutes <= 0) return null;
  return Math.round((minutes / 60) * 100) / 100;
}

function inferShiftTypeFromTime(startTime, taskTags = []) {
  if ((taskTags || []).includes('night_shift')) {
    return 'night';
  }
  if (!startTime) return 'day';
  const hour = Number(String(startTime).split(':')[0]);
  if (Number.isNaN(hour)) return 'day';
  return (hour >= 18 || hour < 5) ? 'night' : 'day';
}

function inferRiskLevel(taskTags = [], riskNotes = '', jobDescription = '') {
  const body = `${riskNotes || ''} ${jobDescription || ''}`;
  if ((taskTags || []).includes('critical_lift') || /critical lift/i.test(body)) {
    return 'critical';
  }
  if (/complex/i.test(body)) {
    return 'complex';
  }
  return 'routine';
}

function inferTravelRequired(taskTags = [], travelNotes = '', jobDescription = '') {
  if ((taskTags || []).includes('long_travel')) return true;
  return /\btravel\b|\bremote\b|\bovernight\b|\bearly arrival\b/i.test(`${travelNotes || ''} ${jobDescription || ''}`);
}

function deriveSiteConditions(riskNotes = '') {
  const conditions = [];
  const body = String(riskNotes || '');
  const checks = [
    [/sloped/i, 'sloped_ground'],
    [/poor\s+ground/i, 'poor_ground_conditions'],
    [/soft\s+ground/i, 'soft_ground_conditions'],
    [/underground\s+services?/i, 'underground_services'],
    [/overhead\s+trees?/i, 'overhead_trees'],
    [/overhead\s+power\s*lines?/i, 'overhead_powerlines'],
    [/pedestrians?/i, 'pedestrians_nearby'],
    [/congested/i, 'congested_worksite'],
    [/poor\s+lighting/i, 'poor_lighting'],
    [/poor\s+access|restricted\s+access/i, 'poor_access_and_egress'],
    [/limited\s+setup/i, 'limited_setup_area'],
    [/night\s+work/i, 'night_work'],
    [/wet\s+weather/i, 'wet_weather_exposure'],
    [/traffic\s+interface/i, 'traffic_interface'],
    [/public\s+interface/i, 'public_interface'],
    [/uneven\s+ground/i, 'uneven_ground'],
    [/wind\s+exposure/i, 'wind_exposure'],
    [/low\s+overhead\s+clearance/i, 'low_overhead_clearance'],
    [/nearby\s+structures?/i, 'nearby_structures'],
    [/live\s+plant/i, 'live_plant_nearby']
  ];
  for (const [pattern, key] of checks) {
    if (pattern.test(body)) conditions.push(key);
  }
  return normalizeSiteConditions(conditions);
}

function buildJobNotes(input) {
  const notes = [];
  if (trimText(input.job_description)) notes.push(`Job description: ${trimText(input.job_description)}`);
  if (trimText(input.risk_notes)) notes.push(`Risk notes: ${trimText(input.risk_notes)}`);
  if (trimText(input.travel_notes)) notes.push(`Travel notes: ${trimText(input.travel_notes)}`);
  if (trimText(input.contact_name) || trimText(input.contact_phone)) {
    notes.push(`Contact: ${[trimText(input.contact_name), trimText(input.contact_phone)].filter(Boolean).join(' / ')}`);
  }
  if (trimText(input.notes)) notes.push(trimText(input.notes));
  return notes.length > 0 ? notes.join('\n\n') : null;
}

function buildCreateJobPayload(input, companyTimeZone) {
  const clientName = trimText(input.client_name);
  const siteName = trimText(input.site_name);
  const scheduleStatus = input.schedule_status !== undefined
    ? input.schedule_status
    : ((input.date && input.shift_start_time && input.scheduled_end_time) ? 'planned' : 'draft');
  const shiftType = validateShiftType(input.shift_type);
  const liftRiskLevel = validateLiftRiskLevel(input.lift_risk_level);

  if (!clientName || !siteName) {
    throw new Error('client_name and site_name are required');
  }

  const scheduleFields = buildJobFields({
    ...input,
    schedule_status: scheduleStatus
  }, companyTimeZone);
  const craneClassesRequired = normalizeCraneClasses(
    input.crane_classes_required || input.crane_class_required || input.crane_class
  );
  const crewRolesRequired = normalizeWorkerRoles(input.crew_roles_required);
  const roleRequirements = normalizeRoleRequirements(input.role_requirements, crewRolesRequired);

  const persistedDate = input.date || scheduleFields.scheduled_start_local?.slice(0, 10) || currentLocalDate(companyTimeZone);

  return {
    reference: trimText(input.reference),
    client_name: clientName,
    site_name: siteName,
    site_location: trimText(input.site_location),
    contact_name: trimText(input.contact_name),
    contact_phone: trimText(input.contact_phone),
    date: persistedDate,
    shift_start_time: scheduleFields.shift_start_time || null,
    shift_type: shiftType,
    estimated_duration_hours: input.estimated_duration_hours ?? null,
    crane_class_required: trimText(input.crane_class_required) || craneClassesRequired[0] || null,
    crane_classes_required: craneClassesRequired,
    job_description: trimText(input.job_description),
    task_tags: normalizeTextList(input.task_tags),
    crew_roles_required: crewRolesRequired,
    role_requirements: roleRequirements,
    required_credentials: normalizeCredentialTypes(input.required_credentials),
    site_conditions: normalizeSiteConditions(input.site_conditions),
    lift_risk_level: liftRiskLevel,
    scheduled_start_at_utc: scheduleFields.scheduled_start_at_utc,
    scheduled_end_at_utc: scheduleFields.scheduled_end_at_utc,
    job_timezone: scheduleFields.job_timezone,
    scheduled_start_local: scheduleFields.scheduled_start_local,
    scheduled_end_local: scheduleFields.scheduled_end_local,
    schedule_status: scheduleFields.schedule_status,
    risk_notes: trimText(input.risk_notes),
    travel_required: input.travel_required ? 1 : 0,
    travel_hours_estimated: input.travel_hours_estimated ?? 0,
    travel_notes: trimText(input.travel_notes),
    source_note: trimText(input.source_note),
    notes: buildJobNotes(input)
  };
}

function insertJob(db, user, payload) {
  const jobId = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO jobs (
      id, company_id, reference, client_name, site_name, site_location,
      contact_name, contact_phone, date, shift_start_time, shift_type,
      estimated_duration_hours, crane_class_required, crane_classes_required, job_description, task_tags,
      crew_roles_required, role_requirements, required_credentials, site_conditions, lift_risk_level,
      scheduled_start_at_utc, scheduled_end_at_utc, job_timezone, scheduled_start_local,
      scheduled_end_local, schedule_status, risk_notes, travel_required,
      travel_hours_estimated, travel_notes, source_note, notes, status,
      created_by_user_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)
  `).run(
    jobId,
    user.company_id,
    payload.reference,
    payload.client_name,
    payload.site_name,
    payload.site_location,
    payload.contact_name,
    payload.contact_phone,
    payload.date,
    payload.shift_start_time,
    payload.shift_type,
    payload.estimated_duration_hours,
    payload.crane_class_required,
    JSON.stringify(payload.crane_classes_required || []),
    payload.job_description,
    JSON.stringify(payload.task_tags || []),
    JSON.stringify(payload.crew_roles_required || []),
    JSON.stringify(payload.role_requirements || []),
    JSON.stringify(payload.required_credentials || []),
    JSON.stringify(payload.site_conditions || []),
    payload.lift_risk_level,
    payload.scheduled_start_at_utc,
    payload.scheduled_end_at_utc,
    payload.job_timezone,
    payload.scheduled_start_local,
    payload.scheduled_end_local,
    payload.schedule_status,
    payload.risk_notes,
    payload.travel_required,
    payload.travel_hours_estimated,
    payload.travel_notes,
    payload.source_note,
    payload.notes,
    user.id,
    now,
    now
  );

  persistJobRoleRequirements(db, user, jobId, payload.role_requirements);

  appendAuditEvent(db, {
    companyId: user.company_id,
    eventType: 'job_created',
    userId: user.id,
    jobId,
    payload: {
      client_name: payload.client_name,
      site_name: payload.site_name,
      date: payload.date,
      shift_type: payload.shift_type,
      role_requirements: payload.role_requirements,
      source: payload.source_note ? 'job_brief_import' : 'manual_console',
      ...scheduleAuditPayload(payload)
    }
  });

  return serializeJob(db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(jobId), null, db);
}

function persistJobRequirementPayload(db, user, jobId, input, source = 'catalogue') {
  if (!hasRequirementPayload(input)) return null;

  const requirements = persistJobRequirements(db, {
    companyId: user.company_id,
    jobId,
    userId: user.id,
    catalogueItemIds: input.requirement_item_ids || input.catalogue_item_ids || [],
    catalogueItemKeys: input.requirement_item_keys || [],
    customRequirements: input.custom_requirements || [],
    source
  });

  appendAuditEvent(db, {
    companyId: user.company_id,
    eventType: source === 'parsed_from_brief' ? 'job_requirement_imported_from_brief' : 'job_requirements_updated',
    userId: user.id,
    jobId,
    payload: {
      job_id: jobId,
      source,
      requirement_count: requirements.items.length,
      catalogue_item_ids: requirements.items
        .filter((item) => item.catalogue_item_id)
        .map((item) => item.catalogue_item_id),
      custom_requirement_labels: requirements.items
        .filter((item) => item.is_custom)
        .map((item) => item.label)
    }
  });

  return requirements;
}

function persistJobAssetPayload(db, user, jobId, input, source = 'manual', options = {}) {
  const hasExplicitAssetUpdate = hasAssetPayload(input)
    || hasOwn(input, 'company_asset_ids')
    || hasOwn(input, 'selected_company_asset_ids')
    || hasOwn(input, 'company_asset_id')
    || hasOwn(input, 'selected_company_asset_id')
    || hasOwn(input, 'asset_numbers')
    || hasOwn(input, 'asset_number');
  if (!hasExplicitAssetUpdate) return null;
  const assignments = persistJobAssetAssignments(db, {
    companyId: user.company_id,
    jobId,
    userId: user.id,
    assetIds: parseAssetIds(input),
    source
  });

  if (assignments.length > 0 || options.auditEmpty) {
    appendAuditEvent(db, {
      companyId: user.company_id,
      eventType: 'job_asset_selected',
      userId: user.id,
      jobId,
      payload: {
        job_id: jobId,
        source,
        asset_ids: assignments.map((assignment) => assignment.asset.id),
        asset_numbers: assignments.map((assignment) => assignment.asset.asset_number)
      }
    });
  }

  return assignments;
}

function normalizeBriefCreatePayload(input) {
  const taskTags = normalizeTextList(input.task_tags);
  const startTime = trimText(input.start_time);
  const endTime = trimText(input.end_time);
  const jobDescription = trimText(input.job_description);
  const riskNotes = trimText(input.risk_notes);
  const travelNotes = trimText(input.travel_notes);
  const crewRolesRequired = normalizeWorkerRoles(input.required_roles);
  const roleRequirements = normalizeRoleRequirements(input.role_requirements, crewRolesRequired);

  return {
    reference: trimText(input.reference),
    client_name: trimText(input.client_name),
    site_name: trimText(input.site_name) || trimText(input.site_address),
    site_location: trimText(input.site_address),
    contact_name: trimText(input.contact_name),
    contact_phone: trimText(input.contact_phone),
    date: trimText(input.scheduled_date),
    shift_start_time: startTime,
    scheduled_end_time: endTime,
    shift_type: validateShiftType(trimText(input.shift_type) || inferShiftTypeFromTime(startTime, taskTags)),
    schedule_status: normalizeScheduleStatus(trimText(input.schedule_status) || ((input.scheduled_date && startTime && endTime) ? 'planned' : 'draft')),
    estimated_duration_hours: input.estimated_duration_hours ?? durationHoursFromTimes(startTime, endTime),
    crane_class_required: trimText(input.crane_class),
    crane_classes_required: normalizeCraneClasses(input.crane_classes_required || input.crane_class),
    job_description: jobDescription,
    task_tags: taskTags,
    crew_roles_required: crewRolesRequired,
    role_requirements: roleRequirements,
    required_credentials: normalizeCredentialTypes(input.required_credentials),
    site_conditions: normalizeSiteConditions([
      ...parseJsonArray(input.site_conditions),
      ...deriveSiteConditions(riskNotes)
    ]),
    lift_risk_level: inferRiskLevel(taskTags, riskNotes, jobDescription),
    job_timezone: trimText(input.timezone),
    risk_notes: riskNotes,
    travel_required: input.travel_required !== undefined
      ? Boolean(input.travel_required)
      : inferTravelRequired(taskTags, travelNotes, jobDescription),
    travel_hours_estimated: input.travel_hours_estimated ?? null,
    travel_notes: travelNotes,
    source_note: trimText(input.source_note),
    notes: trimText(input.notes),
    crane_model_id: input.crane_model_id ?? null,
    crane_travel_state_id: input.crane_travel_state_id ?? null,
    required_capacity_tonnes: input.required_capacity_tonnes ?? null,
    lift_weight_tonnes: input.lift_weight_tonnes ?? null,
    radius_m: input.radius_m ?? null,
    height_m: input.height_m ?? null,
    counterweight_required_tonnes: input.counterweight_required_tonnes ?? null,
    site_access_notes: trimText(input.site_access_notes),
    setup_notes: trimText(input.setup_notes),
    source_confidence: trimText(input.source_confidence),
    requirement_item_ids: Array.isArray(input.requirement_item_ids) ? input.requirement_item_ids : [],
    requirement_item_keys: Array.isArray(input.requirement_item_keys) ? input.requirement_item_keys : [],
    custom_requirements: Array.isArray(input.custom_requirements) ? input.custom_requirements : [],
    company_asset_ids: parseAssetIds(input)
  };
}

function scheduleAuditPayload(jobRow) {
  return {
    schedule_status: jobRow.schedule_status,
    job_timezone: jobRow.job_timezone,
    scheduled_start_at_utc: jobRow.scheduled_start_at_utc,
    scheduled_end_at_utc: jobRow.scheduled_end_at_utc,
    scheduled_start_local: jobRow.scheduled_start_local,
    scheduled_end_local: jobRow.scheduled_end_local
  };
}

router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const { status, schedule_status, timezone } = req.query;

  let sql = `SELECT * FROM jobs WHERE company_id = ?`;
  const params = [req.user.company_id];
  if (req.query.include_archived !== 'true') {
    sql += ` AND archived_at IS NULL`;
  }
  if (status) {
    sql += ` AND status = ?`;
    params.push(status);
  }
  if (schedule_status) {
    sql += ` AND schedule_status = ?`;
    params.push(schedule_status);
  }
  sql += ` ORDER BY COALESCE(scheduled_start_at_utc, date || 'T00:00:00Z') ASC, created_at DESC`;

  const jobs = db.prepare(sql).all(...params).map((row) => serializeJob(row, timezone || null, db));
  res.json(jobs);
});

router.get('/suggestions', requireAuth, (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT client_name, site_name, site_location, site_conditions
    FROM jobs
    WHERE company_id = ?
      AND archived_at IS NULL
    ORDER BY updated_at DESC, created_at DESC
    LIMIT 250
  `).all(req.user.company_id);

  const pick = (field) => Array.from(new Set(rows
    .map((row) => String(row[field] || '').trim())
    .filter(Boolean))).slice(0, 50);

  const siteConditionMap = {};
  for (const row of rows) {
    const siteKey = String(row.site_name || row.site_location || '').trim();
    if (!siteKey) continue;
    const conditions = normalizeSiteConditions(row.site_conditions);
    if (conditions.length === 0) continue;
    siteConditionMap[siteKey] = Array.from(new Set([...(siteConditionMap[siteKey] || []), ...conditions]));
  }

  res.json({
    client_names: pick('client_name'),
    site_names: pick('site_name'),
    site_locations: pick('site_location'),
    site_conditions_by_site: siteConditionMap
  });
});

router.post('/', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  const db = getDb();
  const companyTimeZone = getCompanyTimeZone(db, req.user.company_id);

  try {
    const payload = buildCreateJobPayload({
      ...req.body,
      notes: req.body.notes
    }, companyTimeZone);
    let job;
    db.transaction(() => {
      job = insertJob(db, req.user, payload);
      persistJobCraneAssessment(db, req.user, job.id, {
        ...req.body,
        crane_class_required: payload.crane_class_required,
        travel_notes: payload.travel_notes,
        source_note: payload.source_note
      });
      persistJobRequirementPayload(db, req.user, job.id, req.body, 'catalogue');
      persistJobAssetPayload(db, req.user, job.id, req.body, 'manual');
      job = serializeJob(db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(job.id), null, db);
    })();
    return res.status(201).json(job);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.post('/import-brief/preview', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  let validated;
  try {
    validated = validateJobBriefImportPayload(req.body);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const db = getDb();
  const availableCraneModels = listCraneModels(db);
  const parsed = parseJobBrief(validated.content, { availableCraneModels });
  if (
    parsed.extracted.crane_model_id
    && parsed.extracted.counterweight_required_tonnes != null
    && !parsed.extracted.crane_travel_state_id
  ) {
    const matchedState = findTravelStateByCarriedCounterweight(
      db,
      parsed.extracted.crane_model_id,
      parsed.extracted.counterweight_required_tonnes
    );
    if (matchedState) {
      parsed.extracted.crane_travel_state_id = matchedState.id;
      parsed.extracted.crane_travel_state_label = matchedState.state_label;
      parsed.confidence.crane_travel_state = parsed.confidence.counterweight_required_tonnes || 'medium';
      if (matchedState.review_required) {
        parsed.warnings = Array.from(new Set([
          ...(parsed.warnings || []),
          'Matched travel state is review-gated. Confirm carried counterweight and road-access basis before dispatch.'
        ]));
      }
    }
  }
  const companyOperatingMode = getCompanyOperatingMode(db, req.user.company_id);
  const isLabourOnly = companyOperatingMode === 'labour_only';
  const requirementMapping = mapParsedTermsToCatalogue(db, req.user.company_id, validated.content);
  const assetMapping = mapAssetReferencesFromText(db, req.user.company_id, validated.content);
  parsed.extracted.structured_requirements = requirementMapping;
  parsed.extracted.requirement_item_ids = requirementMapping.selected_catalogue_item_ids;
  parsed.extracted.requirement_item_keys = requirementMapping.selected_catalogue_item_keys;
  parsed.extracted.suggested_requirement_item_keys = requirementMapping.suggested_catalogue_item_keys;
  parsed.extracted.custom_requirements = requirementMapping.one_off_custom_requirements;
  parsed.extracted.suggested_assets = isLabourOnly ? [] : assetMapping.matched_assets;
  parsed.extracted.company_asset_ids = isLabourOnly ? [] : assetMapping.matched_asset_ids;
  parsed.extracted.unknown_asset_numbers = assetMapping.unknown_asset_numbers;
  if (requirementMapping.warnings.length > 0) {
    parsed.warnings = Array.from(new Set([...(parsed.warnings || []), ...requirementMapping.warnings]));
  }
  if (assetMapping.warnings.length > 0) {
    parsed.warnings = Array.from(new Set([...(parsed.warnings || []), ...assetMapping.warnings]));
  }
  if (isLabourOnly && (assetMapping.matched_assets.length > 0 || assetMapping.unknown_asset_numbers.length > 0)) {
    parsed.warnings = Array.from(new Set([
      ...(parsed.warnings || []),
      'This job brief mentions equipment or transport, but this company is configured as labour-only. Confirm whether DispatchTalon should track this for the job.'
    ]));
  }
  const importId = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO job_imports (
      id, company_id, user_id, source_type, filename, original_text,
      parsed_payload_json, confidence_json, warnings_json, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'parsed', ?, ?)
  `).run(
    importId,
    req.user.company_id,
    req.user.id,
    validated.source_type,
    validated.filename,
    validated.content,
    JSON.stringify(parsed.extracted),
    JSON.stringify(parsed.confidence),
    JSON.stringify(parsed.warnings),
    now,
    now
  );

  appendAuditEvent(db, {
    companyId: req.user.company_id,
    eventType: 'job_brief_import_previewed',
    userId: req.user.id,
    payload: {
      import_id: importId,
      source_type: validated.source_type,
      filename: validated.filename,
      extracted_summary: {
        client_name: parsed.extracted.client_name,
        site_name: parsed.extracted.site_name,
        scheduled_date: parsed.extracted.scheduled_date,
        timezone: parsed.extracted.timezone,
        required_roles: parsed.extracted.required_roles,
        role_requirements: parsed.extracted.role_requirements,
        required_credentials: parsed.extracted.required_credentials,
        task_tags: parsed.extracted.task_tags
      },
      warning_count: parsed.warnings.length
    }
  });

  return res.json({
    import_id: importId,
    extracted: parsed.extracted,
    confidence: parsed.confidence,
    warnings: parsed.warnings
  });
});

router.post('/import-brief/:importId/create-job', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  const db = getDb();
  const importRow = db.prepare(`
    SELECT *
    FROM job_imports
    WHERE id = ? AND company_id = ?
  `).get(req.params.importId, req.user.company_id);

  if (!importRow) {
    return res.status(404).json({ error: 'Job brief import not found' });
  }

  if (!VALID_JOB_IMPORT_STATUSES.includes(importRow.status) || importRow.status !== 'parsed') {
    if (importRow.status === 'job_created' && importRow.created_job_id) {
      return res.status(409).json({ error: 'A job has already been created from this brief', created_job_id: importRow.created_job_id });
    }
    return res.status(409).json({ error: 'Job brief import is not in a creatable state' });
  }

  const companyTimeZone = getCompanyTimeZone(db, req.user.company_id);
  let payload;
  try {
    const normalizedImport = normalizeBriefCreatePayload(req.body);
    payload = buildCreateJobPayload(normalizedImport, companyTimeZone);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  let createdJob;
  const now = new Date().toISOString();
  db.transaction(() => {
    createdJob = insertJob(db, req.user, payload);
    persistJobCraneAssessment(db, req.user, createdJob.id, {
      ...req.body,
      ...payload,
      crane_class_required: payload.crane_class_required
    });
    persistJobRequirementPayload(db, req.user, createdJob.id, req.body, 'parsed_from_brief');
    persistJobAssetPayload(db, req.user, createdJob.id, req.body, 'suggested');
    db.prepare(`
      UPDATE job_imports
      SET created_job_id = ?, status = 'job_created', parsed_payload_json = ?, updated_at = ?
      WHERE id = ?
    `).run(
      createdJob.id,
      JSON.stringify(req.body || {}),
      now,
      req.params.importId
    );

    appendAuditEvent(db, {
      companyId: req.user.company_id,
      eventType: 'job_created_from_brief',
      userId: req.user.id,
      jobId: createdJob.id,
      payload: {
        import_id: req.params.importId,
        source_type: importRow.source_type,
        filename: importRow.filename,
        created_job_id: createdJob.id
      }
    });

    createdJob = serializeJob(
      db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(createdJob.id),
      null,
      db
    );
  })();

  return res.status(201).json(createdJob);
});

router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const job = serializeJob(
    db.prepare(`SELECT * FROM jobs WHERE id = ? AND company_id = ?`).get(req.params.id, req.user.company_id),
    null,
    db
  );
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

router.get('/:id/requirements', requireAuth, (req, res) => {
  const db = getDb();
  const job = db.prepare(`SELECT id FROM jobs WHERE id = ? AND company_id = ?`)
    .get(req.params.id, req.user.company_id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  res.json(listJobRequirements(db, req.user.company_id, req.params.id));
});

router.get('/:id/assets', requireAuth, (req, res) => {
  const db = getDb();
  const job = db.prepare(`SELECT id FROM jobs WHERE id = ? AND company_id = ?`)
    .get(req.params.id, req.user.company_id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  return res.json({ assignments: listJobAssetAssignments(db, req.user.company_id, req.params.id) });
});

router.post('/:id/custom-requirements', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  const db = getDb();
  const job = db.prepare(`SELECT id FROM jobs WHERE id = ? AND company_id = ?`)
    .get(req.params.id, req.user.company_id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  try {
    const created = addCustomRequirementToJob(db, {
      companyId: req.user.company_id,
      jobId: req.params.id,
      userId: req.user.id,
      category: req.body.category || 'custom',
      label: req.body.label,
      notes: req.body.notes || null
    });

    appendAuditEvent(db, {
      companyId: req.user.company_id,
      eventType: 'job_custom_requirement_added',
      userId: req.user.id,
      jobId: req.params.id,
      payload: {
        job_id: req.params.id,
        custom_requirement_id: created.custom_requirement_id,
        category: created.category,
        label: created.custom_label
      }
    });

    res.status(201).json(listJobRequirements(db, req.user.company_id, req.params.id));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.patch('/:id', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  const db = getDb();
  const existing = db.prepare(`SELECT * FROM jobs WHERE id = ? AND company_id = ?`)
    .get(req.params.id, req.user.company_id);
  if (!existing) return res.status(404).json({ error: 'Job not found' });
  if (existing.archived_at) {
    return res.status(409).json({
      error: 'Job has been cleared from active dispatch.',
      archived_at: existing.archived_at
    });
  }

  const nextStatus = hasOwn(req.body, 'status') ? req.body.status : existing.status;
  if (nextStatus && !VALID_JOB_STATUSES.includes(nextStatus)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_JOB_STATUSES.join(', ')}` });
  }
  if (hasOwn(req.body, 'shift_type') && !VALID_SHIFT_TYPES.includes(req.body.shift_type)) {
    return res.status(400).json({ error: `shift_type must be one of: ${VALID_SHIFT_TYPES.join(', ')}` });
  }
  if (hasOwn(req.body, 'lift_risk_level') && !VALID_RISK_LEVELS.includes(req.body.lift_risk_level)) {
    return res.status(400).json({ error: `lift_risk_level must be one of: ${VALID_RISK_LEVELS.join(', ')}` });
  }

  const companyTimeZone = getCompanyTimeZone(db, req.user.company_id);
  let scheduleFields;
  try {
    scheduleFields = buildJobFields(req.body, companyTimeZone, existing);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const nextDate = hasOwn(req.body, 'date')
    ? (req.body.date || scheduleFields.scheduled_start_local?.slice(0, 10) || existing.date)
    : existing.date;
  const updates = [];
  const params = [];
  const changedFields = [];
  let nextRoleRequirementsForSave = null;

  function queueUpdate(column, value, existingValue = existing[column]) {
    const current = existingValue === undefined ? null : existingValue;
    const next = value === undefined ? null : value;
    if (current === next) return;
    updates.push(`${column} = ?`);
    params.push(next);
    changedFields.push(column);
  }

  if (hasOwn(req.body, 'reference')) queueUpdate('reference', trimText(req.body.reference), existing.reference || null);
  if (hasOwn(req.body, 'client_name')) {
    const nextClient = trimText(req.body.client_name);
    if (!nextClient) return res.status(400).json({ error: 'client_name is required' });
    queueUpdate('client_name', nextClient);
  }
  if (hasOwn(req.body, 'site_name')) {
    const nextSite = trimText(req.body.site_name);
    if (!nextSite) return res.status(400).json({ error: 'site_name is required' });
    queueUpdate('site_name', nextSite);
  }
  if (hasOwn(req.body, 'site_location')) queueUpdate('site_location', trimText(req.body.site_location), existing.site_location || null);
  if (hasOwn(req.body, 'contact_name')) queueUpdate('contact_name', trimText(req.body.contact_name), existing.contact_name || null);
  if (hasOwn(req.body, 'contact_phone')) queueUpdate('contact_phone', trimText(req.body.contact_phone), existing.contact_phone || null);
  if (nextDate !== existing.date) queueUpdate('date', nextDate);
  if (hasOwn(req.body, 'shift_type')) queueUpdate('shift_type', req.body.shift_type);
  if (hasOwn(req.body, 'estimated_duration_hours')) queueUpdate('estimated_duration_hours', toNumberOrNull(req.body.estimated_duration_hours), existing.estimated_duration_hours);
  if (hasOwn(req.body, 'crane_class_required') || hasOwn(req.body, 'crane_classes_required')) {
    const nextCraneClasses = normalizeCraneClasses(
      hasOwn(req.body, 'crane_classes_required') ? req.body.crane_classes_required : req.body.crane_class_required
    );
    queueUpdate('crane_classes_required', JSON.stringify(nextCraneClasses), existing.crane_classes_required || '[]');
    queueUpdate('crane_class_required', trimText(req.body.crane_class_required) || nextCraneClasses[0] || null, existing.crane_class_required || null);
  }
  if (hasOwn(req.body, 'job_description')) queueUpdate('job_description', trimText(req.body.job_description), existing.job_description || null);
  if (hasOwn(req.body, 'task_tags')) queueUpdate('task_tags', JSON.stringify(normalizeTextList(req.body.task_tags)), existing.task_tags);
  if (hasOwn(req.body, 'crew_roles_required') || hasOwn(req.body, 'role_requirements')) {
    const baseCrewRoles = hasOwn(req.body, 'crew_roles_required')
      ? normalizeWorkerRoles(req.body.crew_roles_required)
      : normalizeWorkerRoles(existing.crew_roles_required);
    nextRoleRequirementsForSave = normalizeRoleRequirements(
      hasOwn(req.body, 'role_requirements') ? req.body.role_requirements : existing.role_requirements,
      baseCrewRoles
    );
    const nextCrewRoles = hasOwn(req.body, 'crew_roles_required')
      ? baseCrewRoles
      : nextRoleRequirementsForSave.map((requirement) => requirement.role_key);
    queueUpdate('crew_roles_required', JSON.stringify(nextCrewRoles), existing.crew_roles_required);
    queueUpdate('role_requirements', JSON.stringify(nextRoleRequirementsForSave), existing.role_requirements || '[]');
  }
  if (hasOwn(req.body, 'required_credentials')) queueUpdate('required_credentials', JSON.stringify(normalizeCredentialTypes(req.body.required_credentials)), existing.required_credentials);
  if (hasOwn(req.body, 'site_conditions')) queueUpdate('site_conditions', JSON.stringify(normalizeSiteConditions(req.body.site_conditions)), existing.site_conditions);
  if (hasOwn(req.body, 'lift_risk_level')) queueUpdate('lift_risk_level', req.body.lift_risk_level);
  queueUpdate('shift_start_time', scheduleFields.shift_start_time || null, existing.shift_start_time || null);
  queueUpdate('scheduled_start_at_utc', scheduleFields.scheduled_start_at_utc, existing.scheduled_start_at_utc || null);
  queueUpdate('scheduled_end_at_utc', scheduleFields.scheduled_end_at_utc, existing.scheduled_end_at_utc || null);
  queueUpdate('job_timezone', scheduleFields.job_timezone, existing.job_timezone || null);
  queueUpdate('scheduled_start_local', scheduleFields.scheduled_start_local, existing.scheduled_start_local || null);
  queueUpdate('scheduled_end_local', scheduleFields.scheduled_end_local, existing.scheduled_end_local || null);
  queueUpdate('schedule_status', scheduleFields.schedule_status, existing.schedule_status || null);
  if (hasOwn(req.body, 'risk_notes')) queueUpdate('risk_notes', trimText(req.body.risk_notes), existing.risk_notes || null);
  if (hasOwn(req.body, 'travel_required')) queueUpdate('travel_required', req.body.travel_required ? 1 : 0, Number(existing.travel_required || 0));
  if (hasOwn(req.body, 'travel_hours_estimated')) queueUpdate('travel_hours_estimated', toNumberOrNull(req.body.travel_hours_estimated), existing.travel_hours_estimated);
  if (hasOwn(req.body, 'travel_notes')) queueUpdate('travel_notes', trimText(req.body.travel_notes), existing.travel_notes || null);
  if (hasOwn(req.body, 'source_note')) queueUpdate('source_note', trimText(req.body.source_note), existing.source_note || null);
  if (hasOwn(req.body, 'notes')) queueUpdate('notes', trimText(req.body.notes), existing.notes || null);
  if (hasOwn(req.body, 'status')) queueUpdate('status', req.body.status);

  const now = new Date().toISOString();

  const updated = db.transaction(() => {
    if (updates.length > 0) {
      updates.push('updated_at = ?');
      params.push(now, req.params.id, req.user.company_id);
      db.prepare(`
        UPDATE jobs
        SET ${updates.join(', ')}
        WHERE id = ? AND company_id = ?
      `).run(...params);
    }

    persistJobCraneAssessment(db, req.user, req.params.id, req.body);
    persistJobRequirementPayload(db, req.user, req.params.id, req.body, 'catalogue');
    persistJobAssetPayload(db, req.user, req.params.id, req.body, 'manual', { auditEmpty: true });
    if (nextRoleRequirementsForSave) {
      persistJobRoleRequirements(db, req.user, req.params.id, nextRoleRequirementsForSave);
    }

    const saved = db.prepare(`SELECT * FROM jobs WHERE id = ? AND company_id = ?`).get(req.params.id, req.user.company_id);
    if (changedFields.length > 0) {
      appendAuditEvent(db, {
        companyId: req.user.company_id,
        eventType: 'job_updated',
        userId: req.user.id,
        jobId: req.params.id,
        payload: {
          changed_fields: Array.from(new Set(changedFields)),
          updated_at: now
        }
      });
    }

    if (changedFields.includes('crew_roles_required') || changedFields.includes('role_requirements')) {
      appendAuditEvent(db, {
        companyId: req.user.company_id,
        eventType: 'job_required_roles_updated',
        userId: req.user.id,
        jobId: req.params.id,
        payload: {
          roles: nextRoleRequirementsForSave
            ? nextRoleRequirementsForSave.map((requirement) => requirement.role_key)
            : normalizeWorkerRoles(req.body.crew_roles_required),
          role_requirements: nextRoleRequirementsForSave || []
        }
      });
    }

    if (changedFields.includes('required_credentials')) {
      const credentials = normalizeCredentialTypes(req.body.required_credentials);
      appendAuditEvent(db, {
        companyId: req.user.company_id,
        eventType: 'job_credentials_updated',
        userId: req.user.id,
        jobId: req.params.id,
        payload: {
          credentials,
          credential_labels: credentials.map(credentialDisplayLabel)
        }
      });
    }

    if (changedFields.includes('crane_classes_required') || changedFields.includes('crane_class_required')) {
      appendAuditEvent(db, {
        companyId: req.user.company_id,
        eventType: 'job_equipment_requirements_updated',
        userId: req.user.id,
        jobId: req.params.id,
        payload: {
          crane_classes_required: normalizeCraneClasses(req.body.crane_classes_required || req.body.crane_class_required)
        }
      });
    }

    if (changedFields.includes('site_conditions')) {
      appendAuditEvent(db, {
        companyId: req.user.company_id,
        eventType: 'job_site_conditions_updated',
        userId: req.user.id,
        jobId: req.params.id,
        payload: {
          site_conditions: normalizeSiteConditions(req.body.site_conditions)
        }
      });
    }

    if (changedFields.some((field) => ['task_tags', 'notes', 'job_description'].includes(field))) {
      appendAuditEvent(db, {
        companyId: req.user.company_id,
        eventType: 'job_additional_requirements_updated',
        userId: req.user.id,
        jobId: req.params.id,
        payload: {
          changed_fields: changedFields.filter((field) => ['task_tags', 'notes', 'job_description'].includes(field))
        }
      });
    }

    if (hasOwn(req.body, 'status') && req.body.status !== existing.status) {
      appendAuditEvent(db, {
        companyId: req.user.company_id,
        eventType: 'job_status_changed',
        userId: req.user.id,
        jobId: req.params.id,
        payload: { from: existing.status, to: req.body.status }
      });
    }

    const beforeSchedule = JSON.stringify(scheduleAuditPayload(existing));
    const afterSchedule = JSON.stringify(scheduleAuditPayload(saved));
    if (beforeSchedule !== afterSchedule) {
      appendAuditEvent(db, {
        companyId: req.user.company_id,
        eventType: 'job_schedule_changed',
        userId: req.user.id,
        jobId: req.params.id,
        payload: {
          before: scheduleAuditPayload(existing),
          after: scheduleAuditPayload(saved)
        }
      });
    }

    return saved;
  })();

  res.json(serializeJob(updated, null, db));
});

router.get('/:id/smartrank', requireAuth, requireRole('admin', 'dispatcher', 'supervisor'), (req, res) => {
  const db = getDb();
  const jobRow = db.prepare(`SELECT * FROM jobs WHERE id = ? AND company_id = ?`)
    .get(req.params.id, req.user.company_id);
  if (!jobRow) return res.status(404).json({ error: 'Job not found' });

  const job = serializeJob(jobRow, null, db);
  let {
    workers,
    credsByWorker,
    fatigueByWorker,
    allocsByWorker,
    preferencesByWorker
  } = fetchSmartRankData(db, req.user.company_id);

  if (req.query.role) {
    workers = workers.filter((worker) => worker.role === req.query.role);
  }

  const roleCompatibilityRules = listRoleCompatibilityRules(db, req.user.company_id);
  const { ranked, blocked, role_coverage_plan } = rankWorkersForJob(
    workers,
    job,
    credsByWorker,
    fatigueByWorker,
    allocsByWorker,
    preferencesByWorker,
    { roleCompatibilityRules }
  );

  const result = { job, ranked, blocked, role_coverage_plan, generated_at: new Date().toISOString() };

  appendAuditEvent(db, {
    companyId: req.user.company_id,
    eventType: 'smartrank_generated',
    userId: req.user.id,
    jobId: job.id,
    payload: {
      ranked_count: ranked.length,
      blocked_count: blocked.length,
      role_coverage_suggested_minimum_headcount: role_coverage_plan.suggested_minimum_headcount,
      role_coverage_review_required: role_coverage_plan.review_required
    }
  });

  if (role_coverage_plan.assignments.length > 0) {
    appendAuditEvent(db, {
      companyId: req.user.company_id,
      eventType: 'role_coverage_suggested',
      userId: req.user.id,
      jobId: job.id,
      payload: {
        suggested_minimum_headcount: role_coverage_plan.suggested_minimum_headcount,
        conservative_headcount: role_coverage_plan.conservative_headcount,
        assignments: role_coverage_plan.assignments.map((assignment) => ({
          worker_id: assignment.worker_id,
          roles_covered: assignment.roles_covered,
          review_required: assignment.review_required
        })),
        unfilled_roles: role_coverage_plan.unfilled_roles
      }
    });
  }

  const learnedSignals = ranked.flatMap((entry) =>
    (entry.preference_signals || [])
      .filter((signal) => signal.source === 'learned')
      .map((signal) => ({
        worker_id: entry.worker.id,
        worker_name: entry.worker.name,
        task_tag: signal.task_tag,
        rating: signal.rating,
        approval_count: signal.approval_count,
        confidence: signal.confidence
      }))
  );

  if (learnedSignals.length > 0) {
    appendAuditEvent(db, {
      companyId: req.user.company_id,
      eventType: 'learned_preference_applied',
      userId: req.user.id,
      jobId: job.id,
      payload: {
        applied_count: learnedSignals.length,
        signals: learnedSignals.slice(0, 10)
      }
    });
  }

  res.json(result);
});

router.get('/:id/allocation-notifications', requireAuth, (req, res) => {
  const db = getDb();
  const job = db.prepare(`SELECT id FROM jobs WHERE id = ? AND company_id = ?`)
    .get(req.params.id, req.user.company_id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  return res.json({
    notifications: listAllocationNotifications(db, {
      companyId: req.user.company_id,
      jobId: req.params.id
    })
  });
});

router.post('/:id/allocation-notifications/preview', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  const db = getDb();
  const job = db.prepare(`SELECT id FROM jobs WHERE id = ? AND company_id = ?`)
    .get(req.params.id, req.user.company_id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  try {
    const preview = createPreviewNotification(db, {
      user: req.user,
      jobId: req.params.id,
      allocationId: req.body.allocation_id || null,
      workerId: req.body.worker_id || null
    });
    return res.status(201).json(preview);
  } catch (error) {
    return res.status(error.status || 400).json({
      error: error.message,
      warning: error.warning || null
    });
  }
});

router.post('/:id/allocation-notifications/publish-manual', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  const db = getDb();
  const job = db.prepare(`SELECT id FROM jobs WHERE id = ? AND company_id = ?`)
    .get(req.params.id, req.user.company_id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  try {
    const result = publishManualNotification(db, {
      user: req.user,
      jobId: req.params.id,
      allocationId: req.body.allocation_id || null,
      workerId: req.body.worker_id || null,
      notificationId: req.body.notification_id || null,
      manualContactAcknowledged: Boolean(req.body.manual_contact_acknowledged)
    });
    return res.json(result);
  } catch (error) {
    return res.status(error.status || 400).json({
      error: error.message,
      warning: error.warning || null
    });
  }
});

router.post('/:id/allocation-notifications/send-sms', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  const db = getDb();
  const job = db.prepare(`SELECT id FROM jobs WHERE id = ? AND company_id = ?`)
    .get(req.params.id, req.user.company_id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const enabled = String(process.env.SMS_PROVIDER_ENABLED || '').toLowerCase() === 'true';
  return res.status(501).json({
    error: enabled
      ? 'SMS provider sending is not implemented in this release.'
      : 'SMS provider sending is disabled. Use manual SMS preview and publish for this release.',
    provider_enabled: enabled
  });
});

router.get('/:id/allocations', requireAuth, (req, res) => {
  const db = getDb();
  const job = db.prepare(`SELECT id FROM jobs WHERE id = ? AND company_id = ?`)
    .get(req.params.id, req.user.company_id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const allocations = db.prepare(`
    SELECT
      a.*,
      j.job_timezone,
      j.schedule_status AS job_schedule_status,
      j.scheduled_start_at_utc AS job_scheduled_start_at_utc,
      j.scheduled_end_at_utc AS job_scheduled_end_at_utc,
      j.scheduled_start_local,
      j.scheduled_end_local,
      w.name AS worker_name,
      w.contact_number AS worker_phone
    FROM allocations a
    JOIN jobs j ON a.job_id = j.id
    JOIN workers w ON a.worker_id = w.id AND w.company_id = a.company_id
    WHERE a.job_id = ? AND a.company_id = ?
    ORDER BY a.allocated_at DESC
  `).all(req.params.id, req.user.company_id);

  res.json(allocations.map((allocation) => serializeAllocation(allocation, null, db)));
});

router.post('/:id/allocations', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  const db = getDb();
  const { worker_id, override_reason } = req.body;

  if (!worker_id) {
    return res.status(400).json({ error: 'worker_id is required' });
  }

  const jobRow = db.prepare(`SELECT * FROM jobs WHERE id = ? AND company_id = ?`)
    .get(req.params.id, req.user.company_id);
  if (!jobRow) return res.status(404).json({ error: 'Job not found' });
  const job = serializeJob(jobRow, null, db);

  if (!['open', 'draft'].includes(job.status)) {
    return res.status(422).json({
      error: `Job status is '${job.status}' - only 'open' or 'draft' jobs can be allocated`
    });
  }

  const worker = db.prepare(`SELECT * FROM workers WHERE id = ? AND company_id = ?`)
    .get(worker_id, req.user.company_id);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });
  if (worker.archived_at) {
    appendAuditEvent(db, {
      companyId: req.user.company_id,
      eventType: 'allocation_rejected',
      userId: req.user.id,
      workerId: worker_id,
      jobId: job.id,
      payload: {
        reason: 'archived_worker',
        archived_at: worker.archived_at
      }
    });
    return res.status(422).json({ error: 'Worker has been removed from active dispatch.' });
  }

  const {
    workers,
    credsByWorker,
    fatigueByWorker,
    allocsByWorker,
    preferencesByWorker
  } = fetchSmartRankData(db, req.user.company_id);

  const roleCompatibilityRules = listRoleCompatibilityRules(db, req.user.company_id);
  const { ranked, blocked, role_coverage_plan } = rankWorkersForJob(
    workers,
    job,
    credsByWorker,
    fatigueByWorker,
    allocsByWorker,
    preferencesByWorker,
    { roleCompatibilityRules }
  );

  const blockedEntry = blocked.find((entry) => entry.worker.id === worker_id);
  if (blockedEntry) {
    appendAuditEvent(db, {
      companyId: req.user.company_id,
      eventType: 'allocation_rejected',
      userId: req.user.id,
      workerId: worker_id,
      jobId: job.id,
      payload: { reason: 'hard_block', blocks: blockedEntry.blocks }
    });
    return res.status(422).json({
      error: 'Worker is hard-blocked and cannot be allocated to this job',
      blocks: blockedEntry.blocks
    });
  }

  const rankedEntry = ranked.find((entry) => entry.worker.id === worker_id);
  if (!rankedEntry) {
    return res.status(422).json({ error: 'Worker is not available for this job' });
  }

  const { rank, score, score_breakdown, warnings, preference_signals } = rankedEntry;
  let confirmedRoleCoverage;
  try {
    confirmedRoleCoverage = validateRequestedRoleCoverage(
      worker,
      job,
      credsByWorker[worker_id] || [],
      req.body.role_coverage || req.body.roles_covered || rankedEntry.role_coverage?.suggested_roles || [],
      { roleCompatibilityRules }
    );
  } catch (error) {
    return res.status(error.status || 400).json({
      error: error.message,
      invalid_roles: error.invalid_roles || []
    });
  }

  const effectiveWarnings = Array.from(
    new Map(
      [
        ...(warnings || []),
        ...(confirmedRoleCoverage.warnings || [])
      ].map((warning) => [JSON.stringify(warning), warning])
    ).values()
  );

  const overrideRequired = effectiveWarnings.length > 0 || rank > 1;
  if (overrideRequired && !override_reason) {
    return res.status(422).json({
      error: effectiveWarnings.length > 0
        ? 'Worker has active warnings. Provide override_reason to confirm this allocation.'
        : 'Selected worker is not top-ranked. Provide override_reason to confirm this allocation.',
      warnings: effectiveWarnings,
      rank
    });
  }

  const snapshot = {
    generated_at: new Date().toISOString(),
    score,
    rank_of_selected: rank,
    total_ranked: ranked.length,
    total_blocked: blocked.length,
    score_breakdown,
    role_coverage: confirmedRoleCoverage,
    role_coverage_plan,
    preference_signals,
    schedule: job.schedule,
    ranking_summary: ranked.map((entry) => ({
      worker_id: entry.worker.id,
      worker_name: entry.worker.name,
      score: entry.score,
      rank: entry.rank
    }))
  };

  const blockedSummary = blocked.map((entry) => ({
    worker_id: entry.worker.id,
    worker_name: entry.worker.name,
    block_types: entry.blocks.map((block) => block.type)
  }));

  const allocationId = randomUUID();
  const now = new Date().toISOString();

  db.transaction(() => {
    db.prepare(`
      INSERT INTO allocations (
        id, job_id, worker_id, company_id, allocated_by_user_id,
        smartrank_position, smartrank_score, smartrank_snapshot,
        active_warnings, active_blocks_on_others, override_reason,
        allocation_start_at_utc, allocation_end_at_utc, allocation_timezone, allocation_status,
        status, allocated_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)
    `).run(
      allocationId,
      job.id,
      worker_id,
      req.user.company_id,
      req.user.id,
      rank,
      score,
      JSON.stringify(snapshot),
      JSON.stringify(effectiveWarnings),
      JSON.stringify(blockedSummary),
      override_reason || null,
      job.scheduled_start_at_utc || null,
      job.scheduled_end_at_utc || null,
      job.job_timezone || null,
      job.schedule_status || null,
      now,
      now
    );

    db.prepare(`UPDATE jobs SET status = 'allocated', updated_at = ? WHERE id = ?`)
      .run(now, job.id);

    insertAllocationRoleCoverages(db, {
      companyId: req.user.company_id,
      jobId: job.id,
      allocationId,
      workerId: worker_id,
      roles: confirmedRoleCoverage.suggested_roles,
      source: 'dispatcher_confirmed',
      reviewRequired: confirmedRoleCoverage.review_required,
      reviewReason: confirmedRoleCoverage.review_required ? (override_reason || null) : null
    });

    appendAuditEvent(db, {
      companyId: req.user.company_id,
      eventType: 'allocation_confirmed',
      userId: req.user.id,
      workerId: worker_id,
      jobId: job.id,
      allocationId,
      payload: {
        smartrank_position: rank,
        score,
        warnings_count: effectiveWarnings.length,
        role_coverage: confirmedRoleCoverage.suggested_roles,
        role_coverage_review_required: confirmedRoleCoverage.review_required,
        schedule: job.schedule
      }
    });

    appendAuditEvent(db, {
      companyId: req.user.company_id,
      eventType: 'role_coverage_confirmed',
      userId: req.user.id,
      workerId: worker_id,
      jobId: job.id,
      allocationId,
      payload: {
        roles_covered: confirmedRoleCoverage.suggested_roles,
        role_labels: confirmedRoleCoverage.suggested_role_labels,
        review_required: confirmedRoleCoverage.review_required,
        reason: override_reason || null
      }
    });

    if (confirmedRoleCoverage.review_required) {
      appendAuditEvent(db, {
        companyId: req.user.company_id,
        eventType: 'role_coverage_review_required',
        userId: req.user.id,
        workerId: worker_id,
        jobId: job.id,
        allocationId,
        payload: {
          roles_covered: confirmedRoleCoverage.suggested_roles,
          warnings: confirmedRoleCoverage.warnings,
          review_reason: override_reason || null
        }
      });
    }

    if (confirmedRoleCoverage.review_required && override_reason) {
      appendAuditEvent(db, {
        companyId: req.user.company_id,
        eventType: 'role_coverage_override_recorded',
        userId: req.user.id,
        workerId: worker_id,
        jobId: job.id,
        allocationId,
        payload: {
          roles_covered: confirmedRoleCoverage.suggested_roles,
          override_reason
        }
      });
    }

    if (effectiveWarnings.length > 0 && override_reason) {
      appendAuditEvent(db, {
        companyId: req.user.company_id,
        eventType: 'warning_acknowledged',
        userId: req.user.id,
        workerId: worker_id,
        jobId: job.id,
        allocationId,
        payload: {
          warnings: effectiveWarnings,
          override_reason,
          schedule: job.schedule
        }
      });
    }

    if (rank > 1) {
      appendAuditEvent(db, {
        companyId: req.user.company_id,
        eventType: 'non_top_ranked_selected',
        userId: req.user.id,
        workerId: worker_id,
        jobId: job.id,
        allocationId,
        payload: {
          selected_rank: rank,
          top_ranked_worker_id: ranked[0]?.worker.id,
          top_ranked_worker_name: ranked[0]?.worker.name,
          override_reason: override_reason || null,
          schedule: job.schedule
        }
      });
    }

    upsertLearnedPreferencesFromAllocation(db, appendAuditEvent, {
      companyId: req.user.company_id,
      workerId: worker_id,
      job,
      userId: req.user.id,
      allocationId,
      selectedRank: rank,
      overrideReason: override_reason || null
    });
  })();

  const allocationRow = db.prepare(`
    SELECT
      a.*,
      j.job_timezone,
      j.schedule_status AS job_schedule_status,
      j.scheduled_start_at_utc AS job_scheduled_start_at_utc,
      j.scheduled_end_at_utc AS job_scheduled_end_at_utc,
      j.scheduled_start_local,
      j.scheduled_end_local,
      w.name AS worker_name,
      w.contact_number AS worker_phone
    FROM allocations a
    JOIN jobs j ON a.job_id = j.id
    JOIN workers w ON a.worker_id = w.id AND w.company_id = a.company_id
    WHERE a.id = ?
  `).get(allocationId);

  res.status(201).json(serializeAllocation(allocationRow, null, db));
});

router.patch('/:jobId/allocations/:allocationId', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  const db = getDb();
  const allocation = db.prepare(`
    SELECT *
    FROM allocations
    WHERE id = ? AND job_id = ? AND company_id = ?
  `).get(req.params.allocationId, req.params.jobId, req.user.company_id);
  if (!allocation) return res.status(404).json({ error: 'Allocation not found' });

  const { status } = req.body;
  const validTransitions = ['changed', 'cancelled'];
  if (!status || !validTransitions.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validTransitions.join(', ')}` });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE allocations
    SET status = ?, allocation_status = CASE WHEN ? = 'cancelled' THEN 'cancelled' ELSE allocation_status END, updated_at = ?
    WHERE id = ?
  `).run(status, status, now, req.params.allocationId);

  appendAuditEvent(db, {
    companyId: req.user.company_id,
    eventType: 'allocation_changed',
    userId: req.user.id,
    workerId: allocation.worker_id,
    jobId: req.params.jobId,
    allocationId: req.params.allocationId,
    payload: { from: allocation.status, to: status }
  });

  if (['changed', 'cancelled'].includes(status)) {
    const activeAllocation = db.prepare(`
      SELECT id
      FROM allocations
      WHERE job_id = ? AND status = 'confirmed' AND id != ?
    `).get(req.params.jobId, req.params.allocationId);

    if (!activeAllocation) {
      db.prepare(`UPDATE jobs SET status = 'open', updated_at = ? WHERE id = ?`)
        .run(now, req.params.jobId);
    }
  }

  const updated = db.prepare(`
    SELECT
      a.*,
      j.job_timezone,
      j.schedule_status AS job_schedule_status,
      j.scheduled_start_at_utc AS job_scheduled_start_at_utc,
      j.scheduled_end_at_utc AS job_scheduled_end_at_utc,
      j.scheduled_start_local,
      j.scheduled_end_local,
      w.name AS worker_name,
      w.contact_number AS worker_phone
    FROM allocations a
    JOIN jobs j ON a.job_id = j.id
    JOIN workers w ON a.worker_id = w.id AND w.company_id = a.company_id
    WHERE a.id = ?
  `).get(req.params.allocationId);

  res.json(serializeAllocation(updated, null, db));
});

module.exports = router;
