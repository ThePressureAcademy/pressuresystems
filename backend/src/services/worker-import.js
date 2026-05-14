'use strict';

const { normalizeTaskTag } = require('./preferences');
const {
  legacyPrimaryRoleForRoles,
  normalizeCredentialType,
  normalizeWorkerRoles
} = require('./intake-catalogues');

const ROLE_MAP = {
  crane_operator: 'crane_operator',
  'crane operator': 'crane_operator',
  operator: 'crane_operator',
  dogman: 'dogman',
  rigger: 'rigger',
  supervisor: 'supervisor',
  allocator: 'allocator',
  traffic_controller: 'traffic_controller',
  'traffic controller': 'traffic_controller',
  'truck driver': 'truck_driver',
  truck_driver: 'truck_driver',
  electrician: 'electrician',
  labourer: 'labourer',
  welder: 'welder',
  weilder: 'welder'
};

const EMPLOYMENT_MAP = {
  permanent: 'permanent',
  full_time: 'permanent',
  'full time': 'permanent',
  fulltime: 'permanent',
  casual: 'casual',
  contractor: 'contractor',
  labour_hire: 'labour_hire',
  'labour hire': 'labour_hire',
  labourhire: 'labour_hire'
};

const STATUS_MAP = {
  available: 'available',
  allocated: 'allocated',
  unavailable: 'unavailable',
  inactive: 'inactive',
  on_leave: 'on_leave',
  'on leave': 'on_leave'
};

const CREDENTIAL_MAP = {
  hrwl_c2: 'hrwl_c2',
  hrwl_c6: 'hrwl_c6',
  hrwl_cn: 'hrwl_cn',
  hrwl_dg: 'hrwl_dg',
  hrwl_ra: 'hrwl_ra',
  hrwl_rb: 'hrwl_rb',
  hrwl_ri: 'hrwl_ri',
  white_card: 'white_card',
  msic: 'msic_card',
  msic_card: 'msic_card',
  site_induction: 'site_induction',
  client_induction: 'client_induction',
  medical_clearance: 'medical_clearance',
  drivers_licence: 'drivers_licence',
  driver_licence: 'drivers_licence',
  other: 'other'
};

function toKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function splitPipe(value) {
  return String(value || '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}

function guessDelimiter(text) {
  const firstLine = String(text || '').split(/\r?\n/, 1)[0] || '';
  return firstLine.includes('\t') ? '\t' : ',';
}

function parseDelimitedLine(line, delimiter) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function parseDelimitedText(content, delimiter) {
  const lines = String(content || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return { headers: [], records: [] };
  }

  const headers = parseDelimitedLine(lines[0], delimiter).map((header) => toKey(header));
  const records = lines.slice(1).map((line, index) => {
    const values = parseDelimitedLine(line, delimiter);
    const raw = {};
    headers.forEach((header, headerIndex) => {
      raw[header] = values[headerIndex] || '';
    });
    return { row_number: index + 2, raw };
  });

  return { headers, records };
}

function normalizeDate(value, warnings) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    warnings.push(`Could not parse expiry date "${value}"`);
    return null;
  }
  return parsed.toISOString().slice(0, 10);
}

function parseCredentialRows(typesValue, expiryValue, warnings) {
  const credentialTypes = splitPipe(typesValue);
  const expiryDates = splitPipe(expiryValue);

  if (credentialTypes.length === 0) return [];
  if (expiryDates.length > 0 && expiryDates.length !== credentialTypes.length) {
    warnings.push('Credential types and expiry dates did not align, so credentials were skipped for this row');
    return [];
  }

  const credentials = [];
  credentialTypes.forEach((typeValue, index) => {
    const mappedType = normalizeCredentialType(CREDENTIAL_MAP[toKey(typeValue)] || typeValue);
    if (!mappedType) {
      warnings.push(`Unsupported credential type "${typeValue}" was skipped`);
      return;
    }

    credentials.push({
      type: mappedType,
      expiry_date: normalizeDate(expiryDates[index], warnings),
      identifier: null,
      issuing_body: null,
      verified: true,
      notes: 'Imported from employee onboarding file'
    });
  });

  return credentials;
}

function parsePreferenceRows(preferredTaskTagsValue, taskStarRatingsValue, warnings) {
  const preferredTags = splitPipe(preferredTaskTagsValue).map(normalizeTaskTag).filter(Boolean);
  const ratings = new Map();

  for (const entry of splitPipe(taskStarRatingsValue)) {
    const [tagValue, ratingValue] = entry.split(':');
    const taskTag = normalizeTaskTag(tagValue);
    if (!taskTag || !ratingValue) {
      warnings.push(`Task rating "${entry}" was skipped`);
      continue;
    }

    let rating = Number(ratingValue);
    if (Number.isNaN(rating)) {
      warnings.push(`Task rating "${entry}" was skipped`);
      continue;
    }

    if (rating < 1 || rating > 5) {
      const clamped = Math.min(5, Math.max(1, Math.round(rating)));
      warnings.push(`Task rating "${entry}" was normalised to ${clamped}`);
      rating = clamped;
    }

    ratings.set(taskTag, {
      task_tag: taskTag,
      rating,
      source: 'imported',
      notes: 'Imported from employee onboarding file'
    });
  }

  for (const taskTag of preferredTags) {
    if (!ratings.has(taskTag)) {
      ratings.set(taskTag, {
        task_tag: taskTag,
        rating: 4,
        source: 'imported',
        notes: 'Imported preferred task tag without explicit star rating'
      });
    }
  }

  return Array.from(ratings.values());
}

function normalizeRow(record) {
  const warnings = [];
  const errors = [];
  const row = record.raw || {};

  const firstName = String(row.first_name || '').trim();
  const lastName = String(row.last_name || '').trim();
  const email = String(row.email || '').trim().toLowerCase();
  const roles = normalizeWorkerRoles(splitPipe(row.role).map((roleValue) => ROLE_MAP[toKey(roleValue)] || roleValue));
  const role = legacyPrimaryRoleForRoles(roles, ROLE_MAP[toKey(row.role)]);
  const employmentType = EMPLOYMENT_MAP[toKey(row.employment_type)];
  const availabilityStatus = row.availability_status
    ? STATUS_MAP[toKey(row.availability_status)]
    : 'available';

  if (!firstName) errors.push('First name is required');
  if (!lastName) errors.push('Last name is required');
  if (!email) errors.push('Email is required');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Email must be a valid email address');
  }
  if (roles.length === 0 || !role) errors.push('role could not be mapped to a supported worker role');
  if (!employmentType) errors.push('Employment type could not be mapped to a supported backend employment type');
  if (row.availability_status && !availabilityStatus) {
    warnings.push(`Availability status "${row.availability_status}" was not recognised, defaulted to available`);
  }

  const credentials = parseCredentialRows(row.credential_types, row.credential_expiry_dates, warnings);
  const preferences = parsePreferenceRows(row.preferred_task_tags, row.task_star_ratings, warnings);

  return {
    row_number: record.row_number,
    raw: row,
    worker: {
      name: `${firstName} ${lastName}`.trim(),
      email,
      role,
      roles,
      employment_type: employmentType,
      crane_classes: splitPipe(row.crane_classes),
      usual_depot: String(row.base_location || '').trim() || null,
      contact_number: String(row.phone || '').trim() || null,
      status: availabilityStatus || 'available',
      availability_note: null,
      notes: String(row.notes || '').trim() || null
    },
    credentials,
    preferences,
    warnings,
    errors,
    action: errors.length > 0 ? 'error' : 'create'
  };
}

function analyzeWorkerImport(content, options = {}) {
  const delimiter = options.delimiter === 'tsv'
    ? '\t'
    : (options.delimiter === 'csv' ? ',' : guessDelimiter(content));
  const format = delimiter === '\t' ? 'tsv' : 'csv';
  const { headers, records } = parseDelimitedText(content, delimiter);
  const existingEmails = new Set((options.existingEmails || []).map((email) => String(email).toLowerCase()));
  const seenBatchEmails = new Set();

  const rows = records.map((record) => normalizeRow(record)).map((row) => {
    if (row.worker.email) {
      if (seenBatchEmails.has(row.worker.email)) {
        row.warnings.push('Duplicate email also appeared earlier in this import batch and will be skipped');
        row.action = 'skip';
      } else {
        seenBatchEmails.add(row.worker.email);
      }

      if (existingEmails.has(row.worker.email)) {
        row.warnings.push('A worker with this email already exists and will be skipped');
        row.action = 'skip';
      }
    }

    if (row.errors.length > 0) {
      row.action = 'error';
    }

    row.importable = row.errors.length === 0;
    return row;
  });

  const summary = {
    total_rows: rows.length,
    ready_to_create: rows.filter((row) => row.action === 'create').length,
    skipped: rows.filter((row) => row.action === 'skip').length,
    rows_with_errors: rows.filter((row) => row.errors.length > 0).length,
    rows_with_warnings: rows.filter((row) => row.warnings.length > 0).length
  };

  return { delimiter: format, headers, rows, summary };
}

module.exports = {
  analyzeWorkerImport
};
