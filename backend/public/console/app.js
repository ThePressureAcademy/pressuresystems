'use strict';

const state = {
  token: null,
  user: null,
  renderCycle: 0,
};

const TOKEN_KEY = 'liftiq.token';
const USER_KEY = 'liftiq.user';
const PASSWORD_REMINDER_DISMISSED_KEY = 'liftiq.passwordReminderDismissed';
const OUR_BUSINESS_DISCLOSURE_KEY = 'liftiq.ourBusinessDisclosure';

const ROLE_OPTIONS = ['crane_operator', 'dogman', 'rigger', 'traffic_controller', 'supervisor', 'allocator'];
const EMPLOYMENT_OPTIONS = ['permanent', 'casual', 'contractor', 'labour_hire'];
const STATUS_OPTIONS = ['available', 'allocated', 'unavailable', 'on_leave', 'inactive'];
const SHIFT_OPTIONS = ['day', 'night', 'split'];
const RISK_OPTIONS = ['routine', 'complex', 'critical'];
const COMMON_TIMEZONES = [
  'Australia/Brisbane',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Adelaide',
  'Australia/Perth',
  'Australia/Darwin',
  'Australia/Hobart',
  'Pacific/Auckland'
];
const SCHEDULE_STATUS_OPTIONS = ['draft', 'planned', 'confirmed', 'completed', 'cancelled'];
const CREDENTIAL_OPTIONS = [
  'high_risk_licence_crane',
  'high_risk_licence_dogging',
  'high_risk_licence_rigging',
  'white_card',
  'msic_card',
  'site_induction',
  'client_induction',
  'medical_clearance',
  'drivers_licence',
  'other'
];

const SOURCE_UPLOAD_ACCEPT = '.csv,.xlsx,.xls,.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp';
const SOURCE_UPLOAD_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const SOURCE_UPLOAD_MAX_FILES = 5;
const SOURCE_UPLOAD_CATEGORIES = [
  { value: 'worker_list', label: 'Worker list' },
  { value: 'asset_plant_list', label: 'Asset / plant list' },
  { value: 'credential_ticket_records', label: 'Credential / ticket records' },
  { value: 'roster_allocation_sheet', label: 'Roster / allocation sheet' },
  { value: 'job_history', label: 'Job history' },
  { value: 'client_site_notes', label: 'Client / site notes' },
  { value: 'equipment_list', label: 'Equipment list' },
  { value: 'insurance_compliance_schedule', label: 'Insurance / compliance schedule' },
  { value: 'internal_report', label: 'Internal report' },
  { value: 'other', label: 'Other' }
];
const SOURCE_UPLOAD_STATUS_CLASSES = {
  pending_review: 'pill-warn',
  under_review: 'pill-info',
  needs_clarification: 'pill-warn',
  ready_for_structuring: 'pill-info',
  structured: 'pill-ok',
  rejected: 'pill-bad',
  deleted: 'pill-muted'
};

const EXPORT_SECTIONS = [
  {
    title: 'Operational exports',
    cards: [
      {
        type: 'workers',
        title: 'Workers CSV',
        button: 'Download workers CSV',
        includes: 'Worker IDs, names, contact fields, roles, status, credentials, and timestamps.',
        excludes: 'Does not include passwords, login tokens, or system secrets.'
      },
      {
        type: 'jobs',
        title: 'Jobs CSV',
        button: 'Download jobs CSV',
        includes: 'Job details, schedule fields, crew requirements, credential requirements, equipment requirements, site conditions, and notes.',
        excludes: 'Does not post to accounting systems or calculate financial totals.'
      },
      {
        type: 'allocations',
        title: 'Allocations CSV',
        button: 'Download allocation CSV',
        includes: 'Allocation IDs, job and worker references, status, publish status, schedule fields, and override reason.',
        excludes: 'Does not notify workers or change allocation state.'
      }
    ]
  },
  {
    title: 'Office handoff exports',
    cards: [
      {
        type: 'payroll-prep',
        title: 'Payroll-prep CSV',
        button: 'Download payroll-prep CSV',
        includes: 'Scheduled allocation hours, worker, role, job, site, and review notes for office handoff.',
        excludes: 'Does not calculate payroll, award rates, allowances, overtime, tax, super, or entitlements.'
      },
      {
        type: 'invoice-prep',
        title: 'Invoice-prep CSV',
        button: 'Download invoice-prep CSV',
        includes: 'Job activity, scheduled window, allocated workers, selected equipment, asset numbers, and review notes.',
        excludes: 'Does not calculate invoice totals, GST, rates, or accounting-system postings.'
      }
    ]
  },
  {
    title: 'Review exports',
    cards: [
      {
        type: 'audit',
        title: 'Audit CSV',
        button: 'Download audit CSV',
        includes: 'Decision-trail event IDs, event types, references, actor IDs, timestamps, and safe summaries.',
        excludes: 'Does not include raw audit payloads, secrets, or provider payloads.'
      },
      {
        type: 'metrics',
        title: 'Metrics CSV',
        button: 'Download metrics CSV',
        includes: 'Period counts for jobs, workers, allocations, warnings, blocks, overrides, and manual notifications.',
        excludes: 'Does not expose worker names, job notes, or operational payloads.'
      }
    ]
  }
];

const TOWERCRANE_VERIFICATION_STATUSES = [
  'Unverified reference asset',
  'Verified model existence',
  'Verified spec sheet available',
  'Verified owned fleet',
  'Verified partner-access fleet',
  'Verified historical fleet',
  'Do not publish',
  'Publish as generic category example only',
  'Publish as customer-facing fleet item'
];

const TOWERCRANE_PUBLISH_STATUSES = [
  'Do not publish',
  'Publish as generic category example',
  'Publish as verified fleet item',
  'Publish with "specs available on request"',
  'Hold for verification',
  'Internal only'
];

const TOWERCRANE_CATEGORIES = [
  {
    key: 'flat_top',
    title: 'Flat Top Tower Cranes',
    shortTitle: 'Flat Top',
    description: 'Flat-top tower cranes are suited to projects requiring efficient erection, clear overhead coordination, strong lifting performance, and effective multi-crane site planning. They are commonly used across commercial builds, residential towers, infrastructure works, and general construction sites.',
    bestFor: [
      'Commercial construction',
      'Residential towers',
      'Multi-crane sites',
      'General building works',
      'Structural lifting',
      'Clean overhead coordination'
    ]
  },
  {
    key: 'luffing_jib',
    title: 'Luffing Jib Tower Cranes',
    shortTitle: 'Luffing Jib',
    description: 'Luffing jib cranes are built for constrained sites where swing radius, neighbouring structures, airspace restrictions, or close-proximity crane operations require tighter control. They are well suited to city projects, high-rise construction, and dense urban environments.',
    bestFor: [
      'High-rise construction',
      'Restricted urban sites',
      'Tight city blocks',
      'Multi-crane airspace',
      'Infrastructure projects',
      'Limited swing radius'
    ]
  },
  {
    key: 'hammerhead',
    title: 'Hammerhead Tower Cranes',
    shortTitle: 'Hammerhead',
    description: 'Hammerhead tower cranes provide strong horizontal jib performance and dependable lifting coverage for conventional construction sites. They are suitable where site space allows fixed-jib operation and broad lifting coverage is required.',
    bestFor: [
      'Conventional construction sites',
      'Broad lifting coverage',
      'Commercial builds',
      'Civil construction',
      'Structural lifting',
      'Adequate swing room'
    ]
  },
  {
    key: 'derrick',
    title: 'Derrick Cranes',
    shortTitle: 'Derrick',
    description: 'Derrick cranes support specialised lifting operations, particularly where access is restricted or tower crane dismantling requires controlled rooftop or structure-mounted lifting solutions. They should be presented as a specialist capability rather than a general hire item.',
    bestFor: [
      'Rooftop lifting',
      'Tower crane dismantling',
      'Restricted-access lifting',
      'Structure-mounted lifting',
      'Specialist crane removal',
      'Controlled small-footprint lifting'
    ]
  }
];

const TOWERCRANE_REFERENCE_MODELS = [
  { category: 'flat_top', manufacturer: 'Potain', model: 'MC85B', capacity: '5T', description: 'Compact and efficient, suitable for tight urban sites and fast setup.' },
  { category: 'flat_top', manufacturer: 'Potain', model: 'MCT88', capacity: '5T', description: 'Topless layout assists visibility and multi-crane coordination.' },
  { category: 'flat_top', manufacturer: 'Raimondi', model: 'MRT144', capacity: '10T', description: 'Versatile mid-range crane suited to typical building projects.' },
  { category: 'flat_top', manufacturer: 'Raimondi', model: 'MRT189', capacity: '10T', description: 'Reliable option for busy multi-crane construction sites.' },
  { category: 'flat_top', manufacturer: 'Raimondi', model: 'MRT294', capacity: '16T', description: 'Higher-capacity option with longer reach for larger commercial or campus-style projects.' },
  { category: 'flat_top', manufacturer: 'Yongmao', model: 'STT133', capacity: '6T', description: 'Simple and dependable option for housing and light commercial work.' },
  { category: 'flat_top', manufacturer: 'Yongmao', model: 'STT153', capacity: '8T', description: 'Good lift capacity while remaining compact to transport and erect.' },
  { category: 'flat_top', manufacturer: 'Comedil', model: 'CTT331', capacity: '16T', description: 'Robust performer for routine mid-to-large lifts.' },
  { category: 'flat_top', manufacturer: 'Comedil', model: 'CTT561', capacity: '24T', description: 'Higher-capacity option for heavier structural lifts.' },
  { category: 'flat_top', manufacturer: 'Comansa', model: '21CM550', capacity: '25T', description: 'Balanced lifting strength and reach for larger construction sites.' },
  { category: 'flat_top', manufacturer: 'Comansa', model: '21CM750', capacity: '37.5T', description: 'Powerful option for heavy material handling and structural work.' },
  { category: 'flat_top', manufacturer: 'Comansa', model: '21CM1100', capacity: '50T', description: 'High-capacity flat-top tower crane suited to very heavy industrial and structural lifts.' },
  { category: 'flat_top', manufacturer: 'Comedil', model: 'CTT51A-2', capacity: '-', description: 'Compact flat-top tower crane suited to smaller building sites and efficient site setup.' },
  { category: 'flat_top', manufacturer: 'Comedil', model: 'CTT161-2.5', capacity: '-', description: 'Flat-top crane option for light-to-medium lifting requirements where clean site coordination matters.' },
  { category: 'flat_top', manufacturer: 'Comedil', model: 'CTT561A-20', capacity: '-', description: 'Higher-capacity flat-top crane suited to major building works and heavier structural lifting.' },
  { category: 'flat_top', manufacturer: 'Yongmao', model: 'STT140-8', capacity: '-', description: 'Flat-top crane suited to general construction, multi-crane sites, and efficient lifting operations.' },
  { category: 'flat_top', manufacturer: 'Yongmao', model: 'STT200-10', capacity: '-', description: 'Mid-range flat-top tower crane suitable for commercial projects and larger building sites.' },
  { category: 'flat_top', manufacturer: 'Yongmao', model: 'STT293-18', capacity: '-', description: 'Larger flat-top crane option for heavier loads, longer reach, and demanding construction programmes.' },
  { category: 'luffing_jib', manufacturer: 'Comedil', model: 'CTL180', capacity: '16T', description: 'Compact luffer that fits neatly into constrained urban sites.' },
  { category: 'luffing_jib', manufacturer: 'Comedil', model: 'CTL260', capacity: '18T', description: 'Proven mid-range option for medium-scale projects.' },
  { category: 'luffing_jib', manufacturer: 'Comedil', model: 'CTL340', capacity: '24T', description: 'Handles heavy loads with precise luffing movement.' },
  { category: 'luffing_jib', manufacturer: 'Comedil', model: 'CTL430', capacity: '24T', description: 'Strong choice for demanding sites requiring reliability and versatility.' },
  { category: 'luffing_jib', manufacturer: 'Recom', model: 'RTL285', capacity: '18T', description: 'Solid lifting ability across a wide range of jobs.' },
  { category: 'luffing_jib', manufacturer: 'Comansa', model: 'CML310', capacity: '24T', description: 'Flexible crane for large builds with complex lifting needs.' },
  { category: 'luffing_jib', manufacturer: 'Comansa', model: 'CML560', capacity: '36T', description: 'High lifting capacity suited to very large structures and infrastructure.' },
  { category: 'luffing_jib', manufacturer: 'Comansa', model: 'CML800', capacity: '64T', description: 'High-capacity luffing crane suited to major projects and heavy lifting requirements.' },
  { category: 'luffing_jib', manufacturer: 'Yongmao', model: 'STL230', capacity: '-', description: 'Luffing jib tower crane suited to restricted sites, city builds, and projects requiring controlled jib movement in tight airspace.' },
  { category: 'luffing_jib', manufacturer: 'Yongmao', model: 'STL420', capacity: '-', description: 'Larger luffing jib crane option for demanding high-rise, commercial, and infrastructure lifting environments.' },
  { category: 'luffing_jib', manufacturer: 'Comedil', model: 'CTL205', capacity: '-', description: 'Compact-to-mid luffing crane option suited to urban construction and controlled lifting zones.' },
  { category: 'luffing_jib', manufacturer: 'GJJ', model: 'JTL120E-8', capacity: '-', description: 'Luffing jib crane option for constrained sites requiring efficient lifting within limited swing radius.' },
  { category: 'hammerhead', manufacturer: 'GJJ', model: 'JT125H-6', capacity: '-', description: 'Hammerhead tower crane suited to conventional building sites requiring dependable reach and lifting performance.' },
  { category: 'hammerhead', manufacturer: 'Liebherr', model: '290HC', capacity: '-', description: 'Heavy-duty hammerhead tower crane option suited to larger construction projects and structural lifting requirements.' },
  { category: 'derrick', manufacturer: 'Derrick', model: 'EDKH185 25t', capacity: '25T', description: 'Derrick crane suited to specialised lifting, dismantling, rooftop works, and restricted-access lifting conditions.' },
  { category: 'derrick', manufacturer: 'Derrick', model: 'EDK45 6t Stiff Leg', capacity: '6T', description: 'Stiff-leg derrick crane suited to controlled lifting where conventional crane access or dismantling conditions are restricted.' }
].map((item) => ({
  ...item,
  verification_status: 'Unverified reference asset',
  source_type: 'Unknown',
  source_note: 'Prompt-provided candidate reference. Verify company, source, and spec evidence before publishing.',
  source_company: '-',
  ownership_status: 'Reference only',
  availability_status: 'Unknown',
  spec_sheet_status: 'Not verified',
  publish_status: 'Hold for verification',
  internal_notes: 'Do not present as owned fleet or customer-facing capability until evidence is recorded.',
  last_verified_date: '-',
  verified_by: '-'
}));

const DISPLAY_LABEL_OVERRIDES = {
  crane_operator: 'Crane Operator',
  heavy_lift_crane_operator: 'Heavy Lift Crane Operator',
  traffic_controller: 'Traffic Controller',
  lift_engineer: 'Lift Engineer',
  truck_driver: 'Truck Driver',
  electrical_spotter: 'Electrical Spotter',
  plant_and_labour: 'Plant + labour',
  labour_only: 'Labour only',
  labour_hire: 'Labour hire',
  on_leave: 'On leave',
  in_progress: 'In progress',
  expiring_soon: 'Expiring soon',
  high_risk_licence_crane: 'High Risk Work Crane',
  high_risk_licence_dogging: 'High Risk Work Dogging',
  high_risk_licence_rigging: 'High Risk Work Rigging',
  white_card: 'White Card',
  msic_card: 'MSIC Card',
  site_induction: 'Site Induction',
  client_induction: 'Client Induction',
  medical_clearance: 'Medical Clearance',
  drivers_licence: 'Driver Licence',
  working_at_height: 'Working at Height',
  confined_space: 'Confined Space',
  operate_breathing_apparatus: 'Operate Breathing Apparatus',
  health_and_safety_representative: 'Health and Safety Representative',
  first_aid: 'First Aid',
  rail_riw: 'RIW',
  rail_sarc: 'SARC',
  rail_wett: 'WETT',
  hrwl_c0: 'C0',
  job_requirement_items: 'Job requirements',
  job_timezone: 'Timezone',
  schedule_status: 'Schedule status',
  shift_type: 'Shift type',
  lift_risk_level: 'Lift risk level',
  employment_type: 'Employment type',
  self_declared_fatigue: 'Self-declared fatigue',
  crew_roles_required: 'Crew roles',
  required_credentials: 'Required credentials',
  site_conditions: 'Site conditions',
  crane_classes_required: 'Crane / equipment classes',
  task_tags: 'Task context'
};

const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null) continue;
    if (key === 'class') node.className = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else node.setAttribute(key, value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
};

const fmtDate = (value) => {
  if (!value) return '-';
  try { return new Date(value).toLocaleString(); } catch { return String(value); }
};

const fmtDateOnly = (value) => {
  if (!value) return '-';
  return String(value).length > 10 ? String(value).slice(0, 10) : String(value);
};

const shortId = (value) => value ? String(value).slice(0, 8) : '-';
const splitCsv = (value) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
const splitPipe = (value) => String(value || '').split('|').map((item) => item.trim()).filter(Boolean);
function keyify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function titleCase(value) {
  const text = String(value || '').replace(/_/g, ' ').trim();
  if (!text) return '';
  return text.split(/\s+/).map((part) => {
    const upper = part.toUpperCase();
    if (['VOC', 'RIW', 'SARC', 'WETT', 'EWP', 'HRWL', 'MSIC', 'NHVR'].includes(upper)) return upper;
    if (/^[A-Z]{1,3}\d?$/.test(upper)) return upper;
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  }).join(' ');
}

function formatTimezoneLabel(value) {
  return String(value || '')
    .split('/')
    .filter((part) => part !== '')
    .map((part) => titleCase(part))
    .join(' / ');
}

function optionLabel(value) {
  if (value && typeof value === 'object') return value.label || formatDisplayLabel(value.value);
  return formatDisplayLabel(value);
}

function optionValue(value) {
  if (value && typeof value === 'object') return value.value;
  return value;
}

function formatDisplayLabel(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const key = keyify(raw);
  if (DISPLAY_LABEL_OVERRIDES[key]) return DISPLAY_LABEL_OVERRIDES[key];
  if (/^hrwl_[a-z]{1,2}\d?$/.test(key)) return key.replace(/^hrwl_/, '').toUpperCase().replace('CO', 'C0');
  if (/^voc_/.test(key)) return `VOC ${titleCase(key.replace(/^voc_/, ''))}`;
  return titleCase(raw);
}

function labelsFromValues(values = [], labelLookup = null) {
  const lookup = labelLookup || {};
  return (values || []).map((value) => lookup[value] || formatDisplayLabel(value));
}

function renderChipList(values = [], labelLookup = null, emptyLabel = '-') {
  if (!values || values.length === 0) return el('span', { class: 'muted' }, emptyLabel);
  return el('div', { class: 'chip-list' }, ...values.map((value) =>
    el('span', { class: 'chip' }, labelsFromValues([value], labelLookup)[0])
  ));
}

function friendlyErrorMessage(message) {
  return String(message || '')
    .replace(/\b[a-z]+(?:_[a-z0-9]+)+\b/g, (token) => formatDisplayLabel(token));
}

function selectedCheckboxValues(form, name) {
  return Array.from(form.querySelectorAll(`input[name="${name}"]:checked`))
    .map((node) => node.value)
    .filter(Boolean);
}
const splitLocalDateTime = (value) => {
  if (!value || !String(value).includes(' ')) return { date: '', time: '' };
  const [datePart, timePart] = String(value).split(' ');
  return { date: datePart || '', time: timePart || '' };
};
const normalizeTag = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');
const stars = (rating) => '★'.repeat(Math.max(0, Number(rating) || 0));

function detectBrowserTimeZone() {
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  return detected || 'Australia/Brisbane';
}

function isoDateInTimeZone(date = new Date(), timeZone = detectBrowserTimeZone()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function addDaysIso(dateStr, days) {
  const [year, month, day] = String(dateStr).split('-').map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  probe.setUTCDate(probe.getUTCDate() + days);
  return probe.toISOString().slice(0, 10);
}

function startOfWeekIso(dateStr) {
  const [year, month, day] = String(dateStr).split('-').map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  const daysToMonday = (probe.getUTCDay() + 6) % 7;
  probe.setUTCDate(probe.getUTCDate() - daysToMonday);
  return probe.toISOString().slice(0, 10);
}

function formatScheduleRange(schedule) {
  if (!schedule?.has_schedule) return 'Draft - schedule not set';
  return `${schedule.display_start_local} -> ${schedule.display_end_local} (${schedule.display_timezone})`;
}

function getHashState() {
  const raw = location.hash.replace(/^#\/?/, '') || 'dashboard';
  const [pathPart, queryPart = ''] = raw.split('?');
  const segments = pathPart.split('/').filter(Boolean);
  return {
    route: segments[0] || 'dashboard',
    rest: segments.slice(1),
    query: new URLSearchParams(queryPart),
  };
}

function setButtonBusy(button, busy, idleLabel, busyLabel) {
  if (!button) return;
  button.disabled = busy;
  button.textContent = busy ? busyLabel : idleLabel;
}

function disableFormControls(container) {
  if (!container) return;
  container.querySelectorAll('input, select, textarea, button').forEach((node) => {
    node.disabled = true;
  });
}

function nextRenderCycle() {
  state.renderCycle += 1;
  return state.renderCycle;
}

function isStaleRender(renderCycle) {
  return renderCycle !== state.renderCycle;
}

let toastTimer = null;
function toast(message, kind = 'info') {
  const node = document.getElementById('toast');
  node.textContent = message;
  node.className = `toast ${kind}`;
  node.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.add('hidden'), 4500);
}

async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); }
    catch { data = { error: text }; }
  }

  if (res.status === 401 && state.token) {
    logout();
    throw { status: 401, error: 'Session expired. Please sign in again.', data };
  }
  if (!res.ok) {
    if (res.status === 403 && data?.must_change_password) {
      persistUser(state.user ? { ...state.user, must_change_password: true } : { must_change_password: true });
      showPasswordChange();
    }
    if (res.status === 403 && data?.company_access_status) {
      if (state.user) persistUser({ ...state.user, company: data.company });
      showAccessBlocked(data.company, data.message || data.error);
    }
    throw { status: res.status, error: friendlyErrorMessage((data && data.error) || `HTTP ${res.status}`), data };
  }
  return data;
}

function humanFileSize(bytes) {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`;
}

function sourceUploadStatusPill(status, label = null) {
  return el('span', {
    class: `pill ${SOURCE_UPLOAD_STATUS_CLASSES[status] || 'pill-muted'}`
  }, label || formatDisplayLabel(status));
}

async function uploadSourceDocument(file, { category, notes, batchCount, authorised, reviewOnly }) {
  const headers = {
    'Content-Type': 'application/octet-stream',
    'X-Source-Upload-Filename': encodeURIComponent(file.name || 'source-document'),
    'X-Source-Upload-Mime-Type': file.type || 'application/octet-stream',
    'X-Source-Upload-Category': encodeURIComponent(category || ''),
    'X-Source-Upload-Notes': encodeURIComponent(notes || ''),
    'X-Source-Upload-Batch-Count': String(batchCount || 1),
    'X-Source-Upload-Authorised': authorised ? 'true' : 'false',
    'X-Source-Upload-Review-Only': reviewOnly ? 'true' : 'false'
  };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;

  const res = await fetch('/api/source-uploads', {
    method: 'POST',
    headers,
    body: await file.arrayBuffer()
  });
  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); }
    catch { data = { error: text }; }
  }
  if (res.status === 401 && state.token) {
    logout();
    throw new Error('Session expired. Please sign in again.');
  }
  if (!res.ok) {
    if (res.status === 403 && data?.must_change_password) showPasswordChange();
    throw new Error(friendlyErrorMessage(data?.error || `HTTP ${res.status}`));
  }
  return data;
}

async function downloadSourceUpload(id, filename, button) {
  const idleLabel = button?.textContent || 'Download';
  setButtonBusy(button, true, idleLabel, 'Preparing...');
  try {
    const headers = {};
    if (state.token) headers.Authorization = `Bearer ${state.token}`;
    const res = await fetch(`/api/source-uploads/${encodeURIComponent(id)}/download`, { headers });
    const blob = await res.blob();
    if (res.status === 401 && state.token) {
      logout();
      throw new Error('Session expired. Please sign in again.');
    }
    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const data = JSON.parse(await blob.text());
        message = data.error || message;
      } catch {
        // Keep generic download error.
      }
      throw new Error(friendlyErrorMessage(message));
    }
    const url = URL.createObjectURL(blob);
    const link = el('a', { href: url, download: filename || 'source-document' });
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    toast(err.message || 'Source document download failed', 'error');
  } finally {
    setButtonBusy(button, false, idleLabel, 'Preparing...');
  }
}

function exportFilterQuery() {
  const form = document.getElementById('export-filter-form');
  const params = new URLSearchParams();
  if (!form) return params;
  const fd = new FormData(form);
  for (const key of ['start_date', 'end_date', 'timezone']) {
    const value = String(fd.get(key) || '').trim();
    if (value) params.set(key, value);
  }
  if (fd.get('include_archived') === 'on') params.set('include_archived', 'true');
  return params;
}

function filenameFromDisposition(value, fallback) {
  const match = String(value || '').match(/filename="?([^";]+)"?/i);
  return match ? match[1] : fallback;
}

async function downloadExportCsv(type, button) {
  const idleLabel = button?.textContent || 'Download CSV';
  setButtonBusy(button, true, idleLabel, 'Preparing CSV...');
  try {
    const query = exportFilterQuery();
    const suffix = query.toString() ? `?${query.toString()}` : '';
    const headers = {};
    if (state.token) headers.Authorization = `Bearer ${state.token}`;
    const res = await fetch(`/api/exports/${encodeURIComponent(type)}.csv${suffix}`, { headers });
    const text = await res.text();
    if (res.status === 401 && state.token) {
      logout();
      throw new Error('Session expired. Please sign in again.');
    }
    if (!res.ok) {
      let message = text || `HTTP ${res.status}`;
      try {
        const data = JSON.parse(text);
        message = data.error || message;
        if (res.status === 403 && data.must_change_password) showPasswordChange();
      } catch {
        // Keep the plain-text error.
      }
      throw new Error(friendlyErrorMessage(message));
    }
    const filename = filenameFromDisposition(
      res.headers.get('content-disposition'),
      `dispatchtalon-${type}-export.csv`
    );
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = el('a', { href: url, download: filename });
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast('CSV export prepared for office review', 'success');
  } catch (err) {
    toast(err.message || 'CSV export failed', 'error');
  } finally {
    setButtonBusy(button, false, idleLabel, 'Preparing CSV...');
  }
}

let craneModelsCache = null;
const craneTravelStateCache = new Map();
let companyProfileCache = null;
let companyCatalogueCache = null;
let companyAssetsCache = null;
let companySetupStateCache = null;
let intakeOptionsCache = null;
let credentialTypesCache = null;

const LABOUR_ONLY_CATALOGUE_CATEGORIES = new Set(['credential', 'voc', 'civil', 'rail', 'energy']);
const OUR_BUSINESS_SECTION_KEYS = [
  'operating-mode',
  'business-basics',
  'tower-crane-library',
  'requirements',
  'asset-register',
  'reset-company-data'
];
const CATALOGUE_SECTION_GROUPS = [
  {
    key: 'credentials-vocs',
    title: 'Credentials / VOCs',
    summary: 'Licences, tickets, VOCs, inductions, and worker eligibility gates.',
    categories: ['credential', 'voc']
  },
  {
    key: 'site-conditions',
    title: 'Site conditions / job requirements',
    summary: 'Civil, access, site condition, and review flags used during job setup.',
    categories: ['civil']
  },
  {
    key: 'equipment-classes',
    title: 'Equipment classes',
    summary: 'Plant and crane requirement classes. Saved plant numbers are managed in Asset Register.',
    categories: ['equipment']
  },
  {
    key: 'transport-classes',
    title: 'Transport classes',
    summary: 'Transport requirement classes that may affect dispatch review.',
    categories: ['transport']
  },
  {
    key: 'specialist-requirements',
    title: 'Rail / energy / specialist requirements',
    summary: 'Specialist review requirements. Keep collapsed unless relevant to this company.',
    categories: ['rail', 'energy']
  }
];
const REQUIREMENT_GROUP_ORDER = [
  'High Risk Work',
  'VOC',
  'Working at Height',
  'Safety / Site',
  'Heavy Vehicle',
  'Rail',
  'Energy / Electrical',
  'Civil / Plant'
];

async function loadCraneModels() {
  if (craneModelsCache) return craneModelsCache;
  craneModelsCache = await api('GET', '/crane-models');
  return craneModelsCache;
}

async function loadCraneTravelStates(craneModelId) {
  if (!craneModelId) return [];
  const key = String(craneModelId);
  if (craneTravelStateCache.has(key)) return craneTravelStateCache.get(key);
  const states = await api('GET', `/crane-models/${encodeURIComponent(craneModelId)}/travel-states`);
  craneTravelStateCache.set(key, states);
  return states;
}

async function loadCompanyProfile(force = false) {
  if (companyProfileCache && !force) return companyProfileCache;
  companyProfileCache = await api('GET', '/company/profile');
  if (state.user) {
    persistUser({ ...state.user, company: companyProfileCache });
  }
  return companyProfileCache;
}

async function loadCompanyCatalogue(force = false) {
  if (companyCatalogueCache && !force) return companyCatalogueCache;
  companyCatalogueCache = await api('GET', '/company/catalogue-selections');
  return companyCatalogueCache;
}

async function loadCompanyAssets(force = false) {
  if (companyAssetsCache && !force) return companyAssetsCache;
  companyAssetsCache = await api('GET', '/company/assets');
  return companyAssetsCache;
}

async function loadCompanySetupState(force = false) {
  if (companySetupStateCache && !force) return companySetupStateCache;
  companySetupStateCache = await api('GET', '/company/setup-state');
  return companySetupStateCache;
}

async function loadIntakeOptions(force = false) {
  if (intakeOptionsCache && !force) return intakeOptionsCache;
  intakeOptionsCache = await api('GET', '/company/intake-options');
  return intakeOptionsCache;
}

async function loadCredentialTypes(force = false) {
  if (credentialTypesCache && !force) return credentialTypesCache;
  credentialTypesCache = await api('GET', '/credential-types');
  return credentialTypesCache;
}

function boolLabel(value) {
  return value ? 'Yes' : 'No';
}

function formatCraneModelOption(model) {
  const parts = [`${model.manufacturer} ${model.model}`];
  if (model.nominal_capacity_tonnes != null) parts.push(`${model.nominal_capacity_tonnes}t`);
  return parts.join(' · ');
}

function formatTravelStateOption(state) {
  const details = [];
  if (state.carried_counterweight_tonnes != null) details.push(`${state.carried_counterweight_tonnes}t carried`);
  if (state.axle_basis) details.push(state.axle_basis);
  if (state.review_required) details.push('review');
  return [state.state_label, details.join(' · ')].filter(Boolean).join(' — ');
}

function populateCraneTravelStateSelect(select, states, selectedId = null) {
  if (!select) return;
  select.innerHTML = '';
  select.appendChild(el('option', { value: '' }, 'Select travel state'));
  for (const state of states || []) {
    const option = el('option', { value: String(state.id) }, formatTravelStateOption(state));
    if (selectedId != null && String(selectedId) === String(state.id)) {
      option.selected = true;
    }
    select.appendChild(option);
  }
}

function renderCranePlanningSummary(planning, options = {}) {
  const panelClass = options.compact ? 'panel crane-planning-panel compact' : 'panel crane-planning-panel';
  const panel = el('div', { class: panelClass });
  panel.appendChild(el('h3', {}, 'Crane, counterweight and transport'));

  if (!planning) {
    panel.appendChild(el('div', { class: 'empty' }, 'No crane planning has been recorded for this job yet.'));
    return panel;
  }

  const kv = el('div', { class: 'kv' });
  const addKv = (label, value) => {
    kv.appendChild(el('div', {}, label));
    const cell = el('div', {});
    if (value instanceof Node) cell.appendChild(value);
    else cell.textContent = value == null || value === '' ? '-' : String(value);
    kv.appendChild(cell);
  };

  addKv('Selected crane model', planning.selected_crane_model
    ? `${planning.selected_crane_model.manufacturer} ${planning.selected_crane_model.model}`
    : '-');
  addKv('Selected travel state', planning.selected_travel_state?.state_label || '-');
  addKv('Crane class', planning.crane_class || '-');
  addKv('Required capacity tonnes', planning.required_capacity_tonnes ?? '-');
  addKv('Lift weight tonnes', planning.lift_weight_tonnes ?? '-');
  addKv('Radius metres', planning.radius_m ?? '-');
  addKv('Height metres', planning.height_m ?? '-');
  addKv('Required counterweight', planning.counterweight_required_tonnes ?? '-');
  addKv('Carried counterweight', planning.counterweight_carried_on_crane_tonnes ?? '-');
  addKv('Counterweight to transport', planning.counterweight_to_transport_tonnes ?? '-');
  addKv('Likely transport requirement', boolLabel(planning.requires_counterweight_transport));
  addKv('Support truck required', boolLabel(planning.support_truck_required));
  addKv('Estimated transport loads', planning.estimated_transport_loads ?? '-');
  addKv('Review required', boolLabel(planning.manual_review_required));
  addKv('Road access review required', boolLabel(planning.transport_review_required || planning.route_review_required));
  addKv('NHVR / state road access review required', boolLabel(planning.nhvr_review_required || planning.osom_review_required));
  addKv('Permit review required', boolLabel(planning.permit_review_required));
  addKv('Source confidence', planning.source_confidence ? formatDisplayLabel(planning.source_confidence) : '-');
  addKv('Review reason', planning.review_reason ? friendlyErrorMessage(planning.review_reason) : '-');
  panel.appendChild(kv);

  if ((planning.messages || []).length > 0) {
    panel.appendChild(el('div', { class: 'alerts crane-planning-alerts' },
      el('strong', {}, 'Review guidance'),
      el('ul', {}, ...(planning.messages || []).map((message) => el('li', {}, message)))
    ));
  }

  if ((planning.transport_requirements || []).length > 0) {
    const list = el('div', { class: 'crane-transport-list' });
    for (const item of planning.transport_requirements) {
      list.appendChild(el('div', { class: 'schedule-card' },
        el('div', { class: 'schedule-card-head' },
          el('div', {},
            el('div', { class: 'rank-name' }, item.load_description || 'Transport requirement'),
            el('div', { class: 'rank-meta' }, formatDisplayLabel(item.vehicle_type || 'unknown_manual_review'))
          ),
          el('div', { class: 'button-row' },
            item.nhvr_review_required ? el('span', { class: 'pill pill-warn' }, 'NHVR review') : null,
            item.route_review_required ? el('span', { class: 'pill pill-warn' }, 'Route review') : null
          )
        ),
        el('div', { class: 'small', style: 'margin-top:8px;' },
          `Counterweight transport may be required. Estimated tonnes: ${item.estimated_tonnes ?? '-'}`
        ),
        el('div', { class: 'small muted', style: 'margin-top:6px;' }, item.notes || '-')
      ));
    }
    panel.appendChild(el('div', { class: 'crane-transport-section' },
      el('h4', {}, 'Transport requirements'),
      list
    ));
  }

  return panel;
}

function loadSession() {
  const token = localStorage.getItem(TOKEN_KEY);
  const user = localStorage.getItem(USER_KEY);
  if (!token || !user) return;
  state.token = token;
  try {
    state.user = normalizeUserSession(JSON.parse(user));
  } catch {
    state.user = null;
  }
}

function normalizeUserSession(user) {
  if (!user) return null;
  return {
    ...user,
    must_change_password: Boolean(user.must_change_password)
  };
}

function persistUser(user) {
  state.user = normalizeUserSession(user);
  if (state.user) localStorage.setItem(USER_KEY, JSON.stringify(state.user));
  else localStorage.removeItem(USER_KEY);
}

function saveSession(token, user) {
  state.token = token;
  localStorage.setItem(TOKEN_KEY, token);
  persistUser(user);
}

async function refreshAuthenticatedUser() {
  const user = await api('GET', '/auth/me');
  persistUser(user);
  return state.user;
}

function isPasswordChangeRequired() {
  return state.user?.must_change_password === true;
}

function companyAccessStatus() {
  return state.user?.company?.effective_access_status || 'active';
}

function isCompanyAccessBlocked() {
  const status = companyAccessStatus();
  return status === 'expired' || status === 'suspended';
}

function isAdminUser() {
  return state.user?.role === 'admin';
}

function isInternalAdmin() {
  return state.user?.is_internal_admin === true;
}

function syncInternalNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  const existing = nav.querySelector('[data-route="internal-pilot-monitor"]');
  if (!isInternalAdmin()) {
    if (existing) existing.remove();
    return;
  }
  if (existing) return;
  nav.appendChild(el('a', {
    href: '#/internal-pilot-monitor',
    'data-route': 'internal-pilot-monitor'
  }, 'Internal Pilot Monitor'));
}

function formatPilotType(value) {
  const labels = {
    internal: 'internal',
    testing_partner: 'test portal',
    founding_partner: 'founding partner',
    commercial_pilot: 'commercial pilot'
  };
  return labels[value] || value || 'pilot';
}

function formatCompanyLabel() {
  if (!state.user) return '';
  const company = state.user.company || {};
  const companyName = company.display_name || company.name || 'Company not set';
  const parts = [
    `${state.user.name} - ${state.user.role}`,
    `Company: ${companyName}`
  ];
  if (company.pilot_type) parts.push(formatPilotType(company.pilot_type));
  if (company.pilot_expires_at) {
    const days = company.days_remaining ?? 0;
    parts.push(days === 1 ? '1 day remaining' : `${days} days remaining`);
  }
  return parts.join(' | ');
}

function setLoginNote(message = '') {
  const node = document.getElementById('login-note');
  node.textContent = message;
  node.classList.toggle('hidden', !message);
}

function logout() {
  nextRenderCycle();
  state.token = null;
  state.user = null;
  companyProfileCache = null;
  companyCatalogueCache = null;
  companyAssetsCache = null;
  companySetupStateCache = null;
  credentialTypesCache = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(PASSWORD_REMINDER_DISMISSED_KEY);
  showLogin();
}

function showLogin(message = '') {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('password-change-screen').classList.add('hidden');
  document.getElementById('app-shell').classList.add('hidden');
  document.getElementById('login-error').textContent = '';
  syncInternalNav();
  setLoginNote(message);
}

function showPasswordChange() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('password-change-screen').classList.remove('hidden');
  document.getElementById('app-shell').classList.add('hidden');
  document.getElementById('password-change-error').textContent = '';
  document.getElementById('password-change-success').textContent = '';
  document.getElementById('password-change-success').classList.add('hidden');
  document.getElementById('password-change-context').textContent = state.user
    ? `Signed in as ${state.user.email}. Set a new account password before opening the pilot console.`
    : 'Your temporary password must be replaced before console access.';
}

function showAccessBlocked(company = state.user?.company, message = '') {
  nextRenderCycle();
  const status = company?.effective_access_status || company?.access_status || 'expired';
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('password-change-screen').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  document.getElementById('user-label').textContent = formatCompanyLabel();
  syncInternalNav();
  document.querySelectorAll('#nav a').forEach((link) => link.classList.remove('active'));
  const view = document.getElementById('view');
  const companyName = company?.display_name || company?.name || 'This company';
  const defaultMessage = status === 'suspended'
    ? 'This pilot portal is suspended. Contact Pressure Systems to restore access.'
    : 'This test portal has expired. Contact Pressure Systems to extend access.';
  view.innerHTML = '';
  view.appendChild(el('div', { class: 'panel access-blocked' },
    el('h2', {}, status === 'suspended' ? 'Pilot access suspended' : 'Test portal expired'),
    el('p', {}, `${companyName}: ${message || defaultMessage}`),
    el('p', { class: 'muted' }, 'Company data remains isolated. Access must be restored before operational console views are available.'),
    el('button', { type: 'button', onclick: logout }, 'Sign out')
  ));
}

function showApp() {
  if (isPasswordChangeRequired()) {
    showPasswordChange();
    return;
  }
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('password-change-screen').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  document.getElementById('user-label').textContent = formatCompanyLabel();
  syncInternalNav();
  if (isCompanyAccessBlocked()) {
    showAccessBlocked();
    return;
  }
  if (!location.hash) location.hash = '#/dashboard';
  else router();
}

async function submitPasswordChange(form, submit, options = {}) {
  const errNode = options.errorNode || document.getElementById('password-change-error');
  const successNode = options.successNode || document.getElementById('password-change-success');
  errNode.textContent = '';
  if (successNode) {
    successNode.textContent = '';
    successNode.classList.add('hidden');
  }

  const formData = new FormData(form);
  const currentPassword = String(formData.get('current_password') || '');
  const newPassword = String(formData.get('new_password') || '');
  const confirmPassword = String(formData.get('confirm_new_password') || '');

  if (newPassword !== confirmPassword) {
    errNode.textContent = 'The new password confirmation does not match.';
    return;
  }

  setButtonBusy(submit, true, 'Change password', 'Updating...');
  try {
    const result = await api('POST', '/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword
    });
    form.reset();
    if (successNode) {
      successNode.textContent = result.message || 'Password updated. Please sign in again.';
      successNode.classList.remove('hidden');
    }
    logout();
    showLogin(result.message || 'Password updated. Please sign in again.');
  } catch (err) {
    errNode.textContent = err.error || 'Password change failed';
  } finally {
    setButtonBusy(submit, false, 'Change password', 'Updating...');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadSession();

  document.getElementById('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    const errNode = document.getElementById('login-error');
    const submit = document.getElementById('login-submit');
    errNode.textContent = '';
    setButtonBusy(submit, true, 'Sign in', 'Signing in...');
    try {
      const result = await api('POST', '/auth/login', { email, password });
      saveSession(result.token, result.user);
      if (result.must_change_password || isPasswordChangeRequired()) {
        showPasswordChange();
      } else if (result.user?.company?.effective_access_status === 'expired' || result.user?.company?.effective_access_status === 'suspended') {
        showAccessBlocked(result.user.company);
      } else {
        showApp();
      }
    } catch (err) {
      errNode.textContent = err.error || 'Login failed';
    } finally {
      setButtonBusy(submit, false, 'Sign in', 'Signing in...');
    }
  });

  document.getElementById('password-change-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    await submitPasswordChange(event.target, document.getElementById('password-change-submit'));
  });

  document.getElementById('logout').addEventListener('click', logout);
  window.addEventListener('hashchange', router);

  if (state.token) {
    refreshAuthenticatedUser()
      .then(() => {
        if (isPasswordChangeRequired()) showPasswordChange();
        else showApp();
      })
      .catch(() => logout());
  } else {
    showLogin();
  }
});

function router() {
  if (!state.token) {
    showLogin();
    return;
  }
  if (isPasswordChangeRequired()) {
    showPasswordChange();
    return;
  }
  if (isCompanyAccessBlocked()) {
    showAccessBlocked();
    return;
  }

  const renderCycle = nextRenderCycle();
  const { route, rest } = getHashState();
  document.querySelectorAll('#nav a').forEach((link) => {
    link.classList.toggle('active', link.dataset.route === route);
  });

  const view = document.getElementById('view');
  view.innerHTML = '<div class="empty">Loading...</div>';

  const routes = {
    dashboard: () => renderDashboard(renderCycle),
    'our-business': () => renderOurBusiness(renderCycle),
    'source-uploads': () => renderSourceUploads(renderCycle),
    schedule: () => renderSchedule(renderCycle),
    'site-log': () => renderSiteLog(renderCycle),
    workers: () => {
      if (rest[0] === 'import') return renderWorkerImport(renderCycle);
      return rest[0] ? renderWorkerDetail(rest[0], renderCycle) : renderWorkersList(renderCycle);
    },
    jobs: () => {
      if (rest[0] === 'import-brief') return renderJobBriefImport(renderCycle);
      if (!rest[0]) return renderJobsList(renderCycle);
      if (rest[1] === 'smartrank') return renderSmartRank(rest[0], renderCycle);
      if (rest[1] === 'allocate') return renderAllocate(rest[0], rest[2], renderCycle);
      return renderJobDetail(rest[0], renderCycle);
    },
    audit: () => renderAudit(renderCycle),
    metrics: () => renderMetrics(renderCycle),
    exports: () => renderExports(renderCycle),
    'internal-pilot-monitor': () => {
      if (!isInternalAdmin()) return renderDashboard(renderCycle);
      return renderInternalPilotMonitor(renderCycle);
    },
    'new-job': () => renderNewJob(renderCycle),
    'new-worker': () => renderNewWorker(renderCycle),
  };

  const handler = routes[route] || (() => renderDashboard(renderCycle));
  Promise.resolve(handler()).catch((err) => {
    if (isStaleRender(renderCycle)) return;
    view.innerHTML = '';
    view.appendChild(el('div', { class: 'panel' },
      el('h2', {}, 'Something went wrong'),
      el('p', { class: 'error' }, err.error || String(err))
    ));
  });
}

function metricTile(label, value) {
  return el('div', { class: 'metric-tile' },
    el('div', { class: 'label' }, label),
    el('div', { class: 'value' }, String(value))
  );
}

function statusPill(status) {
  const map = {
    available: 'pill-ok',
    allocated: 'pill-warn',
    unavailable: 'pill-bad',
    on_leave: 'pill-muted',
    inactive: 'pill-muted',
  };
  return el('span', { class: `pill ${map[status] || 'pill-muted'}` }, formatDisplayLabel(status));
}

function riskPill(risk) {
  const map = { routine: 'pill-muted', complex: 'pill-warn', critical: 'pill-bad' };
  return el('span', { class: `pill ${map[risk] || 'pill-muted'}` }, formatDisplayLabel(risk));
}

function jobStatusPill(status) {
  const map = {
    open: 'pill-info',
    draft: 'pill-muted',
    allocated: 'pill-ok',
    in_progress: 'pill-warn',
    complete: 'pill-muted',
    cancelled: 'pill-bad'
  };
  return el('span', { class: `pill ${map[status] || 'pill-muted'}` }, formatDisplayLabel(status));
}

function scheduleStatusPill(status) {
  const map = {
    draft: 'pill-muted',
    planned: 'pill-info',
    confirmed: 'pill-ok',
    completed: 'pill-muted',
    cancelled: 'pill-bad'
  };
  return el('span', { class: `pill ${map[status] || 'pill-muted'}` }, formatDisplayLabel(status));
}

function confidencePill(level = 'low') {
  const normalized = String(level || 'low').toLowerCase();
  const className = normalized === 'high'
    ? 'pill-ok'
    : (normalized === 'medium' ? 'pill-warn' : 'pill-bad');
  return el('span', { class: `pill ${className}` }, formatDisplayLabel(normalized));
}

function credPill(status) {
  const map = {
    valid: 'pill-ok',
    expiring_soon: 'pill-warn',
    expired: 'pill-bad',
    pending_verification: 'pill-info',
  };
  const labelMap = {
    valid: 'Current',
    expiring_soon: 'Expiring soon',
    pending_verification: 'Needs review'
  };
  return el('span', { class: `pill ${map[status] || 'pill-muted'}` }, labelMap[status] || formatDisplayLabel(status));
}

function renderTagList(tags, emptyLabel = '-', labelLookup = null) {
  if (!tags || tags.length === 0) return el('span', { class: 'muted' }, emptyLabel);
  return el('ul', { class: 'tag-list' }, ...(tags || []).map((tag) =>
    el('li', {}, (labelLookup && labelLookup[tag]) || formatDisplayLabel(tag))
  ));
}

function flattenCatalogueGroups(grouped = {}) {
  const groups = [];
  for (const [category, categoryGroups] of Object.entries(grouped || {})) {
    for (const [groupLabel, items] of Object.entries(categoryGroups || {})) {
      groups.push({ category, groupLabel, items });
    }
  }
  return groups.sort((a, b) => {
    const aIndex = REQUIREMENT_GROUP_ORDER.indexOf(a.groupLabel);
    const bIndex = REQUIREMENT_GROUP_ORDER.indexOf(b.groupLabel);
    const aOrder = aIndex === -1 ? REQUIREMENT_GROUP_ORDER.length : aIndex;
    const bOrder = bIndex === -1 ? REQUIREMENT_GROUP_ORDER.length : bIndex;
    return aOrder - bOrder || a.groupLabel.localeCompare(b.groupLabel) || a.category.localeCompare(b.category);
  });
}

function groupCatalogueItems(items = []) {
  const grouped = {};
  for (const item of items || []) {
    grouped[item.category] = grouped[item.category] || {};
    grouped[item.category][item.group_label] = grouped[item.category][item.group_label] || [];
    grouped[item.category][item.group_label].push(item);
  }
  return grouped;
}

function enabledCatalogueOnly(catalogue = {}) {
  const items = (catalogue.items || []).filter((item) => item.is_enabled);
  return {
    ...catalogue,
    items,
    grouped: groupCatalogueItems(items),
    enabled_count: items.length
  };
}

function operatingMode(profile = companyProfileCache || state.user?.company || {}) {
  return profile.operating_mode === 'labour_only' ? 'labour_only' : 'plant_and_labour';
}

function isLabourOnly(profile = companyProfileCache || state.user?.company || {}) {
  return operatingMode(profile) === 'labour_only';
}

function filterCatalogueForOperatingMode(catalogue = {}, mode = 'plant_and_labour') {
  if (mode !== 'labour_only') return catalogue;
  const items = (catalogue.items || []).filter((item) => LABOUR_ONLY_CATALOGUE_CATEGORIES.has(item.category));
  return {
    ...catalogue,
    items,
    grouped: groupCatalogueItems(items),
    enabled_count: items.filter((item) => item.is_enabled).length
  };
}

function hiddenEnabledRequirementIds(fullCatalogue = {}, visibleCatalogue = {}) {
  const visibleIds = new Set((visibleCatalogue.items || []).map((item) => Number(item.id)));
  return (fullCatalogue.items || [])
    .filter((item) => item.is_enabled && !visibleIds.has(Number(item.id)))
    .map((item) => Number(item.id))
    .filter(Number.isFinite);
}

function renderRequirementChecklist(catalogue, options = {}) {
  const name = options.name || 'requirement_item_ids';
  const selectedIds = new Set((options.selectedIds || []).map((id) => String(id)));
  const root = el('div', { class: 'requirement-grid' });
  const groups = flattenCatalogueGroups(catalogue.grouped || {});

  for (const group of groups) {
    const card = el('div', { class: 'requirement-group', 'data-category': group.category });
    const checkboxes = [];
    card.appendChild(el('div', { class: 'requirement-group-head' },
      el('div', {},
        el('strong', {}, group.groupLabel),
        el('div', { class: 'small muted' }, group.category)
      ),
      el('div', { class: 'button-row' },
        el('button', {
          type: 'button',
          class: 'secondary',
          onclick: () => checkboxes.forEach((box) => { box.checked = true; })
        }, 'Select group'),
        el('button', {
          type: 'button',
          class: 'secondary',
          onclick: () => checkboxes.forEach((box) => { box.checked = false; })
        }, 'Clear')
      )
    ));

    for (const item of group.items || []) {
      const box = el('input', { type: 'checkbox', name, value: String(item.id) });
      box.checked = selectedIds.size > 0 ? selectedIds.has(String(item.id)) : Boolean(item.is_enabled);
      checkboxes.push(box);
      card.appendChild(el('label', { class: 'check-row' },
        box,
        el('span', {}, item.label)
      ));
    }

    root.appendChild(card);
  }

  if (groups.length === 0) {
    root.appendChild(el('div', { class: 'empty' }, options.emptyText || 'No requirement catalogue items available.'));
  }

  return root;
}

function optionLabelLookup(groups = []) {
  const lookup = {};
  for (const group of groups || []) {
    for (const option of group.options || []) {
      lookup[option.value] = option.label;
    }
  }
  return lookup;
}

function equipmentGroupsFromCatalogue(catalogue = {}) {
  const grouped = {};
  for (const item of catalogue.items || []) {
    if (!['equipment', 'transport'].includes(item.category)) continue;
    const group = item.group_label || formatDisplayLabel(item.category);
    grouped[group] = grouped[group] || [];
    grouped[group].push({ value: item.label, label: item.label });
  }
  return Object.entries(grouped).map(([group, options]) => ({ group, options }));
}

function renderGroupedCheckboxPicker(name, groups = [], options = {}) {
  const selected = new Set((options.selectedValues || []).map(String));
  const root = el('div', { class: 'option-picker' });
  if (options.helpText) root.appendChild(el('div', { class: 'small muted' }, options.helpText));
  if (options.search !== false) {
    const search = el('input', {
      type: 'search',
      class: 'option-search',
      placeholder: options.searchPlaceholder || 'Search options...',
      'aria-label': options.searchPlaceholder || 'Search options'
    });
    root.appendChild(search);
    search.addEventListener('input', () => {
      const query = search.value.trim().toLowerCase();
      root.querySelectorAll('.option-row').forEach((row) => {
        row.classList.toggle('hidden', query && !row.textContent.toLowerCase().includes(query));
      });
    });
  }

  const grid = el('div', { class: 'option-grid' });
  for (const group of groups || []) {
    const card = el('div', { class: 'option-group' });
    card.appendChild(el('div', { class: 'option-group-head' },
      el('strong', {}, group.group),
      el('span', { class: 'small muted' }, `${(group.options || []).length} option(s)`)
    ));
    for (const option of group.options || []) {
      const box = el('input', { type: 'checkbox', name, value: option.value });
      box.checked = selected.has(String(option.value));
      card.appendChild(el('label', { class: 'option-row' },
        box,
        el('span', {}, option.label)
      ));
    }
    grid.appendChild(card);
  }
  if (!groups || groups.length === 0) {
    grid.appendChild(el('div', { class: 'empty' }, options.emptyText || 'No options available.'));
  }
  root.appendChild(grid);
  return root;
}

function roleOptionLabel(groups = [], value) {
  for (const group of groups || []) {
    const option = (group.options || []).find((item) => String(item.value) === String(value));
    if (option) return option.label;
  }
  return formatDisplayLabel(value);
}

function roleRequirementMap(requirements = []) {
  const map = new Map();
  for (const requirement of requirements || []) {
    const role = requirement.role_key || requirement.role || requirement.value;
    if (!role) continue;
    map.set(String(role), requirement);
  }
  return map;
}

function renderRoleRequirementsEditor(crewInputName, groups = [], selectedRequirements = []) {
  const panel = el('div', { class: 'role-requirements-panel' });
  panel.appendChild(el('div', { class: 'small muted' },
    'Set count and separation rules for selected crew roles. Combined-role coverage remains review-gated by SmartRank and dispatcher confirmation.'
  ));
  const host = el('div', { class: 'role-requirement-grid' });
  const existing = roleRequirementMap(selectedRequirements);

  panel.refresh = (form) => {
    host.innerHTML = '';
    const selectedRoles = selectedCheckboxValues(form, crewInputName);
    if (selectedRoles.length === 0) {
      host.appendChild(el('div', { class: 'empty' }, 'Select crew roles above to set counts and separation rules.'));
      return;
    }
    for (const role of selectedRoles) {
      const requirement = existing.get(String(role)) || {};
      const count = Math.max(1, Number(requirement.required_count || 1));
      const distinct = Boolean(requirement.requires_distinct_worker);
      host.appendChild(el('div', { class: 'role-requirement-row', 'data-role': role },
        el('strong', {}, roleOptionLabel(groups, role)),
        buildFieldWrapper('Count', el('input', {
          type: 'number',
          min: '1',
          max: '20',
          step: '1',
          name: `role_required_count_${role}`,
          value: String(count)
        })),
        el('label', { class: 'checkbox-row' },
          el('input', {
            type: 'checkbox',
            name: `role_requires_distinct_${role}`,
            checked: distinct ? 'checked' : null
          }),
          'Separate worker only'
        ),
        buildInput(`role_notes_${role}`, 'Role note', {
          value: requirement.notes || '',
          placeholder: 'Optional dispatcher note'
        })
      ));
    }
  };

  panel.appendChild(host);
  return panel;
}

function cssEscapeValue(value) {
  const text = String(value || '');
  if (globalThis.CSS && typeof globalThis.CSS.escape === 'function') {
    return globalThis.CSS.escape(text);
  }
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function roleRequirementsFromForm(form, crewInputName = 'crew_roles_required') {
  return selectedCheckboxValues(form, crewInputName).map((role) => {
    const escapedRole = cssEscapeValue(role);
    const countInput = form.querySelector(`input[name="role_required_count_${escapedRole}"]`);
    const distinctInput = form.querySelector(`input[name="role_requires_distinct_${escapedRole}"]`);
    const notesInput = form.querySelector(`input[name="role_notes_${escapedRole}"]`);
    return {
      role_key: role,
      required_count: Math.max(1, Number(countInput?.value || 1)),
      requires_distinct_worker: Boolean(distinctInput?.checked),
      notes: String(notesInput?.value || '').trim() || null
    };
  });
}

function renderRoleRequirementsSummary(requirements = []) {
  const normalized = requirements || [];
  if (normalized.length === 0) return el('span', { class: 'muted' }, '-');
  return el('div', { class: 'chip-list' }, ...normalized.map((requirement) => {
    const parts = [
      roleOptionLabel([], requirement.role_label || requirement.role_key),
      `x${requirement.required_count || 1}`
    ];
    if (requirement.requires_distinct_worker) parts.push('separate worker only');
    return el('span', { class: 'chip' }, parts.join(' | '));
  }));
}

function renderRoleCoveragePlan(plan) {
  if (!plan) return null;
  const panel = el('div', { class: 'panel role-coverage-plan' });
  panel.appendChild(el('div', { class: 'toolbar' },
    el('h3', {}, 'Role coverage suggestion'),
    el('span', { class: 'pill pill-info' }, `Minimum ${plan.suggested_minimum_headcount || 0} / conservative ${plan.conservative_headcount || 0}`)
  ));
  panel.appendChild(el('p', { class: 'small muted' },
    plan.boundary || 'Role coverage is decision support only. Dispatcher confirmation is required.'
  ));
  if (!plan.assignments || plan.assignments.length === 0) {
    panel.appendChild(el('div', { class: 'empty' }, 'No coverage suggestion available yet.'));
  } else {
    for (const assignment of plan.assignments) {
      panel.appendChild(el('div', { class: 'role-coverage-row' },
        el('strong', {}, assignment.worker_name),
        renderChipList(assignment.roles_covered || assignment.role_labels || [], null, '-'),
        assignment.review_required ? el('span', { class: 'pill pill-warn' }, 'Review required') : el('span', { class: 'pill pill-ok' }, 'Compatible')
      ));
    }
  }
  if (plan.unfilled_roles?.length) {
    panel.appendChild(el('div', { class: 'alerts' },
      el('strong', {}, 'Unfilled role slots: '),
      plan.unfilled_roles.map((item) => `${item.role_label || formatDisplayLabel(item.role_key)} x${item.remaining_count}`).join(', ')
    ));
  }
  return panel;
}

function renderRoleCoverageSummary(coverage = {}) {
  const roles = coverage.suggested_roles || coverage.roles_covered || [];
  if (!roles.length) return el('span', { class: 'small muted' }, 'No matching required roles');
  return el('div', { class: 'role-coverage-summary' },
    el('div', { class: 'small muted' }, 'Suggested role coverage'),
    renderChipList(roles, null, '-'),
    coverage.review_required ? el('span', { class: 'pill pill-warn' }, 'Review required') : el('span', { class: 'pill pill-ok' }, 'Compatible')
  );
}

function selectedRequirementIdsFromForm(form) {
  return Array.from(form.querySelectorAll('input[name="requirement_item_ids"]:checked'))
    .map((node) => Number(node.value))
    .filter(Number.isFinite);
}

function selectedCompanyAssetIdsFromForm(form) {
  return Array.from(form.querySelectorAll('select[name="company_asset_ids"]'))
    .map((node) => Number(node.value))
    .filter(Number.isFinite);
}

function assetItemsFromCatalogue(catalogue = {}) {
  return (catalogue.items || [])
    .filter((item) => item.is_enabled && ['equipment', 'transport'].includes(item.category));
}

function assetsGroupedByCatalogueItem(assets = []) {
  const grouped = new Map();
  for (const asset of assets || []) {
    const key = String(asset.catalogue_item_id);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(asset);
  }
  return grouped;
}

function renderStructuredRequirementsSummary(requirements = []) {
  const panel = el('div', { class: 'panel' });
  panel.appendChild(el('h3', {}, 'Job requirements'));
  if (!requirements || requirements.length === 0) {
    panel.appendChild(el('div', { class: 'empty' }, 'No structured requirements recorded.'));
    return panel;
  }

  panel.appendChild(el('div', { class: 'requirement-pill-list' }, ...requirements.map((item) =>
    el('span', { class: `requirement-pill ${item.is_custom ? 'custom' : ''}` },
      `${item.label}${item.is_custom ? ' (one-off)' : ''}`
    )
  )));

  const customCount = requirements.filter((item) => item.is_custom).length;
  if (customCount > 0) {
    panel.appendChild(el('div', { class: 'alerts crane-form-alerts' },
      'One-off requirements are job-scoped only and require dispatcher review before allocation.'
    ));
  }

  return panel;
}

function renderAssetAssignmentsSummary(assignments = [], warnings = []) {
  const panel = el('div', { class: 'panel' });
  panel.appendChild(el('h3', {}, 'Selected assets / plant'));
  if (!assignments || assignments.length === 0) {
    panel.appendChild(el('div', { class: 'empty' }, 'No exact asset selected. Job remains at requirement-class level.'));
    return panel;
  }

  panel.appendChild(el('div', { class: 'asset-list' }, ...assignments.map((assignment) => {
    const asset = assignment.asset || assignment;
    return el('div', { class: 'asset-row' },
      el('div', {},
        el('strong', {}, asset.asset_number),
        el('div', { class: 'small muted' }, asset.display_name || asset.catalogue_item?.label || 'Asset')
      ),
      el('span', { class: `pill ${asset.asset_status === 'active' ? 'pill-ok' : 'pill-warn'}` }, formatDisplayLabel(asset.asset_status || 'active')),
      el('span', { class: 'small muted' }, asset.home_location || '-')
    );
  })));

  const allWarnings = Array.from(new Set([
    ...(warnings || []),
    ...assignments.flatMap((assignment) => assignment.asset?.warnings || [])
  ]));
  if (allWarnings.length > 0) {
    panel.appendChild(el('div', { class: 'alerts crane-form-alerts' },
      el('strong', {}, 'Asset review'),
      el('ul', {}, ...allWarnings.map((warning) => el('li', {}, warning)))
    ));
  }

  return panel;
}

function renderPreferenceSignals(signals) {
  if (!signals || signals.length === 0) {
    return el('div', { class: 'small muted' }, 'No matching task preference signals');
  }

  return el('div', { class: 'signal-list' }, ...(signals || []).map((signal) => {
    const parts = [
      formatDisplayLabel(signal.task_tag),
      `${stars(signal.rating)} (${signal.rating})`,
      formatDisplayLabel(signal.source)
    ];
    if (signal.source === 'learned') {
      parts.push(`${signal.approval_count || 0} confirmed`);
      parts.push(`conf ${Number(signal.confidence || 0).toFixed(2)}`);
    }
    return el('span', { class: `signal-chip ${signal.source}` }, parts.join(' · '));
  }));
}

function renderBuildMyBusinessPanel(setupState = {}) {
  const counts = setupState.counts || {};
  const mode = setupState.operating_mode || operatingMode();
  const isPlantAndLabour = mode === 'plant_and_labour';
  const panel = el('div', { class: 'panel build-business-panel' });
  const steps = [
    {
      title: '1. Choose operating mode',
      body: mode === 'labour_only'
        ? 'Current mode: Labour only.'
        : 'Current mode: Plant + labour.',
      href: '#/our-business',
      action: 'Open Our Business'
    },
    {
      title: '2. Select company requirements',
      body: setupState.catalogue_configured
        ? `${setupState.enabled_catalogue_count || 0} requirement item(s) enabled.`
        : 'No company requirements selected yet.',
      href: '#/our-business',
      action: 'Choose requirements'
    },
    {
      title: '3. Add workers',
      body: counts.workers > 0
        ? `${counts.workers} worker(s) added.`
        : 'Import a spreadsheet, add manually, or skip for now.',
      href: '#/workers/import',
      action: 'Import workers'
    },
    {
      title: '4. Upload source records',
      body: 'Use assisted setup if your worker, asset, credential, roster, or job data is still in PDFs, Word documents, spreadsheets, or reports.',
      href: '#/source-uploads',
      action: 'Upload records'
    },
    ...(isPlantAndLabour ? [{
      title: '5. Add assets',
      body: counts.assets > 0
        ? `${counts.assets} plant number(s) registered.`
        : 'Enable equipment or transport classes, then add plant numbers under each class.',
      href: '#/our-business',
      action: 'Build asset register'
    }] : []),
    {
      title: isPlantAndLabour ? '6. Create first job' : '5. Create first job',
      body: counts.jobs > 0
        ? `${counts.jobs} job(s) created.`
        : 'Import a job brief, create manually, or skip until a real job is ready.',
      href: '#/jobs/import-brief',
      action: 'Import job brief'
    }
  ];

  panel.appendChild(el('div', { class: 'toolbar' },
    el('div', {},
      el('h3', {}, 'Build My Business'),
      el('p', { class: 'small muted' },
        'Start clean: choose your mode, save the requirements your company uses, then add workers, upload existing source records if needed, assets where applicable, and jobs.'
      )
    ),
    setupState.is_first_run
      ? el('span', { class: 'pill pill-info' }, 'first-run setup')
      : el('span', { class: 'pill' }, 'setup progress')
  ));

  panel.appendChild(el('div', { class: 'setup-steps' }, ...steps.map((step) =>
    el('div', { class: 'setup-step' },
      el('strong', {}, step.title),
      el('p', { class: 'small muted' }, step.body),
      el('a', { href: step.href }, el('button', { class: 'secondary' }, step.action))
    )
  )));

  panel.appendChild(el('div', { class: 'status-note' },
    'This setup is not mandatory all at once. Save progress as the company data becomes available.'
  ));

  return panel;
}

async function renderDashboard(renderCycle) {
  const view = document.getElementById('view');
  view.innerHTML = '';

  const [metrics, setupState] = await Promise.all([
    api('GET', '/metrics'),
    loadCompanySetupState(true)
  ]);
  if (isStaleRender(renderCycle)) return;

  view.appendChild(el('div', { class: 'toolbar' },
    el('h2', {}, 'Pilot dashboard'),
    el('div', { class: 'button-row' },
      el('a', { href: '#/workers/import' }, el('button', {}, 'Import workers')),
      el('a', { href: '#/source-uploads' }, el('button', { class: 'secondary' }, 'Upload source records')),
      el('a', { href: '#/new-worker' }, el('button', { class: 'secondary' }, '+ New worker')),
      el('a', { href: '#/new-job' }, el('button', { class: 'secondary' }, '+ New job'))
    )
  ));

  view.appendChild(buildSecurityPanel());
  if (setupState.is_first_run || !setupState.catalogue_configured || (setupState.counts?.workers || 0) === 0 || (setupState.counts?.jobs || 0) === 0) {
    view.appendChild(renderBuildMyBusinessPanel(setupState));
  }

  view.appendChild(el('div', { class: 'panel' },
    el('div', { class: 'metrics-grid' },
      metricTile('Total jobs', metrics.total_jobs),
      metricTile('Total allocations', metrics.total_allocations),
      metricTile('Workers imported', metrics.workers_imported),
      metricTile('Credential blocks', metrics.credential_blocks),
      metricTile('Fatigue blocks', metrics.fatigue_blocks),
      metricTile('Fatigue warnings', metrics.fatigue_warnings),
      metricTile('Warning overrides', metrics.warning_overrides),
      metricTile('Lower-ranked selections', metrics.lower_ranked_selections),
      metricTile('Top-ranked selections', metrics.top_ranked_selections),
      metricTile('Preference signals created', metrics.preference_signals_created),
      metricTile('Preference signals updated', metrics.preference_signals_updated),
      metricTile('Audit events', metrics.total_audit_events)
    )
  ));

  const audit = await api('GET', '/audit-events?limit=8');
  if (isStaleRender(renderCycle)) return;
  view.appendChild(el('div', { class: 'panel' },
    el('div', { class: 'toolbar' },
      el('h3', {}, 'Recent activity'),
      el('a', { href: '#/audit' }, 'View all')
    ),
    auditEventsTable(audit.events)
  ));
}

function renderSourceUploadBoundary() {
  return el('div', { class: 'panel source-upload-boundary' },
    el('strong', {}, 'Assisted review boundary: '),
    'These are source documents for pilot setup review. Uploads do not update live workers, assets, credentials, jobs, allocations, or compliance records. ',
    'The DispatchTalon team reviews the file, suggests structure, and the business confirms what should be used before anything is added to the pilot setup.'
  );
}

function renderSourceUploadList(uploads = {}, options = {}) {
  const rows = uploads.uploads || uploads || [];
  const panel = el('div', { class: 'panel source-upload-list-panel' });
  panel.appendChild(el('div', { class: 'toolbar' },
    el('div', {},
      el('h3', {}, options.title || 'Uploaded files'),
      el('p', { class: 'small muted' }, options.summary || 'Status shows where each source document sits in the assisted setup review process.')
    )
  ));

  if (!rows.length) {
    panel.appendChild(el('div', { class: 'empty' },
      'No source documents uploaded yet. CSV remains fastest, but PDF, Word, Excel, roster, credential, equipment, and image records can be uploaded for assisted pilot setup review.'
    ));
    return panel;
  }

  const list = el('div', { class: 'source-upload-list' });
  for (const upload of rows) {
    const card = el('article', { class: 'source-upload-card' },
      el('div', { class: 'source-upload-card__main' },
        el('div', {},
          el('strong', {}, upload.original_filename || 'Source document'),
          el('div', { class: 'small muted' },
            `${upload.category_label || formatDisplayLabel(upload.category)} | ${humanFileSize(upload.file_size_bytes)} | uploaded ${fmtDate(upload.created_at)}`
          )
        ),
        sourceUploadStatusPill(upload.review_status, upload.review_status_label)
      ),
      upload.notes
        ? el('p', { class: 'small source-upload-note' }, upload.notes)
        : null,
      upload.review_notes
        ? el('p', { class: 'small muted source-upload-note' }, `Review note: ${upload.review_notes}`)
        : null,
      el('div', { class: 'small muted' },
        upload.review_status === 'pending_review'
          ? 'Next step: DispatchTalon review. No live records have been updated.'
          : 'Next step depends on DispatchTalon review and business confirmation.'
      )
    );

    if (options.allowDelete) {
      const removeButton = el('button', { type: 'button', class: 'secondary' }, 'Remove upload');
      removeButton.addEventListener('click', async () => {
        if (!window.confirm('Remove this uploaded source document from the pilot setup queue?')) return;
        try {
          await api('DELETE', `/source-uploads/${encodeURIComponent(upload.id)}`);
          toast('Source upload removed', 'success');
          router();
        } catch (err) {
          toast(err.error || 'Could not remove source upload', 'error');
        }
      });
      card.appendChild(el('div', { class: 'button-row' }, removeButton));
    }
    list.appendChild(card);
  }
  panel.appendChild(list);
  return panel;
}

function renderSourceUploadNextSteps() {
  return el('div', { class: 'panel source-upload-next' },
    el('h3', {}, 'What happens next'),
    el('ol', { class: 'source-upload-steps' },
      el('li', {}, 'Upload the source document.'),
      el('li', {}, 'DispatchTalon reviews the file.'),
      el('li', {}, 'We identify possible workers, assets, credentials, or setup data.'),
      el('li', {}, 'You confirm what should be used.'),
      el('li', {}, 'Only confirmed information is added to your pilot setup.')
    ),
    el('p', { class: 'small muted' },
      'This is the pilot setup process, not a live extraction or save workflow.'
    )
  );
}

async function renderSourceUploads(renderCycle) {
  const view = document.getElementById('view');
  view.innerHTML = '';

  view.appendChild(el('div', { class: 'toolbar' },
    el('div', {},
      el('h2', {}, 'Pilot Setup Uploads'),
      el('p', { class: 'muted' }, 'Upload source records for assisted DispatchTalon pilot setup review.')
    ),
    el('div', { class: 'button-row' },
      el('a', { href: '#/dashboard' }, el('button', { class: 'secondary' }, '< Dashboard')),
      el('a', { href: '#/workers/import' }, el('button', { class: 'secondary' }, 'CSV worker import'))
    )
  ));

  const data = await api('GET', '/source-uploads');
  if (isStaleRender(renderCycle)) return;

  view.appendChild(el('section', { class: 'panel source-upload-hero' },
    el('div', { class: 'source-upload-eyebrow' }, 'Assisted Source Document Upload'),
    el('h3', {}, 'Upload what you have.'),
    el('p', {},
      'CSV is fastest, but if your information is sitting in a PDF, Word document, spreadsheet, roster, credential list, equipment list, or internal report, upload it for pilot setup review.'
    ),
    el('p', { class: 'muted' },
      'DispatchTalon will help turn existing business records into structured worker, asset, and credential data.'
    )
  ));

  view.appendChild(renderSourceUploadBoundary());

  const form = el('form', { class: 'panel source-upload-form' });
  const fileInput = el('input', {
    type: 'file',
    name: 'files',
    accept: SOURCE_UPLOAD_ACCEPT,
    multiple: 'true',
    required: 'true'
  });
  const categoryField = buildSelect('category', 'What does this document contain?', [
    { value: '', label: 'Select document category' },
    ...SOURCE_UPLOAD_CATEGORIES
  ], { required: 'true' });
  const notesInput = el('textarea', {
    name: 'notes',
    placeholder: 'Example: This spreadsheet has plant and asset numbers. These PDFs have tickets and expiry dates.'
  });
  const authorisedInput = el('input', { type: 'checkbox', name: 'authorised' });
  const reviewOnlyInput = el('input', { type: 'checkbox', name: 'review_only' });
  const submitButton = el('button', { type: 'submit' }, 'Upload for pilot setup review');
  const errorBox = el('div', { class: 'error', role: 'alert' });
  const resultBox = el('div', { class: 'success hidden', role: 'status' });

  form.appendChild(el('h3', {}, 'Upload source documents'));
  form.appendChild(el('p', { class: 'small muted' },
    'Accepted file types: CSV, XLS, XLSX, PDF, DOC, DOCX, PNG, JPG, JPEG, WEBP. Limit: 10MB per file, up to 5 files per batch, 50MB per tenant during pilot.'
  ));
  form.appendChild(buildFileField('Source file(s)', fileInput));
  form.appendChild(categoryField);
  form.appendChild(buildTextareaField('Optional notes', notesInput));
  form.appendChild(el('label', { class: 'check-row consent-row' },
    authorisedInput,
    el('span', {}, 'I understand this file may contain business or worker information. I confirm I am authorised to share it with DispatchTalon for pilot setup review.')
  ));
  form.appendChild(el('label', { class: 'check-row consent-row' },
    reviewOnlyInput,
    el('span', {}, 'I understand this upload is for assisted review only and will not automatically update live records.')
  ));
  form.appendChild(errorBox);
  form.appendChild(resultBox);
  form.appendChild(el('div', { class: 'button-row' }, submitButton));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.textContent = '';
    resultBox.classList.add('hidden');
    resultBox.textContent = '';

    const files = Array.from(fileInput.files || []);
    const fd = new FormData(form);
    const category = String(fd.get('category') || '').trim();
    const notes = String(fd.get('notes') || '').trim();
    if (!files.length) {
      errorBox.textContent = 'Choose at least one source document before uploading.';
      return;
    }
    if (files.length > SOURCE_UPLOAD_MAX_FILES) {
      errorBox.textContent = 'Upload up to 5 files in one pilot setup batch.';
      return;
    }
    if (!category) {
      errorBox.textContent = 'Select what this document contains before uploading.';
      return;
    }
    if (!authorisedInput.checked || !reviewOnlyInput.checked) {
      errorBox.textContent = 'Confirm the privacy and assisted-review statements before uploading.';
      return;
    }
    const tooLarge = files.find((file) => file.size > SOURCE_UPLOAD_MAX_FILE_SIZE_BYTES);
    if (tooLarge) {
      errorBox.textContent = `${tooLarge.name} is too large. Upload files up to 10MB.`;
      return;
    }

    setButtonBusy(submitButton, true, 'Upload for pilot setup review', 'Uploading...');
    try {
      for (const file of files) {
        await uploadSourceDocument(file, {
          category,
          notes,
          batchCount: files.length,
          authorised: authorisedInput.checked,
          reviewOnly: reviewOnlyInput.checked
        });
      }
      resultBox.textContent = 'Your file has been uploaded for pilot setup review. The DispatchTalon team will review the source document and help turn relevant worker, asset, or credential information into structured pilot data. No live records have been updated yet.';
      resultBox.classList.remove('hidden');
      toast('Uploaded for review', 'success');
      fileInput.value = '';
      notesInput.value = '';
      const refreshed = await api('GET', '/source-uploads');
      if (!isStaleRender(renderCycle)) {
        uploadListHost.innerHTML = '';
        uploadListHost.appendChild(renderSourceUploadList(refreshed, { allowDelete: true }));
      }
    } catch (err) {
      errorBox.textContent = err.message || err.error || 'Upload failed. Try again or contact DispatchTalon.';
    } finally {
      setButtonBusy(submitButton, false, 'Upload for pilot setup review', 'Uploading...');
    }
  });

  view.appendChild(form);
  view.appendChild(renderSourceUploadNextSteps());
  const uploadListHost = el('div');
  uploadListHost.appendChild(renderSourceUploadList(data, { allowDelete: true }));
  view.appendChild(uploadListHost);
}

function renderOperatingModePanel(profile = {}) {
  const form = el('form', { class: 'panel operating-mode-panel' });
  const errBox = el('div', { class: 'error' });
  const success = el('div', { class: 'success hidden' });
  const currentMode = operatingMode(profile);
  form.appendChild(el('h3', {}, 'Operating mode'));
  form.appendChild(el('div', { class: 'small muted', style: 'margin-bottom:10px;' },
    'Choose whether this company allocates labour only or plant plus labour. This controls which job intake sections are shown by default.'
  ));
  const options = [
    {
      value: 'labour_only',
      label: 'LABOUR ONLY',
      description: 'Use DispatchTalon for people, credentials, VOCs, scheduling, SmartRank, and audit. Hide plant and crane planning by default.'
    },
    {
      value: 'plant_and_labour',
      label: 'PLANT + LABOUR',
      description: 'Use DispatchTalon for workers, equipment, plant assets, crane planning, transport review, scheduling, SmartRank, and audit.'
    }
  ];
  form.appendChild(el('div', { class: 'mode-options' }, ...options.map((option) => {
    const input = el('input', { type: 'radio', name: 'operating_mode', value: option.value });
    input.checked = option.value === currentMode;
    return el('label', { class: 'mode-card' },
      input,
      el('span', {},
        el('strong', { class: 'mode-card-title' }, option.label),
        el('span', { class: 'small muted' }, option.description)
      )
    );
  })));
  form.appendChild(errBox);
  form.appendChild(success);
  form.appendChild(el('div', { class: 'button-row' },
    el('button', { type: 'submit' }, 'Save operating mode')
  ));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errBox.textContent = '';
    success.classList.add('hidden');
    const fd = new FormData(form);
    try {
      const updated = await api('PATCH', '/company/profile', {
        operating_mode: fd.get('operating_mode')
      });
      companyProfileCache = updated;
      companyCatalogueCache = null;
      companyAssetsCache = null;
      companySetupStateCache = null;
      if (state.user) {
        state.user = { ...state.user, company: updated };
        localStorage.setItem(USER_KEY, JSON.stringify(state.user));
      }
      success.textContent = 'Operating mode saved.';
      success.classList.remove('hidden');
      toast('Operating mode saved', 'success');
      router();
    } catch (err) {
      errBox.textContent = err.error || 'Could not save operating mode';
    }
  });
  return form;
}

function renderDefaultTimezonePanel(profile, intakeOptions = {}) {
  const form = el('form', { class: 'panel' });
  const errBox = el('div', { class: 'error' });
  const success = el('div', { class: 'status-note hidden' });
  const currentTimezone = profile.timezone || 'Australia/Brisbane';
  const configuredTimezones = intakeOptions.timezones?.length ? intakeOptions.timezones : COMMON_TIMEZONES;
  const timezones = configuredTimezones.some((timezone) => String(timezone) === String(currentTimezone))
    ? configuredTimezones
    : [currentTimezone, ...configuredTimezones];

  form.appendChild(el('h3', {}, 'Default timezone'));
  form.appendChild(el('div', { class: 'small muted', style: 'margin-bottom:10px;' },
    'New jobs default to this timezone. Dispatchers can still override timezone per job.'
  ));
  form.appendChild(buildSelect('timezone', 'Company default timezone', timezones, {
    value: currentTimezone,
    labelFormatter: formatTimezoneLabel
  }));
  form.appendChild(errBox);
  form.appendChild(success);
  form.appendChild(el('div', { class: 'button-row' },
    el('button', { type: 'submit' }, 'Save timezone')
  ));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errBox.textContent = '';
    success.classList.add('hidden');
    const fd = new FormData(form);
    try {
      const updated = await api('PATCH', '/company/profile', {
        timezone: fd.get('timezone')
      });
      companyProfileCache = updated;
      if (state.user) {
        state.user = { ...state.user, company: updated };
        localStorage.setItem(USER_KEY, JSON.stringify(state.user));
      }
      success.textContent = 'Default timezone saved.';
      success.classList.remove('hidden');
      toast('Default timezone saved', 'success');
    } catch (err) {
      errBox.textContent = err.error || 'Could not save default timezone';
    }
  });
  return form;
}

function ourBusinessDisclosureStorageKey() {
  const companyId = state.user?.company?.id || companyProfileCache?.id || 'company';
  const userId = state.user?.id || 'user';
  return `${OUR_BUSINESS_DISCLOSURE_KEY}.${companyId}.${userId}`;
}

function readOurBusinessDisclosureState() {
  try {
    return JSON.parse(localStorage.getItem(ourBusinessDisclosureStorageKey()) || '{}') || {};
  } catch {
    return {};
  }
}

function writeOurBusinessDisclosureState(sectionKey, open) {
  const current = readOurBusinessDisclosureState();
  current[sectionKey] = Boolean(open);
  localStorage.setItem(ourBusinessDisclosureStorageKey(), JSON.stringify(current));
}

function defaultOurBusinessSectionOpen(sectionKey, context = {}) {
  const saved = readOurBusinessDisclosureState();
  if (Object.prototype.hasOwnProperty.call(saved, sectionKey)) return Boolean(saved[sectionKey]);
  if (sectionKey === 'operating-mode') return Boolean(context.isFirstRun || !context.catalogueConfigured);
  if (sectionKey === 'business-basics') return Boolean(context.isFirstRun);
  if (sectionKey === 'requirements') return Boolean(context.isFirstRun || !context.catalogueConfigured);
  return false;
}

function setupStatusPill(status) {
  const normalized = status || 'Not started';
  const className = /saved|selected|added|ready/i.test(normalized)
    ? 'pill pill-ok'
    : /review|hidden|not started/i.test(normalized)
      ? 'pill pill-warn'
      : 'pill pill-info';
  return el('span', { class: className }, normalized);
}

function prepareOurBusinessSectionBody(node) {
  if (node?.classList?.contains('panel')) {
    node.classList.remove('panel');
    node.classList.add('our-business-section__embedded-panel');
  }
  return node;
}

function renderOurBusinessSection(sectionKey, title, summary, bodyNode, options = {}) {
  const details = el('details', {
    class: `panel our-business-section ${options.className || ''}`.trim(),
    'data-our-business-section': sectionKey
  });
  details.open = defaultOurBusinessSectionOpen(sectionKey, options.context || {});
  details.appendChild(el('summary', {},
    el('span', { class: 'our-business-section__title' },
      el('strong', {}, title),
      el('span', { class: 'small muted' }, summary)
    ),
    el('span', { class: 'our-business-section__meta' },
      options.countLabel ? el('span', { class: 'small muted' }, options.countLabel) : null,
      setupStatusPill(options.status)
    ),
    el('span', { class: 'tile-disclosure-label' }, 'Open details')
  ));
  details.appendChild(el('div', { class: 'our-business-section__body' }, bodyNode));
  details.addEventListener('toggle', () => writeOurBusinessDisclosureState(sectionKey, details.open));
  return details;
}

function setOurBusinessSectionsOpen(open, sectionKeys = OUR_BUSINESS_SECTION_KEYS) {
  document.querySelectorAll('details[data-our-business-section]').forEach((section) => {
    const key = section.getAttribute('data-our-business-section');
    if (!sectionKeys.includes(key)) return;
    section.open = Boolean(open);
    writeOurBusinessDisclosureState(key, section.open);
  });
}

function renderOurBusinessControls(mode) {
  const controls = el('div', { class: 'our-business-controls button-row' },
    el('button', {
      type: 'button',
      class: 'secondary',
      onclick: () => setOurBusinessSectionsOpen(false)
    }, 'Collapse all'),
    el('button', {
      type: 'button',
      class: 'secondary',
      onclick: () => setOurBusinessSectionsOpen(true)
    }, 'Expand all')
  );
  if (mode === 'plant_and_labour') {
    controls.appendChild(el('button', {
      type: 'button',
      class: 'secondary',
      onclick: () => {
        const target = document.querySelector('details[data-our-business-section="asset-register"]');
        if (!target) return;
        target.open = true;
        writeOurBusinessDisclosureState('asset-register', true);
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 'Jump to Asset Register'));
  }
  return controls;
}

function countCatalogueItemsByCategories(catalogue = {}, categories = [], enabledOnly = false) {
  const set = new Set(categories);
  return (catalogue.items || [])
    .filter((item) => set.has(item.category))
    .filter((item) => !enabledOnly || item.is_enabled)
    .length;
}

function catalogueForCategories(catalogue = {}, categories = []) {
  const set = new Set(categories);
  const items = (catalogue.items || []).filter((item) => set.has(item.category));
  return {
    ...catalogue,
    items,
    grouped: groupCatalogueItems(items),
    enabled_count: items.filter((item) => item.is_enabled).length
  };
}

function renderCatalogueCategorySection(section, catalogue, options = {}) {
  const sectionCatalogue = catalogueForCategories(catalogue, section.categories);
  const total = (sectionCatalogue.items || []).length;
  if (total === 0) return null;
  const selected = sectionCatalogue.enabled_count || 0;
  const details = el('details', { class: 'business-accordion catalogue-section', 'data-catalogue-section': section.key });
  details.open = Boolean(options.open);
  details.appendChild(el('summary', {},
    el('span', { class: 'business-accordion-title' }, section.title),
    el('span', { class: 'business-accordion-summary' }, section.summary),
    el('span', { class: 'our-business-section__meta' },
      el('span', { class: 'small muted' }, `${selected} selected / ${total} available`),
      setupStatusPill(selected > 0 ? 'Selected' : 'Not started')
    )
  ));
  details.appendChild(el('div', { class: 'business-accordion-body' },
    renderRequirementChecklist(sectionCatalogue, options.checklistOptions || {})
  ));
  return details;
}

function renderOurBusinessCatalogueSections(catalogue, mode, setupState = {}) {
  const root = el('div', { class: 'our-business-catalogue-sections' });
  const isFirstRun = Boolean(setupState.is_first_run);
  for (const section of CATALOGUE_SECTION_GROUPS) {
    if (mode === 'labour_only' && ['equipment-classes', 'transport-classes'].includes(section.key)) continue;
    const open = (
      (section.key === 'credentials-vocs' && (isFirstRun || mode === 'labour_only')) ||
      (section.key === 'equipment-classes' && mode === 'plant_and_labour' && countCatalogueItemsByCategories(catalogue, ['equipment'], true) === 0)
    );
    const node = renderCatalogueCategorySection(section, catalogue, { open });
    if (node) root.appendChild(node);
  }
  if (!root.children.length) {
    root.appendChild(el('div', { class: 'empty' }, 'No company requirement sections available for this operating mode.'));
  }
  return root;
}

async function renderOurBusiness(renderCycle) {
  const view = document.getElementById('view');
  view.innerHTML = '';
  const [profile, catalogue, assetsPayload, setupState, intakeOptions] = await Promise.all([
    loadCompanyProfile(true),
    loadCompanyCatalogue(true),
    loadCompanyAssets(true),
    loadCompanySetupState(true),
    loadIntakeOptions()
  ]);
  if (isStaleRender(renderCycle)) return;
  const mode = operatingMode(profile);
  const visibleCatalogue = filterCatalogueForOperatingMode(catalogue, mode);
  const context = {
    isFirstRun: Boolean(setupState.is_first_run),
    catalogueConfigured: Boolean(catalogue.configured),
    enabledCatalogueCount: visibleCatalogue.enabled_count || 0
  };
  const assetCount = (assetsPayload.assets || []).length;
  const enabledAssetClassCount = assetItemsFromCatalogue(catalogue).length;

  const form = el('form', { class: 'our-business-requirements-form' });
  const errBox = el('div', { class: 'error' });
  const success = el('div', { class: 'status-note hidden' });

  view.appendChild(el('div', { class: 'panel our-business-overview' },
    el('div', { class: 'toolbar' },
      el('div', {},
        el('h2', {}, 'Our Business'),
        el('div', { class: 'small muted' },
          mode === 'labour_only'
            ? 'Labour-only setup keeps plant and asset controls out of the way while preserving people, credentials, VOCs, and review requirements.'
            : 'Plant + labour setup lets you enable only the equipment classes your company uses, then add actual plant numbers in Asset Register.'
        )
      ),
      el('span', { class: 'pill pill-info' }, `${visibleCatalogue.enabled_count || 0} visible enabled`)
    ),
    renderOurBusinessControls(mode)
  ));

  view.appendChild(renderOurBusinessSection(
    'operating-mode',
    'Operating mode',
    'Controls whether plant, transport, crane planning, and asset selectors appear in normal job setup.',
    prepareOurBusinessSectionBody(renderOperatingModePanel(profile)),
    {
      context,
      status: 'Selected',
      countLabel: mode === 'labour_only' ? 'Labour only' : 'Plant + labour'
    }
  ));
  view.appendChild(renderOurBusinessSection(
    'business-basics',
    'Business basics',
    'Company timezone used as the default for new jobs.',
    prepareOurBusinessSectionBody(renderDefaultTimezonePanel(profile, intakeOptions)),
    {
      context,
      status: profile.timezone ? 'Saved' : 'Needs review',
      countLabel: profile.timezone ? formatTimezoneLabel(profile.timezone) : 'No timezone saved'
    }
  ));
  view.appendChild(renderOurBusinessSection(
    'tower-crane-library',
    'Tower Crane Asset Library',
    'Static/internal business-building reference. It does not create company fleet assets or job selectors.',
    prepareOurBusinessSectionBody(renderTowerCraneBusinessBuilder()),
    {
      context,
      status: 'Internal only',
      countLabel: 'Reference only'
    }
  ));

  form.appendChild(el('div', { class: 'toolbar' },
    el('div', {},
      el('h3', {}, 'Company requirement catalogue'),
      el('div', { class: 'small muted' },
        mode === 'labour_only'
          ? 'Choose the credentials, VOCs, civil/access, rail, and energy requirements your labour allocation workflow uses.'
          : 'Choose the credentials, equipment, transport, civil/access, rail, energy, and VOC requirements your company actually uses.'
      )
    ),
    setupStatusPill(catalogue.configured ? 'Saved' : 'Not started')
  ));

  if (!catalogue.configured) {
    form.appendChild(el('div', { class: 'read-only-banner' },
      mode === 'labour_only'
        ? 'No company requirements have been saved yet. Labour-only setup items are shown, but nothing is enabled until you save this setup.'
        : 'No company requirements have been saved yet. Common setup items are shown, but nothing is enabled until you save this setup.'
    ));
  }

  const search = el('input', {
    type: 'search',
    placeholder: 'Filter catalogue items...',
    'aria-label': 'Filter catalogue items'
  });
  const checklist = renderOurBusinessCatalogueSections(visibleCatalogue, mode, setupState);
  search.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    checklist.querySelectorAll('.check-row').forEach((row) => {
      const text = row.textContent.toLowerCase();
      row.classList.toggle('hidden', query && !text.includes(query));
    });
    checklist.querySelectorAll('details.catalogue-section').forEach((section) => {
      const hasVisibleMatch = Array.from(section.querySelectorAll('.check-row'))
        .some((row) => !row.classList.contains('hidden'));
      if (query && hasVisibleMatch) section.open = true;
    });
  });

  form.appendChild(buildFieldWrapper('Search/filter', search));
  form.appendChild(checklist);
  form.appendChild(errBox);
  form.appendChild(success);
  form.appendChild(el('div', { class: 'button-row' },
    el('button', { type: 'submit' }, 'Save company setup'),
    el('a', { href: '#/jobs' }, el('button', { type: 'button', class: 'secondary' }, 'Back to Jobs'))
  ));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errBox.textContent = '';
    success.classList.add('hidden');
    try {
      const response = await api('POST', '/company/catalogue-selections', {
        catalogue_item_ids: [
          ...selectedRequirementIdsFromForm(form),
          ...hiddenEnabledRequirementIds(catalogue, visibleCatalogue)
        ]
      });
      companyCatalogueCache = response;
      companySetupStateCache = null;
      success.textContent = `Company setup saved. ${response.enabled_count || 0} requirement item(s) enabled.`;
      success.classList.remove('hidden');
      toast('Company setup saved', 'success');
    } catch (err) {
      errBox.textContent = err.error || 'Could not save company setup';
    }
  });

  view.appendChild(renderOurBusinessSection(
    'requirements',
    'Company requirements',
    'Enable only the job, worker, credential, equipment, and review items this company actually uses.',
    form,
    {
      context,
      status: catalogue.configured ? 'Saved' : 'Not started',
      countLabel: `${visibleCatalogue.enabled_count || 0} selected`
    }
  ));
  if (mode === 'plant_and_labour') {
    view.appendChild(renderOurBusinessSection(
      'asset-register',
      'Asset register',
      'Add real asset numbers only under enabled equipment and transport classes. Job selectors use these saved assets only.',
      prepareOurBusinessSectionBody(renderAssetRegister(catalogue, assetsPayload)),
      {
        context,
        status: assetCount > 0 ? 'Saved' : (enabledAssetClassCount > 0 ? 'Needs review' : 'Not started'),
        countLabel: `${assetCount} assets / ${enabledAssetClassCount} classes`
      }
    ));
  } else {
    view.appendChild(renderOurBusinessSection(
      'asset-register',
      'Asset register',
      'Hidden in Labour-only mode so job creation does not show irrelevant plant selectors.',
      el('div', {},
        el('h3', {}, 'Plant and asset register hidden'),
        el('p', { class: 'small muted' },
          'This company is configured as labour-only. Switch to Plant + labour above to manage equipment classes, transport items, and actual plant assets.'
        )
      ),
      {
        context,
        status: 'Hidden in labour-only',
        countLabel: 'No asset selector'
      }
    ));
  }
  const resetPanel = renderCompanyResetPanel(setupState);
  if (resetPanel) {
    view.appendChild(renderOurBusinessSection(
      'reset-company-data',
      'Review / setup summary',
      'Advanced reset controls and setup counts. Keep collapsed unless you are cleaning a tenant.',
      prepareOurBusinessSectionBody(resetPanel),
      {
        context,
        status: 'Advanced',
        countLabel: 'Admin action'
      }
    ));
  }
}

const RESET_OPTIONS = [
  {
    scope: 'jobs',
    label: 'Clear jobs only',
    phrase: 'CLEAR JOBS',
    description: 'Archives active jobs, clears job requirements/imports/asset assignments, and cancels company allocations. Workers, Daily Site Log records, custom credential types, worker credentials, and source uploads remain.'
  },
  {
    scope: 'workers',
    label: 'Clear workers only',
    phrase: 'CLEAR WORKERS',
    description: 'Archives active workers, clears worker credentials/fatigue/preferences, and cancels company allocations. Jobs, Daily Site Log records, custom credential types, and source uploads remain.'
  },
  {
    scope: 'setup',
    label: 'Clear Our Business setup only',
    phrase: 'CLEAR SETUP',
    description: 'Clears catalogue selections, company assets, job asset assignments, and archives custom credential types. Users, jobs, workers, Daily Site Log records, worker credentials, and source uploads remain.'
  },
  {
    scope: 'all',
    label: 'Clear all company operational data',
    phrase: 'CLEAR COMPANY DATA',
    description: 'Archives active jobs/workers and clears operational setup, imports, requirements, worker credentials, fatigue, preferences, Daily Site Log records, assets, and allocations. Users and source uploads remain.'
  }
];

function renderResetCountList(counts = {}) {
  const keys = [
    ['jobs', 'active jobs'],
    ['workers', 'active workers'],
    ['credentials', 'worker credentials'],
    ['fatigue_records', 'fatigue records'],
    ['company_assets', 'active assets'],
    ['active_allocations', 'active allocations'],
    ['allocation_notifications', 'allocation notifications'],
    ['job_imports', 'job imports'],
    ['site_logs', 'Daily Site Log records'],
    ['catalogue_selections', 'setup selections'],
    ['credential_types', 'active custom credential types'],
    ['source_uploads', 'source uploads kept'],
    ['audit_events', 'audit events'],
    ['users', 'company users kept']
  ];
  return el('div', { class: 'reset-count-grid' }, ...keys.map(([key, label]) =>
    el('div', { class: 'reset-count' },
      el('strong', {}, String(counts[key] ?? (key === 'company_assets' ? counts.assets : 0) ?? 0)),
      el('span', {}, label)
    )
  ));
}

function renderCompanyResetPanel(setupState = {}) {
  if (!isAdminUser()) return null;

  const panel = el('details', { class: 'panel danger-panel reset-panel' });
  panel.appendChild(el('summary', {}, 'Reset company data'));
  panel.appendChild(el('p', { class: 'small muted' },
    'Use this only for test setup or when rebuilding a company workspace. These actions only apply to this company and do not delete users or global reference catalogues.'
  ));
  panel.appendChild(el('div', { class: 'read-only-banner' },
    'Reset actions cannot be automatically restored. Review the preview counts and type the exact confirmation phrase before continuing.'
  ));
  panel.appendChild(renderResetCountList(setupState.counts || {}));

  const cards = el('div', { class: 'reset-grid' });
  for (const option of RESET_OPTIONS) {
    const previewBox = el('div', { class: 'reset-preview small muted' }, 'Preview not loaded yet.');
    const phraseInput = el('input', {
      name: `confirmation_${option.scope}`,
      placeholder: option.phrase,
      autocomplete: 'off',
      'aria-label': `Type ${option.phrase} to confirm ${option.label}`
    });
    const errBox = el('div', { class: 'error' });
    const previewButton = el('button', { type: 'button', class: 'secondary' }, 'Preview');
    const resetButton = el('button', { type: 'button', class: 'danger' }, option.label);

    previewButton.addEventListener('click', async () => {
      errBox.textContent = '';
      setButtonBusy(previewButton, true, 'Preview', 'Loading...');
      try {
        const preview = await api('GET', `/company/reset-preview?scope=${encodeURIComponent(option.scope)}`);
        previewBox.innerHTML = '';
        previewBox.appendChild(renderResetCountList(preview.counts || {}));
        if (preview.effects?.length) {
          previewBox.appendChild(el('ul', {}, ...preview.effects.map((effect) => el('li', {}, effect))));
        }
      } catch (err) {
        errBox.textContent = err.error || 'Could not load reset preview';
      } finally {
        setButtonBusy(previewButton, false, 'Preview', 'Loading...');
      }
    });

    resetButton.addEventListener('click', async () => {
      errBox.textContent = '';
      if (phraseInput.value !== option.phrase) {
        errBox.textContent = `Type ${option.phrase} to enable this reset.`;
        phraseInput.focus();
        return;
      }
      const confirmed = window.confirm(
        `${option.label}?\n\nThis only applies to this company. Users and global catalogues will be kept.\n\nType confirmation has been entered. Continue?`
      );
      if (!confirmed) return;

      setButtonBusy(resetButton, true, option.label, 'Resetting...');
      try {
        const result = await api('POST', '/company/reset', {
          scope: option.scope,
          confirmation: phraseInput.value
        });
        companyCatalogueCache = null;
        companyAssetsCache = null;
        companySetupStateCache = null;
        toast(result.label || 'Company data reset completed', 'success');
        router();
      } catch (err) {
        errBox.textContent = err.error || 'Could not reset company data';
      } finally {
        setButtonBusy(resetButton, false, option.label, 'Resetting...');
      }
    });

    cards.appendChild(el('div', { class: 'reset-card' },
      el('h4', {}, option.label),
      el('p', { class: 'small muted' }, option.description),
      el('div', { class: 'small' }, 'Confirmation phrase: ', el('strong', {}, option.phrase)),
      previewBox,
      buildFieldWrapper('Type confirmation phrase', phraseInput),
      errBox,
      el('div', { class: 'button-row' }, previewButton, resetButton)
    ));
  }

  panel.appendChild(cards);
  return panel;
}

function towerCraneCategoryByKey(key) {
  return TOWERCRANE_CATEGORIES.find((category) => category.key === key);
}

function towerCraneModelsForCategory(key) {
  return TOWERCRANE_REFERENCE_MODELS.filter((model) => model.category === key);
}

function renderBusinessAccordion(title, summaryText, bodyNodes = [], open = false) {
  const details = el('details', { class: 'business-accordion', ...(open ? { open: 'open' } : {}) });
  details.appendChild(el('summary', {},
    el('span', { class: 'business-accordion-title' }, title),
    el('span', { class: 'business-accordion-summary' }, summaryText)
  ));
  details.appendChild(el('div', { class: 'business-accordion-body' }, ...bodyNodes));
  return details;
}

function renderTowerStatusPill(label, tone = 'neutral') {
  return el('span', { class: `business-status business-status-${tone}` }, label);
}

function renderTowerCraneCapabilitySummary() {
  return renderBusinessAccordion('Tower Crane Capability Summary',
    'Reusable crane-sector asset architecture, not a company fleet claim.',
    [
      el('div', { class: 'business-layer-grid' },
        el('div', { class: 'business-layer-card' },
          el('strong', {}, 'Layer 1 - customer-facing content'),
          el('p', { class: 'small muted' }, 'Simple capability copy, clean category explanations, enquiry path, and spec wording that avoids unverified fleet claims.')
        ),
        el('div', { class: 'business-layer-card' },
          el('strong', {}, 'Layer 2 - business-building controls'),
          el('p', { class: 'small muted' }, 'Category builder, CTA structure, page sections, candidate model cards, and publish decisions for a specific crane business.')
        ),
        el('div', { class: 'business-layer-card' },
          el('strong', {}, 'Layer 3 - internal intelligence'),
          el('p', { class: 'small muted' }, 'Source notes, verification status, ownership status, spec checks, competitor/reference context, and model-by-model records.')
        )
      ),
      el('div', { class: 'read-only-banner' },
        'This library is not a fleet claim. Every imported model starts as an unverified reference asset until company, source, and spec evidence is recorded.'
      ),
      el('div', { class: 'business-status-row' },
        renderTowerStatusPill('Draft', 'draft'),
        renderTowerStatusPill('Needs verification', 'warning'),
        renderTowerStatusPill('Internal only', 'neutral')
      )
    ],
    true
  );
}

function renderTowerCraneNextAction() {
  return renderBusinessAccordion('Next Review Action',
    'Select one crane business, verify source evidence, then generate a clean page preview.',
    [
      el('ol', { class: 'business-action-list' },
        el('li', {}, 'Pick the target business or pilot tenant.'),
        el('li', {}, 'Attach source evidence for each crane model before publishing it as a customer-facing asset.'),
        el('li', {}, 'Use generic category examples when fleet ownership is not verified.'),
        el('li', {}, 'Keep technical notes collapsed and expose only enquiry-ready copy to customers.')
      )
    ],
    true
  );
}

function renderTowerCranePagePreview() {
  return renderBusinessAccordion('Customer-Facing Output Preview',
    'Generic tower crane page structure that can be adapted after verification.',
    [
      el('div', { class: 'business-preview-card' },
        el('div', { class: 'eyebrow' }, 'Tower crane capability page builder'),
        el('h3', {}, 'Tower Crane Solutions for Complex Construction Sites'),
        el('p', {}, 'Structured tower crane capability for commercial builds, high-rise projects, infrastructure works, restricted-access sites, and heavy structural lifting. Use this preview only after verifying which models belong to the business.'),
        el('div', { class: 'business-chip-row' },
          ...[
            'High-rise construction',
            'Commercial developments',
            'Multi-crane sites',
            'Restricted-access urban projects',
            'Infrastructure works',
            'Heavy structural lifting',
            'Rooftop and specialist lifting',
            'Crane dismantling support'
          ].map((item) => el('span', {}, item))
        )
      )
    ],
    true
  );
}

function renderTowerCranePreviewBody() {
  return el('div', { class: 'business-preview-content' },
    el('p', {}, 'Tower crane capability should be matched to site conditions, lifting requirements, access constraints, project sequencing, and available working radius. A clear tower crane page helps customers understand the right crane category before requesting detailed technical support.'),
    el('div', { class: 'tower-category-grid' },
      ...TOWERCRANE_CATEGORIES.map((category) =>
        el('div', { class: 'tower-category-card' },
          el('h4', {}, category.title),
          el('p', { class: 'small muted' }, category.description),
          el('ul', { class: 'tag-list' }, ...category.bestFor.slice(0, 4).map((item) => el('li', {}, item)))
        )
      )
    ),
    el('div', { class: 'business-cta-block' },
      el('h4', {}, 'Need help selecting the right tower crane?'),
      el('p', { class: 'small muted' }, 'Send through project details, site constraints, lifting requirements, or programme dates so suitable tower crane options can be reviewed.'),
      el('div', { class: 'button-row' },
        el('button', { type: 'button' }, 'Enquire About Tower Cranes'),
        el('button', { type: 'button', class: 'secondary' }, 'Request Crane Specs')
      )
    )
  );
}

function renderTowerCraneCategoryBuilder() {
  return renderBusinessAccordion('Crane Category Builder',
    'Four reusable category blocks for clean crane-sector service pages.',
    [
      el('div', { class: 'tower-category-grid' },
        ...TOWERCRANE_CATEGORIES.map((category) =>
          el('div', { class: 'tower-category-card' },
            el('div', { class: 'business-card-head' },
              el('h4', {}, category.title),
              renderTowerStatusPill('Generic category example', 'neutral')
            ),
            el('p', { class: 'small muted' }, category.description),
            el('div', { class: 'small muted' }, 'Best suited for'),
            el('ul', { class: 'tag-list' }, ...category.bestFor.map((item) => el('li', {}, item)))
          )
        )
      )
    ]
  );
}

function renderTowerCraneReferenceLibrary() {
  const categorySections = TOWERCRANE_CATEGORIES.map((category) => {
    const models = towerCraneModelsForCategory(category.key);
    return renderBusinessAccordion(`${category.shortTitle} candidates`,
      `${models.length} reference model(s), all held for verification.`,
      [
        el('div', { class: 'tower-model-grid' },
          ...models.map((model) =>
            el('div', { class: 'tower-model-card' },
              el('div', { class: 'business-card-head' },
                el('h4', {}, `${model.manufacturer} ${model.model}`),
                renderTowerStatusPill(model.verification_status, 'warning')
              ),
              el('div', { class: 'small muted' }, category.title),
              el('p', {}, model.description),
              el('div', { class: 'tower-model-meta' },
                el('span', {}, `Capacity: ${model.capacity}`),
                el('span', {}, 'Specs available on request'),
                el('span', {}, `Publish: ${model.publish_status}`)
              )
            )
          )
        )
      ]
    );
  });
  return renderBusinessAccordion('Reference Asset Library',
    `${TOWERCRANE_REFERENCE_MODELS.length} candidate crane models. Collapsed to prevent a data wall.`,
    [
      el('p', { class: 'small muted' }, 'These are equipment-category examples and market reference assets only. They are not presented as a pilot user fleet, competitor fleet, owned fleet, or hire list.'),
      ...categorySections
    ]
  );
}

function renderTowerCraneVerificationTable() {
  const rows = TOWERCRANE_REFERENCE_MODELS.map((model) => {
    const category = towerCraneCategoryByKey(model.category);
    return el('tr', {},
      el('td', {}, `${model.manufacturer} ${model.model}`),
      el('td', {}, category?.shortTitle || '-'),
      el('td', {}, model.capacity),
      el('td', {}, model.source_type),
      el('td', {}, model.ownership_status),
      el('td', {}, model.spec_sheet_status),
      el('td', {}, model.publish_status)
    );
  });
  return renderBusinessAccordion('Verification Status',
    'Internal model-by-model status table. Hidden from the customer-facing preview.',
    [
      el('div', { class: 'business-table-wrapper' },
        el('table', { class: 'business-verification-table' },
          el('thead', {},
            el('tr', {},
              el('th', {}, 'Model name'),
              el('th', {}, 'Crane category'),
              el('th', {}, 'Capacity'),
              el('th', {}, 'Source type'),
              el('th', {}, 'Ownership status'),
              el('th', {}, 'Spec sheet status'),
              el('th', {}, 'Customer-facing publish status')
            )
          ),
          el('tbody', {}, ...rows)
        )
      ),
      el('details', { class: 'business-nested-detail' },
        el('summary', {}, 'Status options and verification fields'),
        el('div', { class: 'business-layer-grid' },
          el('div', { class: 'business-layer-card' },
            el('strong', {}, 'Verification statuses'),
            el('ul', { class: 'tag-list' }, ...TOWERCRANE_VERIFICATION_STATUSES.map((status) => el('li', {}, status)))
          ),
          el('div', { class: 'business-layer-card' },
            el('strong', {}, 'Publish statuses'),
            el('ul', { class: 'tag-list' }, ...TOWERCRANE_PUBLISH_STATUSES.map((status) => el('li', {}, status)))
          ),
          el('div', { class: 'business-layer-card' },
            el('strong', {}, 'Required verification fields'),
            el('p', { class: 'small muted' }, 'Model name, category, capacity, manufacturer, source type, source note, source company, ownership status, availability status, spec sheet status, publish status, internal notes, last verified date, and verified by.')
          )
        )
      )
    ]
  );
}

function renderTowerCraneSpecManagement() {
  return renderBusinessAccordion('Spec Sheet / Download Management',
    'Spec links stay withheld until the source file is verified.',
    [
      el('ul', { class: 'business-action-list' },
        el('li', {}, 'Only show "View specs" where a real file or technical page has been checked.'),
        el('li', {}, 'Confirm the model name matches the spec file before customer-facing use.'),
        el('li', {}, 'Check that the file does not confuse the customer about ownership or source company.'),
        el('li', {}, 'If no verified file exists, show: Specs available on request.')
      )
    ]
  );
}

function renderTowerCraneSeoAndIntent() {
  return renderBusinessAccordion('SEO and Search Intent',
    'Natural crane-sector search coverage without keyword stuffing or ownership claims.',
    [
      el('div', { class: 'business-layer-grid' },
        el('div', { class: 'business-layer-card' },
          el('strong', {}, 'Suggested meta title'),
          el('p', { class: 'small muted' }, 'Tower Crane Capability | Flat Top, Luffing, Hammerhead & Derrick Crane Solutions')
        ),
        el('div', { class: 'business-layer-card' },
          el('strong', {}, 'Suggested meta description'),
          el('p', { class: 'small muted' }, 'Structured tower crane capability pages for commercial construction, high-rise projects, infrastructure works, restricted-access sites, structural lifting, and crane dismantling support.')
        ),
        el('div', { class: 'business-layer-card' },
          el('strong', {}, 'Search intent'),
          el('ul', { class: 'tag-list' },
            ...[
              'Tower crane hire',
              'Tower cranes',
              'Flat top tower cranes',
              'Luffing jib cranes',
              'Hammerhead cranes',
              'Derrick cranes',
              'Construction crane hire',
              'High-rise crane solutions',
              'Restricted-access lifting',
              'Crane dismantling',
              'Structural lifting',
              'Equipment hire website'
            ].map((term) => el('li', {}, term))
          )
        )
      )
    ]
  );
}

function renderTowerCraneEnquiryPathway() {
  return renderBusinessAccordion('Enquiry Pathway',
    'Keep the next step visible and practical.',
    [
      el('div', { class: 'business-cta-block' },
        el('h4', {}, 'Need help selecting the right tower crane?'),
        el('p', { class: 'small muted' }, 'Send through project details, site constraints, lifting requirements, or programme dates so suitable tower crane options can be reviewed.'),
        el('div', { class: 'button-row' },
          el('button', { type: 'button' }, 'Discuss Tower Crane Requirements'),
          el('button', { type: 'button', class: 'secondary' }, 'Request Crane Specs')
        )
      )
    ]
  );
}

function renderTowerCraneInternalNotes() {
  return renderBusinessAccordion('Internal Notes',
    'Collapsed source-control reminders for operators and agents.',
    [
      el('ul', { class: 'business-action-list' },
        el('li', {}, 'Do not treat pilot-user screenshots, competitor pages, or uploaded reference material as proof of owned fleet.'),
        el('li', {}, 'Do not publish a crane as a customer-facing asset until the specific business has verified evidence.'),
        el('li', {}, 'Use neutral labels such as reference model, candidate crane model, equipment category example, or verify before publishing.'),
        el('li', {}, 'Keep verification notes separate from customer-facing copy.')
      )
    ]
  );
}

function renderTowerCraneFollowUp() {
  return renderBusinessAccordion('Follow-Up Improvements',
    'Useful next work after the controlled asset library is reviewed.',
    [
      el('ol', { class: 'business-action-list' },
        el('li', {}, 'Add editable per-tenant source records when backend data storage is required.'),
        el('li', {}, 'Add verified spec-file attachment support when a real document workflow exists.'),
        el('li', {}, 'Add a publish workflow that separates generic category examples from verified business assets.'),
        el('li', {}, 'Run mobile visual QA once the target pilot tenant has sample business data.')
      )
    ]
  );
}

function renderTowerCraneBusinessBuilder() {
  const panel = el('div', { class: 'panel business-builder-panel' });
  panel.appendChild(el('div', { class: 'toolbar' },
    el('div', {},
      el('h3', {}, 'Build Our Business: Tower Crane Asset Library'),
      el('div', { class: 'small muted' },
        'Reusable tower crane categories, candidate models, verification controls, and customer-facing page preview for crane-sector business building.'
      )
    ),
    renderTowerStatusPill('Internal only', 'neutral')
  ));
  panel.appendChild(renderTowerCraneCapabilitySummary());
  panel.appendChild(renderTowerCraneNextAction());
  const preview = renderTowerCranePagePreview();
  preview.querySelector('.business-preview-card')?.appendChild(renderTowerCranePreviewBody());
  panel.appendChild(preview);
  panel.appendChild(renderTowerCraneCategoryBuilder());
  panel.appendChild(renderTowerCraneReferenceLibrary());
  panel.appendChild(renderTowerCraneVerificationTable());
  panel.appendChild(renderTowerCraneSpecManagement());
  panel.appendChild(renderTowerCraneSeoAndIntent());
  panel.appendChild(renderTowerCraneEnquiryPathway());
  panel.appendChild(renderTowerCraneInternalNotes());
  panel.appendChild(renderTowerCraneFollowUp());
  return panel;
}

function renderAssetRegister(catalogue, assetsPayload = {}) {
  const panel = el('div', { class: 'panel asset-register' });
  const assets = assetsPayload.assets || [];
  const assetsByItem = assetsGroupedByCatalogueItem(assets);
  const enabledAssetItems = assetItemsFromCatalogue(catalogue);
  const registerItems = new Map();
  for (const item of enabledAssetItems) registerItems.set(String(item.id), item);
  for (const asset of assets) {
    if (!registerItems.has(String(asset.catalogue_item_id))) {
      registerItems.set(String(asset.catalogue_item_id), {
        id: asset.catalogue_item_id,
        label: asset.catalogue_item?.label || asset.display_name,
        category: asset.catalogue_item?.category || 'equipment',
        group_label: asset.catalogue_item?.group_label || 'Assets',
        is_enabled: false
      });
    }
  }

  panel.appendChild(el('div', { class: 'toolbar' },
    el('div', {},
      el('h3', {}, 'Asset Register'),
      el('div', { class: 'small muted' },
        'Register actual machines by asset number / plant number under enabled equipment and transport classes. Assets are not created automatically.'
      )
    ),
    el('span', { class: 'pill pill-info' }, `${assets.length} active asset(s)`)
  ));
  panel.appendChild(el('div', { class: 'button-row asset-register-controls' },
    el('button', {
      type: 'button',
      class: 'secondary',
      onclick: () => panel.querySelectorAll('details.asset-group').forEach((group) => { group.open = false; })
    }, 'Collapse asset groups'),
    el('button', {
      type: 'button',
      class: 'secondary',
      onclick: () => panel.querySelectorAll('details.asset-group').forEach((group) => { group.open = true; })
    }, 'Expand asset groups')
  ));

  if (registerItems.size === 0) {
    panel.appendChild(el('div', { class: 'empty' },
      'Select equipment or transport classes before adding plant numbers.'
    ));
    return panel;
  }

  for (const item of Array.from(registerItems.values()).sort((a, b) => String(a.label).localeCompare(String(b.label)))) {
    const group = el('details', { class: 'asset-group asset-tile' });
    const existingAssets = assetsByItem.get(String(item.id)) || [];
    const reviewAssets = existingAssets.filter((asset) => asset.asset_status !== 'active');
    group.appendChild(el('summary', {},
      el('span', { class: 'asset-tile__title' },
        el('strong', {}, item.label),
        el('span', { class: 'small muted' }, item.group_label || item.category)
      ),
      el('span', { class: 'asset-tile__meta' },
        el('span', { class: 'pill pill-info' }, `${existingAssets.length} asset(s)`),
        reviewAssets.length > 0 ? el('span', { class: 'pill pill-warn' }, `${reviewAssets.length} needs review`) : null
      ),
      !item.is_enabled ? el('span', { class: 'pill pill-warn', style: 'margin-left:8px;' }, 'class not enabled') : null,
      el('span', { class: 'tile-disclosure-label' }, 'Details')
    ));

    if (!item.is_enabled) {
      group.appendChild(el('div', { class: 'alerts crane-form-alerts' },
        "This asset's catalogue class is not currently enabled in Our Business."
      ));
    }

    if (existingAssets.length === 0) {
      group.appendChild(el('div', { class: 'small muted asset-empty' }, 'No plant numbers added yet.'));
    } else {
      group.appendChild(el('div', { class: 'asset-list' }, ...existingAssets.map((asset) =>
        renderAssetTile(asset, item)
      )));
    }

    const addForm = el('form', { class: 'asset-add-form hidden' });
    const errBox = el('div', { class: 'error' });
    addForm.appendChild(el('div', { class: 'row' },
      buildInput('asset_number', 'Asset number / plant number', { placeholder: 'MC20-001', required: true }),
      buildInput('display_name', 'Display name', { placeholder: `${item.label} / MC20-001` }),
      buildSelect('asset_status', 'Status', ['active', 'inactive', 'unavailable', 'retired'], { value: 'active' }),
      buildInput('home_location', 'Home location', { placeholder: 'Brisbane' })
    ));
    addForm.appendChild(buildTextarea('notes', 'Notes'));
    addForm.appendChild(errBox);
    addForm.appendChild(el('div', { class: 'button-row' },
      el('button', { type: 'submit' }, 'Save asset')
    ));
    addForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      errBox.textContent = '';
      const fd = new FormData(addForm);
      try {
        await api('POST', '/company/assets', {
          catalogue_item_id: item.id,
          asset_number: fd.get('asset_number'),
          display_name: fd.get('display_name') || null,
          asset_status: fd.get('asset_status') || 'active',
          home_location: fd.get('home_location') || null,
          notes: fd.get('notes') || null
        });
        companyAssetsCache = null;
        companySetupStateCache = null;
        toast('Asset added', 'success');
        router();
      } catch (err) {
        errBox.textContent = err.error || 'Could not add asset';
      }
    });
    if (item.is_enabled) {
      const addToggle = el('button', {
        type: 'button',
        class: 'secondary asset-add-toggle',
        onclick: () => {
          addForm.classList.toggle('hidden');
          if (!addForm.classList.contains('hidden')) {
            const input = addForm.querySelector('input[name="asset_number"]');
            if (input) input.focus();
          }
        }
      }, 'Add asset');
      group.appendChild(el('div', { class: 'button-row asset-add-row' }, addToggle));
      group.appendChild(addForm);
    }
    panel.appendChild(group);
  }

  return panel;
}

function assetStatusPill(status) {
  const normalized = status || 'active';
  return el('span', {
    class: `pill asset-tile__status ${normalized === 'active' ? 'pill-ok' : 'pill-warn'}`
  }, formatDisplayLabel(normalized));
}

function renderAssetTile(asset, catalogueItem = {}) {
  const title = asset.display_name || asset.asset_number || catalogueItem.label || 'Asset';
  const category = asset.catalogue_item?.label || catalogueItem.label || catalogueItem.group_label || 'Asset';
  const status = asset.asset_status || 'active';
  const tile = el('details', { class: 'asset-row asset-tile' });
  tile.appendChild(el('summary', {},
    el('span', { class: 'asset-tile__title' },
      el('strong', {}, title),
      el('span', { class: 'small muted' }, asset.asset_number ? `Plant number: ${asset.asset_number}` : 'Plant number not recorded')
    ),
    el('span', { class: 'asset-tile__meta' },
      el('span', { class: 'small muted' }, category),
      assetStatusPill(status),
      asset.home_location ? el('span', { class: 'small muted' }, asset.home_location) : null
    ),
    el('span', { class: 'tile-disclosure-label' }, 'Details')
  ));

  tile.appendChild(el('div', { class: 'asset-tile__body' },
    el('div', { class: 'kv' },
      el('div', {}, 'Asset number / plant number'), el('div', {}, asset.asset_number || '-'),
      el('div', {}, 'Display name'), el('div', {}, asset.display_name || '-'),
      el('div', {}, 'Type / category'), el('div', {}, category),
      el('div', {}, 'Status'), el('div', {}, assetStatusPill(status)),
      el('div', {}, 'Home location'), el('div', {}, asset.home_location || '-'),
      el('div', {}, 'Notes'), el('div', {}, asset.notes || '-')
    ),
    el('div', { class: 'button-row asset-tile__actions' },
      el('button', {
        type: 'button',
        class: 'secondary',
        onclick: async () => {
          try {
            await api('POST', `/company/assets/${asset.id}/archive`);
            companyAssetsCache = null;
            companySetupStateCache = null;
            toast('Asset archived', 'success');
            router();
          } catch (err) {
            toast(err.error || 'Could not archive asset', 'error');
          }
        }
      }, 'Archive')
    )
  ));
  return tile;
}

function renderJobAssetSelector(catalogue = {}, assetsPayload = {}, options = {}) {
  const panel = el('div', { class: 'asset-selector-panel' });
  const assetsByItem = assetsGroupedByCatalogueItem(assetsPayload.assets || []);
  const itemsById = new Map((catalogue.items || []).map((item) => [String(item.id), item]));
  const selectedAssetIds = new Set((options.selectedAssetIds || []).map((id) => String(id)));

  const refresh = (form) => {
    panel.innerHTML = '';
    const selectedIds = selectedRequirementIdsFromForm(form).map((id) => String(id));
    const selectedAssetItems = selectedIds
      .map((id) => itemsById.get(id))
      .filter((item) => item && ['equipment', 'transport'].includes(item.category));

    panel.appendChild(el('h4', {}, 'Optional asset / plant selection'));
    if (selectedAssetItems.length === 0) {
      panel.appendChild(el('div', { class: 'small muted' },
        'Select an equipment or transport requirement to optionally choose a specific asset / plant number.'
      ));
      return;
    }

    for (const item of selectedAssetItems) {
      const assets = (assetsByItem.get(String(item.id)) || []).filter((asset) => asset.asset_status !== 'retired');
      if (assets.length === 0) {
        panel.appendChild(el('div', { class: 'small muted asset-select-row' },
          `No saved assets for ${item.label} yet. Add plant numbers in Our Business or use one-off job context.`
        ));
        continue;
      }

      const select = el('select', { name: 'company_asset_ids' });
      select.appendChild(el('option', { value: '' }, `No specific saved asset selected for ${item.label}`));
      for (const asset of assets) {
        const option = el('option', { value: String(asset.id) },
          `${asset.asset_number} - ${asset.display_name || item.label} (${formatDisplayLabel(asset.asset_status)})`
        );
        if (selectedAssetIds.has(String(asset.id))) option.selected = true;
        select.appendChild(option);
      }
      panel.appendChild(buildFieldWrapper(`Select asset / plant number for ${item.label}`, select));
    }
  };

  panel.refresh = refresh;
  return panel;
}

function buildSecurityPanel() {
  const panel = el('div', { class: 'panel security-panel' });
  const dismissed = localStorage.getItem(PASSWORD_REMINDER_DISMISSED_KEY) === 'true';

  if (dismissed) {
    panel.classList.add('security-panel-compact');
    panel.appendChild(el('div', { class: 'toolbar' },
      el('div', {},
        el('h3', {}, 'Account security'),
        el('p', { class: 'small muted' }, 'Password options are collapsed for this session.')
      ),
      el('button', {
        type: 'button',
        class: 'secondary',
        onclick: () => {
          localStorage.removeItem(PASSWORD_REMINDER_DISMISSED_KEY);
          router();
        }
      }, 'Show password options')
    ));
    return panel;
  }

  const copy = el('div', { class: 'security-copy' },
    el('h3', {}, 'Account security'),
    el('p', {},
      'Pilot portal access is invite-only. First login may require a password change.'
    ),
    el('p', { class: 'small muted' },
      'Use this panel if you want to rotate your own account password. Mandatory password changes are handled before dashboard access.'
    )
  );

  const actions = el('div', { class: 'security-actions' });
  const form = el('form');
  const errBox = el('div', { class: 'error' });
  const submit = el('button', { type: 'submit' }, 'Change password');
  form.appendChild(el('h3', {}, 'Change account password'));
  form.appendChild(el('label', {},
    el('span', {}, 'Current password'),
    el('input', { name: 'current_password', type: 'password', required: true, autocomplete: 'current-password' })
  ));
  form.appendChild(el('label', {},
    el('span', {}, 'New password'),
    el('input', { name: 'new_password', type: 'password', required: true, minlength: '10', autocomplete: 'new-password' })
  ));
  form.appendChild(el('label', {},
    el('span', {}, 'Confirm new password'),
    el('input', { name: 'confirm_new_password', type: 'password', required: true, minlength: '10', autocomplete: 'new-password' })
  ));
  form.appendChild(errBox);
  form.appendChild(el('div', { class: 'button-row' },
    submit,
    el('button', {
      type: 'button',
      class: 'secondary',
      onclick: () => {
        localStorage.setItem(PASSWORD_REMINDER_DISMISSED_KEY, 'true');
        router();
      }
    }, 'Collapse reminder')
  ));
  form.appendChild(el('div', { class: 'status-note' },
    'A successful password change signs you out so the next login proves the new password works.'
  ));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    await submitPasswordChange(form, submit, { errorNode: errBox, successNode: null });
  });

  actions.appendChild(form);

  panel.appendChild(el('div', { class: 'security-grid' }, copy, actions));
  return panel;
}

function toDateTimeLocalValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part) => String(part).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function dateTimeLocalToIso(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function siteLogStatusPill(status) {
  const map = {
    scheduled: 'pill-info',
    signed_in: 'pill-ok',
    signed_out: 'pill-muted',
    absent: 'pill-warn',
    removed: 'pill-bad',
    manual_entry: 'pill-warn'
  };
  return el('span', { class: `pill ${map[status] || 'pill-muted'}` }, formatDisplayLabel(status));
}

function siteLogPrintFooter() {
  return el('div', { class: 'daily-log-print-footer' },
    'Generated from DispatchTalon pilot records. Review before operational use.'
  );
}

async function renderSiteLog(renderCycle) {
  const view = document.getElementById('view');
  view.innerHTML = '';
  const { query } = getHashState();
  const date = query.get('date') || isoDateInTimeZone(new Date(), state.user?.company?.timezone || detectBrowserTimeZone());
  const site = query.get('site') || '';
  const worker = query.get('worker') || '';
  const status = query.get('status') || '';
  const params = new URLSearchParams({ date });
  if (site) params.set('site', site);
  if (worker) params.set('worker', worker);
  if (status) params.set('status', status);

  const [profile, siteLogPayload, workers, jobs, assetsPayload, intakeOptions] = await Promise.all([
    loadCompanyProfile(),
    api('GET', `/site-logs?${params.toString()}`),
    api('GET', '/workers'),
    api('GET', '/jobs').catch(() => []),
    loadCompanyAssets().catch(() => ({ assets: [] })),
    loadIntakeOptions()
  ]);
  if (isStaleRender(renderCycle)) return;

  const logs = siteLogPayload.logs || [];
  view.appendChild(el('div', { class: 'toolbar daily-log-toolbar' },
    el('div', {},
      el('p', { class: 'eyebrow' }, 'Daily Site Log'),
      el('h2', {}, 'Staff diary and onsite history'),
      el('p', { class: 'small muted' },
        'Record who was onsite, when they signed in and out, and what role, plant, or site context was attached. This is an operational record, not payroll or compliance approval.'
      )
    ),
    el('div', { class: 'button-row' },
      el('button', {
        type: 'button',
        class: 'secondary',
        onclick: () => window.print()
      }, 'Print daily report')
    )
  ));

  const filters = el('form', { class: 'panel daily-log-filters' });
  filters.appendChild(el('h3', {}, 'Historical onsite lookup'));
  filters.appendChild(el('div', { class: 'row' },
    buildInput('date', 'Date', { type: 'date', value: date, required: true }),
    buildInput('site', 'Site / job contains', { value: site, placeholder: 'Site, job, or client' }),
    buildInput('worker', 'Worker contains', { value: worker, placeholder: 'Worker name' }),
    buildSelect('status', 'Status', [
      { value: '', label: 'All statuses' },
      'scheduled',
      'signed_in',
      'signed_out',
      'absent',
      'manual_entry'
    ], { value: status })
  ));
  filters.appendChild(el('div', { class: 'button-row' },
    el('button', { type: 'submit' }, 'Lookup onsite history'),
    el('a', { href: `#/site-log?date=${encodeURIComponent(isoDateInTimeZone(new Date(), profile.timezone || detectBrowserTimeZone()))}` },
      el('button', { type: 'button', class: 'secondary' }, 'Today')
    )
  ));
  filters.addEventListener('submit', (event) => {
    event.preventDefault();
    const fd = new FormData(filters);
    const next = new URLSearchParams();
    next.set('date', fd.get('date'));
    if (fd.get('site')) next.set('site', fd.get('site'));
    if (fd.get('worker')) next.set('worker', fd.get('worker'));
    if (fd.get('status')) next.set('status', fd.get('status'));
    location.hash = `#/site-log?${next.toString()}`;
  });
  view.appendChild(filters);

  view.appendChild(buildSiteLogCreatePanel({ date, jobs }));

  const report = el('section', { class: 'daily-log-report', 'aria-label': 'Printable Daily Site Log' },
    el('div', { class: 'daily-log-report-head' },
      el('div', {},
        el('p', { class: 'eyebrow' }, profile.display_name || profile.name || 'Company'),
        el('h2', {}, 'Daily Site Log'),
        el('p', { class: 'small muted' }, `Date: ${date} | Generated: ${fmtDate(new Date().toISOString())}`)
      ),
      el('span', { class: 'pill pill-info' }, `${logs.reduce((total, log) => total + (log.entries || []).length, 0)} entries`)
    )
  );

  if (logs.length === 0) {
    report.appendChild(el('div', { class: 'empty' },
      'No site log has been created for this date yet.',
      el('br'),
      'Start by adding a site/job, then add workers to the log.'
    ));
  } else {
    logs.forEach((log) => {
      report.appendChild(renderSiteLogCard(log, {
        workers,
        assets: assetsPayload.assets || [],
        intakeOptions
      }));
    });
  }
  report.appendChild(siteLogPrintFooter());
  view.appendChild(report);
}

function buildSiteLogCreatePanel({ date, jobs = [] }) {
  const panel = el('form', { class: 'panel daily-log-create-panel' });
  const err = el('div', { class: 'error' });
  const jobOptions = [{ value: '', label: 'No linked job' }, ...(jobs || []).map((job) => ({
    value: job.id,
    label: [job.site_name, job.client_name, job.date].filter(Boolean).join(' / ')
  }))];
  panel.appendChild(el('h3', {}, 'Create daily site log'));
  panel.appendChild(el('p', { class: 'small muted' },
    'Use this when a site diary needs to exist before workers are signed in. Existing jobs can be linked, but a standalone site log is also supported.'
  ));
  panel.appendChild(el('div', { class: 'row' },
    buildInput('date', 'Date', { type: 'date', value: date, required: true }),
    buildSelect('job_id', 'Linked job (optional)', jobOptions),
    buildInput('site_name', 'Site / job name', { placeholder: 'Example: Queen St shutdown' }),
    buildInput('client_name', 'Client (optional)'),
    buildInput('location', 'Location (optional)')
  ));
  panel.appendChild(buildTextarea('notes', 'Daily notes', { placeholder: 'Weather, access, handover, site context' }));
  panel.appendChild(err);
  const submit = el('button', { type: 'submit' }, 'Create site log');
  panel.appendChild(submit);
  panel.addEventListener('submit', async (event) => {
    event.preventDefault();
    err.textContent = '';
    const fd = new FormData(panel);
    setButtonBusy(submit, true, 'Create site log', 'Creating...');
    try {
      await api('POST', '/site-logs', {
        date: fd.get('date'),
        job_id: fd.get('job_id') || null,
        site_name: fd.get('site_name') || null,
        client_name: fd.get('client_name') || null,
        location: fd.get('location') || null,
        notes: fd.get('notes') || null
      });
      toast('Daily site log created', 'success');
      location.hash = `#/site-log?date=${encodeURIComponent(fd.get('date'))}`;
      router();
    } catch (error) {
      err.textContent = error.error || 'Could not create site log';
    } finally {
      setButtonBusy(submit, false, 'Create site log', 'Creating...');
    }
  });
  return panel;
}

function renderSiteLogCard(log, context = {}) {
  const card = el('article', { class: 'panel daily-log-card' });
  card.appendChild(el('div', { class: 'daily-log-card-head' },
    el('div', {},
      el('h3', {}, log.site_name || 'Site log'),
      el('p', { class: 'small muted' },
        [log.client_name, log.location, log.job_name].filter(Boolean).join(' | ') || 'No client or location recorded.'
      )
    ),
    el('span', { class: 'pill pill-info' }, `${(log.entries || []).length} worker(s)`)
  ));
  if (log.notes) card.appendChild(el('p', { class: 'small' }, log.notes));
  card.appendChild(buildSiteLogEntryForm(log, context));

  const entries = el('div', { class: 'daily-log-entry-list' });
  if (!log.entries || log.entries.length === 0) {
    entries.appendChild(el('div', { class: 'empty' }, 'No workers added to this site log yet.'));
  } else {
    log.entries.forEach((entry) => entries.appendChild(renderSiteLogEntry(log, entry)));
  }
  card.appendChild(entries);
  return card;
}

function buildSiteLogEntryForm(log, { workers = [], assets = [], intakeOptions = {} }) {
  const form = el('form', { class: 'daily-log-entry-form' });
  const err = el('div', { class: 'error' });
  const workerOptions = [{ value: '', label: 'Select worker' }, ...workers.map((worker) => ({
    value: worker.id,
    label: [worker.name, labelsFromValues(worker.roles || [worker.role]).join(', ')].filter(Boolean).join(' / ')
  }))];
  const assetOptions = [{ value: '', label: 'No assigned plant / asset' }, ...assets.map((asset) => ({
    value: asset.id,
    label: asset.display_name || asset.asset_number
  }))];
  form.appendChild(el('h3', {}, 'Add worker to log'));
  form.appendChild(el('div', { class: 'row' },
    buildSelect('worker_id', 'Worker', workerOptions, { required: true }),
    buildGroupedSelect('role', 'Role / trade', intakeOptions.worker_role_groups || [], { placeholder: 'Use worker role' }),
    buildSelect('company_asset_id', 'Assigned plant / asset', assetOptions),
    buildSelect('status', 'Initial status', ['scheduled', 'manual_entry'], { value: 'scheduled' })
  ));
  form.appendChild(buildTextarea('notes', 'Notes', { placeholder: 'Optional site diary note for this worker' }));
  form.appendChild(err);
  const submit = el('button', { type: 'submit', class: 'secondary' }, 'Add worker');
  form.appendChild(submit);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    err.textContent = '';
    const fd = new FormData(form);
    setButtonBusy(submit, true, 'Add worker', 'Adding...');
    try {
      await api('POST', `/site-logs/${log.id}/entries`, {
        worker_id: fd.get('worker_id'),
        role: fd.get('role') || null,
        company_asset_id: fd.get('company_asset_id') || null,
        status: fd.get('status') || 'scheduled',
        notes: fd.get('notes') || null
      });
      toast('Worker added to site log', 'success');
      router();
    } catch (error) {
      err.textContent = error.error || 'Could not add worker to site log';
    } finally {
      setButtonBusy(submit, false, 'Add worker', 'Adding...');
    }
  });
  return form;
}

function renderSiteLogEntry(log, entry) {
  const row = el('div', { class: `daily-log-entry daily-log-entry--${entry.status}` });
  row.appendChild(el('div', { class: 'daily-log-entry-main' },
    el('strong', {}, entry.worker_name || 'Worker'),
    el('span', { class: 'small muted' }, [
      entry.role_label || formatDisplayLabel(entry.role) || 'Role not set',
      entry.asset_name || null
    ].filter(Boolean).join(' | '))
  ));
  row.appendChild(el('div', { class: 'daily-log-entry-times' },
    el('span', {}, `In: ${entry.sign_in_time ? fmtDate(entry.sign_in_time) : '-'}`),
    el('span', {}, `Out: ${entry.sign_out_time ? fmtDate(entry.sign_out_time) : '-'}`)
  ));
  row.appendChild(el('div', { class: 'daily-log-entry-status' }, siteLogStatusPill(entry.status)));

  const actions = el('div', { class: 'button-row daily-log-entry-actions' });
  if (!['signed_in', 'signed_out', 'removed'].includes(entry.status)) {
    actions.appendChild(el('button', {
      type: 'button',
      onclick: async () => {
        try {
          await api('POST', `/site-logs/${log.id}/entries/${entry.id}/sign-in`, {});
          toast('Worker signed in.', 'success');
          router();
        } catch (error) {
          toast(error.error || 'Could not sign worker in', 'error');
        }
      }
    }, 'Sign in'));
  }
  if (entry.status === 'signed_in') {
    actions.appendChild(el('button', {
      type: 'button',
      onclick: async () => {
        try {
          await api('POST', `/site-logs/${log.id}/entries/${entry.id}/sign-out`, {});
          toast('Worker signed out.', 'success');
          router();
        } catch (error) {
          toast(error.error || 'Could not sign worker out', 'error');
        }
      }
    }, 'Sign out'));
  }
  if (entry.status !== 'removed') {
    actions.appendChild(el('button', {
      type: 'button',
      class: 'secondary',
      onclick: async () => {
        const reason = window.prompt('Optional removal note');
        try {
          await api('POST', `/site-logs/${log.id}/entries/${entry.id}/remove`, { notes: reason || null });
          toast('Site log entry removed', 'success');
          router();
        } catch (error) {
          toast(error.error || 'Could not remove site log entry', 'error');
        }
      }
    }, 'Remove'));
  }
  row.appendChild(actions);

  if (entry.status === 'removed') {
    row.appendChild(el('p', { class: 'small muted daily-log-entry-note' },
      'Removed entries are locked out of normal sign-in, sign-out, and time-edit workflows.'
    ));
  } else {
    const edit = el('details', { class: 'daily-log-entry-edit' },
      el('summary', {}, 'Edit time / note')
    );
    const form = el('form', {});
    const err = el('div', { class: 'error' });
    form.appendChild(el('div', { class: 'row' },
      buildInput('sign_in_time', 'Sign-in time', { type: 'datetime-local', value: toDateTimeLocalValue(entry.sign_in_time) }),
      buildInput('sign_out_time', 'Sign-out time', { type: 'datetime-local', value: toDateTimeLocalValue(entry.sign_out_time) }),
      buildSelect('status', 'Status', ['scheduled', 'signed_in', 'signed_out', 'absent', 'manual_entry'], { value: entry.status })
    ));
    form.appendChild(buildTextarea('notes', 'Notes', { value: entry.notes || '' }));
    form.appendChild(err);
    form.appendChild(el('button', { type: 'submit', class: 'secondary' }, 'Save entry'));
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      err.textContent = '';
      const fd = new FormData(form);
      try {
        await api('PATCH', `/site-logs/${log.id}/entries/${entry.id}`, {
          sign_in_time: dateTimeLocalToIso(fd.get('sign_in_time')),
          sign_out_time: dateTimeLocalToIso(fd.get('sign_out_time')),
          status: fd.get('status'),
          notes: fd.get('notes') || null
        });
        toast('Site log entry updated', 'success');
        router();
      } catch (error) {
        err.textContent = error.error || 'Could not update site log entry';
      }
    });
    edit.appendChild(form);
    row.appendChild(edit);
  }
  if (entry.notes) row.appendChild(el('p', { class: 'small muted daily-log-entry-note' }, entry.notes));
  return row;
}

async function renderSchedule(renderCycle) {
  const view = document.getElementById('view');
  view.innerHTML = '';

  const { query } = getHashState();
  const requestedTimeZone = query.get('timezone') || detectBrowserTimeZone() || 'Australia/Brisbane';
  const requestedStart = query.get('start') || startOfWeekIso(isoDateInTimeZone(new Date(), requestedTimeZone));
  const requestedEnd = addDaysIso(requestedStart, 6);
  const data = await api('GET', `/schedule?start=${encodeURIComponent(requestedStart)}&end=${encodeURIComponent(requestedEnd)}&timezone=${encodeURIComponent(requestedTimeZone)}`);
  if (isStaleRender(renderCycle)) return;

  const previousWeek = addDaysIso(data.range.start_date, -7);
  const nextWeek = addDaysIso(data.range.start_date, 7);

  view.appendChild(el('div', { class: 'toolbar' },
    el('h2', {}, 'Dispatch calendar'),
    el('div', { class: 'button-row' },
      el('a', { href: `#/schedule?start=${previousWeek}&timezone=${encodeURIComponent(data.timezone)}` }, el('button', { class: 'secondary' }, '< Previous week')),
      el('a', { href: `#/schedule?start=${startOfWeekIso(isoDateInTimeZone(new Date(), data.timezone))}&timezone=${encodeURIComponent(data.timezone)}` }, el('button', { class: 'secondary' }, 'Current week')),
      el('a', { href: `#/schedule?start=${nextWeek}&timezone=${encodeURIComponent(data.timezone)}` }, el('button', { class: 'secondary' }, 'Next week >'))
    )
  ));

  const timezoneInput = el('input', {
    name: 'timezone',
    value: data.timezone,
    list: 'timezone-options',
    placeholder: 'Australia/Brisbane'
  });
  const timezoneList = el('datalist', { id: 'timezone-options' },
    ...COMMON_TIMEZONES.map((item) => el('option', { value: item }, item))
  );
  const applyButton = el('button', { type: 'submit' }, 'Apply timezone');
  const rangeForm = el('form', { class: 'panel schedule-controls' });
  rangeForm.appendChild(el('div', { class: 'row' },
    buildFieldWrapper('Week start', el('input', { type: 'date', name: 'start', value: data.range.start_date })),
    buildFieldWrapper('Display timezone', timezoneInput)
  ));
  rangeForm.appendChild(timezoneList);
  rangeForm.appendChild(el('div', { class: 'button-row' }, applyButton));
  rangeForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const fd = new FormData(rangeForm);
    location.hash = `#/schedule?start=${fd.get('start')}&timezone=${encodeURIComponent(fd.get('timezone') || data.timezone)}`;
  });
  view.appendChild(rangeForm);

  view.appendChild(el('div', { class: 'panel small muted' },
    `Showing ${data.range.start_date} to ${data.range.end_date} in ${data.timezone}. `,
    'Scheduled jobs are grouped by local dispatch time. Planned and confirmed allocations surface assigned workers here; double-booking is blocked or warned in SmartRank based on overlap severity.'
  ));

  for (let offset = 0; offset < 7; offset += 1) {
    const day = addDaysIso(data.range.start_date, offset);
    const jobsForDay = data.jobs.filter((job) => job.schedule?.display_start_local?.startsWith(day));
    const panel = el('div', { class: 'panel' });
    panel.appendChild(el('div', { class: 'toolbar' },
      el('h3', {}, day),
      el('span', { class: 'small muted' }, `${jobsForDay.length} scheduled job${jobsForDay.length === 1 ? '' : 's'}`)
    ));

    if (jobsForDay.length === 0) {
      panel.appendChild(el('div', { class: 'empty' }, 'No scheduled jobs'));
    } else {
      const list = el('div', { class: 'schedule-list' });
      for (const job of jobsForDay) {
        const assigned = job.assigned_workers || [];
        list.appendChild(el('div', { class: 'schedule-card' },
          el('div', { class: 'schedule-card-head' },
            el('div', {},
              el('div', { class: 'rank-name' }, `${job.site_name} - ${job.client_name}`),
              el('div', { class: 'rank-meta' }, formatScheduleRange(job.schedule))
            ),
            el('div', { class: 'button-row' },
              scheduleStatusPill(job.schedule?.status || job.schedule_status),
              jobStatusPill(job.status)
            )
          ),
          el('div', { class: 'small', style: 'margin-top:10px;' },
            el('strong', {}, 'Assigned: '),
            assigned.length > 0
              ? assigned.map((item) => `${item.worker_name} (${formatDisplayLabel(item.allocation_status || item.status)})`).join(', ')
              : 'Unallocated'
          ),
          el('div', { class: 'small', style: 'margin-top:6px;' },
            el('strong', {}, 'Task context: '),
            labelsFromValues(job.task_tags || [], null).join(', ') || 'none'
          ),
          job.crane_planning && (job.crane_planning.transport_review_required || job.crane_planning.manual_review_required)
            ? el('div', { class: 'button-row', style: 'margin-top:8px;' },
                job.crane_planning.manual_review_required ? el('span', { class: 'pill pill-warn' }, 'Review required') : null,
                job.crane_planning.transport_review_required ? el('span', { class: 'pill pill-warn' }, 'Transport review') : null
              )
            : null,
          el('div', { class: 'button-row', style: 'margin-top:10px;' },
            el('a', { href: `#/jobs/${job.id}` }, el('button', { class: 'secondary' }, 'View job')),
            el('a', { href: `#/jobs/${job.id}/smartrank` }, el('button', {}, assigned.length > 0 ? 'Re-run SmartRank' : 'Allocate'))
          )
        ));
      }
      panel.appendChild(list);
    }

    view.appendChild(panel);
  }
}

async function renderWorkersList(renderCycle) {
  const view = document.getElementById('view');
  view.innerHTML = '';

  const workers = await api('GET', '/workers');
  if (isStaleRender(renderCycle)) return;

  view.appendChild(el('div', { class: 'toolbar' },
    el('h2', {}, 'Workers'),
    el('div', { class: 'button-row' },
      el('a', { href: '#/workers/import' }, el('button', {}, 'Import workers')),
      el('a', { href: '#/new-worker' }, el('button', { class: 'secondary' }, '+ New worker'))
    )
  ));

  view.appendChild(el('div', { class: 'panel small muted' },
    'Pilot onboarding accepts CSV upload and paste-table import. Download the ',
    el('a', { href: '/samples/employee-import-sample.csv', target: '_blank' }, 'sample CSV'),
    ' or ',
    el('a', { href: '/samples/employee-import-sample.tsv', target: '_blank' }, 'sample TSV'),
    '. Removed workers are hidden from this active dispatch list but kept in audit history.'
  ));

  if (workers.length === 0) {
    view.appendChild(el('div', { class: 'panel empty' }, 'No workers added yet. Import a spreadsheet or add your first worker.'));
    return;
  }

  const table = el('table');
  table.appendChild(el('thead', {}, el('tr', {},
    el('th', {}, 'Name'),
    el('th', {}, 'Email'),
    el('th', {}, 'Role'),
    el('th', {}, 'Employment'),
    el('th', {}, 'Crane classes'),
    el('th', {}, 'Status'),
    el('th', {}, 'Depot')
  )));
  const body = el('tbody');
  for (const worker of workers) {
    body.appendChild(el('tr', {},
      el('td', {}, el('a', { href: `#/workers/${worker.id}` }, worker.name)),
      el('td', {}, worker.email || '-'),
      el('td', {}, labelsFromValues(worker.roles || [worker.role], null).join(', ') || '-'),
      el('td', {}, formatDisplayLabel(worker.employment_type)),
        el('td', {}, labelsFromValues(worker.crane_classes || [], null).join(', ') || '-'),
      el('td', {}, statusPill(worker.status)),
      el('td', {}, worker.usual_depot || '-')
    ));
  }
  table.appendChild(body);
  view.appendChild(el('div', { class: 'panel' }, table));
}

async function renderNewWorker(renderCycle) {
  const view = document.getElementById('view');
  view.innerHTML = '';
  const intakeOptions = await loadIntakeOptions();
  if (isStaleRender(renderCycle)) return;

  const form = el('form', { class: 'panel' });
  const errBox = el('div', { class: 'error' });
  form.appendChild(el('h2', {}, 'Create worker'));
  form.appendChild(el('div', { class: 'row' },
    buildInput('name', 'Name', { required: true }),
    buildInput('email', 'Email', { type: 'email' }),
    buildSelect('employment_type', 'Employment type', EMPLOYMENT_OPTIONS, { required: true }),
    buildSelect('status', 'Availability status', STATUS_OPTIONS),
    buildInput('crane_classes', 'Crane classes (comma-separated)', { placeholder: 'Articulated / Pick-and-Carry, Mobile Crane' }),
    buildInput('usual_depot', 'Base location / depot'),
    buildInput('contact_number', 'Phone')
  ));
  form.appendChild(el('div', { class: 'panel sub-panel' },
    el('h3', {}, 'Worker roles'),
    renderGroupedCheckboxPicker('roles', intakeOptions.worker_role_groups || [], {
      helpText: 'Select every role this worker can realistically be considered for. Credentials still decide allocation eligibility.',
      searchPlaceholder: 'Search roles...'
    })
  ));
  form.appendChild(buildTextarea('notes', 'Notes'));
  form.appendChild(errBox);
  form.appendChild(el('div', { class: 'button-row' },
    el('button', { type: 'submit' }, 'Create worker'),
    el('a', { href: '#/workers' }, el('button', { type: 'button', class: 'secondary' }, 'Cancel'))
  ));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errBox.textContent = '';
    const fd = new FormData(form);
    const body = {
      name: fd.get('name'),
      email: fd.get('email') || null,
      roles: selectedCheckboxValues(form, 'roles'),
      employment_type: fd.get('employment_type'),
      status: fd.get('status') || 'available',
      crane_classes: splitCsv(fd.get('crane_classes')),
      usual_depot: fd.get('usual_depot') || null,
      contact_number: fd.get('contact_number') || null,
      notes: fd.get('notes') || null
    };
    try {
      const worker = await api('POST', '/workers', body);
      toast('Worker created', 'success');
      location.hash = `#/workers/${worker.id}`;
    } catch (err) {
      errBox.textContent = err.error;
    }
  });

  view.appendChild(form);
}

async function renderWorkerImport(renderCycle) {
  const view = document.getElementById('view');
  view.innerHTML = '';

  view.appendChild(el('div', { class: 'toolbar' },
    el('h2', {}, 'Import workers'),
    el('a', { href: '#/workers' }, el('button', { class: 'secondary' }, '< Back to workers'))
  ));

  view.appendChild(el('div', { class: 'panel' },
    el('p', {}, 'Paste a TSV table from Excel/Google Sheets or load a CSV file. Preview first, then confirm the import.'),
    el('div', { class: 'button-row' },
      el('a', { href: '/samples/employee-import-sample.csv', target: '_blank' }, el('button', { type: 'button', class: 'secondary' }, 'Open sample CSV')),
      el('a', { href: '/samples/employee-import-sample.tsv', target: '_blank' }, el('button', { type: 'button', class: 'secondary' }, 'Open sample TSV')),
      el('a', { href: '#/source-uploads' }, el('button', { type: 'button', class: 'secondary' }, 'Upload source documents instead'))
    )
  ));

  const form = el('form', { class: 'panel' });
  const fileInput = el('input', { type: 'file', accept: '.csv,.tsv,text/csv,text/tab-separated-values' });
  const contentInput = el('textarea', { name: 'content', class: 'large-textarea', placeholder: 'Paste the sample TSV or load a CSV file here...' });
  const errBox = el('div', { class: 'error' });
  const results = el('div');
  const importButton = el('button', { type: 'button', disabled: 'true' }, 'Confirm import');
  let previewData = null;

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    contentInput.value = await file.text();
  });

  const doPreview = async () => {
    errBox.textContent = '';
    results.innerHTML = '';
    previewData = null;
    importButton.disabled = true;

    const content = String(contentInput.value || '').trim();
    if (!content) {
      errBox.textContent = 'Paste table data or choose a CSV/TSV file first.';
      return;
    }

    try {
      previewData = await api('POST', '/workers/import', { content, mode: 'preview' });
      results.appendChild(renderImportPreview(previewData));
      importButton.disabled = false;
    } catch (err) {
      errBox.textContent = err.error;
    }
  };

  const doImport = async () => {
    if (!previewData) return;
    errBox.textContent = '';
    importButton.disabled = true;
    try {
      const result = await api('POST', '/workers/import', {
        content: contentInput.value,
        mode: 'import'
      });
      results.innerHTML = '';
      results.appendChild(renderImportResult(result));
      toast(`Imported ${result.summary.workers_created} workers`, 'success');
    } catch (err) {
      errBox.textContent = err.error;
      importButton.disabled = false;
    }
  };

  form.appendChild(el('h3', {}, 'Paste or upload worker data'));
  form.appendChild(buildFileField('CSV / TSV file', fileInput));
  form.appendChild(buildTextareaField('Paste table data', contentInput));
  form.appendChild(errBox);
  form.appendChild(el('div', { class: 'button-row' },
    el('button', { type: 'submit' }, 'Preview rows'),
    importButton,
    el('a', { href: '#/workers' }, el('button', { type: 'button', class: 'secondary' }, 'Cancel'))
  ));
  form.appendChild(results);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    await doPreview();
  });
  importButton.addEventListener('click', doImport);

  view.appendChild(form);
}

function renderImportPreview(preview) {
  const panel = el('div', { class: 'panel preview-panel' });
  panel.appendChild(el('h3', {}, 'Import preview'));
  panel.appendChild(el('div', { class: 'metrics-grid compact-grid' },
    metricTile('Rows', preview.summary.total_rows),
    metricTile('Ready', preview.summary.ready_to_create),
    metricTile('Skipped', preview.summary.skipped),
    metricTile('Errors', preview.summary.rows_with_errors),
    metricTile('Warnings', preview.summary.rows_with_warnings)
  ));

  const table = el('table');
  table.appendChild(el('thead', {}, el('tr', {},
    el('th', {}, 'Row'),
    el('th', {}, 'Worker'),
    el('th', {}, 'Action'),
    el('th', {}, 'Credentials'),
    el('th', {}, 'Preferences'),
    el('th', {}, 'Notes')
  )));
  const body = el('tbody');
  for (const row of preview.rows) {
    const notes = [];
    if (row.errors?.length) notes.push(`Errors: ${row.errors.join(' | ')}`);
    if (row.warnings?.length) notes.push(`Warnings: ${row.warnings.join(' | ')}`);
    body.appendChild(el('tr', {},
      el('td', {}, String(row.row_number)),
      el('td', {},
        el('div', {}, row.worker?.name || '-'),
        el('div', { class: 'small muted' }, row.worker?.email || '-')
      ),
      el('td', {}, row.action === 'create'
        ? el('span', { class: 'pill pill-ok' }, 'create')
        : row.action === 'skip'
          ? el('span', { class: 'pill pill-warn' }, 'skip')
          : el('span', { class: 'pill pill-bad' }, 'error')),
      el('td', {}, String((row.credentials || []).length)),
      el('td', {}, String((row.preferences || []).length)),
      el('td', { class: 'small' }, notes.join(' | ') || 'Ready')
    ));
  }
  table.appendChild(body);
  panel.appendChild(table);
  return panel;
}

function renderImportResult(result) {
  const panel = el('div', { class: 'panel' });
  panel.appendChild(el('h3', {}, 'Import complete'));
  panel.appendChild(el('div', { class: 'metrics-grid compact-grid' },
    metricTile('Workers created', result.summary.workers_created),
    metricTile('Workers skipped', result.summary.workers_skipped),
    metricTile('Credentials created', result.summary.credentials_created),
    metricTile('Preferences created', result.summary.preferences_created),
    metricTile('Rows with errors', result.summary.rows_with_errors)
  ));

  const table = el('table');
  table.appendChild(el('thead', {}, el('tr', {},
    el('th', {}, 'Row'),
    el('th', {}, 'Status'),
    el('th', {}, 'Worker'),
    el('th', {}, 'Notes')
  )));
  const body = el('tbody');
  for (const row of result.rows) {
    const notes = [];
    if (row.warnings?.length) notes.push(row.warnings.join(' | '));
    if (row.errors?.length) notes.push(row.errors.join(' | '));
    body.appendChild(el('tr', {},
      el('td', {}, String(row.row_number)),
      el('td', {}, row.status),
      el('td', {}, row.worker_name || '-'),
      el('td', { class: 'small' }, notes.join(' | ') || '-')
    ));
  }
  table.appendChild(body);
  panel.appendChild(table);
  panel.appendChild(el('div', { class: 'button-row', style: 'margin-top:12px;' },
    el('a', { href: '#/workers' }, el('button', { type: 'button' }, 'View workers'))
  ));
  return panel;
}

async function renderWorkerDetail(workerId, renderCycle) {
  const view = document.getElementById('view');
  view.innerHTML = '';

  const [worker, credentials, fatigue, preferences, intakeOptions, credentialTypes] = await Promise.all([
    api('GET', `/workers/${workerId}`),
    api('GET', `/workers/${workerId}/credentials`),
    api('GET', `/workers/${workerId}/fatigue-records`),
    api('GET', `/workers/${workerId}/preferences`),
    loadIntakeOptions(),
    loadCredentialTypes()
  ]);
  if (isStaleRender(renderCycle)) return;
  const workerArchived = Boolean(worker.archived_at);

  view.appendChild(el('div', { class: 'toolbar' },
    el('h2', {}, worker.name),
    el('div', { class: 'button-row' },
      el('a', { href: '#/workers/import' }, el('button', { class: 'secondary' }, 'Import workers')),
      el('a', { href: '#/workers' }, el('button', { class: 'secondary' }, '< All workers'))
    )
  ));

  if (workerArchived) {
    view.appendChild(el('div', { class: 'read-only-banner' },
      `Removed from active dispatch ${fmtDate(worker.archived_at)}. Existing audit history is preserved.`,
      worker.archive_reason ? ` Reason: ${worker.archive_reason}` : ''
    ));
  }

  const editForm = el('form', { class: 'panel' });
  const editErr = el('div', { class: 'error' });
  editForm.appendChild(el('h3', {}, 'Worker details'));
  editForm.appendChild(el('div', { class: 'row' },
    buildInput('name', 'Name', { value: worker.name || '' }),
    buildInput('email', 'Email', { type: 'email', value: worker.email || '' }),
    buildSelect('status', 'Status', STATUS_OPTIONS, { value: worker.status || 'available' }),
    buildSelect('employment_type', 'Employment type', EMPLOYMENT_OPTIONS, { value: worker.employment_type || 'permanent' }),
    buildInput('contact_number', 'Phone', { value: worker.contact_number || '' }),
    buildInput('usual_depot', 'Base location / depot', { value: worker.usual_depot || '' }),
    buildInput('crane_classes', 'Crane classes (comma-separated)', { value: (worker.crane_classes || []).join(', ') }),
    buildInput('availability_note', 'Availability note', { value: worker.availability_note || '' })
  ));
  editForm.appendChild(el('div', { class: 'panel sub-panel' },
    el('h3', {}, 'Worker roles'),
    renderGroupedCheckboxPicker('roles', intakeOptions.worker_role_groups || [], {
      selectedValues: worker.roles || [worker.role],
      helpText: 'Roles help filtering and human context. Credentials, VOCs, availability, fatigue, and job requirements remain the allocation gates.',
      searchPlaceholder: 'Search roles...'
    })
  ));
  editForm.appendChild(buildTextarea('notes', 'Notes', { value: worker.notes || '' }));
  editForm.appendChild(editErr);
  const editSubmit = el('button', { type: 'submit' }, 'Save changes');
  editForm.appendChild(editSubmit);
  if (workerArchived) {
    disableFormControls(editForm);
    editErr.textContent = 'Archived workers stay read-only in the pilot UI.';
  } else {
    editForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      editErr.textContent = '';
      const fd = new FormData(editForm);
      const payload = {
        name: fd.get('name'),
        email: fd.get('email') || null,
        status: fd.get('status'),
        roles: selectedCheckboxValues(editForm, 'roles'),
        employment_type: fd.get('employment_type'),
        contact_number: fd.get('contact_number') || null,
        crane_classes: splitCsv(fd.get('crane_classes')),
        usual_depot: fd.get('usual_depot') || null,
        availability_note: fd.get('availability_note') || null,
        notes: fd.get('notes') || null
      };
      setButtonBusy(editSubmit, true, 'Save changes', 'Saving...');
      try {
        const savedWorker = await api('PATCH', `/workers/${workerId}`, payload);
        if (!savedWorker || savedWorker.id !== workerId) {
          throw { error: 'Worker update did not return the saved worker.' };
        }
        const persistedWorker = await api('GET', `/workers/${workerId}`);
        if (!persistedWorker || persistedWorker.id !== workerId) {
          throw { error: 'Worker update could not be confirmed from the server.' };
        }
        toast('Worker updated', 'success');
        router();
      } catch (err) {
        editErr.textContent = err.error || 'Could not save worker changes';
      } finally {
        setButtonBusy(editSubmit, false, 'Save changes', 'Saving...');
      }
    });
  }
  view.appendChild(editForm);

  if (!workerArchived) {
    const removePanel = el('form', { class: 'panel danger-panel' });
    const removeErr = el('div', { class: 'error' });
    const removeSubmit = el('button', { type: 'submit', class: 'danger' }, 'Remove worker');
    removePanel.appendChild(el('h3', {}, 'Remove worker from active dispatch?'));
    removePanel.appendChild(el('p', { class: 'small muted' },
      'This will remove the worker from active dispatch and SmartRank ranking. Existing audit history will be kept.'
    ));
    removePanel.appendChild(buildTextarea('reason', 'Reason (optional)', {
      placeholder: 'Optional internal note for why this worker is being removed from active dispatch'
    }));
    removePanel.appendChild(removeErr);
    removePanel.appendChild(el('div', { class: 'button-row' },
      removeSubmit,
      el('a', { href: '#/workers' }, el('button', { type: 'button', class: 'secondary' }, 'Cancel'))
    ));
    removePanel.addEventListener('submit', async (event) => {
      event.preventDefault();
      removeErr.textContent = '';
      const confirmed = window.confirm(
        'Remove worker from active dispatch?\n\nThis will remove the worker from active dispatch and SmartRank ranking. Existing audit history will be kept.'
      );
      if (!confirmed) return;

      const fd = new FormData(removePanel);
      setButtonBusy(removeSubmit, true, 'Remove worker', 'Removing...');
      try {
        const result = await api('POST', `/workers/${workerId}/remove`, {
          reason: fd.get('reason') || null
        });
        toast(result.message || 'Worker removed from active dispatch.', 'success');
        location.hash = '#/workers';
      } catch (err) {
        removeErr.textContent = err.error || 'Could not remove worker';
      } finally {
        setButtonBusy(removeSubmit, false, 'Remove worker', 'Removing...');
      }
    });
    view.appendChild(removePanel);
  }

  const prefPanel = el('div', { class: 'panel' });
  const prefErr = el('div', { class: 'error' });
  prefPanel.appendChild(el('h3', {}, `Task preferences (${preferences.length})`));
  prefPanel.appendChild(el('div', { class: 'small muted' },
    workerArchived
      ? 'Imported, manual, and learned signals remain visible for history, but archived workers are removed from active dispatch workflows.'
      : 'Manual ratings are dispatcher-controlled. Imported and learned signals stay visible so SmartRank remains explainable.'
  ));

  if (preferences.length === 0) {
    prefPanel.appendChild(el('div', { class: 'empty' }, 'No task preference signals recorded yet.'));
  } else {
    const table = el('table');
    table.appendChild(el('thead', {}, el('tr', {},
      el('th', {}, 'Task tag'),
      el('th', {}, 'Rating'),
      el('th', {}, 'Source'),
      el('th', {}, 'Confidence'),
      el('th', {}, 'Confirmed'),
      el('th', {}, 'Notes'),
      el('th', {}, 'Action')
    )));
    const body = el('tbody');
    for (const preference of preferences) {
      const actionCell = el('td', {});
      if (!workerArchived && preference.source === 'manual') {
        actionCell.appendChild(el('button', {
          type: 'button',
          class: 'secondary',
          onclick: () => {
            prefForm.elements.preference_id.value = preference.id;
            prefForm.elements.task_tag.value = formatDisplayLabel(preference.task_tag);
            prefForm.elements.rating.value = String(preference.rating);
            prefForm.elements.notes.value = preference.notes || '';
            prefMode.textContent = 'Edit manual task preference';
          }
        }, 'Edit'));
      } else {
        actionCell.appendChild(el('span', { class: 'small muted' }, 'Read-only'));
      }

      body.appendChild(el('tr', {},
        el('td', {}, formatDisplayLabel(preference.task_tag)),
        el('td', {}, `${stars(preference.rating)} (${preference.rating})`),
        el('td', {}, el('span', { class: `pill ${preference.source === 'manual' ? 'pill-ok' : (preference.source === 'imported' ? 'pill-info' : 'pill-warn')}` }, formatDisplayLabel(preference.source))),
        el('td', {}, preference.source === 'learned' ? Number(preference.confidence || 0).toFixed(2) : '1.00'),
        el('td', {}, preference.source === 'learned' ? String(preference.approval_count || 0) : '-'),
        el('td', {}, preference.notes || '-'),
        actionCell
      ));
    }
    table.appendChild(body);
    prefPanel.appendChild(table);
  }

  const prefForm = el('form', { style: 'margin-top:16px;' });
  const prefMode = el('h3', {}, 'Add manual task preference');
  prefForm.appendChild(prefMode);
  prefForm.appendChild(el('input', { type: 'hidden', name: 'preference_id' }));
  prefForm.appendChild(el('div', { class: 'row' },
    buildInput('task_tag', 'Task context', { required: true, placeholder: 'Tower crane, shutdown, night shift' }),
    buildSelect('rating', 'Star rating', ['5', '4', '3', '2', '1'], { required: true, value: '5' })
  ));
  prefForm.appendChild(buildTextarea('notes', 'Notes', { placeholder: 'Optional dispatcher context for this manual preference' }));
  prefForm.appendChild(prefErr);
  prefForm.appendChild(el('div', { class: 'button-row' },
    el('button', { type: 'submit' }, 'Save manual preference'),
    el('button', {
      type: 'button',
      class: 'secondary',
      onclick: () => {
        prefForm.reset();
        prefForm.elements.preference_id.value = '';
        prefMode.textContent = 'Add manual task preference';
        prefForm.elements.rating.value = '5';
      }
    }, 'Clear')
  ));
  prefForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    prefErr.textContent = '';
    const fd = new FormData(prefForm);
    const preferenceId = String(fd.get('preference_id') || '');
    const payload = {
      task_tag: normalizeTag(fd.get('task_tag')),
      rating: Number(fd.get('rating')),
      notes: fd.get('notes') || null
    };
    try {
      if (preferenceId) {
        await api('PATCH', `/workers/${workerId}/preferences/${preferenceId}`, payload);
        toast('Manual preference updated', 'success');
      } else {
        await api('POST', `/workers/${workerId}/preferences`, payload);
        toast('Manual preference added', 'success');
      }
      router();
    } catch (err) {
      prefErr.textContent = err.error;
    }
  });
  if (workerArchived) {
    disableFormControls(prefForm);
    prefErr.textContent = 'Archived workers cannot receive new preference changes.';
  }
  prefPanel.appendChild(prefForm);
  view.appendChild(prefPanel);

  const credPanel = el('div', { class: 'panel' });
  credPanel.appendChild(el('h3', {}, `Credentials (${credentials.length})`));
  if (credentials.length === 0) {
    credPanel.appendChild(el('div', { class: 'empty' }, 'No credentials recorded.'));
  } else {
    credPanel.appendChild(el('div', { class: 'credential-list' },
      ...credentials.map((credential) => renderCredentialTile(credential))
    ));
  }
  if (workerArchived) {
    credPanel.appendChild(el('div', { class: 'small muted' },
      'Archived workers keep existing credential history, but new credential entries are disabled in the active pilot workflow.'
    ));
  } else {
    credPanel.appendChild(buildCredentialTypeManager(credentialTypes));
    credPanel.appendChild(buildCredentialForm(workerId, intakeOptions, credentialTypes));
  }
  view.appendChild(credPanel);

  const fatPanel = el('div', { class: 'panel' });
  fatPanel.appendChild(el('h3', {}, `Fatigue records (${fatigue.length})`));
  if (fatigue.length === 0) {
    fatPanel.appendChild(el('div', { class: 'empty' }, 'No fatigue records recorded.'));
  } else {
    const table = el('table');
    table.appendChild(el('thead', {}, el('tr', {},
      el('th', {}, 'Shift start'),
      el('th', {}, 'Shift end'),
      el('th', {}, 'Length'),
      el('th', {}, 'Type'),
      el('th', {}, 'Travel'),
      el('th', {}, 'Self-fatigue')
    )));
    const body = el('tbody');
    for (const record of fatigue.slice(0, 30)) {
      body.appendChild(el('tr', {},
        el('td', {}, fmtDate(record.shift_start)),
        el('td', {}, fmtDate(record.shift_end)),
        el('td', {}, `${Number(record.shift_length_hours || 0).toFixed(1)}h`),
        el('td', {}, formatDisplayLabel(record.shift_type)),
        el('td', {}, `${record.travel_hours || 0}h`),
        el('td', {}, record.self_declared_fatigue ? el('span', { class: 'pill pill-warn' }, 'declared') : '-')
      ));
    }
    table.appendChild(body);
    fatPanel.appendChild(table);
  }
  if (workerArchived) {
    fatPanel.appendChild(el('div', { class: 'small muted' },
      'Archived workers keep fatigue history, but new fatigue entries are disabled in the active pilot workflow.'
    ));
  } else {
    fatPanel.appendChild(buildFatigueForm(workerId));
  }
  view.appendChild(fatPanel);
}

function renderCredentialTile(credential) {
  const status = credential.status || '';
  const tile = el('details', { class: 'credential-tile' });
  const label = credential.type_label || formatDisplayLabel(credential.type) || 'Credential';
  tile.appendChild(el('summary', {},
    el('span', { class: 'credential-tile__title' },
      el('strong', {}, label),
      el('span', { class: 'small muted' }, credential.identifier || 'No identifier recorded')
    ),
    el('span', { class: 'credential-tile__meta' },
      status ? credPill(status) : el('span', { class: 'pill pill-warn' }, 'Needs review'),
      credential.expiry_date ? el('span', { class: 'small muted' }, `Expires ${fmtDateOnly(credential.expiry_date)}`) : el('span', { class: 'small muted' }, 'No expiry recorded'),
      el('span', { class: `pill credential-tile__status ${credential.verified ? 'pill-ok' : 'pill-warn'}` }, credential.verified ? 'Confirmed' : 'Needs confirmation')
    ),
    el('span', { class: 'tile-disclosure-label' }, 'Details')
  ));

  tile.appendChild(el('div', { class: 'credential-tile__body' },
    el('div', { class: 'kv' },
      el('div', {}, 'Credential type'), el('div', {}, label),
      el('div', {}, 'Identifier'), el('div', {}, credential.identifier || '-'),
      el('div', {}, 'Issuing body'), el('div', {}, credential.issuing_body || '-'),
      el('div', {}, 'Issued'), el('div', {}, fmtDateOnly(credential.issue_date)),
      el('div', {}, 'Expires'), el('div', {}, fmtDateOnly(credential.expiry_date)),
      el('div', {}, 'Status'), el('div', {}, status ? credPill(status) : 'Needs review'),
      el('div', {}, 'Review state'), el('div', {}, credential.verified ? 'Confirmed' : 'Needs confirmation')
    )
  ));

  return tile;
}

function credentialTypeGroupsForForm(intakeOptions = {}, credentialTypes = {}) {
  const groups = (intakeOptions.credential_groups || [{
    group: 'Credentials',
    options: CREDENTIAL_OPTIONS.map((value) => ({ value, label: formatDisplayLabel(value) }))
  }]).map((group) => ({
    group: group.group,
    options: (group.options || []).map((option) => ({
      value: option.value,
      label: option.label
    }))
  }));
  if ((credentialTypes.custom || []).length) {
    groups.push({
      group: 'Business-specific credential',
      options: credentialTypes.custom
        .filter((item) => item.active !== false)
        .map((item) => ({ value: item.id, label: item.label || item.name }))
    });
  }
  return groups;
}

function buildCredentialTypeManager(credentialTypes = {}) {
  const panel = el('details', { class: 'credential-type-manager' },
    el('summary', {}, 'Manage credential types')
  );
  panel.appendChild(el('p', { class: 'small muted' },
    'Add business-specific credential or licence types such as NZ SiteSafe. These are tenant credential types and do not change global DispatchTalon defaults.'
  ));

  const list = el('div', { class: 'credential-type-list' });
  const custom = credentialTypes.custom || [];
  if (custom.length === 0) {
    list.appendChild(el('div', { class: 'empty' }, 'No custom credential types added yet.'));
  } else {
    custom.forEach((item) => {
      list.appendChild(el('div', { class: 'credential-type-row' },
        el('div', {},
          el('strong', {}, item.name || item.label),
          el('div', { class: 'small muted' }, [formatDisplayLabel(item.category), item.region].filter(Boolean).join(' / ') || 'Business-specific credential')
        ),
        el('div', { class: 'button-row' },
          el('button', {
            type: 'button',
            class: 'secondary',
            onclick: () => {
              const form = panel.querySelector('form');
              form.elements.credential_type_id.value = item.id;
              form.elements.name.value = item.name || item.label || '';
              form.elements.category.value = item.category || 'other';
              form.elements.region.value = item.region || '';
              form.elements.description.value = item.description || '';
              form.querySelector('[data-mode]').textContent = 'Edit custom credential type';
            }
          }, 'Edit'),
          item.active === false ? el('span', { class: 'pill pill-muted' }, 'Archived') : el('button', {
            type: 'button',
            class: 'secondary',
            onclick: async () => {
              try {
                await api('POST', `/credential-types/${item.id}/archive`, {});
                credentialTypesCache = null;
                toast('Credential type archived', 'success');
                router();
              } catch (error) {
                toast(error.error || 'Could not archive credential type', 'error');
              }
            }
          }, 'Archive')
        )
      ));
    });
  }
  panel.appendChild(list);

  const form = el('form', { class: 'credential-type-form' });
  const err = el('div', { class: 'error' });
  form.appendChild(el('h3', { 'data-mode': 'true' }, 'Add custom credential type'));
  form.appendChild(el('input', { type: 'hidden', name: 'credential_type_id' }));
  form.appendChild(el('div', { class: 'row' },
    buildInput('name', 'Credential type name', { placeholder: 'NZ SiteSafe', required: true }),
    buildSelect('category', 'Category', ['site_access', 'licence', 'high_risk_work', 'induction', 'VOC', 'medical', 'client_requirement', 'other'], { value: 'site_access' }),
    buildInput('region', 'Region (optional)', { placeholder: 'NZ, AU, QLD' })
  ));
  form.appendChild(buildTextarea('description', 'Description (optional)', { placeholder: 'Optional internal note for this credential type' }));
  form.appendChild(err);
  form.appendChild(el('div', { class: 'button-row' },
    el('button', { type: 'submit' }, 'Save credential type'),
    el('button', {
      type: 'button',
      class: 'secondary',
      onclick: () => {
        form.reset();
        form.elements.credential_type_id.value = '';
        form.querySelector('[data-mode]').textContent = 'Add custom credential type';
      }
    }, 'Clear')
  ));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    err.textContent = '';
    const fd = new FormData(form);
    const credentialTypeId = String(fd.get('credential_type_id') || '');
    const payload = {
      name: fd.get('name'),
      category: fd.get('category'),
      region: fd.get('region') || null,
      description: fd.get('description') || null
    };
    try {
      if (credentialTypeId) {
        await api('PATCH', `/credential-types/${credentialTypeId}`, payload);
        toast('Credential type updated', 'success');
      } else {
        await api('POST', '/credential-types', payload);
        toast('Credential type added', 'success');
      }
      credentialTypesCache = null;
      router();
    } catch (error) {
      err.textContent = error.error || 'Could not save credential type';
    }
  });
  panel.appendChild(form);
  return panel;
}

function buildCredentialForm(workerId, intakeOptions = {}, credentialTypes = {}) {
  const form = el('form', { style: 'margin-top:16px;' });
  const errBox = el('div', { class: 'error' });
  const credentialGroups = credentialTypeGroupsForForm(intakeOptions, credentialTypes);
  form.appendChild(el('h3', {}, 'Add credential'));
  form.appendChild(el('div', { class: 'row' },
    buildGroupedSelect('type', 'Credential type', credentialGroups, { required: true }),
    buildInput('identifier', 'Identifier'),
    buildInput('issuing_body', 'Issuing body'),
    buildInput('issue_date', 'Issue date', { type: 'date' }),
    buildInput('expiry_date', 'Expiry date', { type: 'date' }),
    buildSelect('verified', 'Review state', [
      { value: 'false', label: 'Needs confirmation' },
      { value: 'true', label: 'Confirmed' }
    ])
  ));
  form.appendChild(buildTextarea('notes', 'Notes', { placeholder: 'Optional credential register note' }));
  form.appendChild(errBox);
  form.appendChild(el('button', { type: 'submit' }, 'Add credential'));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errBox.textContent = '';
    const fd = new FormData(form);
    try {
      await api('POST', `/workers/${workerId}/credentials`, {
        type: fd.get('type') && !String(fd.get('type')).includes('-') ? fd.get('type') : null,
        credential_type_id: fd.get('type') && String(fd.get('type')).includes('-') ? fd.get('type') : null,
        identifier: fd.get('identifier') || null,
        issuing_body: fd.get('issuing_body') || null,
        issue_date: fd.get('issue_date') || null,
        expiry_date: fd.get('expiry_date') || null,
        verified: fd.get('verified') === 'true',
        notes: fd.get('notes') || null
      });
      toast('Credential added', 'success');
      router();
    } catch (err) {
      errBox.textContent = err.error;
    }
  });
  return form;
}

function buildFatigueForm(workerId) {
  const form = el('form', { style: 'margin-top:16px;' });
  const errBox = el('div', { class: 'error' });
  form.appendChild(el('h3', {}, 'Add fatigue / shift record'));
  form.appendChild(el('div', { class: 'row' },
    buildInput('shift_start', 'Shift start', { type: 'datetime-local', required: true }),
    buildInput('shift_end', 'Shift end', { type: 'datetime-local', required: true }),
    buildSelect('shift_type', 'Shift type', SHIFT_OPTIONS, { required: true }),
    buildInput('travel_hours', 'Travel hours', { type: 'number', step: '0.5', value: '0' }),
    buildSelect('self_declared_fatigue', 'Self-declared fatigue', ['false', 'true']),
    buildInput('notes', 'Notes')
  ));
  form.appendChild(errBox);
  form.appendChild(el('button', { type: 'submit' }, 'Record shift'));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errBox.textContent = '';
    const fd = new FormData(form);
    try {
      await api('POST', `/workers/${workerId}/fatigue-records`, {
        shift_start: new Date(fd.get('shift_start')).toISOString(),
        shift_end: new Date(fd.get('shift_end')).toISOString(),
        shift_type: fd.get('shift_type'),
        travel_hours: Number(fd.get('travel_hours') || 0),
        self_declared_fatigue: fd.get('self_declared_fatigue') === 'true',
        notes: fd.get('notes') || null
      });
      toast('Fatigue record added', 'success');
      router();
    } catch (err) {
      errBox.textContent = err.error;
    }
  });
  return form;
}

function joinListValue(values) {
  return Array.isArray(values) ? values.join(', ') : '';
}

function inputSourceTypeFromFilename(filename) {
  const lower = String(filename || '').toLowerCase();
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'markdown';
  if (lower.endsWith('.txt')) return 'txt';
  if (lower.endsWith('.docx')) return 'docx';
  return 'pasted_text';
}

function appendConfidenceNote(field, confidenceMap, fieldName) {
  const level = confidenceMap?.[fieldName] || 'low';
  field.appendChild(el('div', { class: 'field-meta' },
    confidencePill(level),
    el('span', { class: 'small muted' },
      level === 'low' ? 'Check this field before creating the job.' : `Extraction confidence: ${level}`
    )
  ));
}

function renderJobBriefImport(renderCycle) {
  const view = document.getElementById('view');
  view.innerHTML = '';

  view.appendChild(el('div', { class: 'toolbar' },
    el('h2', {}, 'Import job brief'),
    el('a', { href: '#/jobs' }, el('button', { class: 'secondary' }, '< Back to Jobs'))
  ));

  const sourceForm = el('form', { class: 'panel' });
  const sourceError = el('div', { class: 'error' });
  const textArea = el('textarea', {
    name: 'content',
    class: 'large-textarea',
    placeholder: 'Paste a job note, lift instruction, or copied message here...'
  });
  const fileInput = el('input', {
    type: 'file',
    accept: '.txt,.md,.markdown,.docx'
  });
  const previewHost = el('div', { class: 'panel' },
    el('div', { class: 'empty' }, 'Paste text or upload a supported file to review extracted job details.')
  );

  sourceForm.appendChild(el('h3', {}, 'Paste or upload job details'));
  sourceForm.appendChild(el('div', { class: 'small muted', style: 'margin-bottom:10px;' },
    'Review before creating. DispatchTalon does not verify job details automatically.'
  ));
  sourceForm.appendChild(buildTextareaField('Job brief text', textArea));
  sourceForm.appendChild(buildFileField('Upload .txt or .md', fileInput));
  sourceForm.appendChild(el('div', { class: 'status-note' },
    'TXT and Markdown are supported in this pilot. DOCX is not supported yet.'
  ));
  sourceForm.appendChild(sourceError);
  sourceForm.appendChild(el('div', { class: 'button-row' },
    el('button', { type: 'submit' }, 'Import job brief'),
    el('a', { href: '#/source-uploads' }, el('button', { type: 'button', class: 'secondary' }, 'Upload source documents')),
    el('a', { href: '#/jobs' }, el('button', { type: 'button', class: 'secondary' }, 'Cancel import'))
  ));

  async function handlePreviewSubmit(event) {
    event.preventDefault();
    sourceError.textContent = '';

    const file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
    let body;

    if (file) {
      const sourceType = inputSourceTypeFromFilename(file.name);
      if (sourceType === 'docx') {
        sourceError.textContent = 'DOCX import is not supported in this pilot yet. Use paste, .txt, or .md.';
        return;
      }
      if (!['txt', 'markdown'].includes(sourceType)) {
        sourceError.textContent = 'Unsupported file type. Use pasted text, .txt, or .md.';
        return;
      }
      if (file.size > 1024 * 1024) {
        sourceError.textContent = 'Job brief import is limited to 1MB for .txt and .md files.';
        return;
      }
      body = {
        filename: file.name,
        source_type: sourceType,
        content: await file.text()
      };
    } else {
      const content = String(textArea.value || '');
      if (!content.trim()) {
        sourceError.textContent = 'Paste job details or upload a file to continue.';
        return;
      }
      if (new Blob([content]).size > 1024 * 1024) {
        sourceError.textContent = 'Job brief import is limited to 1MB for pasted text.';
        return;
      }
      body = {
        source_type: 'pasted_text',
        content
      };
    }

    try {
      const preview = await api('POST', '/jobs/import-brief/preview', body);
      if (isStaleRender(renderCycle)) return;
      await renderPreview(preview);
      toast('Job brief preview ready', 'success');
    } catch (err) {
      sourceError.textContent = err.error || 'Job brief preview failed';
    }
  }

  async function renderPreview(preview) {
    previewHost.innerHTML = '';
    const [companyProfile, craneModels] = await Promise.all([
      loadCompanyProfile(),
      loadCraneModels()
    ]);
    if (isStaleRender(renderCycle)) return;
    const labourOnlyMode = isLabourOnly(companyProfile);
    const previewForm = el('form', { class: 'job-brief-preview-form' });
    const previewError = el('div', { class: 'error' });
    const extracted = preview.extracted || {};
    const confidence = preview.confidence || {};
    const defaultScheduleStatus = extracted.scheduled_date && extracted.start_time && extracted.end_time
      ? 'planned'
      : 'draft';

    previewHost.appendChild(el('h3', {}, 'Review extracted job details'));
    previewHost.appendChild(el('div', { class: 'small muted', style: 'margin-bottom:10px;' },
      'Review before creating. DispatchTalon does not verify job details automatically.'
    ));

    if ((preview.warnings || []).length > 0) {
      const warningList = el('ul');
      for (const warning of preview.warnings) {
        warningList.appendChild(el('li', {}, warning));
      }
      previewHost.appendChild(el('div', { class: 'alerts job-brief-warnings' },
        el('strong', {}, 'Warnings'),
        warningList
      ));
    }

    const clientField = buildInput('client_name', 'Client name', { required: true, value: extracted.client_name || '' });
    appendConfidenceNote(clientField, confidence, 'client_name');
    const siteNameField = buildInput('site_name', 'Site name', { required: true, value: extracted.site_name || '' });
    appendConfidenceNote(siteNameField, confidence, 'site_name');
    const siteAddressField = buildInput('site_address', 'Site address', { value: extracted.site_address || '' });
    appendConfidenceNote(siteAddressField, confidence, 'site_address');
    const jobDescriptionField = buildTextarea('job_description', 'Job description', {
      value: extracted.job_description || ''
    });
    appendConfidenceNote(jobDescriptionField, confidence, 'job_description');
    const dateField = buildInput('scheduled_date', 'Scheduled date', { type: 'date', value: extracted.scheduled_date || '' });
    appendConfidenceNote(dateField, confidence, 'scheduled_date');
    const startTimeField = buildInput('start_time', 'Start time', { type: 'time', value: extracted.start_time || '' });
    appendConfidenceNote(startTimeField, confidence, 'start_time');
    const endTimeField = buildInput('end_time', 'End time', { type: 'time', value: extracted.end_time || '' });
    appendConfidenceNote(endTimeField, confidence, 'end_time');
    const timezoneField = buildFieldWrapper('Timezone', el('input', {
      name: 'timezone',
      value: extracted.timezone || detectBrowserTimeZone(),
      list: 'job-brief-timezone-options',
      placeholder: 'Australia/Brisbane'
    }));
    appendConfidenceNote(timezoneField, confidence, 'timezone');
    const craneField = buildInput('crane_class', 'Crane class', { value: extracted.crane_class || '' });
    appendConfidenceNote(craneField, confidence, 'crane_class');
    const craneModelSelect = el('select', { name: 'crane_model_id' });
    craneModelSelect.appendChild(el('option', { value: '' }, 'Select crane model'));
    for (const model of craneModels || []) {
      const option = el('option', { value: String(model.id) }, formatCraneModelOption(model));
      if (extracted.crane_model_id != null && String(extracted.crane_model_id) === String(model.id)) {
        option.selected = true;
      }
      craneModelSelect.appendChild(option);
    }
    const craneModelField = buildFieldWrapper('Crane model', craneModelSelect);
    appendConfidenceNote(craneModelField, confidence, 'crane_model');
    const craneTravelStateSelect = el('select', { name: 'crane_travel_state_id' });
    populateCraneTravelStateSelect(craneTravelStateSelect, []);
    const craneTravelStateField = buildFieldWrapper('Travel state', craneTravelStateSelect);
    appendConfidenceNote(craneTravelStateField, confidence, 'crane_travel_state');
    const travelStateStatus = el('div', { class: 'status-note' }, 'Select a crane model to load travel states.');
    const requiredCapacityField = buildInput('required_capacity_tonnes', 'Required capacity tonnes', {
      type: 'number',
      step: '0.1',
      value: extracted.required_capacity_tonnes ?? ''
    });
    appendConfidenceNote(requiredCapacityField, confidence, 'required_capacity_tonnes');
    const counterweightField = buildInput('counterweight_required_tonnes', 'Counterweight required tonnes', {
      type: 'number',
      step: '0.1',
      value: extracted.counterweight_required_tonnes ?? ''
    });
    appendConfidenceNote(counterweightField, confidence, 'counterweight_required_tonnes');
    const rolesField = buildInput('required_roles', 'Required roles (comma-separated)', { value: labelsFromValues(extracted.required_roles || []).join(', ') });
    appendConfidenceNote(rolesField, confidence, 'required_roles');
    const credentialsField = buildInput('required_credentials', 'Required credentials (comma-separated)', { value: labelsFromValues(extracted.required_credentials || []).join(', ') });
    appendConfidenceNote(credentialsField, confidence, 'required_credentials');
    const tagsField = buildInput('task_tags', 'Additional job context (comma-separated)', { value: labelsFromValues(extracted.task_tags || []).join(', ') });
    appendConfidenceNote(tagsField, confidence, 'task_tags');
    const riskField = buildTextarea('risk_notes', 'Risk notes', { value: extracted.risk_notes || '' });
    appendConfidenceNote(riskField, confidence, 'risk_notes');
    const travelField = buildTextarea('travel_notes', 'Travel notes', { value: extracted.travel_notes || '' });
    appendConfidenceNote(travelField, confidence, 'travel_notes');
    const siteAccessField = buildTextarea('site_access_notes', 'Site access notes', { value: extracted.site_access_notes || '' });
    appendConfidenceNote(siteAccessField, confidence, 'site_access_notes');
    const setupNotesField = buildTextarea('setup_notes', 'Setup notes', { value: extracted.setup_notes || '' });
    appendConfidenceNote(setupNotesField, confidence, 'setup_notes');
    const contactNameField = buildInput('contact_name', 'Contact name', { value: extracted.contact_name || '' });
    appendConfidenceNote(contactNameField, confidence, 'contact_name');
    const contactPhoneField = buildInput('contact_phone', 'Contact phone', { value: extracted.contact_phone || '' });
    appendConfidenceNote(contactPhoneField, confidence, 'contact_phone');
    const sourceField = buildTextarea('source_note', 'Source note', {
      value: extracted.source_note || '',
      class: 'large-textarea'
    });
    appendConfidenceNote(sourceField, confidence, 'source_note');

    previewForm.appendChild(el('div', { class: 'row' },
      clientField,
      siteNameField,
      siteAddressField,
      dateField,
      startTimeField,
      endTimeField,
      timezoneField,
      buildSelect('schedule_status', 'Create as', ['draft', 'planned', 'confirmed'], { value: defaultScheduleStatus }),
      ...(labourOnlyMode ? [] : [
        craneField,
        craneModelField,
        craneTravelStateField,
        requiredCapacityField,
        counterweightField
      ]),
      rolesField,
      credentialsField,
      tagsField,
      contactNameField,
      contactPhoneField
    ));
    previewForm.appendChild(el('datalist', { id: 'job-brief-timezone-options' },
      ...COMMON_TIMEZONES.map((item) => el('option', { value: item }, item))
    ));
    previewForm.appendChild(jobDescriptionField);
    previewForm.appendChild(riskField);
    previewForm.appendChild(travelField);
    if (!labourOnlyMode) previewForm.appendChild(travelStateStatus);
    previewForm.appendChild(siteAccessField);
    if (!labourOnlyMode) previewForm.appendChild(setupNotesField);
    previewForm.appendChild(el('input', {
      type: 'hidden',
      name: 'source_confidence',
      value: extracted.source_confidence || confidence.source_confidence || 'low'
    }));
    previewForm.appendChild(sourceField);
    if (labourOnlyMode) {
      previewForm.appendChild(el('div', { class: 'alerts job-brief-warnings' },
        'Labour-only mode is active. Equipment, crane, transport, counterweight, and asset references are treated as review notes or one-off requirements unless the company switches to Plant + labour.'
      ));
    }
    const requirementMapping = extracted.structured_requirements || {};
    const selectedRequirements = requirementMapping.selected_catalogue_items || [];
    const suggestedRequirements = requirementMapping.suggested_catalogue_items || [];
    const oneOffRequirements = requirementMapping.one_off_custom_requirements || [];
    const suggestedAssets = extracted.suggested_assets || [];
    const unknownAssetNumbers = extracted.unknown_asset_numbers || [];
    const requirementPanel = el('div', { class: 'panel requirement-form-section' });
    requirementPanel.appendChild(el('h3', {}, 'Mapped job requirements'));
    requirementPanel.appendChild(el('div', { class: 'small muted' },
      'Selected catalogue requirements will be attached to the job. Suggested items are not in company setup and need confirmation.'
    ));
    requirementPanel.appendChild(el('div', { class: 'requirement-pill-list' },
      ...(selectedRequirements.length ? selectedRequirements.map((item) =>
        el('span', { class: 'requirement-pill' }, item.label)
      ) : [el('span', { class: 'muted' }, 'No enabled catalogue requirements detected.')])
    ));
    if (suggestedRequirements.length > 0) {
      requirementPanel.appendChild(el('div', { class: 'alerts job-brief-warnings' },
        el('strong', {}, 'Suggested outside company setup'),
        el('ul', {}, ...suggestedRequirements.map((item) => el('li', {}, item.label)))
      ));
    }
    if (oneOffRequirements.length > 0) {
      requirementPanel.appendChild(el('div', { class: 'alerts job-brief-warnings' },
        el('strong', {}, 'One-off custom requirements'),
        el('ul', {}, ...oneOffRequirements.map((item) => el('li', {}, item.label || String(item))))
      ));
    }
    if (suggestedAssets.length > 0 || unknownAssetNumbers.length > 0) {
      requirementPanel.appendChild(el('div', { class: 'alerts job-brief-warnings' },
        el('strong', {}, 'Asset / plant references'),
        el('ul', {},
          ...suggestedAssets.map((asset) => el('li', {},
            `${asset.asset_number} - ${asset.display_name || asset.catalogue_item?.label || 'Asset'}`
          )),
          ...unknownAssetNumbers.map((assetNumber) => el('li', {},
            `${assetNumber} mentioned but not found in company asset register.`
          ))
        )
      ));
    }
    previewForm.appendChild(requirementPanel);
    if (!labourOnlyMode) {
      previewForm.appendChild(el('div', { class: 'alerts crane-form-alerts' },
        el('ul', {},
          el('li', {}, 'Review required'),
          el('li', {}, 'Counterweight transport may be required'),
          el('li', {}, 'Road access review required'),
          el('li', {}, 'NHVR / state notice or permit check may be required'),
          el('li', {}, 'Confirm route, vehicle combination, axle masses, dimensions, and permits before dispatch')
        )
      ));
    }
    previewForm.appendChild(previewError);
    previewForm.appendChild(el('div', { class: 'button-row' },
      el('button', { type: 'submit' }, 'Create job from brief'),
      el('button', {
        type: 'button',
        class: 'secondary',
        onclick: () => { location.hash = '#/jobs'; }
      }, 'Cancel import')
    ));

    async function syncTravelStates(selectedModelId, selectedStateId = null) {
      populateCraneTravelStateSelect(craneTravelStateSelect, []);
      if (!selectedModelId) {
        travelStateStatus.textContent = 'Select a crane model to load travel states.';
        return;
      }
      travelStateStatus.textContent = 'Loading travel states...';
      try {
        const states = await loadCraneTravelStates(selectedModelId);
        populateCraneTravelStateSelect(craneTravelStateSelect, states, selectedStateId);
        travelStateStatus.textContent = `${states.length} travel state(s) available.`;
      } catch (err) {
        travelStateStatus.textContent = err.error || 'Could not load travel states.';
      }
    }

    craneModelSelect.addEventListener('change', async () => {
      await syncTravelStates(craneModelSelect.value, null);
    });
    if (extracted.crane_model_id) {
      await syncTravelStates(extracted.crane_model_id, extracted.crane_travel_state_id || null);
    }

    previewForm.addEventListener('submit', async (submitEvent) => {
      submitEvent.preventDefault();
      previewError.textContent = '';
      const fd = new FormData(previewForm);
      try {
        const createdJob = await api('POST', `/jobs/import-brief/${preview.import_id}/create-job`, {
          client_name: fd.get('client_name') || null,
          site_name: fd.get('site_name') || null,
          site_address: fd.get('site_address') || null,
          job_description: fd.get('job_description') || null,
          scheduled_date: fd.get('scheduled_date') || null,
          start_time: fd.get('start_time') || null,
          end_time: fd.get('end_time') || null,
          timezone: fd.get('timezone') || null,
          schedule_status: fd.get('schedule_status') || 'draft',
          crane_class: fd.get('crane_class') || null,
          crane_model_id: fd.get('crane_model_id') || null,
          crane_travel_state_id: fd.get('crane_travel_state_id') || null,
          required_capacity_tonnes: fd.get('required_capacity_tonnes') ? Number(fd.get('required_capacity_tonnes')) : null,
          counterweight_required_tonnes: fd.get('counterweight_required_tonnes') ? Number(fd.get('counterweight_required_tonnes')) : null,
          required_roles: splitCsv(fd.get('required_roles')),
          required_credentials: splitCsv(fd.get('required_credentials')),
          task_tags: splitCsv(fd.get('task_tags')),
          risk_notes: fd.get('risk_notes') || null,
          travel_notes: fd.get('travel_notes') || null,
          contact_name: fd.get('contact_name') || null,
          contact_phone: fd.get('contact_phone') || null,
          site_access_notes: fd.get('site_access_notes') || null,
          setup_notes: fd.get('setup_notes') || null,
          source_confidence: fd.get('source_confidence') || null,
          source_note: fd.get('source_note') || null,
          requirement_item_ids: extracted.requirement_item_ids || [],
          requirement_item_keys: extracted.requirement_item_keys || [],
          company_asset_ids: labourOnlyMode ? [] : (extracted.company_asset_ids || []),
          custom_requirements: extracted.custom_requirements || []
        });
        toast('Job created from brief', 'success');
        previewHost.innerHTML = '';
        previewHost.appendChild(el('h3', {}, 'Job created from brief'));
        previewHost.appendChild(el('div', { class: 'kv' },
          el('div', {}, 'Job ID'), el('div', { class: 'mono' }, shortId(createdJob.id)),
          el('div', {}, 'Client'), el('div', {}, createdJob.client_name),
          el('div', {}, 'Site'), el('div', {}, createdJob.site_name),
          el('div', {}, 'Schedule'), el('div', {}, formatScheduleRange(createdJob.schedule))
        ));
        if (!labourOnlyMode) {
          previewHost.appendChild(renderCranePlanningSummary(createdJob.crane_planning, { compact: true }));
        }
        previewHost.appendChild(el('div', { class: 'button-row', style: 'margin-top:12px;' },
          el('a', { href: `#/jobs/${createdJob.id}` }, el('button', { type: 'button' }, 'View created job')),
          el('a', { href: '#/jobs' }, el('button', { type: 'button', class: 'secondary' }, 'Back to Jobs')),
          createdJob.schedule?.has_schedule
            ? el('a', { href: '#/schedule' }, el('button', { type: 'button', class: 'secondary' }, 'Open Schedule'))
            : null
        ));
      } catch (err) {
        previewError.textContent = err.error || 'Job creation failed';
      }
    });

    previewHost.appendChild(previewForm);
  }

  sourceForm.addEventListener('submit', handlePreviewSubmit);
  view.appendChild(sourceForm);
  view.appendChild(previewHost);
}

async function renderJobsList(renderCycle) {
  const view = document.getElementById('view');
  view.innerHTML = '';

  const jobs = await api('GET', '/jobs');
  if (isStaleRender(renderCycle)) return;

  view.appendChild(el('div', { class: 'toolbar' },
    el('h2', {}, 'Jobs'),
    el('div', { class: 'button-row' },
      el('a', { href: '#/jobs/import-brief' }, el('button', {}, 'Import job brief')),
      el('a', { href: '#/new-job' }, el('button', { class: 'secondary' }, '+ New job'))
    )
  ));

  if (jobs.length === 0) {
    view.appendChild(el('div', { class: 'panel empty' }, 'No jobs created yet. Import a job brief or create a job manually.'));
    return;
  }

  const table = el('table');
  table.appendChild(el('thead', {}, el('tr', {},
    el('th', {}, 'Schedule'),
    el('th', {}, 'Client'),
    el('th', {}, 'Site'),
    el('th', {}, 'Task context'),
    el('th', {}, 'Timezone'),
    el('th', {}, 'Risk'),
    el('th', {}, 'Status'),
    el('th', {}, 'Actions')
  )));
  const body = el('tbody');
  for (const job of jobs) {
    body.appendChild(el('tr', {},
      el('td', {},
        el('div', { class: 'small' }, formatScheduleRange(job.schedule)),
        el('div', { class: 'small muted' }, `Schedule: ${formatDisplayLabel(job.schedule?.status || job.schedule_status)}`)
      ),
      el('td', {}, job.client_name),
      el('td', {}, el('a', { href: `#/jobs/${job.id}` }, job.site_name)),
      el('td', {}, labelsFromValues(job.task_tags || [], null).join(', ') || '-'),
      el('td', {}, job.schedule?.timezone || job.job_timezone || '-'),
      el('td', {}, riskPill(job.lift_risk_level)),
      el('td', {}, el('div', { class: 'button-row' },
        jobStatusPill(job.status),
        scheduleStatusPill(job.schedule?.status || job.schedule_status),
        job.crane_planning?.manual_review_required ? el('span', { class: 'pill pill-warn' }, 'Review required') : null,
        job.crane_planning?.transport_review_required ? el('span', { class: 'pill pill-warn' }, 'Transport review') : null
      )),
      el('td', {}, el('a', { href: `#/jobs/${job.id}/smartrank` }, 'SmartRank'))
    ));
  }
  table.appendChild(body);
  view.appendChild(el('div', { class: 'panel' }, table));
}

async function renderNewJob(renderCycle) {
  const view = document.getElementById('view');
  view.innerHTML = '';

  const [companyProfile, craneModels, companyCatalogue, companyAssets, intakeOptions, jobSuggestions] = await Promise.all([
    loadCompanyProfile(),
    loadCraneModels(),
    loadCompanyCatalogue(),
    loadCompanyAssets(),
    loadIntakeOptions(),
    api('GET', '/jobs/suggestions').catch(() => ({
      client_names: [],
      site_names: [],
      site_locations: [],
      site_conditions_by_site: {}
    }))
  ]);
  if (isStaleRender(renderCycle)) return;
  const mode = operatingMode(companyProfile);

  const defaultTimeZone = companyProfile.timezone || 'Australia/Brisbane';
  const today = isoDateInTimeZone(new Date(), defaultTimeZone);
  const form = el('form', { class: 'panel' });
  const errBox = el('div', { class: 'error' });
  const craneModelSelect = el('select', { name: 'crane_model_id' });
  craneModelSelect.appendChild(el('option', { value: '' }, 'Select crane model'));
  for (const model of craneModels || []) {
    craneModelSelect.appendChild(el('option', { value: String(model.id) }, formatCraneModelOption(model)));
  }
  const craneTravelStateSelect = el('select', { name: 'crane_travel_state_id' });
  populateCraneTravelStateSelect(craneTravelStateSelect, []);
  const travelStateStatus = el('div', { class: 'status-note' }, 'Select a crane model to load travel states.');

  form.appendChild(el('h2', {}, 'Create job'));
  form.appendChild(el('div', { class: 'row' },
    buildInput('reference', 'Reference'),
    buildInput('client_name', 'Client name', { required: true, list: 'job-client-suggestions', autocomplete: 'off' }),
    buildInput('site_name', 'Site name', { required: true, list: 'job-site-suggestions', autocomplete: 'off' }),
    buildInput('site_location', 'Site location', { list: 'job-location-suggestions', autocomplete: 'off' }),
    buildInput('date', 'Scheduled date', { type: 'date', value: today }),
    buildInput('shift_start_time', 'Scheduled start time', { type: 'time' }),
    buildInput('scheduled_end_time', 'Scheduled end time', { type: 'time' }),
    buildFieldWrapper('Timezone', el('input', {
      name: 'job_timezone',
      value: defaultTimeZone,
      list: 'job-timezone-options',
      placeholder: 'Australia/Brisbane'
    })),
    buildSelect('schedule_status', 'Schedule status', SCHEDULE_STATUS_OPTIONS, { value: 'planned' }),
    buildSelect('shift_type', 'Shift type', SHIFT_OPTIONS, { required: true }),
    buildInput('estimated_duration_hours', 'Estimated duration (hours)', { type: 'number', step: '0.5' }),
    buildSelect('lift_risk_level', 'Lift risk level', RISK_OPTIONS),
    buildSelect('travel_required', 'Additional travel required exceeding 100km', ['false', 'true'])
  ));
  form.appendChild(el('datalist', { id: 'job-timezone-options' },
    ...(intakeOptions.timezones || COMMON_TIMEZONES).map((item) => el('option', { value: item }, item))
  ));
  form.appendChild(el('datalist', { id: 'job-client-suggestions' },
    ...(jobSuggestions.client_names || []).map((item) => el('option', { value: item }, item))
  ));
  form.appendChild(el('datalist', { id: 'job-site-suggestions' },
    ...(jobSuggestions.site_names || []).map((item) => el('option', { value: item }, item))
  ));
  form.appendChild(el('datalist', { id: 'job-location-suggestions' },
    ...(jobSuggestions.site_locations || []).map((item) => el('option', { value: item }, item))
  ));

  const enabledCompanyCatalogue = filterCatalogueForOperatingMode(enabledCatalogueOnly(companyCatalogue), mode);
  const roleRequirementsEditor = renderRoleRequirementsEditor('crew_roles_required', intakeOptions.worker_role_groups || []);
  form.appendChild(el('div', { class: 'panel sub-panel' },
    el('h3', {}, 'Crew roles'),
    renderGroupedCheckboxPicker('crew_roles_required', intakeOptions.worker_role_groups || [], {
      helpText: 'Select the crew roles the job needs. Roles help filtering; credentials remain the hard allocation gate.',
      searchPlaceholder: 'Search crew roles...'
    }),
    roleRequirementsEditor
  ));
  roleRequirementsEditor.refresh(form);
  form.querySelectorAll('input[name="crew_roles_required"]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => roleRequirementsEditor.refresh(form));
  });
  form.appendChild(el('div', { class: 'panel sub-panel' },
    el('h3', {}, 'Required credentials and VOCs'),
    renderGroupedCheckboxPicker('required_credentials', intakeOptions.credential_groups || [], {
      helpText: 'Select licences, tickets, VOCs, and site credentials required for this job.',
      searchPlaceholder: 'Search credentials...'
    })
  ));
  if (mode === 'plant_and_labour') {
    form.appendChild(el('div', { class: 'panel sub-panel' },
      el('h3', {}, 'Crane / equipment classes'),
      renderGroupedCheckboxPicker('crane_classes_required', equipmentGroupsFromCatalogue(enabledCompanyCatalogue), {
        helpText: 'Select one or more equipment classes or transport requirements. This is planning context, not lift engineering approval.',
        searchPlaceholder: 'Search equipment classes...',
        emptyText: 'No equipment or transport classes are enabled yet. Open Our Business to enable plant classes.'
      })
    ));
  }
  form.appendChild(el('div', { class: 'panel sub-panel' },
    el('h3', {}, 'Site conditions'),
    renderGroupedCheckboxPicker('site_conditions', intakeOptions.site_condition_groups || [], {
      helpText: 'Select site conditions that should be visible during dispatch review. This is a review aid, not a compliance determination.',
      searchPlaceholder: 'Search site conditions...'
    })
  ));
  form.appendChild(buildTextarea('additional_requirements_note', 'Additional job requirements / notes', {
    class: 'large-note',
    placeholder: 'Example: spreader bar, extra timber, crane mats, tag lines, client induction, restricted access.'
  }));

  const requirementsSection = el('div', { class: 'panel requirement-form-section' });
  requirementsSection.appendChild(el('h3', {}, 'Job requirements'));
  requirementsSection.appendChild(el('div', { class: 'small muted', style: 'margin-bottom:10px;' },
    mode === 'labour_only'
      ? (companyCatalogue.configured
        ? 'Labour-only mode: company-enabled credentials, VOCs, civil/access, rail, and energy requirements are shown. Use one-off notes for plant/equipment mentions.'
        : 'No company requirements selected yet. Open Our Business to choose labour credentials, VOCs, access, rail, and energy requirements.')
      : (companyCatalogue.configured
        ? 'Only company-enabled catalogue items are shown. Add one-off requirements for job-specific items.'
        : 'No company requirements selected yet. Open Our Business to choose credentials, equipment, transport, and review items relevant to your operation.')
  ));
  requirementsSection.appendChild(renderRequirementChecklist(enabledCompanyCatalogue, {
    emptyText: 'No company requirements selected yet. Open Our Business to choose the credentials, equipment, transport, and review items relevant to your operation.'
  }));
  const assetSelectorPanel = mode === 'plant_and_labour'
    ? renderJobAssetSelector(enabledCompanyCatalogue, companyAssets)
    : null;
  if (assetSelectorPanel) requirementsSection.appendChild(assetSelectorPanel);
  requirementsSection.appendChild(buildInput('custom_requirements', mode === 'labour_only' ? 'Add one-off requirement or equipment/plant note' : 'Add one-off requirement', {
    placeholder: mode === 'labour_only'
      ? 'client induction, shutdown spotter, equipment note for review'
      : '40T Articulated / Pick-and-Carry, special access ticket, client induction'
  }));
  requirementsSection.appendChild(el('div', { class: 'small muted' },
    'One-off requirements attach to this job only and require review before allocation.'
  ));
  form.appendChild(requirementsSection);
  if (assetSelectorPanel) {
    assetSelectorPanel.refresh(form);
    requirementsSection.querySelectorAll('input[name="requirement_item_ids"]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => assetSelectorPanel.refresh(form));
    });
  }

  const craneSection = el('div', { class: 'panel crane-form-section' });
  craneSection.appendChild(el('h3', {}, 'Crane, counterweight and transport'));
  craneSection.appendChild(el('div', { class: 'small muted', style: 'margin-bottom:10px;' },
    'Operational planning support only. Review required language is intentional. DispatchTalon does not approve permits, compliance, or lift engineering.'
  ));
  craneSection.appendChild(el('div', { class: 'row' },
    buildFieldWrapper('Crane model', craneModelSelect),
    buildFieldWrapper('Travel state', craneTravelStateSelect),
    buildInput('required_capacity_tonnes', 'Required capacity tonnes', { type: 'number', step: '0.1', placeholder: '100' }),
    buildInput('lift_weight_tonnes', 'Lift weight tonnes', { type: 'number', step: '0.1' }),
    buildInput('radius_m', 'Radius metres', { type: 'number', step: '0.1' }),
    buildInput('height_m', 'Height metres', { type: 'number', step: '0.1' }),
    buildInput('counterweight_required_tonnes', 'Counterweight required tonnes', { type: 'number', step: '0.1', placeholder: '24.0' })
  ));
  craneSection.appendChild(travelStateStatus);
  craneSection.appendChild(buildTextarea('site_access_notes', 'Site access notes', {
    placeholder: 'Restricted access, bridge limits, low loader access, escort notes...'
  }));
  craneSection.appendChild(buildTextarea('setup_notes', 'Setup notes', {
    placeholder: 'Reduced counterweight, full counterweight, support truck, semi trailer...'
  }));
  craneSection.appendChild(el('div', { class: 'alerts crane-form-alerts' },
    el('ul', {},
      el('li', {}, 'Review required'),
      el('li', {}, 'Counterweight transport may be required'),
      el('li', {}, 'Road access review required'),
      el('li', {}, 'NHVR / state notice or permit check may be required'),
      el('li', {}, 'Confirm route, vehicle combination, axle masses, dimensions, and permits before dispatch')
    )
  ));
  if (mode === 'plant_and_labour') {
    form.appendChild(craneSection);
  } else {
    form.appendChild(el('div', { class: 'panel small muted' },
      'Labour-only mode hides crane model, travel state, counterweight, transport planning, and asset selection by default. Add a one-off equipment/plant note if the brief needs dispatcher review.'
    ));
  }
  form.appendChild(el('div', { class: 'panel small muted' },
    `Company default timezone: ${defaultTimeZone}. Planned and confirmed jobs require start, end, and timezone; draft jobs can be saved without a schedule window.`
  ));
  form.appendChild(buildTextarea('notes', 'Notes'));
  form.appendChild(errBox);
  form.appendChild(el('div', { class: 'button-row' },
    el('button', { type: 'submit' }, 'Create job'),
    el('a', { href: '#/jobs' }, el('button', { type: 'button', class: 'secondary' }, 'Cancel'))
  ));

  craneModelSelect.addEventListener('change', async () => {
    const craneModelId = craneModelSelect.value;
    populateCraneTravelStateSelect(craneTravelStateSelect, []);
    if (!craneModelId) {
      travelStateStatus.textContent = 'Select a crane model to load travel states.';
      return;
    }
    travelStateStatus.textContent = 'Loading travel states...';
    try {
      const states = await loadCraneTravelStates(craneModelId);
      populateCraneTravelStateSelect(craneTravelStateSelect, states);
      travelStateStatus.textContent = `${states.length} travel state(s) available.`;
    } catch (err) {
      travelStateStatus.textContent = err.error || 'Could not load travel states.';
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errBox.textContent = '';
    const fd = new FormData(form);
    const body = {
      reference: fd.get('reference') || null,
      client_name: fd.get('client_name'),
      site_name: fd.get('site_name'),
      site_location: fd.get('site_location') || null,
      date: fd.get('date') || null,
      shift_start_time: fd.get('shift_start_time') || null,
      scheduled_end_time: fd.get('scheduled_end_time') || null,
      job_timezone: fd.get('job_timezone') || defaultTimeZone,
      schedule_status: fd.get('schedule_status') || 'planned',
      shift_type: fd.get('shift_type'),
      estimated_duration_hours: fd.get('estimated_duration_hours') ? Number(fd.get('estimated_duration_hours')) : null,
      crane_class_required: selectedCheckboxValues(form, 'crane_classes_required')[0] || null,
      crane_classes_required: selectedCheckboxValues(form, 'crane_classes_required'),
      task_tags: [],
      crew_roles_required: selectedCheckboxValues(form, 'crew_roles_required'),
      role_requirements: roleRequirementsFromForm(form),
      required_credentials: selectedCheckboxValues(form, 'required_credentials'),
      site_conditions: selectedCheckboxValues(form, 'site_conditions'),
      lift_risk_level: fd.get('lift_risk_level'),
      travel_required: fd.get('travel_required') === 'true',
      notes: [fd.get('additional_requirements_note'), fd.get('notes')]
        .map((value) => String(value || '').trim())
        .filter(Boolean)
        .join('\n\n') || null,
      crane_model_id: fd.get('crane_model_id') || null,
      crane_travel_state_id: fd.get('crane_travel_state_id') || null,
      required_capacity_tonnes: fd.get('required_capacity_tonnes') ? Number(fd.get('required_capacity_tonnes')) : null,
      lift_weight_tonnes: fd.get('lift_weight_tonnes') ? Number(fd.get('lift_weight_tonnes')) : null,
      radius_m: fd.get('radius_m') ? Number(fd.get('radius_m')) : null,
      height_m: fd.get('height_m') ? Number(fd.get('height_m')) : null,
      counterweight_required_tonnes: fd.get('counterweight_required_tonnes') ? Number(fd.get('counterweight_required_tonnes')) : null,
      site_access_notes: fd.get('site_access_notes') || null,
      setup_notes: fd.get('setup_notes') || null,
      requirement_item_ids: selectedRequirementIdsFromForm(form),
      company_asset_ids: selectedCompanyAssetIdsFromForm(form),
      custom_requirements: splitCsv(fd.get('custom_requirements')).map((label) => ({
        category: 'custom',
        label
      }))
    };
    try {
      const job = await api('POST', '/jobs', body);
      toast('Job created', 'success');
      location.hash = `#/jobs/${job.id}`;
    } catch (err) {
      errBox.textContent = err.error;
    }
  });

  view.appendChild(form);
}

function selectedRequirementIdsFromJob(job = {}) {
  return (job.structured_requirements || [])
    .map((item) => item.catalogue_item_id)
    .filter((id) => id != null);
}

function selectedAssetIdsFromJob(job = {}) {
  return (job.asset_assignments || [])
    .map((assignment) => assignment.asset?.id)
    .filter((id) => id != null);
}

function customRequirementsFromJob(job = {}) {
  return (job.structured_requirements || [])
    .filter((item) => item.is_custom)
    .map((item) => item.label)
    .filter(Boolean)
    .join(', ');
}

function buildJobEditPanel(job, companyProfile, craneModels, companyCatalogue, companyAssets, jobId, intakeOptions = {}) {
  const mode = operatingMode(companyProfile);
  const startParts = splitLocalDateTime(job.schedule?.scheduled_start_local || job.scheduled_start_local || '');
  const endParts = splitLocalDateTime(job.schedule?.scheduled_end_local || job.scheduled_end_local || '');
  const detectedTimeZone = job.job_timezone || job.schedule?.timezone || detectBrowserTimeZone() || 'Australia/Brisbane';
  const panel = el('details', { class: 'panel job-edit-panel' });
  panel.appendChild(el('summary', {}, 'Edit job'));
  const form = el('form', { class: 'job-edit-form' });
  const errBox = el('div', { class: 'error' });
  const submit = el('button', { type: 'submit' }, 'Save job changes');

  const cranePlanning = job.crane_planning || {};
  const craneModelSelect = el('select', { name: 'crane_model_id' });
  craneModelSelect.appendChild(el('option', { value: '' }, 'Select crane model'));
  for (const model of craneModels || []) {
    const option = el('option', { value: String(model.id) }, formatCraneModelOption(model));
    if (cranePlanning.crane_model_id != null && String(cranePlanning.crane_model_id) === String(model.id)) {
      option.selected = true;
    }
    craneModelSelect.appendChild(option);
  }
  const craneTravelStateSelect = el('select', { name: 'crane_travel_state_id' });
  populateCraneTravelStateSelect(craneTravelStateSelect, [], cranePlanning.crane_travel_state_id);
  const travelStateStatus = el('div', { class: 'status-note' }, 'Select a crane model to load travel states.');

  const loadTravelStatesForModel = async () => {
    const craneModelId = craneModelSelect.value;
    populateCraneTravelStateSelect(craneTravelStateSelect, [], cranePlanning.crane_travel_state_id);
    if (!craneModelId) {
      travelStateStatus.textContent = 'Select a crane model to load travel states.';
      return;
    }
    travelStateStatus.textContent = 'Loading travel states...';
    try {
      const states = await loadCraneTravelStates(craneModelId);
      populateCraneTravelStateSelect(craneTravelStateSelect, states, cranePlanning.crane_travel_state_id);
      travelStateStatus.textContent = `${states.length} travel state(s) available.`;
    } catch (err) {
      travelStateStatus.textContent = err.error || 'Could not load travel states.';
    }
  };

  form.appendChild(el('h3', {}, 'Edit job'));
  form.appendChild(el('div', { class: 'small muted' },
    'Save persists to the backend, reloads the saved job, and records audit events for changed job, schedule, requirements, and asset context.'
  ));
  form.appendChild(el('div', { class: 'row' },
    buildInput('reference', 'Reference', { value: job.reference || '' }),
    buildInput('client_name', 'Client name', { required: true, value: job.client_name || '' }),
    buildInput('site_name', 'Site name', { required: true, value: job.site_name || '' }),
    buildInput('site_location', 'Site location', { value: job.site_location || '' }),
    buildInput('contact_name', 'Contact name', { value: job.contact_name || '' }),
    buildInput('contact_phone', 'Contact phone', { value: job.contact_phone || '' }),
    buildSelect('status', 'Job status', ['draft', 'open', 'allocated', 'in_progress', 'complete', 'cancelled'], { value: job.status || 'open' }),
    buildInput('date', 'Scheduled date', { type: 'date', value: job.date || startParts.date || '' }),
    buildInput('shift_start_time', 'Scheduled start time', { type: 'time', value: startParts.time || job.shift_start_time || '' }),
    buildInput('scheduled_end_time', 'Scheduled end time', { type: 'time', value: endParts.time || '' }),
    buildFieldWrapper('Timezone', el('input', {
      name: 'job_timezone',
      value: detectedTimeZone,
      list: 'job-timezone-options',
      placeholder: 'Australia/Brisbane'
    })),
    buildSelect('schedule_status', 'Schedule status', SCHEDULE_STATUS_OPTIONS, { value: job.schedule?.status || job.schedule_status || 'planned' }),
    buildSelect('shift_type', 'Shift type', SHIFT_OPTIONS, { value: job.shift_type || 'day', required: true }),
    buildInput('estimated_duration_hours', 'Estimated duration (hours)', { type: 'number', step: '0.5', value: job.estimated_duration_hours ?? '' }),
    buildSelect('lift_risk_level', 'Lift risk level', RISK_OPTIONS, { value: job.lift_risk_level || 'routine' }),
    buildSelect('travel_required', 'Additional travel required exceeding 100km', ['false', 'true'], { value: job.travel_required ? 'true' : 'false' })
  ));
  form.appendChild(el('datalist', { id: 'job-timezone-options' },
    ...(intakeOptions.timezones || COMMON_TIMEZONES).map((item) => el('option', { value: item }, item))
  ));
  const enabledCompanyCatalogue = filterCatalogueForOperatingMode(enabledCatalogueOnly(companyCatalogue), mode);
  const editRoleRequirementsEditor = renderRoleRequirementsEditor(
    'crew_roles_required',
    intakeOptions.worker_role_groups || [],
    job.role_requirements || []
  );
  form.appendChild(el('div', { class: 'panel sub-panel' },
    el('h3', {}, 'Crew roles'),
    renderGroupedCheckboxPicker('crew_roles_required', intakeOptions.worker_role_groups || [], {
      selectedValues: job.crew_roles_required || [],
      helpText: 'Select the crew roles this job needs.',
      searchPlaceholder: 'Search crew roles...'
    }),
    editRoleRequirementsEditor
  ));
  editRoleRequirementsEditor.refresh(form);
  form.querySelectorAll('input[name="crew_roles_required"]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => editRoleRequirementsEditor.refresh(form));
  });
  form.appendChild(el('div', { class: 'panel sub-panel' },
    el('h3', {}, 'Required credentials and VOCs'),
    renderGroupedCheckboxPicker('required_credentials', intakeOptions.credential_groups || [], {
      selectedValues: job.required_credentials || [],
      helpText: 'Select licences, tickets, VOCs, and site credentials required for this job.',
      searchPlaceholder: 'Search credentials...'
    })
  ));
  if (mode === 'plant_and_labour') {
    form.appendChild(el('div', { class: 'panel sub-panel' },
      el('h3', {}, 'Crane / equipment classes'),
      renderGroupedCheckboxPicker('crane_classes_required', equipmentGroupsFromCatalogue(enabledCompanyCatalogue), {
        selectedValues: job.crane_classes_required || (job.crane_class_required ? [job.crane_class_required] : []),
        helpText: 'Select one or more equipment classes or transport requirements.',
        searchPlaceholder: 'Search equipment classes...'
      })
    ));
  }
  form.appendChild(el('div', { class: 'panel sub-panel' },
    el('h3', {}, 'Site conditions'),
    renderGroupedCheckboxPicker('site_conditions', intakeOptions.site_condition_groups || [], {
      selectedValues: job.site_conditions || [],
      helpText: 'Select site conditions that should be visible during dispatch review.',
      searchPlaceholder: 'Search site conditions...'
    })
  ));
  form.appendChild(buildTextarea('job_description', 'Job description', { value: job.job_description || '' }));
  form.appendChild(buildTextarea('risk_notes', 'Risk notes', { value: job.risk_notes || '' }));
  form.appendChild(buildTextarea('travel_notes', 'Travel notes', { value: job.travel_notes || '' }));
  form.appendChild(buildTextarea('source_note', 'Source / job brief note', { value: job.source_note || '' }));
  form.appendChild(buildTextarea('notes', 'Notes', { value: job.notes || '' }));

  const requirementsSection = el('div', { class: 'panel requirement-form-section' });
  requirementsSection.appendChild(el('h3', {}, 'Structured requirements'));
  requirementsSection.appendChild(renderRequirementChecklist(enabledCompanyCatalogue, {
    selectedIds: selectedRequirementIdsFromJob(job),
    emptyText: 'No company requirements selected yet. Open Our Business to choose requirement catalogue items.'
  }));
  const assetSelectorPanel = mode === 'plant_and_labour'
    ? renderJobAssetSelector(enabledCompanyCatalogue, companyAssets, { selectedAssetIds: selectedAssetIdsFromJob(job) })
    : null;
  if (assetSelectorPanel) requirementsSection.appendChild(assetSelectorPanel);
  requirementsSection.appendChild(buildInput('custom_requirements', 'One-off requirements (comma-separated)', {
    value: customRequirementsFromJob(job)
  }));
  form.appendChild(requirementsSection);

  if (assetSelectorPanel) {
    assetSelectorPanel.refresh(form);
    requirementsSection.querySelectorAll('input[name="requirement_item_ids"]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => assetSelectorPanel.refresh(form));
    });
  }

  if (mode === 'plant_and_labour') {
    const craneSection = el('div', { class: 'panel crane-form-section' });
    craneSection.appendChild(el('h3', {}, 'Crane, counterweight and transport'));
    craneSection.appendChild(el('div', { class: 'small muted', style: 'margin-bottom:10px;' },
      'Planning support only. Review required language does not approve permits, compliance, or lift engineering.'
    ));
    craneSection.appendChild(el('div', { class: 'row' },
      buildFieldWrapper('Crane model', craneModelSelect),
      buildFieldWrapper('Travel state', craneTravelStateSelect),
      buildInput('required_capacity_tonnes', 'Required capacity tonnes', { type: 'number', step: '0.1', value: cranePlanning.required_capacity_tonnes ?? '' }),
      buildInput('lift_weight_tonnes', 'Lift weight tonnes', { type: 'number', step: '0.1', value: cranePlanning.lift_weight_tonnes ?? '' }),
      buildInput('radius_m', 'Radius metres', { type: 'number', step: '0.1', value: cranePlanning.radius_m ?? '' }),
      buildInput('height_m', 'Height metres', { type: 'number', step: '0.1', value: cranePlanning.height_m ?? '' }),
      buildInput('counterweight_required_tonnes', 'Counterweight required tonnes', { type: 'number', step: '0.1', value: cranePlanning.counterweight_required_tonnes ?? '' })
    ));
    craneSection.appendChild(travelStateStatus);
    craneSection.appendChild(buildTextarea('site_access_notes', 'Site access notes', { value: cranePlanning.site_access_notes || '' }));
    craneSection.appendChild(buildTextarea('setup_notes', 'Setup notes', { value: cranePlanning.setup_notes || '' }));
    form.appendChild(craneSection);
    craneModelSelect.addEventListener('change', loadTravelStatesForModel);
    loadTravelStatesForModel();
  }

  form.appendChild(errBox);
  form.appendChild(el('div', { class: 'button-row' },
    submit,
    el('a', { href: `#/jobs/${jobId}` }, el('button', { type: 'button', class: 'secondary' }, 'Cancel'))
  ));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errBox.textContent = '';
    const fd = new FormData(form);
    const body = {
      reference: fd.get('reference') || null,
      client_name: fd.get('client_name'),
      site_name: fd.get('site_name'),
      site_location: fd.get('site_location') || null,
      contact_name: fd.get('contact_name') || null,
      contact_phone: fd.get('contact_phone') || null,
      status: fd.get('status'),
      date: fd.get('date') || null,
      shift_start_time: fd.get('shift_start_time') || null,
      scheduled_end_time: fd.get('scheduled_end_time') || null,
      job_timezone: fd.get('job_timezone') || detectedTimeZone,
      schedule_status: fd.get('schedule_status') || 'planned',
      shift_type: fd.get('shift_type'),
      estimated_duration_hours: fd.get('estimated_duration_hours') ? Number(fd.get('estimated_duration_hours')) : null,
      crane_class_required: selectedCheckboxValues(form, 'crane_classes_required')[0] || null,
      crane_classes_required: selectedCheckboxValues(form, 'crane_classes_required'),
      job_description: fd.get('job_description') || null,
      task_tags: job.task_tags || [],
      crew_roles_required: selectedCheckboxValues(form, 'crew_roles_required'),
      role_requirements: roleRequirementsFromForm(form),
      required_credentials: selectedCheckboxValues(form, 'required_credentials'),
      site_conditions: selectedCheckboxValues(form, 'site_conditions'),
      lift_risk_level: fd.get('lift_risk_level'),
      travel_required: fd.get('travel_required') === 'true',
      risk_notes: fd.get('risk_notes') || null,
      travel_notes: fd.get('travel_notes') || null,
      source_note: fd.get('source_note') || null,
      notes: fd.get('notes') || null,
      crane_model_id: fd.get('crane_model_id') || null,
      crane_travel_state_id: fd.get('crane_travel_state_id') || null,
      required_capacity_tonnes: fd.get('required_capacity_tonnes') ? Number(fd.get('required_capacity_tonnes')) : null,
      lift_weight_tonnes: fd.get('lift_weight_tonnes') ? Number(fd.get('lift_weight_tonnes')) : null,
      radius_m: fd.get('radius_m') ? Number(fd.get('radius_m')) : null,
      height_m: fd.get('height_m') ? Number(fd.get('height_m')) : null,
      counterweight_required_tonnes: fd.get('counterweight_required_tonnes') ? Number(fd.get('counterweight_required_tonnes')) : null,
      site_access_notes: fd.get('site_access_notes') || null,
      setup_notes: fd.get('setup_notes') || null,
      requirement_item_ids: selectedRequirementIdsFromForm(form),
      company_asset_ids: selectedCompanyAssetIdsFromForm(form),
      custom_requirements: splitCsv(fd.get('custom_requirements')).map((label) => ({
        category: 'custom',
        label
      }))
    };
    setButtonBusy(submit, true, 'Save job changes', 'Saving...');
    try {
      const savedJob = await api('PATCH', `/jobs/${jobId}`, body);
      if (!savedJob || savedJob.id !== jobId) {
        throw { error: 'Job update did not return the saved job.' };
      }
      const persistedJob = await api('GET', `/jobs/${jobId}`);
      if (!persistedJob || persistedJob.id !== jobId) {
        throw { error: 'Job update could not be confirmed from the server.' };
      }
      toast('Job updated', 'success');
      router();
    } catch (err) {
      errBox.textContent = err.error || 'Could not save job changes';
    } finally {
      setButtonBusy(submit, false, 'Save job changes', 'Saving...');
    }
  });

  panel.appendChild(form);
  return panel;
}

async function renderJobDetail(jobId, renderCycle) {
  const view = document.getElementById('view');
  view.innerHTML = '';

  const [job, allocations, notificationData, companyProfile, craneModels, companyCatalogue, companyAssets, intakeOptions] = await Promise.all([
    api('GET', `/jobs/${jobId}`),
    api('GET', `/jobs/${jobId}/allocations`),
    api('GET', `/jobs/${jobId}/allocation-notifications`),
    loadCompanyProfile(),
    loadCraneModels(),
    loadCompanyCatalogue(),
    loadCompanyAssets(),
    loadIntakeOptions()
  ]);
  if (isStaleRender(renderCycle)) return;

  view.appendChild(el('div', { class: 'toolbar' },
    el('h2', {}, `${job.site_name} - ${job.client_name}`),
    el('div', { class: 'button-row' },
      el('a', { href: `#/jobs/${jobId}/smartrank` }, el('button', {}, 'Run SmartRank')),
      el('a', { href: '#/jobs' }, el('button', { class: 'secondary' }, '< All jobs'))
    )
  ));

  const kv = el('div', { class: 'kv' });
  const addKv = (label, value) => {
    kv.appendChild(el('div', {}, label));
    const content = el('div', {});
    if (value instanceof Node) content.appendChild(value);
    else content.textContent = value == null || value === '' ? '-' : String(value);
    kv.appendChild(content);
  };
  addKv('Status', jobStatusPill(job.status));
  addKv('Schedule', formatScheduleRange(job.schedule));
  addKv('Schedule status', scheduleStatusPill(job.schedule?.status || job.schedule_status));
  addKv('Date', fmtDateOnly(job.date));
  addKv('Shift', `${job.shift_type}${job.shift_start_time ? ` @ ${job.shift_start_time}` : ''}`);
  addKv('Timezone', job.schedule?.timezone || job.job_timezone || '-');
  addKv('Site address', job.site_location || '-');
  addKv('Contact', [job.contact_name, job.contact_phone].filter(Boolean).join(' / ') || '-');
  addKv('Crane / equipment classes', renderChipList(job.crane_classes_required || (job.crane_class_required ? [job.crane_class_required] : []), null, '-'));
  addKv('Job description', job.job_description || '-');
  addKv('Task context', renderTagList(job.task_tags, 'none'));
  addKv('Crew roles', renderChipList(job.crew_roles_required || [], null, '-'));
  addKv('Role requirements', renderRoleRequirementsSummary(job.role_requirements || []));
  addKv('Required credentials', renderChipList(job.required_credentials || [], null, 'none'));
  addKv('Site conditions', renderChipList(job.site_conditions || [], null, '-'));
  addKv('Risk level', riskPill(job.lift_risk_level));
  addKv('Risk notes', job.risk_notes || '-');
  addKv('Additional travel over 100km', job.travel_required ? 'Yes' : 'No');
  addKv('Travel notes', job.travel_notes || '-');
  addKv('Reference', job.reference || '-');
  addKv('Source note', job.source_note || '-');
  addKv('Notes', job.notes || '-');
  view.appendChild(el('div', { class: 'panel' }, kv));
  view.appendChild(renderStructuredRequirementsSummary(job.structured_requirements || []));
  view.appendChild(renderAssetAssignmentsSummary(job.asset_assignments || [], job.asset_assignment_warnings || []));
  view.appendChild(renderCranePlanningSummary(job.crane_planning));
  view.appendChild(buildJobEditPanel(job, companyProfile, craneModels, companyCatalogue, companyAssets, jobId, intakeOptions));

  const allocPanel = el('div', { class: 'panel' });
  allocPanel.appendChild(el('h3', {}, `Allocations (${allocations.length})`));
  if (allocations.length === 0) {
    allocPanel.appendChild(el('div', { class: 'empty' },
      'No worker allocated yet. ',
      el('a', { href: `#/jobs/${jobId}/smartrank` }, 'Run SmartRank to allocate.')
    ));
  } else {
    const notifications = notificationData?.notifications || [];
    for (const allocation of allocations) {
      allocPanel.appendChild(renderAllocationCard(jobId, allocation, notifications));
    }
  }
  view.appendChild(allocPanel);
}

function latestNotificationForAllocation(notifications, allocationId) {
  return (notifications || [])
    .filter((notification) => notification.allocation_id === allocationId)
    .sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')))[0] || null;
}

function notificationStatusPill(notification) {
  if (!notification) return el('span', { class: 'pill pill-muted' }, 'Draft');
  const status = notification.status || 'draft';
  const cls = status === 'published_manual'
    ? 'pill-ok'
    : (status === 'previewed' ? 'pill-warn' : 'pill-muted');
  return el('span', { class: `pill ${cls}` }, formatDisplayLabel(status));
}

function renderAllocationCard(jobId, allocation, notifications = []) {
  const latestNotification = latestNotificationForAllocation(notifications, allocation.id);
  const card = el('div', { class: 'rank-card' });
  card.appendChild(el('div', { class: 'rank-head' },
    el('div', {},
      el('div', { class: 'rank-name' }, `${allocation.worker_name || 'Allocated worker'} - rank #${allocation.smartrank_position} (score ${allocation.smartrank_score})`),
      el('div', { class: 'rank-meta' }, `Allocated ${fmtDate(allocation.allocated_at)} · Status: ${formatDisplayLabel(allocation.status)}`)
    )
  ));
  card.appendChild(el('div', { class: 'button-row', style: 'margin-top:8px;' },
    notificationStatusPill(latestNotification),
    el('span', { class: 'small muted' },
      latestNotification
        ? `Notification ${formatDisplayLabel(latestNotification.status)} ${latestNotification.updated_at ? `- ${fmtDate(latestNotification.updated_at)}` : ''}`
        : 'Notification status: Draft. Worker has not been notified.'
    )
  ));
  if (allocation.role_coverages?.length) {
    card.appendChild(el('div', { class: 'role-coverage-summary' },
      el('div', { class: 'small muted' }, 'Assigned role coverage'),
      renderChipList(allocation.role_coverages.map((coverage) => coverage.role_key), null, '-'),
      allocation.role_coverages.some((coverage) => coverage.review_required)
        ? el('span', { class: 'pill pill-warn' }, 'Review recorded')
        : el('span', { class: 'pill pill-ok' }, 'Coverage recorded')
    ));
  }
  if (allocation.override_reason) {
    card.appendChild(el('div', { class: 'alerts' },
      el('strong', {}, 'Override reason: '),
      allocation.override_reason
    ));
  }
  if (allocation.schedule) {
    card.appendChild(el('div', { class: 'alerts' },
      el('strong', {}, 'Scheduled window: '),
      formatScheduleRange(allocation.schedule)
    ));
  }
  if (allocation.active_warnings?.length) {
    const list = el('ul');
    for (const warning of allocation.active_warnings) list.appendChild(el('li', {}, warning.detail || formatDisplayLabel(warning.type)));
    card.appendChild(el('div', { class: 'alerts' },
      el('strong', {}, 'Warnings at allocation: '),
      list
    ));
  }
  card.appendChild(el('div', { class: 'button-row', style: 'margin-top:12px;' },
    el('button', {
      type: 'button',
      onclick: () => openAllocationPublishModal(jobId, allocation, latestNotification)
    }, latestNotification?.status === 'published_manual' ? 'View / republish message' : 'Publish allocation')
  ));
  if (latestNotification?.message_body_snapshot) {
    card.appendChild(el('details', { class: 'notification-snapshot' },
      el('summary', {}, 'Last notification message'),
      el('pre', { class: 'mono sms-preview' }, latestNotification.message_body_snapshot)
    ));
  }
  card.appendChild(el('details', {},
    el('summary', {}, 'Snapshot'),
    el('pre', { class: 'mono' }, JSON.stringify(allocation.smartrank_snapshot, null, 2))
  ));
  return card;
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = el('textarea', { class: 'clipboard-fallback', readonly: 'readonly' }, text);
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  area.remove();
}

function closeModal(modal) {
  if (modal) modal.remove();
}

async function openAllocationPublishModal(jobId, allocation, existingNotification = null) {
  const modal = el('div', { class: 'modal-backdrop' });
  const dialog = el('div', { class: 'modal-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Publish allocation' });
  modal.appendChild(dialog);
  document.body.appendChild(modal);

  const content = el('div', { class: 'modal-content' }, el('p', { class: 'muted' }, 'Generating SMS preview...'));
  dialog.appendChild(el('div', { class: 'toolbar' },
    el('h3', {}, 'Publish allocation'),
    el('button', { type: 'button', class: 'secondary', onclick: () => closeModal(modal) }, 'Close')
  ));
  dialog.appendChild(content);

  try {
    const preview = await api('POST', `/jobs/${jobId}/allocation-notifications/preview`, {
      allocation_id: allocation.id
    });
    const notification = preview.notification || existingNotification;
    const warning = preview.warning || null;
    const message = preview.sms_preview || notification?.message_body_snapshot || '';
    content.innerHTML = '';

    const ackId = `manual-contact-${allocation.id}`;
    const ackRow = warning
      ? el('label', { class: 'checkbox-row manual-contact-ack' },
          el('input', { type: 'checkbox', id: ackId }),
          'Worker mobile is missing. I will use manual contact and update the worker profile.'
        )
      : null;
    const publishButton = el('button', { type: 'button' }, 'Mark as manually published');
    const copyButton = el('button', { type: 'button', class: 'secondary' }, 'Copy SMS');
    const errBox = el('div', { class: 'error' });

    copyButton.addEventListener('click', async () => {
      if (warning && !content.querySelector(`#${ackId}`)?.checked) {
        toast('Acknowledge manual contact before copying without a mobile number.', 'error');
        return;
      }
      try {
        await copyTextToClipboard(message);
        toast('SMS preview copied', 'success');
      } catch {
        toast('Copy failed. Select the preview text manually.', 'error');
      }
    });

    publishButton.addEventListener('click', async () => {
      errBox.textContent = '';
      const acknowledged = warning ? Boolean(content.querySelector(`#${ackId}`)?.checked) : false;
      setButtonBusy(publishButton, true, 'Mark as manually published', 'Publishing...');
      try {
        await api('POST', `/jobs/${jobId}/allocation-notifications/publish-manual`, {
          allocation_id: allocation.id,
          notification_id: notification?.id || null,
          manual_contact_acknowledged: acknowledged
        });
        toast('Allocation marked as manually published', 'success');
        closeModal(modal);
        router();
      } catch (err) {
        errBox.textContent = err.error || 'Could not publish allocation';
      } finally {
        setButtonBusy(publishButton, false, 'Mark as manually published', 'Publishing...');
      }
    });

    content.appendChild(el('div', { class: 'kv notification-preview-kv' },
      el('div', {}, 'Worker'), el('div', {}, allocation.worker_name || preview.allocation?.worker_name || allocation.worker_id),
      el('div', {}, 'Mobile'), el('div', {}, notification?.recipient_phone || allocation.worker_phone || '-'),
      el('div', {}, 'Allocation'), el('div', { class: 'mono' }, allocation.id),
      el('div', {}, 'Status'), el('div', {}, notificationStatusPill(notification))
    ));
    content.appendChild(el('p', { class: 'small muted' },
      'Phase 1 does not send SMS automatically. Copy this message, send it through your company channel, then mark the allocation as manually published.'
    ));
    if (warning) {
      content.appendChild(el('div', { class: 'alerts notification-warning' },
        el('strong', {}, 'Warning: '),
        warning
      ));
    }
    content.appendChild(buildFieldWrapper('SMS preview', el('textarea', {
      readonly: 'readonly',
      class: 'sms-preview-textarea',
      rows: '6'
    }, message)));
    if (ackRow) content.appendChild(ackRow);
    content.appendChild(errBox);
    content.appendChild(el('div', { class: 'button-row' }, copyButton, publishButton));
  } catch (err) {
    content.innerHTML = '';
    content.appendChild(el('div', { class: 'error' }, err.error || 'Could not generate allocation preview'));
  }
}

async function renderSmartRank(jobId, renderCycle) {
  const view = document.getElementById('view');
  view.innerHTML = '';

  const result = await api('GET', `/jobs/${jobId}/smartrank`);
  if (isStaleRender(renderCycle)) return;

  view.appendChild(el('div', { class: 'toolbar' },
    el('h2', {}, `SmartRank - ${result.job.site_name}`),
    el('a', { href: `#/jobs/${jobId}` }, el('button', { class: 'secondary' }, '< Back to job'))
  ));

  view.appendChild(el('div', { class: 'panel' },
    el('div', { class: 'small muted' }, `Generated ${fmtDate(result.generated_at)} · ${result.ranked.length} ranked, ${result.blocked.length} blocked`),
    el('div', { class: 'small', style: 'margin-top:8px;' },
      el('strong', {}, 'Scheduled window: '),
      formatScheduleRange(result.job.schedule)
    ),
    el('div', { class: 'small muted', style: 'margin-top:8px;' },
      'Confirmed allocation learning may adjust the task preference factor, but it never overrides hard blocks or hides warnings.'
    ),
    el('div', { class: 'button-row', style: 'margin-top:10px;' },
      el('strong', {}, 'Task context:'),
      renderTagList(result.job.task_tags, 'none')
    ),
    result.job.crane_planning && (result.job.crane_planning.manual_review_required || result.job.crane_planning.transport_review_required)
      ? el('div', { class: 'alerts crane-planning-alerts' },
          el('strong', {}, 'Job readiness warning'),
          el('ul', {}, ...((result.job.crane_planning.messages || ['Review required']).map((message) => el('li', {}, message))))
        )
      : null,
    result.job.structured_requirement_warnings?.length
      ? el('div', { class: 'alerts crane-planning-alerts' },
          el('strong', {}, 'Requirement review'),
          el('ul', {}, ...result.job.structured_requirement_warnings.map((message) => el('li', {}, message)))
        )
      : null,
    result.job.asset_assignments?.length
      ? el('div', { class: 'small', style: 'margin-top:8px;' },
          el('strong', {}, 'Selected assets: '),
          result.job.asset_assignments.map((assignment) => assignment.asset.asset_number).join(', ')
        )
      : null,
    result.job.asset_assignment_warnings?.length
      ? el('div', { class: 'alerts crane-planning-alerts' },
          el('strong', {}, 'Asset review'),
          el('ul', {}, ...result.job.asset_assignment_warnings.map((message) => el('li', {}, message)))
        )
      : null,
    el('div', { class: 'small', style: 'margin-top:8px;' },
      el('strong', {}, 'Required credentials: '),
      labelsFromValues(result.job.required_credentials || [], null).join(', ') || 'none'
    ),
    el('div', { class: 'small', style: 'margin-top:8px;' },
      el('strong', {}, 'Role requirements: '),
      (result.job.role_requirements || [])
        .map((requirement) => `${formatDisplayLabel(requirement.role_label || requirement.role_key)} x${requirement.required_count || 1}${requirement.requires_distinct_worker ? ' (separate worker only)' : ''}`)
        .join(', ') || 'none'
    )
  ));

  const coveragePlan = renderRoleCoveragePlan(result.role_coverage_plan);
  if (coveragePlan) view.appendChild(coveragePlan);

  if (result.ranked.length === 0) {
    view.appendChild(el('div', { class: 'panel empty' }, 'No eligible workers for this job.'));
  } else {
    view.appendChild(el('h3', { style: 'margin-bottom:8px;' }, `Ranked workers (${result.ranked.length})`));
    for (const ranked of result.ranked) {
      view.appendChild(renderRankCard(jobId, ranked, ranked.rank === 1));
    }
  }

  if (result.blocked.length > 0) {
    view.appendChild(el('h3', { style: 'margin-top:24px; margin-bottom:8px;' }, `Blocked workers (${result.blocked.length})`));
    for (const blocked of result.blocked) {
      view.appendChild(renderBlockedCard(blocked));
    }
  }
}

function renderRankCard(jobId, ranked, isTop) {
  const hasWarnings = ranked.warnings && ranked.warnings.length > 0;
  const card = el('div', { class: `rank-card ${isTop ? 'top' : (hasWarnings ? 'warn' : '')}` });

  card.appendChild(el('div', { class: 'rank-head' },
    el('div', {},
      el('div', { class: 'rank-name' },
        `#${ranked.rank} ${ranked.worker.name}`,
        isTop ? el('span', { class: 'pill pill-ok', style: 'margin-left:8px;' }, 'top-ranked') : null
      ),
      el('div', { class: 'rank-meta' },
        `${labelsFromValues(ranked.worker.roles || [ranked.worker.role], null).join(', ')} / ${formatDisplayLabel(ranked.worker.employment_type)} / ${formatDisplayLabel(ranked.worker.status)}`
      )
    ),
    el('div', { class: 'rank-score' }, String(ranked.score))
  ));

  const breakdown = el('div', { class: 'breakdown' });
  for (const [factor, info] of Object.entries(ranked.score_breakdown || {})) {
    breakdown.appendChild(el('div', {},
      el('strong', {}, `${formatDisplayLabel(factor)}:`),
      ` ${info.score} x ${info.weight} = ${Number(info.weighted || 0).toFixed(1)}`
    ));
  }
  card.appendChild(breakdown);

  card.appendChild(el('div', { class: 'preference-section' },
    el('div', { class: 'small muted' }, 'Preference signals'),
    renderPreferenceSignals(ranked.preference_signals)
  ));

  card.appendChild(renderRoleCoverageSummary(ranked.role_coverage));

  card.appendChild(el('details', {},
    el('summary', {}, 'Factor details'),
    el('ul', {}, ...Object.entries(ranked.score_breakdown || {}).map(([key, info]) =>
      el('li', { class: 'small' }, `${formatDisplayLabel(key)}: ${info.detail}`)
    ))
  ));

  if (hasWarnings) {
    const list = el('ul');
    for (const warning of ranked.warnings) list.appendChild(el('li', {}, warning.detail || formatDisplayLabel(warning.type)));
    card.appendChild(el('div', { class: 'alerts' },
      el('strong', {}, 'Warnings: '),
      list
    ));
  }

  card.appendChild(el('div', { class: 'actions' },
    el('a', { href: `#/jobs/${jobId}/allocate/${ranked.worker.id}` },
      el('button', {}, isTop ? 'Allocate' : 'Allocate (override)')
    )
  ));

  return card;
}

function renderBlockedCard(blocked) {
  const card = el('div', { class: 'rank-card blocked' });
  card.appendChild(el('div', { class: 'rank-head' },
    el('div', {},
      el('div', { class: 'rank-name' },
        blocked.worker.name,
        el('span', { class: 'pill pill-bad', style: 'margin-left:8px;' }, 'blocked')
      ),
      el('div', { class: 'rank-meta' }, `${labelsFromValues(blocked.worker.roles || [blocked.worker.role], null).join(', ')} / ${formatDisplayLabel(blocked.worker.status)}`)
    )
  ));

  const list = el('ul');
  for (const reason of blocked.blocks || []) {
    list.appendChild(el('li', {}, `${formatDisplayLabel(reason.type)}: ${reason.detail || ''}`));
  }
  card.appendChild(el('div', { class: 'alerts' },
    el('strong', {}, 'Block reasons:'),
    list
  ));
  return card;
}

async function renderAllocate(jobId, workerId, renderCycle) {
  const view = document.getElementById('view');
  view.innerHTML = '';

  const result = await api('GET', `/jobs/${jobId}/smartrank`);
  if (isStaleRender(renderCycle)) return;

  const ranked = result.ranked.find((entry) => entry.worker.id === workerId);
  const blocked = result.blocked.find((entry) => entry.worker.id === workerId);

  view.appendChild(el('div', { class: 'toolbar' },
    el('h2', {}, 'Confirm allocation'),
    el('a', { href: `#/jobs/${jobId}/smartrank` }, el('button', { class: 'secondary' }, '< Back to SmartRank'))
  ));

  if (blocked) {
    const panel = el('div', { class: 'panel' });
    panel.appendChild(el('h3', {}, blocked.worker.name));
    panel.appendChild(el('div', { class: 'pill pill-bad' }, 'Hard-blocked - cannot allocate'));
    const list = el('ul');
    for (const reason of blocked.blocks) list.appendChild(el('li', {}, reason.detail || formatDisplayLabel(reason.type)));
    panel.appendChild(el('div', { class: 'alerts', style: 'margin-top:10px;' },
      el('strong', {}, 'Block reasons:'),
      list
    ));
    view.appendChild(panel);
    return;
  }

  if (!ranked) {
    view.appendChild(el('div', { class: 'panel' },
      el('p', {}, 'Worker is not currently in the ranked list. Re-run SmartRank.')
    ));
    return;
  }

  const isTop = ranked.rank === 1;
  const hasWarnings = ranked.warnings.length > 0;
  const requiresReason = !isTop || hasWarnings;

  const panel = el('div', { class: 'panel' });
  const form = el('form');
  const errBox = el('div', { class: 'error' });
  const successBox = el('div', { class: 'panel hidden' });
  panel.appendChild(el('h3', {}, `${ranked.worker.name} - rank #${ranked.rank}, score ${ranked.score}`));
  panel.appendChild(el('div', { class: 'small muted' }, `Scheduled window: ${formatScheduleRange(result.job.schedule)}`));
  if (!isTop) {
    panel.appendChild(el('div', { class: 'pill pill-warn' }, `Lower-ranked selection (top ranked worker is ${result.ranked[0]?.worker.name || 'n/a'})`));
  }
  if (hasWarnings) {
    const list = el('ul');
    for (const warning of ranked.warnings) list.appendChild(el('li', {}, warning.detail || warning.type));
    panel.appendChild(el('div', { class: 'alerts', style: 'margin-top:10px;' },
      el('strong', {}, 'Warnings: '),
      list
    ));
  }
  panel.appendChild(el('div', { class: 'preference-section' },
    el('div', { class: 'small muted' }, 'Preference signals that affected this ranking'),
    renderPreferenceSignals(ranked.preference_signals)
  ));
  const coverageRoles = ranked.role_coverage?.suggested_roles || [];
  panel.appendChild(el('div', { class: 'preference-section role-coverage-select' },
    el('div', { class: 'small muted' }, 'Role coverage to confirm for this worker'),
    coverageRoles.length
      ? el('div', { class: 'option-grid compact-grid' }, ...coverageRoles.map((role) =>
          el('label', { class: 'option-row' },
            el('input', { type: 'checkbox', name: 'role_coverage', value: role, checked: 'checked' }),
            el('span', {}, formatDisplayLabel(role))
          )
        ))
      : el('div', { class: 'empty' }, 'No selected required roles are covered by this worker.')
  ));
  panel.appendChild(el('div', { class: 'small muted', style: 'margin-top:10px;' },
    'Combined-role allocation is decision support only. Confirm job, site, client, company procedure, credentials, schedule, and fatigue context before confirming.'
  ));

  if (requiresReason) {
    form.appendChild(buildTextarea('override_reason', 'Override reason (required)', {
      required: true,
      placeholder: hasWarnings
        ? 'Explain why this allocation is acceptable despite warnings...'
        : 'Explain why a lower-ranked worker is being selected...'
    }));
  }
  form.appendChild(errBox);
  form.appendChild(el('div', { class: 'button-row' },
    el('button', { type: 'submit' }, 'Confirm allocation'),
    el('a', { href: `#/jobs/${jobId}/smartrank` }, el('button', { type: 'button', class: 'secondary' }, 'Cancel'))
  ));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errBox.textContent = '';
    const fd = new FormData(form);
    const body = { worker_id: workerId };
    body.role_coverage = selectedCheckboxValues(form, 'role_coverage');
    if (requiresReason) body.override_reason = fd.get('override_reason');
    try {
      const allocation = await api('POST', `/jobs/${jobId}/allocations`, body);
      toast('Allocation confirmed', 'success');
      successBox.classList.remove('hidden');
      successBox.innerHTML = '';
      successBox.appendChild(el('h3', {}, 'Allocation confirmed'));
      successBox.appendChild(el('div', { class: 'kv' },
        el('div', {}, 'Allocation ID'), el('div', { class: 'mono' }, allocation.id),
        el('div', {}, 'Worker'), el('div', {}, ranked.worker.name),
        el('div', {}, 'Role coverage'), el('div', {}, (allocation.role_coverages || []).map((coverage) => formatDisplayLabel(coverage.role_key)).join(' / ') || '-'),
        el('div', {}, 'SmartRank position'), el('div', {}, `#${allocation.smartrank_position} (score ${allocation.smartrank_score})`),
        el('div', {}, 'Allocated at'), el('div', {}, fmtDate(allocation.allocated_at))
      ));
      successBox.appendChild(el('details', { open: 'open' },
        el('summary', {}, 'Snapshot summary'),
        el('pre', { class: 'mono' }, JSON.stringify(allocation.smartrank_snapshot, null, 2))
      ));
      successBox.appendChild(el('div', { class: 'button-row', style: 'margin-top:12px;' },
        el('a', { href: `#/jobs/${jobId}` }, el('button', { type: 'button' }, 'View job'))
      ));
      form.querySelectorAll('button, input, textarea, select').forEach((node) => { node.disabled = true; });
    } catch (err) {
      errBox.innerHTML = '';
      errBox.appendChild(el('strong', {}, `Allocation rejected (HTTP ${err.status}): `));
      errBox.appendChild(document.createTextNode(err.error || 'Unknown error'));
      if (err.data?.blocks?.length) {
        const blockList = el('ul');
        for (const block of err.data.blocks) blockList.appendChild(el('li', {}, block.detail || block.type));
        errBox.appendChild(blockList);
      }
      if (err.data?.warnings?.length) {
        const warningList = el('ul');
        for (const warning of err.data.warnings) warningList.appendChild(el('li', {}, warning.detail || warning.type));
        errBox.appendChild(warningList);
      }
    }
  });

  panel.appendChild(form);
  panel.appendChild(successBox);
  view.appendChild(panel);
}

async function renderAudit(renderCycle) {
  const view = document.getElementById('view');
  view.innerHTML = '';

  const { query } = getHashState();
  const eventType = query.get('event_type') || '';

  view.appendChild(el('div', { class: 'toolbar' },
    el('h2', {}, 'Audit log'),
    el('div', {})
  ));
  view.appendChild(el('div', { class: 'read-only-banner' },
    'Read-only - audit events are append-only and cannot be modified.'
  ));

  const filter = el('div', { class: 'panel' });
  const select = el('select', { id: 'audit-filter' });
  for (const option of [
    '',
    'smartrank_generated',
    'allocation_confirmed',
    'allocation_rejected',
    'allocation_changed',
    'allocation_publish_previewed',
    'allocation_published_manual',
    'role_coverage_suggested',
    'role_coverage_confirmed',
    'role_coverage_review_required',
    'role_coverage_override_recorded',
    'warning_acknowledged',
    'non_top_ranked_selected',
    'job_created',
    'job_brief_import_previewed',
    'job_created_from_brief',
    'job_schedule_changed',
    'job_status_changed',
    'worker_removed',
    'worker_imported',
    'worker_import_completed',
    'preference_signal_created',
    'preference_signal_updated',
    'learned_preference_applied',
    'credential_block_applied',
    'fatigue_block_applied',
    'fatigue_warning_triggered',
    'availability_block_applied',
    'credential_expiry_alert'
  ]) {
    const opt = el('option', { value: option }, option ? formatDisplayLabel(option) : '- all -');
    if (option === eventType) opt.selected = true;
    select.appendChild(opt);
  }
  select.addEventListener('change', (event) => {
    const nextValue = event.target.value;
    if (nextValue) location.hash = `#/audit?event_type=${encodeURIComponent(nextValue)}`;
    else location.hash = '#/audit';
  });
  filter.appendChild(buildFieldWrapper('Filter by event type', select));
  view.appendChild(filter);

  const qs = eventType ? `?event_type=${encodeURIComponent(eventType)}&limit=100` : '?limit=100';
  const audit = await api('GET', `/audit-events${qs}`);
  if (isStaleRender(renderCycle)) return;

  view.appendChild(el('div', { class: 'panel' },
    el('div', { class: 'small muted' },
      eventType ? `${audit.events.length} filtered events shown` : `${audit.events.length} of ${audit.total} events shown`
    ),
    auditEventsTable(audit.events)
  ));
}

function auditEventReason(event) {
  const payload = event.payload || {};
  if (payload.override_reason) return payload.override_reason;
  if (payload.review_reason) return friendlyErrorMessage(payload.review_reason);
  if (payload.task_tag && payload.rating != null) return `${formatDisplayLabel(payload.task_tag)} -> ${payload.rating} star`;
  if (payload.reason) return friendlyErrorMessage(payload.reason);
  if (payload.from && payload.to) return `${formatDisplayLabel(payload.from)} -> ${formatDisplayLabel(payload.to)}`;
  if (payload.selected_rank) return `Selected rank #${payload.selected_rank}`;
  if (payload.notification_id) return `Notification ${shortId(payload.notification_id)}`;
  if (payload.import_id) return `Import ${shortId(payload.import_id)}`;
  if (payload.transport_type) return formatDisplayLabel(payload.transport_type);
  if (payload.client_name || payload.site_name) return [payload.client_name, payload.site_name].filter(Boolean).join(' / ');
  if (payload.email) return payload.email;
  if (payload.score != null) return `Score ${payload.score}`;
  return '-';
}

function auditEventSignals(event) {
  const payload = event.payload || {};
  const values = [];
  if (Array.isArray(payload.blocks) && payload.blocks.length) values.push(...payload.blocks.map((item) => item.detail || item.type));
  if (Array.isArray(payload.warnings) && payload.warnings.length) values.push(...payload.warnings.map((item) => item.detail || item.type));
  if (payload.warnings_count) values.push(`${payload.warnings_count} warning(s)`);
  if (Array.isArray(payload.block_types) && payload.block_types.length) values.push(...payload.block_types.map(formatDisplayLabel));
  if (payload.credential_count != null) values.push(`${payload.credential_count} credential(s)`);
  if (payload.preference_count != null) values.push(`${payload.preference_count} preference(s)`);
  if (payload.applied_count != null) values.push(`${payload.applied_count} learned signal(s)`);
  if (payload.approval_count != null) values.push(`${payload.approval_count} confirmed allocation(s)`);
  if (payload.confidence != null) values.push(`conf ${Number(payload.confidence).toFixed(2)}`);
  if (payload.warning_count != null) values.push(`${payload.warning_count} warning(s)`);
  if (payload.source_confidence) values.push(`source ${payload.source_confidence}`);
  if (payload.requires_counterweight_transport) values.push('counterweight transport');
  if (payload.transport_review_required) values.push('transport review');
  if (payload.nhvr_review_required) values.push('NHVR review');
  if (payload.permit_review_required) values.push('permit review');
  if (!values.length) return '-';
  return values.slice(0, 4).join(' | ');
}

function auditEventPill(eventType) {
  if (['allocation_rejected', 'credential_block_applied', 'fatigue_block_applied', 'availability_block_applied'].includes(eventType)) {
    return 'pill-bad';
  }
  if (['warning_acknowledged', 'fatigue_warning_triggered', 'non_top_ranked_selected', 'credential_expiry_alert', 'learned_preference_applied', 'worker_removed', 'job_schedule_changed', 'job_brief_import_previewed', 'allocation_publish_previewed', 'role_coverage_review_required', 'role_coverage_override_recorded'].includes(eventType)) {
    return 'pill-warn';
  }
  if (['job_counterweight_transport_assessed', 'transport_requirement_created'].includes(eventType)) {
    return 'pill-warn';
  }
  if (['allocation_confirmed', 'allocation_published_manual', 'role_coverage_confirmed', 'role_coverage_suggested', 'job_created', 'job_created_from_brief', 'worker_imported', 'preference_signal_created'].includes(eventType)) {
    return 'pill-ok';
  }
  return 'pill-info';
}

function auditEventStatus(event) {
  const eventType = event.event_type || '';
  const reason = auditEventReason(event);
  const signals = auditEventSignals(event);
  const detail = [reason, signals].filter((value) => value && value !== '-').join(' | ');

  if (eventType.includes('failed')) {
    return { label: 'Failed', className: 'pill-bad', detail };
  }
  if (eventType.includes('blocked') || ['allocation_rejected', 'credential_block_applied', 'fatigue_block_applied', 'availability_block_applied'].includes(eventType)) {
    return { label: 'Blocked', className: 'pill-bad', detail };
  }
  if (eventType.includes('review') || eventType.includes('warning') || ['warning_acknowledged', 'credential_expiry_alert', 'non_top_ranked_selected', 'allocation_publish_previewed', 'role_coverage_override_recorded'].includes(eventType)) {
    return { label: 'Review', className: 'pill-warn', detail };
  }
  if (eventType.includes('created') || eventType.includes('confirmed') || eventType.includes('published') || eventType.includes('completed') || eventType.includes('updated') || eventType.includes('imported') || eventType.includes('changed')) {
    return { label: 'Recorded', className: 'pill-ok', detail };
  }
  return { label: 'Logged', className: 'pill-info', detail };
}

function auditEventReference(event) {
  const refs = [];
  if (event.allocation_id) refs.push('Allocation');
  if (event.job_id) refs.push('Job');
  if (event.worker_id) refs.push('Worker');
  if (event.event_type?.startsWith('company_')) refs.push('Company setup');
  if (event.event_type?.includes('export')) refs.push('Export');
  return refs.length ? refs.join(' / ') : '-';
}

function auditEventTechnicalDetails(event) {
  const technicalRows = [
    ['Event ID', event.id],
    ['User ID', event.user_id],
    ['Worker ID', event.worker_id],
    ['Job ID', event.job_id],
    ['Allocation ID', event.allocation_id]
  ];

  return el('details', { class: 'technical-details' },
    el('summary', {}, 'Technical details'),
    el('div', { class: 'technical-detail-grid' },
      ...technicalRows.flatMap(([label, value]) => [
        el('div', { class: 'muted' }, label),
        el('div', { class: 'mono' }, value || '-')
      ])
    ),
    el('pre', { class: 'mono technical-payload' }, JSON.stringify(event.payload || {}, null, 2))
  );
}

function auditEventsTable(events, options = {}) {
  if (!events || events.length === 0) return el('div', { class: 'empty' }, 'No audit events.');

  const showTechnicalDetails = options.showTechnicalDetails ?? isInternalAdmin();
  const headers = [
    'Timestamp',
    'Event',
    'Status / Result',
    'Reference'
  ];
  if (showTechnicalDetails) headers.push('Technical');

  const table = el('table');
  table.appendChild(el('thead', {}, el('tr', {},
    ...headers.map((header) => el('th', {}, header))
  )));

  const body = el('tbody');
  for (const event of events) {
    const status = auditEventStatus(event);
    const rowCells = [
      el('td', { class: 'small' }, fmtDate(event.timestamp)),
      el('td', {}, el('span', { class: `pill ${auditEventPill(event.event_type)}` }, formatDisplayLabel(event.event_type))),
      el('td', { class: 'activity-status-cell' },
        el('span', { class: `pill ${status.className}` }, status.label),
        status.detail ? el('div', { class: 'small muted activity-detail' }, status.detail) : null
      ),
      el('td', { class: 'small' }, auditEventReference(event))
    ];

    if (showTechnicalDetails) {
      rowCells.push(el('td', {}, auditEventTechnicalDetails(event)));
    }

    body.appendChild(el('tr', {},
      ...rowCells
    ));
  }
  table.appendChild(body);
  return table;
}

function internalMonitorSummary(companies = []) {
  return {
    activePilots: companies.filter((company) => company.access_status === 'active').length,
    notActivated: companies.filter((company) => company.adoption_stage === 'not activated').length,
    activeThisWeek: companies.filter((company) => Number(company.active_days || 0) > 0).length,
    strongAdoption: companies.filter((company) => company.adoption_stage === 'strong adoption signal').length,
    needsFollowUp: companies.filter((company) =>
      ['not activated', 'activated but shallow'].includes(company.adoption_stage)
      || Number(company.days_remaining ?? 99) <= 3
      || company.access_status === 'expired'
    ).length
  };
}

function renderPilotActivityTable(companies = []) {
  if (!companies.length) {
    return el('div', { class: 'empty' }, 'No pilot companies match the current monitor filter.');
  }

  const table = el('table');
  table.appendChild(el('thead', {},
    el('tr', {},
      ['Company', 'Pilot type', 'Days left', 'Last login', 'Last activity', 'Active days', 'Workers', 'Jobs', 'SmartRank', 'Imports', 'Edits', 'Resets', 'Score', 'Stage', 'Follow-up']
        .map((heading) => el('th', {}, heading))
    )
  ));
  const tbody = el('tbody');
  for (const company of companies) {
    const imports = Number(company.worker_import_count || 0) + Number(company.job_brief_import_count || 0);
    tbody.appendChild(el('tr', {},
      el('td', {},
        el('strong', {}, company.company_name || 'Company'),
        el('div', { class: 'small muted' }, company.company_slug || company.company_id)
      ),
      el('td', {}, formatDisplayLabel(company.pilot_type)),
      el('td', {}, company.days_remaining == null ? '-' : String(company.days_remaining)),
      el('td', {}, fmtDate(company.last_login_at)),
      el('td', {},
        fmtDate(company.last_activity_at),
        el('div', { class: 'small muted' }, company.last_activity_type ? formatDisplayLabel(company.last_activity_type) : 'No activity')
      ),
      el('td', {}, String(company.active_days || 0)),
      el('td', {}, String(company.workers_count || 0)),
      el('td', {}, String(company.jobs_count || 0)),
      el('td', {}, String(company.smartrank_run_count || 0)),
      el('td', {}, String(imports)),
      el('td', {}, String(company.edit_count || 0)),
      el('td', {}, String(company.reset_count || 0)),
      el('td', {}, el('span', { class: 'pilot-score' }, `${company.engagement_score || 0}/100`)),
      el('td', {}, formatDisplayLabel(company.adoption_stage)),
      el('td', {}, company.follow_up || '-')
    ));
  }
  table.appendChild(tbody);
  return table;
}

function renderInternalSourceUploadsTable(data = {}) {
  const uploads = data.uploads || [];
  const statuses = data.review_statuses || {};
  const panel = el('div', { class: 'panel' },
    el('div', { class: 'toolbar' },
      el('div', {},
        el('h3', {}, 'Assisted source uploads'),
        el('p', { class: 'small muted' },
          'Internal review queue. Download is restricted to internal admin users. Updating status does not publish data into live records.'
        )
      )
    )
  );

  if (!uploads.length) {
    panel.appendChild(el('div', { class: 'empty' }, 'No pilot setup source documents are pending review.'));
    return panel;
  }

  const wrapper = el('div', { class: 'business-table-wrapper' });
  const table = el('table', { class: 'source-upload-admin-table' });
  table.appendChild(el('thead', {}, el('tr', {},
    el('th', {}, 'Tenant'),
    el('th', {}, 'Uploader'),
    el('th', {}, 'Document'),
    el('th', {}, 'Category'),
    el('th', {}, 'Status'),
    el('th', {}, 'Review notes'),
    el('th', {}, 'Actions')
  )));
  const tbody = el('tbody');

  for (const upload of uploads) {
    const statusSelect = el('select', { 'aria-label': `Review status for ${upload.original_filename}` });
    for (const [value, label] of Object.entries(statuses)) {
      if (value === 'deleted') continue;
      const option = el('option', { value }, label);
      if (value === upload.review_status) option.selected = true;
      statusSelect.appendChild(option);
    }
    const notes = el('textarea', {
      placeholder: 'Internal review notes',
      'aria-label': `Review notes for ${upload.original_filename}`
    });
    notes.value = upload.review_notes || '';

    const updateButton = el('button', { type: 'button', class: 'secondary' }, 'Update');
    updateButton.addEventListener('click', async () => {
      try {
        await api('PATCH', `/source-uploads/${encodeURIComponent(upload.id)}/status`, {
          review_status: statusSelect.value,
          review_notes: notes.value
        });
        toast('Source upload status updated', 'success');
        router();
      } catch (err) {
        toast(err.error || 'Could not update source upload status', 'error');
      }
    });

    const downloadButton = el('button', { type: 'button', class: 'secondary' }, 'Download');
    downloadButton.addEventListener('click', () => downloadSourceUpload(upload.id, upload.original_filename, downloadButton));

    tbody.appendChild(el('tr', {},
      el('td', {}, upload.tenant_id || upload.company_id || '-'),
      el('td', {},
        el('div', {}, upload.uploaded_by_email || '-'),
        el('div', { class: 'small muted' }, fmtDate(upload.created_at))
      ),
      el('td', {},
        el('div', {}, upload.original_filename || '-'),
        el('div', { class: 'small muted' }, `${humanFileSize(upload.file_size_bytes)} | ${upload.mime_type || '-'}`)
      ),
      el('td', {}, upload.category_label || formatDisplayLabel(upload.category)),
      el('td', {}, statusSelect),
      el('td', {}, notes),
      el('td', {}, el('div', { class: 'button-row' }, updateButton, downloadButton))
    ));
  }

  table.appendChild(tbody);
  wrapper.appendChild(table);
  panel.appendChild(wrapper);
  return panel;
}

async function renderInternalPilotMonitor(renderCycle) {
  const view = document.getElementById('view');
  view.innerHTML = '';
  view.appendChild(el('div', { class: 'toolbar' },
    el('h2', {}, 'Internal Pilot Monitor'),
    el('p', { class: 'muted' }, 'Founder-only usage signals. Aggregates activity without exposing job, worker, client, site, contact, or note details.')
  ));

  const [monitor, sourceUploadData] = await Promise.all([
    api('GET', '/internal/pilot-activity?status=all&days=14'),
    api('GET', '/source-uploads?scope=all')
  ]);
  if (isStaleRender(renderCycle)) return;

  const companies = monitor.companies || [];
  const summary = internalMonitorSummary(companies);
  view.appendChild(el('div', { class: 'panel internal-monitor-hero' },
    el('div', { class: 'small muted' }, `Generated ${fmtDate(monitor.generated_at)} | ${monitor.window_days} day window`),
    el('div', { class: 'metrics-grid', style: 'margin-top:14px;' },
      metricTile('Active pilots', summary.activePilots),
      metricTile('Not activated', summary.notActivated),
      metricTile('Active this week', summary.activeThisWeek),
      metricTile('Strong adoption signals', summary.strongAdoption),
      metricTile('Needs follow-up', summary.needsFollowUp)
    )
  ));

  view.appendChild(el('div', { class: 'panel' },
    el('h3', {}, 'Pilot activity'),
    el('p', { class: 'small muted' },
      'This table intentionally shows counts, dates, event categories, engagement stage, and follow-up prompts only. It does not expose operational payloads or customer job content.'
    ),
    el('div', { class: 'business-table-wrapper' }, renderPilotActivityTable(companies))
  ));

  view.appendChild(renderInternalSourceUploadsTable(sourceUploadData));

  view.appendChild(el('div', { class: 'panel small muted' },
    el('strong', {}, 'Privacy boundary: '),
    'worker names, emails, phone numbers, job descriptions, client names, site addresses, contact details, uploaded brief text, private notes, and raw audit payloads are deliberately excluded.'
  ));
}

function renderExportCard(card) {
  const button = el('button', {
    type: 'button',
    onclick: (event) => downloadExportCsv(card.type, event.currentTarget)
  }, card.button);

  return el('article', { class: 'export-card' },
    el('h4', {}, card.title),
    el('p', { class: 'small' }, card.includes),
    el('p', { class: 'small muted' }, card.excludes),
    button
  );
}

async function renderExports(renderCycle) {
  const view = document.getElementById('view');
  view.innerHTML = '';

  const profile = await loadCompanyProfile();
  if (isStaleRender(renderCycle)) return;

  view.appendChild(el('div', { class: 'toolbar' },
    el('h2', {}, 'Reports & Exports'),
    el('p', { class: 'muted' }, 'CSV handoff for office review, spreadsheet workflows, and later accounting-system mapping.')
  ));

  const form = el('form', { id: 'export-filter-form', class: 'panel export-filter-panel' },
    el('h3', {}, 'Export filters'),
    el('div', { class: 'form-grid' },
      buildInput('start_date', 'Start date', { type: 'date' }),
      buildInput('end_date', 'End date', { type: 'date' }),
      buildSelect('timezone', 'Timezone', COMMON_TIMEZONES, { value: profile?.timezone || 'Australia/Brisbane' })
    ),
    buildFieldWrapper('Include archived workers/jobs', el('input', { type: 'checkbox', name: 'include_archived' })),
    el('p', { class: 'small muted' },
      'Date filters apply to each export where a matching operational date exists. Downloaded CSV files remain tenant-scoped to this company.'
    )
  );
  view.appendChild(form);

  view.appendChild(el('div', { class: 'panel warning-panel' },
    el('strong', {}, 'Accounting boundary: '),
    'Exports are prepared for office review. DispatchTalon does not calculate payroll, tax, super, award rates, or invoice totals. ',
    'Direct Xero/MYOB integration is future roadmap work after the export schema is proven.'
  ));

  for (const section of EXPORT_SECTIONS) {
    view.appendChild(el('section', { class: 'panel export-section' },
      el('h3', {}, section.title),
      el('div', { class: 'export-grid' }, ...section.cards.map(renderExportCard))
    ));
  }
}

async function renderMetrics(renderCycle) {
  const view = document.getElementById('view');
  view.innerHTML = '';

  view.appendChild(el('div', { class: 'toolbar' },
    el('h2', {}, 'Pilot metrics'),
    el('button', { class: 'secondary', onclick: () => window.print() }, 'Print / save as PDF')
  ));

  const metrics = await api('GET', '/metrics');
  if (isStaleRender(renderCycle)) return;
  const metricsEmpty = [
    'total_jobs',
    'total_allocations',
    'workers_imported',
    'top_ranked_selections',
    'lower_ranked_selections',
    'credential_blocks',
    'fatigue_blocks',
    'fatigue_warnings',
    'availability_blocks',
    'warning_overrides',
    'allocation_rejections',
    'preference_signals_created',
    'preference_signals_updated',
    'learned_preference_applications',
    'total_audit_events'
  ].every((key) => Number(metrics[key] || 0) === 0);

  view.appendChild(el('div', { class: 'panel' },
    el('div', { class: 'small muted' }, `Period: ${metrics.period?.label || `${metrics.period?.from || ''} to ${metrics.period?.to || ''}`}`),
    el('div', { class: 'metrics-grid', style: 'margin-top:14px;' },
      metricTile('Total jobs', metrics.total_jobs),
      metricTile('Total allocations', metrics.total_allocations),
      metricTile('Workers imported', metrics.workers_imported),
      metricTile('Top-ranked selections', metrics.top_ranked_selections),
      metricTile('Lower-ranked selections', metrics.lower_ranked_selections),
      metricTile('Credential blocks', metrics.credential_blocks),
      metricTile('Fatigue blocks', metrics.fatigue_blocks),
      metricTile('Fatigue warnings', metrics.fatigue_warnings),
      metricTile('Availability blocks', metrics.availability_blocks),
      metricTile('Warning overrides', metrics.warning_overrides),
      metricTile('Allocation rejections', metrics.allocation_rejections),
      metricTile('Preference signals created', metrics.preference_signals_created),
      metricTile('Preference signals updated', metrics.preference_signals_updated),
      metricTile('Learned preference applications', metrics.learned_preference_applications),
      metricTile('Total audit events', metrics.total_audit_events)
    )
  ));

  if (metricsEmpty) {
    view.appendChild(el('div', { class: 'panel empty' },
      'Metrics will appear after workers, jobs, allocations, and audit events are created.'
    ));
  }

  view.appendChild(el('div', { class: 'panel small muted' },
    'These metrics are derived from append-only audit events. ',
    'This is adaptive preference learning, not autonomous AI. ',
    'Dispatcher-confirmed decisions remain the final control point.'
  ));
}

function buildInput(name, label, attrs = {}) {
  return buildFieldWrapper(label, el('input', { name, type: attrs.type || 'text', ...attrs }));
}

function buildTextarea(name, label, attrs = {}) {
  const area = el('textarea', { name, ...attrs });
  if (attrs.value) area.value = attrs.value;
  return buildFieldWrapper(label, area);
}

function buildSelect(name, label, options, attrs = {}) {
  const { labelFormatter, ...selectAttrs } = attrs;
  const select = el('select', { name, ...selectAttrs });
  for (const option of options) {
    const value = String(optionValue(option));
    const labelText = typeof labelFormatter === 'function'
      ? labelFormatter(value, option)
      : optionLabel(option);
    const node = el('option', { value }, labelText);
    if (attrs.value != null && String(attrs.value) === value) node.selected = true;
    select.appendChild(node);
  }
  return buildFieldWrapper(label, select);
}

function buildGroupedSelect(name, label, groups, attrs = {}) {
  const select = el('select', { name, ...attrs });
  const hasValue = attrs.value != null && String(attrs.value) !== '';
  const placeholder = el('option', { value: '' }, attrs.placeholder || 'Select');
  placeholder.selected = !hasValue;
  placeholder.disabled = Boolean(attrs.required);
  select.appendChild(placeholder);
  for (const group of groups || []) {
    const optGroup = el('optgroup', { label: group.group || 'Options' });
    for (const option of group.options || []) {
      const value = String(optionValue(option));
      const node = el('option', { value }, optionLabel(option));
      if (attrs.value != null && String(attrs.value) === value) node.selected = true;
      optGroup.appendChild(node);
    }
    select.appendChild(optGroup);
  }
  return buildFieldWrapper(label, select);
}

function buildFieldWrapper(label, control) {
  return el('label', {}, el('span', {}, label), control);
}

function buildTextareaField(label, control) {
  return buildFieldWrapper(label, control);
}

function buildFileField(label, control) {
  return buildFieldWrapper(label, control);
}
