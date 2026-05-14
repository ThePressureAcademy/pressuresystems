'use strict';

const { normalizeTaskTag } = require('./preferences');
const {
  DEFAULT_TIMEZONE,
  isValidTimeZone,
  normalizeTimeZone
} = require('./timezone');

const MAX_TEXT_IMPORT_BYTES = 1024 * 1024;
const SUPPORTED_SOURCE_TYPES = ['pasted_text', 'txt', 'markdown'];

const MONTHS = {
  january: '01',
  february: '02',
  march: '03',
  april: '04',
  may: '05',
  june: '06',
  july: '07',
  august: '08',
  september: '09',
  october: '10',
  november: '11',
  december: '12'
};

const SECTION_LABELS = [
  'client',
  'site',
  'site name',
  'site address',
  'contact',
  'job',
  'job description',
  'required crew',
  'crew',
  'crane',
  'transport',
  'timing',
  'requirements',
  'notes',
  'task tags'
];

const CRANE_CLASS_MATCHERS = [
  { pattern: /\bfranna\b|\bpick[\s-]*and[\s-]*carry\b/i, value: 'Articulated / Pick-and-Carry' },
  { pattern: /\bcity crane\b/i, value: 'City Crane' },
  { pattern: /\btower crane\b/i, value: 'Tower Crane' },
  { pattern: /\bmobile crane\b/i, value: 'Mobile Crane' },
  { pattern: /\bcrawler crane\b/i, value: 'Crawler Crane' },
  { pattern: /\b150\s*t(?:onne)?\s+crane\b/i, value: '150T' }
];

const ROLE_MATCHERS = [
  { pattern: /\blift supervisor\b/i, value: 'supervisor' },
  { pattern: /\bcrane operator\b/i, value: 'crane_operator' },
  { pattern: /\bdogman\b/i, value: 'dogman' },
  { pattern: /\brigger\b/i, value: 'rigger' },
  { pattern: /\bsupervisor\b/i, value: 'supervisor' }
];

const CREDENTIAL_MATCHERS = [
  { pattern: /\bwhite card\b/i, value: 'white_card' },
  { pattern: /\bhrwl[-\s]*c(?:2|6|n)\b/i, value: 'high_risk_licence_crane' },
  { pattern: /\bhrwl[-\s]*dg\b/i, value: 'high_risk_licence_dogging' },
  { pattern: /\bhrwl[-\s]*r(?:a|b|i)\b/i, value: 'high_risk_licence_rigging' },
  { pattern: /\bewp\b/i, value: 'other' }
];

const TASK_TAG_MATCHERS = [
  { pattern: /\bshutdown\b/i, value: 'shutdown' },
  { pattern: /\bnight[\s_-]*shift\b/i, value: 'night_shift' },
  { pattern: /\bcritical lift\b/i, value: 'critical_lift' },
  { pattern: /\bshort[\s_-]*notice\b/i, value: 'short_notice' },
  { pattern: /\blong[\s_-]*travel\b/i, value: 'long_travel' },
  { pattern: /\blow[\s_-]*complexity\b/i, value: 'low_complexity' },
  { pattern: /\btower crane\b/i, value: 'tower_crane' },
  { pattern: /\bfranna\b/i, value: 'franna' },
  { pattern: /\bmobile crane\b/i, value: 'mobile_crane' },
  { pattern: /\bgmk5150l-1\b/i, value: 'gmk5150l_1' },
  { pattern: /\bgmk5150l\b/i, value: 'gmk5150l' },
  { pattern: /\bcounterweight\b/i, value: 'counterweight' },
  { pattern: /\bsemi[\s_-]*trailer\b/i, value: 'semi_trailer' },
  { pattern: /\blow[\s_-]*loader\b/i, value: 'low_loader' },
  { pattern: /\bsupport truck\b/i, value: 'support_truck' },
  { pattern: /\bdogman\b/i, value: 'dogman' },
  { pattern: /\brigger\b/i, value: 'rigger' },
  { pattern: /\bsupervisor\b/i, value: 'supervisor' },
  { pattern: /\bhigh pressure\b/i, value: 'high_pressure' }
];

function unique(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

function trimToNull(value) {
  const normalized = String(value || '').trim();
  return normalized ? normalized : null;
}

function cleanLine(value) {
  return String(value || '')
    .replace(/^\uFEFF/, '')
    .replace(/^\s{0,3}#{1,6}\s*/, '')
    .replace(/^\s*[-*]\s+/, '')
    .trim();
}

function toLines(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(cleanLine);
}

function sectionKey(line) {
  const probe = String(line || '').trim().toLowerCase().replace(/:$/, '');
  return SECTION_LABELS.find((label) => probe === label) || null;
}

function isSectionHeader(line) {
  return Boolean(sectionKey(line));
}

function extractInlineValue(line, label) {
  const lower = String(line || '').toLowerCase();
  const prefix = `${label.toLowerCase()}:`;
  if (!lower.startsWith(prefix)) return null;
  return trimToNull(line.slice(prefix.length));
}

function extractLabeledValue(lines, labels) {
  for (const rawLabel of labels) {
    const label = rawLabel.toLowerCase();
    for (let index = 0; index < lines.length; index += 1) {
      const inline = extractInlineValue(lines[index], label);
      if (inline != null) return inline;
      if (String(lines[index]).toLowerCase() === label && lines[index + 1]) {
        return trimToNull(lines[index + 1]);
      }
    }
  }
  return null;
}

function extractSectionText(lines, labels) {
  for (const rawLabel of labels) {
    const label = rawLabel.toLowerCase();
    const startIndex = lines.findIndex((line) => {
      const lower = String(line || '').toLowerCase();
      return lower === label || lower.startsWith(`${label}:`);
    });
    if (startIndex === -1) continue;

    const collected = [];
    const inline = extractInlineValue(lines[startIndex], label);
    if (inline) collected.push(inline);

    for (let index = startIndex + 1; index < lines.length; index += 1) {
      const line = lines[index];
      if (!line) {
        if (collected.length > 0) break;
        continue;
      }
      if (isSectionHeader(line)) break;
      collected.push(line);
    }

    const value = trimToNull(collected.join(' '));
    if (value) return value;
  }

  return null;
}

function parsePhone(value) {
  const match = String(value || '').match(/(\+?\d[\d\s]{7,}\d)/);
  if (!match) return { name: trimToNull(value), phone: null };

  const phone = trimToNull(match[1].replace(/\s+/g, ' '));
  const name = trimToNull(String(value || '').replace(match[1], '').replace(/[-–—]+$/, '').trim());
  return { name, phone };
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function parseDateString(value) {
  const text = String(value || '').trim();
  if (!text) return null;

  let match = text.match(/\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)?\s*(\d{1,2})\s+([a-z]+)\s+(\d{4})\b/i);
  if (match) {
    const [, day, monthName, year] = match;
    const month = MONTHS[monthName.toLowerCase()];
    if (month) return `${year}-${month}-${pad2(day)}`;
  }

  match = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  match = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (match) {
    return `${match[3]}-${pad2(match[2])}-${pad2(match[1])}`;
  }

  return null;
}

function parseTimeString(value) {
  const text = String(value || '').trim();
  if (!text) return null;

  let match = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (match) {
    let hour = Number(match[1]);
    const minute = Number(match[2] || '00');
    const meridiem = match[3].toLowerCase();
    if (hour === 12) hour = 0;
    if (meridiem === 'pm') hour += 12;
    return `${pad2(hour)}:${pad2(minute)}`;
  }

  match = text.match(/\b(\d{2}):(\d{2})\b/);
  if (match) {
    return `${match[1]}:${match[2]}`;
  }

  return null;
}

function detectTimezone(text, lines, warnings) {
  const directValue = extractLabeledValue(lines, ['timezone']);
  if (directValue && isValidTimeZone(directValue)) {
    return { value: directValue, confidence: 'high' };
  }

  const body = String(text || '');
  if (/\bmelbourne\b|\bvic\b/i.test(body)) {
    warnings.push('Timezone inferred from location. Please confirm.');
    return { value: 'Australia/Melbourne', confidence: 'medium' };
  }
  if (/\bsydney\b|\bnsw\b/i.test(body)) {
    warnings.push('Timezone inferred from location. Please confirm.');
    return { value: 'Australia/Sydney', confidence: 'medium' };
  }
  if (/\bperth\b|\bwa\b/i.test(body)) {
    warnings.push('Timezone inferred from location. Please confirm.');
    return { value: 'Australia/Perth', confidence: 'medium' };
  }
  if (/\bauckland\b|\bnz\b|\bnew zealand\b/i.test(body)) {
    warnings.push('Timezone inferred from location. Please confirm.');
    return { value: 'Pacific/Auckland', confidence: 'medium' };
  }

  warnings.push('Timezone defaulted to Australia/Brisbane. Please confirm.');
  return { value: DEFAULT_TIMEZONE, confidence: 'low' };
}

function detectValuesByMatchers(text, matchers) {
  const matches = [];
  for (const matcher of matchers) {
    if (matcher.pattern.test(text)) matches.push(matcher.value);
  }
  return unique(matches);
}

function inferShiftType(startTime, taskTags, text) {
  if ((taskTags || []).includes('night_shift') || /\bnight shift\b/i.test(text || '')) {
    return 'night';
  }
  if (startTime) {
    const hour = Number(String(startTime).split(':')[0]);
    if (hour >= 18 || hour < 5) return 'night';
  }
  return 'day';
}

function inferLiftRiskLevel(taskTags, text) {
  if ((taskTags || []).includes('critical_lift') || /\bcritical lift\b/i.test(text || '')) {
    return 'critical';
  }
  if (/\bcomplex\b/i.test(text || '')) {
    return 'complex';
  }
  return 'routine';
}

function inferTravelRequired(taskTags, travelNotes, text) {
  if ((taskTags || []).includes('long_travel')) return true;
  if (travelNotes) return true;
  return /\btravel\b|\bremote\b|\bovernight\b|\bsemi[\s_-]*trailer\b|\blow[\s_-]*loader\b|\btransport\b/i.test(text || '');
}

function minConfidence(...levels) {
  const order = { low: 1, medium: 2, high: 3 };
  const filtered = levels.filter((level) => ['low', 'medium', 'high'].includes(level));
  if (filtered.length === 0) return 'low';
  return filtered.reduce((lowest, current) => (
    order[current] < order[lowest] ? current : lowest
  ));
}

function findCraneModelByName(availableCraneModels = [], modelName) {
  return (availableCraneModels || []).find((item) => String(item.model || '').toLowerCase() === String(modelName || '').toLowerCase()) || null;
}

function detectCraneModel(text, availableCraneModels, warnings) {
  const body = String(text || '');
  if (/\bgmk\s*5150l-1\b/i.test(body)) {
    const model = findCraneModelByName(availableCraneModels, 'GMK5150L-1');
    return {
      crane_model_id: model?.id || null,
      crane_model_name: model ? `${model.manufacturer} ${model.model}` : 'Grove GMK5150L-1',
      confidence: 'high'
    };
  }
  if (/\bgrove\s+gmk\s*5150l\b|\bgmk\s*5150l\b/i.test(body)) {
    const model = findCraneModelByName(availableCraneModels, 'GMK5150L');
    return {
      crane_model_id: model?.id || null,
      crane_model_name: model ? `${model.manufacturer} ${model.model}` : 'Grove GMK5150L',
      confidence: 'high'
    };
  }
  if (/\bgmk\s*5150\b/i.test(body)) {
    warnings.push('GMK 5150 family detected. Confirm the exact crane variant before using counterweight travel-state assumptions.');
    return {
      crane_model_id: null,
      crane_model_name: 'GMK 5150 family',
      confidence: 'low'
    };
  }
  return {
    crane_model_id: null,
    crane_model_name: null,
    confidence: 'low'
  };
}

function detectCounterweightRequirement(text, craneModel, warnings) {
  const body = String(text || '');
  const explicit = body.match(/\b(\d+(?:\.\d+)?)\s*t(?:onne|on)?s?\s+counterweight\b/i);
  if (explicit) {
    return { value: Number(explicit[1]), confidence: 'high' };
  }

  if (/\bfull counterweight\b/i.test(body)) {
    if (craneModel?.max_counterweight_tonnes != null) {
      return { value: Number(craneModel.max_counterweight_tonnes), confidence: 'medium' };
    }
    warnings.push('Full counterweight mentioned, but the exact crane model was not confirmed. Check the required counterweight.');
    return { value: null, confidence: 'low' };
  }

  if (/\breduced counterweight\b/i.test(body)) {
    warnings.push('Reduced counterweight mentioned without an exact tonnage. Confirm the required counterweight.');
  }

  return { value: null, confidence: 'low' };
}

function detectRequiredCapacity(text, warnings) {
  const body = String(text || '');
  if (/\b100\s*t(?:onne)?\s+setup\b|\b100t-class\b/i.test(body)) {
    warnings.push('Crane setup inferred. Confirm required capacity and counterweight.');
    return { value: 100, confidence: 'medium' };
  }

  const explicit = body.match(/\b(\d+(?:\.\d+)?)\s*t(?:onne)?\s+setup\b/i);
  if (explicit) {
    warnings.push('Crane setup inferred. Confirm required capacity and counterweight.');
    return { value: Number(explicit[1]), confidence: 'medium' };
  }

  return { value: null, confidence: 'low' };
}

function extractTransportSentences(text) {
  return String(text || '')
    .split(/[.\n]/)
    .map((item) => trimToNull(item))
    .filter((item) => /\bcounterweight\b|\bsemi[\s_-]*trailer\b|\blow[\s_-]*loader\b|\bfloat\b|\bsupport truck\b|\btransport\b|\bnhvr\b|\bpermit\b|\brestricted access\b|\broad limits\b|\baxle\b|\broadable\b/i.test(item))
    .join('. ');
}

function extractAccessSentences(text) {
  return String(text || '')
    .split(/[.\n]/)
    .map((item) => trimToNull(item))
    .filter((item) => /\brestricted access\b|\bbridge\b|\bpermit\b|\bnhvr\b|\bescort\b|\bpilot\b|\blow[\s_-]*loader\b|\bsemi[\s_-]*trailer\b|\broad limits\b/i.test(item))
    .join('. ');
}

function validateJobBriefImportPayload(input) {
  const content = String(input?.content || '');
  if (!content.trim()) {
    throw new Error('content is required');
  }

  const filename = trimToNull(input?.filename);
  const sourceType = detectSourceType(input?.source_type, filename);
  const bytes = Buffer.byteLength(content, 'utf8');

  if (sourceType === 'docx') {
    throw new Error('DOCX import is not supported in this pilot yet. Use paste, .txt, or .md.');
  }
  if (!SUPPORTED_SOURCE_TYPES.includes(sourceType)) {
    throw new Error('Unsupported file type. Use pasted text, .txt, or .md.');
  }
  if (bytes > MAX_TEXT_IMPORT_BYTES) {
    throw new Error('Job brief import is limited to 1MB for pasted text, .txt, and .md files.');
  }

  return {
    source_type: sourceType,
    filename,
    content
  };
}

function detectSourceType(sourceType, filename) {
  const normalized = trimToNull(sourceType);
  if (normalized) {
    const candidate = normalized.toLowerCase();
    if (candidate === 'md') return 'markdown';
    if (candidate === 'markdown') return 'markdown';
    if (candidate === 'txt') return 'txt';
    if (candidate === 'pasted_text') return 'pasted_text';
    if (candidate === 'docx') return 'docx';
    return 'unsupported';
  }

  const ext = trimToNull(filename)?.toLowerCase();
  if (ext?.endsWith('.md') || ext?.endsWith('.markdown')) return 'markdown';
  if (ext?.endsWith('.txt')) return 'txt';
  if (ext?.endsWith('.docx')) return 'docx';
  if (ext && /\.[a-z0-9]+$/i.test(ext)) return 'unsupported';
  return 'pasted_text';
}

function parseExplicitTaskTags(lines) {
  const value = extractLabeledValue(lines, ['task tags']);
  if (!value) return [];
  return unique(
    value
      .split(/[|,]/)
      .map((item) => normalizeTaskTag(item))
      .filter(Boolean)
  );
}

function parseJobBrief(text, options = {}) {
  const availableCraneModels = options.availableCraneModels || [];
  const lines = toLines(text);
  const warnings = [];
  const confidence = {
    client_name: 'low',
    site_name: 'low',
    site_address: 'low',
    job_description: 'low',
    scheduled_date: 'low',
    start_time: 'low',
    end_time: 'low',
    timezone: 'low',
    crane_class: 'low',
    crane_model: 'low',
    crane_travel_state: 'low',
    required_capacity_tonnes: 'low',
    counterweight_required_tonnes: 'low',
    required_roles: 'low',
    required_credentials: 'low',
    task_tags: 'low',
    risk_notes: 'low',
    travel_notes: 'low',
    contact_name: 'low',
    contact_phone: 'low',
    site_access_notes: 'low',
    setup_notes: 'low',
    source_confidence: 'low',
    source_note: 'high'
  };

  const clientName = extractLabeledValue(lines, ['client']);
  if (clientName) confidence.client_name = 'high';

  const siteAddress = extractLabeledValue(lines, ['site address', 'site']);
  if (siteAddress) confidence.site_address = 'high';

  const siteNameExplicit = extractLabeledValue(lines, ['site name']);
  let siteName = siteNameExplicit;
  if (siteNameExplicit) {
    confidence.site_name = 'high';
  } else if (siteAddress) {
    siteName = siteAddress;
    confidence.site_name = 'low';
    warnings.push('Site name was inferred from the site address. Please confirm.');
  }

  const contactLine = extractLabeledValue(lines, ['contact']);
  const contact = parsePhone(contactLine);
  if (contact.name) confidence.contact_name = 'high';
  if (contact.phone) confidence.contact_phone = 'high';

  const jobDescription = extractSectionText(lines, ['job description', 'job']);
  if (jobDescription) confidence.job_description = 'high';

  const timingText = extractSectionText(lines, ['timing']) || String(text || '');
  const scheduledDate = parseDateString(timingText);
  if (scheduledDate) {
    confidence.scheduled_date = 'high';
  } else {
    warnings.push('Date/time could not be confidently extracted.');
  }

  const startLine = extractLabeledValue(lines, ['start', 'start time', 'commence']);
  const endLine = extractLabeledValue(lines, ['finish', 'finish time', 'end', 'end time']);
  const startTime = parseTimeString(startLine);
  const endTime = parseTimeString(endLine);
  if (startTime) confidence.start_time = 'high';
  if (endTime) confidence.end_time = 'high';
  if (!startTime || !endTime) {
    warnings.push('Date/time could not be confidently extracted.');
  }

  const timezone = detectTimezone(text, lines, warnings);
  confidence.timezone = timezone.confidence;

  const crewText = extractSectionText(lines, ['required crew', 'crew']) || String(text || '');
  const requiredRoles = detectValuesByMatchers(crewText, ROLE_MATCHERS);
  if (requiredRoles.length > 0) {
    confidence.required_roles = /required crew|crew/i.test(crewText) ? 'high' : 'medium';
  }

  const requirementsText = extractSectionText(lines, ['requirements']) || String(text || '');
  const requiredCredentials = detectValuesByMatchers(requirementsText, CREDENTIAL_MATCHERS);
  if (requiredCredentials.length > 0) {
    confidence.required_credentials = /requirements/i.test(requirementsText) ? 'high' : 'medium';
  }

  const explicitTaskTags = parseExplicitTaskTags(lines);
  const inferredTaskTags = detectValuesByMatchers(String(text || ''), TASK_TAG_MATCHERS).map(normalizeTaskTag);
  const taskTags = unique([...explicitTaskTags, ...inferredTaskTags]);
  if (taskTags.length > 0) {
    confidence.task_tags = explicitTaskTags.length > 0 ? 'high' : 'medium';
  }

  const craneText = extractSectionText(lines, ['crane']) || String(text || '');
  const craneClasses = detectValuesByMatchers(craneText, CRANE_CLASS_MATCHERS);
  let craneClass = craneClasses[0] || null;
  if (craneClasses.length === 1) {
    confidence.crane_class = 'high';
  } else if (craneClasses.length > 1) {
    confidence.crane_class = 'medium';
    warnings.push('Multiple crane classes were detected. Confirm the required crane class before creating the job.');
  }

  const detectedCraneModel = detectCraneModel(text, availableCraneModels, warnings);
  if (detectedCraneModel.crane_model_name) {
    confidence.crane_model = detectedCraneModel.confidence;
  }

  const selectedCraneModel = detectedCraneModel.crane_model_id
    ? (availableCraneModels || []).find((item) => Number(item.id) === Number(detectedCraneModel.crane_model_id)) || null
    : null;

  const counterweightRequirement = detectCounterweightRequirement(text, selectedCraneModel, warnings);
  if (counterweightRequirement.value != null) {
    confidence.counterweight_required_tonnes = counterweightRequirement.confidence;
  }

  const requiredCapacity = detectRequiredCapacity(text, warnings);
  if (requiredCapacity.value != null) {
    confidence.required_capacity_tonnes = requiredCapacity.confidence;
  }

  const notesText = extractSectionText(lines, ['notes']);
  const transportText = extractSectionText(lines, ['transport']);
  const riskNotes = trimToNull(notesText);
  if (riskNotes) {
    confidence.risk_notes = 'medium';
  }

  const travelNotes = trimToNull(
    `${notesText || ''} ${transportText || ''}`
      .split(/[.]/)
      .filter((item) => /\btravel\b|\bremote\b|\bovernight\b|\bearly arrival\b/i.test(item))
      .join('. ')
  );
  if (travelNotes) {
    confidence.travel_notes = 'medium';
  }

  const siteAccessNotes = trimToNull(extractAccessSentences(`${transportText || ''} ${notesText || ''}`));
  if (siteAccessNotes) {
    confidence.site_access_notes = 'medium';
  }

  const setupNotes = trimToNull(extractTransportSentences(`${craneText || ''} ${transportText || ''}`));
  if (setupNotes) {
    confidence.setup_notes = 'medium';
  }

  const sourceConfidence = minConfidence(
    detectedCraneModel.confidence,
    counterweightRequirement.confidence,
    requiredCapacity.confidence
  );
  confidence.source_confidence = sourceConfidence;

  const extracted = {
    client_name: clientName,
    site_name: siteName,
    site_address: siteAddress,
    job_description: jobDescription,
    scheduled_date: scheduledDate,
    start_time: startTime,
    end_time: endTime,
    timezone: timezone.value,
    crane_class: craneClass,
    crane_model_id: detectedCraneModel.crane_model_id,
    crane_model_name: detectedCraneModel.crane_model_name,
    crane_travel_state_id: null,
    crane_travel_state_label: null,
    required_capacity_tonnes: requiredCapacity.value,
    lift_weight_tonnes: null,
    radius_m: null,
    height_m: null,
    counterweight_required_tonnes: counterweightRequirement.value,
    required_roles: requiredRoles,
    required_credentials: requiredCredentials,
    task_tags: taskTags,
    risk_notes: riskNotes,
    travel_notes: travelNotes,
    contact_name: contact.name,
    contact_phone: contact.phone,
    site_access_notes: siteAccessNotes,
    setup_notes: setupNotes,
    source_confidence: sourceConfidence,
    source_note: String(text || '').trim()
  };

  return {
    extracted,
    confidence,
    warnings: unique(warnings),
    derived: {
      shift_type: inferShiftType(startTime, taskTags, text),
      lift_risk_level: inferLiftRiskLevel(taskTags, text),
      travel_required: inferTravelRequired(taskTags, travelNotes, text),
      job_timezone: normalizeTimeZone(timezone.value)
    }
  };
}

module.exports = {
  MAX_TEXT_IMPORT_BYTES,
  SUPPORTED_SOURCE_TYPES,
  detectSourceType,
  parseJobBrief,
  validateJobBriefImportPayload
};
