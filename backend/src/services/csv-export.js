'use strict';

const {
  credentialDisplayLabel,
  formatDisplayLabel,
  siteConditionLabel,
  workerRoleLabel
} = require('./intake-catalogues');

const EXPORT_DATE = () => new Date().toISOString().slice(0, 10);
const PAYROLL_PREP_WARNING = 'Scheduled allocation export only. Review before payroll entry. No payroll, tax, super, award, allowance, overtime, or entitlement calculation.';
const INVOICE_PREP_WARNING = 'Invoice preparation export only. Review before invoicing. No invoice totals, tax, or accounting-system posting.';

const EXPORT_DEFINITIONS = {
  workers: {
    filename: 'dispatchtalon-workers-export',
    headers: [
      'company_name',
      'worker_id',
      'worker_name',
      'email',
      'phone',
      'roles',
      'status',
      'credentials',
      'created_at',
      'updated_at'
    ]
  },
  jobs: {
    filename: 'dispatchtalon-jobs-export',
    headers: [
      'company_name',
      'job_id',
      'job_title',
      'client',
      'site',
      'location',
      'job_date',
      'start_time',
      'end_time',
      'timezone',
      'required_roles',
      'required_credentials',
      'equipment_requirements',
      'site_conditions',
      'additional_notes',
      'created_at'
    ]
  },
  allocations: {
    filename: 'dispatchtalon-allocations-export',
    headers: [
      'company_name',
      'allocation_id',
      'job_id',
      'job_title',
      'worker_id',
      'worker_name',
      'role',
      'allocation_status',
      'publish_status',
      'override_reason',
      'scheduled_start',
      'scheduled_end',
      'timezone',
      'created_at'
    ]
  },
  'payroll-prep': {
    filename: 'dispatchtalon-payroll-prep-export',
    headers: [
      'company_name',
      'worker_name',
      'worker_id',
      'job_title',
      'site',
      'job_date',
      'start_time',
      'end_time',
      'total_scheduled_hours',
      'role',
      'notes',
      'export_warning'
    ]
  },
  'invoice-prep': {
    filename: 'dispatchtalon-invoice-prep-export',
    headers: [
      'company_name',
      'job_id',
      'job_title',
      'client',
      'site',
      'job_date',
      'scheduled_start',
      'scheduled_end',
      'workers_allocated',
      'equipment_selected',
      'asset_number',
      'notes',
      'export_warning'
    ]
  },
  audit: {
    filename: 'dispatchtalon-audit-export',
    headers: [
      'company_name',
      'event_id',
      'event_type',
      'job_id',
      'worker_id',
      'actor_user_id',
      'event_time',
      'summary'
    ]
  },
  metrics: {
    filename: 'dispatchtalon-metrics-export',
    headers: [
      'company_name',
      'period_start',
      'period_end',
      'jobs_created',
      'workers_added',
      'allocations_confirmed',
      'warnings',
      'blocks',
      'overrides',
      'manual_notifications_published'
    ]
  }
};

function parseJsonList(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (value == null || value === '') return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return String(value).split(/[|,]/).map((item) => item.trim()).filter(Boolean);
  }
}

function unique(values = []) {
  return Array.from(new Set(values.filter((value) => value != null && String(value).trim() !== '')));
}

function joinValues(values = []) {
  return unique(values.map((value) => String(value || '').trim()).filter(Boolean)).join('; ');
}

function displayValues(values = [], formatter = formatDisplayLabel) {
  return joinValues((values || []).map((value) => formatter(value)));
}

function statusLabel(value) {
  const key = String(value || '').trim().toLowerCase();
  const labels = {
    published_manual: 'Published manual'
  };
  return labels[key] || formatDisplayLabel(value);
}

function firstText(...values) {
  for (const value of values) {
    if (value != null && String(value).trim() !== '') return String(value).trim();
  }
  return '';
}

function companyName(company) {
  return firstText(company?.display_name, company?.name);
}

function filenameFor(type) {
  const definition = EXPORT_DEFINITIONS[type];
  return `${definition.filename}-${EXPORT_DATE()}.csv`;
}

function sanitizedCell(value) {
  if (value == null) return '';
  let text = Array.isArray(value) ? joinValues(value) : String(value);
  if (/^[=+\-@]/.test(text.trimStart())) text = `'${text}`;
  return text;
}

function csvEscape(value) {
  const text = sanitizedCell(value);
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function rowsToCsv(headers, rows) {
  return [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(','))
  ].join('\r\n') + '\r\n';
}

function dateFilters(query = {}) {
  return {
    start: query.start_date || query.from || null,
    end: query.end_date || query.to || null,
    includeArchived: String(query.include_archived || '').toLowerCase() === 'true',
    jobId: query.job_id || null,
    workerId: query.worker_id || null
  };
}

function addDateWhere(where, params, column, filters) {
  if (filters.start) {
    where.push(`date(${column}) >= date(?)`);
    params.push(filters.start);
  }
  if (filters.end) {
    where.push(`date(${column}) <= date(?)`);
    params.push(filters.end);
  }
}

function getCompany(db, companyId) {
  return db.prepare(`
    SELECT id, name, display_name, timezone, created_at
    FROM companies
    WHERE id = ?
  `).get(companyId);
}

function credentialMap(db, companyId, workerIds = []) {
  if (!workerIds.length) return new Map();
  const placeholders = workerIds.map(() => '?').join(',');
  const rows = db.prepare(`
    SELECT worker_id, COALESCE(credential_name_snapshot, type) AS type, status, expiry_date
    FROM credentials
    WHERE company_id = ?
      AND worker_id IN (${placeholders})
      AND COALESCE(active, 1) = 1
    ORDER BY type ASC, expiry_date ASC
  `).all(companyId, ...workerIds);

  const map = new Map();
  for (const row of rows) {
    const parts = [credentialDisplayLabel(row.type)];
    if (row.status) parts.push(formatDisplayLabel(row.status));
    if (row.expiry_date) parts.push(`expires ${row.expiry_date}`);
    if (!map.has(row.worker_id)) map.set(row.worker_id, []);
    map.get(row.worker_id).push(parts.filter(Boolean).join(' - '));
  }
  return map;
}

function jobRequirementMap(db, companyId, jobIds = []) {
  if (!jobIds.length) return new Map();
  const placeholders = jobIds.map(() => '?').join(',');
  const rows = db.prepare(`
    SELECT
      jri.job_id,
      jri.category,
      COALESCE(rci.label, jcr.label) AS label
    FROM job_requirement_items jri
    LEFT JOIN requirement_catalogue_items rci ON rci.id = jri.catalogue_item_id
    LEFT JOIN job_custom_requirements jcr ON jcr.id = jri.custom_requirement_id
    WHERE jri.company_id = ?
      AND jri.job_id IN (${placeholders})
    ORDER BY jri.category ASC, label ASC
  `).all(companyId, ...jobIds);

  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.job_id)) {
      map.set(row.job_id, {
        credentials: [],
        equipment: [],
        all: []
      });
    }
    const bucket = map.get(row.job_id);
    const label = firstText(row.label);
    if (!label) continue;
    bucket.all.push(label);
    if (['credential', 'voc', 'rail', 'energy', 'civil'].includes(row.category)) {
      bucket.credentials.push(label);
    }
    if (['equipment', 'transport'].includes(row.category)) {
      bucket.equipment.push(label);
    }
  }
  return map;
}

function assetMap(db, companyId, jobIds = []) {
  if (!jobIds.length) return new Map();
  const placeholders = jobIds.map(() => '?').join(',');
  const rows = db.prepare(`
    SELECT
      jaa.job_id,
      ca.asset_number,
      COALESCE(ca.display_name, rci.label, ca.asset_number) AS label
    FROM job_asset_assignments jaa
    JOIN company_assets ca ON ca.id = jaa.company_asset_id AND ca.company_id = jaa.company_id
    LEFT JOIN requirement_catalogue_items rci ON rci.id = ca.catalogue_item_id
    WHERE jaa.company_id = ?
      AND jaa.job_id IN (${placeholders})
    ORDER BY ca.asset_number ASC
  `).all(companyId, ...jobIds);

  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.job_id)) {
      map.set(row.job_id, {
        labels: [],
        numbers: []
      });
    }
    const bucket = map.get(row.job_id);
    bucket.labels.push(row.label);
    bucket.numbers.push(row.asset_number);
  }
  return map;
}

function latestNotificationMap(db, companyId, allocationIds = []) {
  if (!allocationIds.length) return new Map();
  const placeholders = allocationIds.map(() => '?').join(',');
  const rows = db.prepare(`
    SELECT allocation_id, status, updated_at
    FROM allocation_notifications
    WHERE company_id = ?
      AND allocation_id IN (${placeholders})
    ORDER BY updated_at DESC, created_at DESC
  `).all(companyId, ...allocationIds);

  const map = new Map();
  for (const row of rows) {
    if (!row.allocation_id || map.has(row.allocation_id)) continue;
    map.set(row.allocation_id, row.status);
  }
  return map;
}

function scheduledStart(row) {
  return firstText(row.allocation_start_at_utc, row.scheduled_start_at_utc, row.scheduled_start_local, row.shift_start_time);
}

function scheduledEnd(row) {
  return firstText(row.allocation_end_at_utc, row.scheduled_end_at_utc, row.scheduled_end_local);
}

function scheduledHours(start, end) {
  if (!start || !end) return '';
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return '';
  const hours = (endDate.getTime() - startDate.getTime()) / 36e5;
  return hours > 0 ? String(Math.round(hours * 100) / 100) : '';
}

function loadWorkerRows(db, company, filters) {
  const where = ['company_id = ?'];
  const params = [company.id];
  if (!filters.includeArchived) where.push('archived_at IS NULL');
  if (filters.workerId) {
    where.push('id = ?');
    params.push(filters.workerId);
  }
  addDateWhere(where, params, 'created_at', filters);

  const workers = db.prepare(`
    SELECT *
    FROM workers
    WHERE ${where.join(' AND ')}
    ORDER BY name ASC, created_at ASC
  `).all(...params);
  const credentials = credentialMap(db, company.id, workers.map((worker) => worker.id));

  return workers.map((worker) => ({
    company_name: companyName(company),
    worker_id: worker.id,
    worker_name: worker.name,
    email: worker.email,
    phone: worker.contact_number,
    roles: displayValues(parseJsonList(worker.roles, worker.role ? [worker.role] : []), workerRoleLabel),
    status: statusLabel(worker.status),
    credentials: joinValues(credentials.get(worker.id) || []),
    created_at: worker.created_at,
    updated_at: worker.updated_at
  }));
}

function loadJobRows(db, company, filters) {
  const where = ['company_id = ?'];
  const params = [company.id];
  if (!filters.includeArchived) where.push('archived_at IS NULL');
  if (filters.jobId) {
    where.push('id = ?');
    params.push(filters.jobId);
  }
  addDateWhere(where, params, 'date', filters);

  const jobs = db.prepare(`
    SELECT *
    FROM jobs
    WHERE ${where.join(' AND ')}
    ORDER BY date ASC, scheduled_start_at_utc ASC, created_at ASC
  `).all(...params);
  const jobIds = jobs.map((job) => job.id);
  const requirements = jobRequirementMap(db, company.id, jobIds);
  const assets = assetMap(db, company.id, jobIds);

  return jobs.map((job) => {
    const requirementBucket = requirements.get(job.id) || { credentials: [], equipment: [] };
    const assetBucket = assets.get(job.id) || { labels: [] };
    const craneClasses = parseJsonList(job.crane_classes_required, job.crane_class_required ? [job.crane_class_required] : []);
    const requiredCredentials = [
      ...parseJsonList(job.required_credentials).map(credentialDisplayLabel),
      ...requirementBucket.credentials
    ];
    const equipmentRequirements = [
      ...craneClasses.map(formatDisplayLabel),
      ...requirementBucket.equipment,
      ...assetBucket.labels
    ];
    const notes = firstText(job.notes, job.source_note, job.travel_notes, job.risk_notes, job.job_description);

    return {
      company_name: companyName(company),
      job_id: job.id,
      job_title: firstText(job.reference, job.site_name, job.client_name, job.id),
      client: job.client_name,
      site: job.site_name,
      location: job.site_location,
      job_date: job.date,
      start_time: firstText(job.scheduled_start_local, job.scheduled_start_at_utc, job.shift_start_time),
      end_time: firstText(job.scheduled_end_local, job.scheduled_end_at_utc),
      timezone: firstText(job.job_timezone, company.timezone),
      required_roles: displayValues(parseJsonList(job.crew_roles_required), workerRoleLabel),
      required_credentials: joinValues(requiredCredentials),
      equipment_requirements: joinValues(equipmentRequirements),
      site_conditions: displayValues(parseJsonList(job.site_conditions), siteConditionLabel),
      additional_notes: notes,
      created_at: job.created_at
    };
  });
}

function loadAllocationBaseRows(db, company, filters) {
  const where = ['a.company_id = ?'];
  const params = [company.id];
  if (filters.jobId) {
    where.push('a.job_id = ?');
    params.push(filters.jobId);
  }
  if (filters.workerId) {
    where.push('a.worker_id = ?');
    params.push(filters.workerId);
  }
  addDateWhere(where, params, 'a.allocated_at', filters);

  return db.prepare(`
    SELECT
      a.*,
      j.reference,
      j.client_name,
      j.site_name,
      j.site_location,
      j.date AS job_date,
      j.notes AS job_notes,
      j.job_description,
      j.shift_start_time,
      j.scheduled_start_at_utc,
      j.scheduled_end_at_utc,
      j.scheduled_start_local,
      j.scheduled_end_local,
      j.job_timezone,
      w.name AS worker_name,
      w.roles AS worker_roles,
      w.role AS worker_role
    FROM allocations a
    JOIN jobs j ON j.id = a.job_id AND j.company_id = a.company_id
    JOIN workers w ON w.id = a.worker_id AND w.company_id = a.company_id
    WHERE ${where.join(' AND ')}
    ORDER BY COALESCE(j.date, a.allocated_at) ASC, a.allocated_at ASC
  `).all(...params);
}

function loadAllocationRows(db, company, filters) {
  const allocations = loadAllocationBaseRows(db, company, filters);
  const notifications = latestNotificationMap(db, company.id, allocations.map((allocation) => allocation.id));

  return allocations.map((allocation) => ({
    company_name: companyName(company),
    allocation_id: allocation.id,
    job_id: allocation.job_id,
    job_title: firstText(allocation.reference, allocation.site_name, allocation.client_name, allocation.job_id),
    worker_id: allocation.worker_id,
    worker_name: allocation.worker_name,
    role: displayValues(parseJsonList(allocation.worker_roles, allocation.worker_role ? [allocation.worker_role] : []), workerRoleLabel),
    allocation_status: statusLabel(firstText(allocation.allocation_status, allocation.status)),
    publish_status: statusLabel(notifications.get(allocation.id) || 'draft'),
    override_reason: allocation.override_reason,
    scheduled_start: scheduledStart(allocation),
    scheduled_end: scheduledEnd(allocation),
    timezone: firstText(allocation.allocation_timezone, allocation.job_timezone, company.timezone),
    created_at: allocation.allocated_at
  }));
}

function loadPayrollPrepRows(db, company, filters) {
  const allocations = loadAllocationBaseRows(db, company, filters);

  return allocations.map((allocation) => {
    const start = scheduledStart(allocation);
    const end = scheduledEnd(allocation);
    return {
      company_name: companyName(company),
      worker_name: allocation.worker_name,
      worker_id: allocation.worker_id,
      job_title: firstText(allocation.reference, allocation.site_name, allocation.client_name, allocation.job_id),
      site: allocation.site_name,
      job_date: allocation.job_date,
      start_time: start,
      end_time: end,
      total_scheduled_hours: scheduledHours(start, end),
      role: displayValues(parseJsonList(allocation.worker_roles, allocation.worker_role ? [allocation.worker_role] : []), workerRoleLabel),
      notes: firstText(allocation.job_notes, allocation.job_description),
      export_warning: PAYROLL_PREP_WARNING
    };
  });
}

function loadInvoicePrepRows(db, company, filters) {
  const jobRows = loadJobRows(db, company, filters);
  if (!jobRows.length) return [];
  const jobIds = jobRows.map((row) => row.job_id);
  const placeholders = jobIds.map(() => '?').join(',');
  const workers = db.prepare(`
    SELECT a.job_id, w.name
    FROM allocations a
    JOIN workers w ON w.id = a.worker_id AND w.company_id = a.company_id
    WHERE a.company_id = ?
      AND a.job_id IN (${placeholders})
      AND a.status != 'cancelled'
    ORDER BY w.name ASC
  `).all(company.id, ...jobIds);
  const workerMap = new Map();
  for (const row of workers) {
    if (!workerMap.has(row.job_id)) workerMap.set(row.job_id, []);
    workerMap.get(row.job_id).push(row.name);
  }
  const assets = assetMap(db, company.id, jobIds);

  return jobRows.map((job) => {
    const assetBucket = assets.get(job.job_id) || { labels: [], numbers: [] };
    return {
      company_name: companyName(company),
      job_id: job.job_id,
      job_title: job.job_title,
      client: job.client,
      site: job.site,
      job_date: job.job_date,
      scheduled_start: job.start_time,
      scheduled_end: job.end_time,
      workers_allocated: joinValues(workerMap.get(job.job_id) || []),
      equipment_selected: joinValues(assetBucket.labels),
      asset_number: joinValues(assetBucket.numbers),
      notes: job.additional_notes,
      export_warning: INVOICE_PREP_WARNING
    };
  });
}

function auditSummary(event) {
  return [
    formatDisplayLabel(event.event_type),
    event.job_id ? `job ${event.job_id}` : '',
    event.worker_id ? `worker ${event.worker_id}` : '',
    event.allocation_id ? `allocation ${event.allocation_id}` : ''
  ].filter(Boolean).join(' - ');
}

function loadAuditRows(db, company, filters) {
  const where = ['company_id = ?'];
  const params = [company.id];
  if (filters.jobId) {
    where.push('job_id = ?');
    params.push(filters.jobId);
  }
  if (filters.workerId) {
    where.push('worker_id = ?');
    params.push(filters.workerId);
  }
  addDateWhere(where, params, 'timestamp', filters);

  const events = db.prepare(`
    SELECT id, event_type, user_id, worker_id, job_id, allocation_id, timestamp
    FROM audit_events
    WHERE ${where.join(' AND ')}
    ORDER BY timestamp DESC
  `).all(...params);

  return events.map((event) => ({
    company_name: companyName(company),
    event_id: event.id,
    event_type: event.event_type,
    job_id: event.job_id,
    worker_id: event.worker_id,
    actor_user_id: event.user_id,
    event_time: event.timestamp,
    summary: auditSummary(event)
  }));
}

function countByEvent(db, companyId, eventType, filters) {
  const where = ['company_id = ?', 'event_type = ?'];
  const params = [companyId, eventType];
  addDateWhere(where, params, 'timestamp', filters);
  return db.prepare(`SELECT COUNT(*) AS n FROM audit_events WHERE ${where.join(' AND ')}`).get(...params).n;
}

function countRows(db, table, companyId, dateColumn, filters, extraWhere = '') {
  const where = ['company_id = ?'];
  const params = [companyId];
  addDateWhere(where, params, dateColumn, filters);
  if (extraWhere) where.push(extraWhere);
  return db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${where.join(' AND ')}`).get(...params).n;
}

function loadMetricsRows(db, company, filters) {
  const periodStart = filters.start || company.created_at || EXPORT_DATE();
  const periodEnd = filters.end || EXPORT_DATE();
  const warnings =
    countByEvent(db, company.id, 'fatigue_warning_triggered', filters)
    + countByEvent(db, company.id, 'fatigueguard_warning_created', filters);
  const blocks =
    countByEvent(db, company.id, 'credential_block_applied', filters)
    + countByEvent(db, company.id, 'credentialgate_block_created', filters)
    + countByEvent(db, company.id, 'fatigue_block_applied', filters)
    + countByEvent(db, company.id, 'availability_block_applied', filters);

  const notificationEvents = countByEvent(db, company.id, 'allocation_published_manual', filters);
  const notificationRows = countRows(
    db,
    'allocation_notifications',
    company.id,
    'created_at',
    filters,
    "status = 'published_manual'"
  );

  return [{
    company_name: companyName(company),
    period_start: String(periodStart).slice(0, 10),
    period_end: String(periodEnd).slice(0, 10),
    jobs_created: countRows(db, 'jobs', company.id, 'created_at', filters, 'archived_at IS NULL'),
    workers_added: countRows(db, 'workers', company.id, 'created_at', filters, 'archived_at IS NULL'),
    allocations_confirmed: countRows(db, 'allocations', company.id, 'allocated_at', filters, "status = 'confirmed'"),
    warnings,
    blocks,
    overrides: countByEvent(db, company.id, 'warning_acknowledged', filters)
      + countByEvent(db, company.id, 'override_reason_recorded', filters),
    manual_notifications_published: Math.max(notificationEvents, notificationRows)
  }];
}

function buildRows(db, company, type, query = {}) {
  const filters = dateFilters(query);
  switch (type) {
    case 'workers':
      return loadWorkerRows(db, company, filters);
    case 'jobs':
      return loadJobRows(db, company, filters);
    case 'allocations':
      return loadAllocationRows(db, company, filters);
    case 'payroll-prep':
      return loadPayrollPrepRows(db, company, filters);
    case 'invoice-prep':
      return loadInvoicePrepRows(db, company, filters);
    case 'audit':
      return loadAuditRows(db, company, filters);
    case 'metrics':
      return loadMetricsRows(db, company, filters);
    default:
      throw Object.assign(new Error('Unknown export type'), { status: 404 });
  }
}

function buildCsvExport(db, user, type, query = {}) {
  const definition = EXPORT_DEFINITIONS[type];
  if (!definition) {
    throw Object.assign(new Error('Unknown export type'), { status: 404 });
  }
  const company = getCompany(db, user.company_id);
  if (!company) {
    throw Object.assign(new Error('Company not found'), { status: 404 });
  }
  const rows = buildRows(db, company, type, query);
  return {
    filename: filenameFor(type),
    headers: definition.headers,
    rows,
    csv: rowsToCsv(definition.headers, rows)
  };
}

module.exports = {
  EXPORT_DEFINITIONS,
  INVOICE_PREP_WARNING,
  PAYROLL_PREP_WARNING,
  buildCsvExport,
  csvEscape,
  rowsToCsv,
  sanitizedCell
};
