'use strict';

const state = {
  token: null,
  user: null,
  renderCycle: 0,
};

const TOKEN_KEY = 'liftiq.token';
const USER_KEY = 'liftiq.user';

const ROLE_OPTIONS = ['crane_operator', 'dogman', 'rigger', 'traffic_controller', 'supervisor', 'allocator'];
const EMPLOYMENT_OPTIONS = ['permanent', 'casual', 'contractor', 'labour_hire'];
const STATUS_OPTIONS = ['available', 'allocated', 'unavailable', 'on_leave', 'inactive'];
const SHIFT_OPTIONS = ['day', 'night', 'split'];
const RISK_OPTIONS = ['routine', 'complex', 'critical'];
const COMMON_TIMEZONES = [
  'Australia/Brisbane',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Perth',
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
      state.user = state.user ? { ...state.user, must_change_password: true } : { must_change_password: true };
      localStorage.setItem(USER_KEY, JSON.stringify(state.user));
      showPasswordChange();
    }
    if (res.status === 403 && data?.company_access_status) {
      state.user = state.user ? { ...state.user, company: data.company } : state.user;
      if (state.user) localStorage.setItem(USER_KEY, JSON.stringify(state.user));
      showAccessBlocked(data.company, data.message || data.error);
    }
    throw { status: res.status, error: (data && data.error) || `HTTP ${res.status}`, data };
  }
  return data;
}

let craneModelsCache = null;
const craneTravelStateCache = new Map();
let companyProfileCache = null;
let companyCatalogueCache = null;
let companyAssetsCache = null;

const LABOUR_ONLY_CATALOGUE_CATEGORIES = new Set(['credential', 'voc', 'civil', 'rail', 'energy']);

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
    state.user = { ...state.user, company: companyProfileCache };
    localStorage.setItem(USER_KEY, JSON.stringify(state.user));
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
  addKv('Source confidence', planning.source_confidence || '-');
  addKv('Review reason', planning.review_reason || '-');
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
            el('div', { class: 'rank-meta' }, item.vehicle_type || 'unknown_manual_review')
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
    state.user = JSON.parse(user);
  } catch {
    state.user = null;
  }
}

function saveSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function companyAccessStatus() {
  return state.user?.company?.effective_access_status || 'active';
}

function isCompanyAccessBlocked() {
  const status = companyAccessStatus();
  return status === 'expired' || status === 'suspended';
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
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  showLogin();
}

function showLogin(message = '') {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('password-change-screen').classList.add('hidden');
  document.getElementById('app-shell').classList.add('hidden');
  document.getElementById('login-error').textContent = '';
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
    ? `Signed in as ${state.user.email}. Replace the bootstrap password before opening the pilot console.`
    : 'Your temporary bootstrap password must be replaced before console access.';
}

function showAccessBlocked(company = state.user?.company, message = '') {
  nextRenderCycle();
  const status = company?.effective_access_status || company?.access_status || 'expired';
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('password-change-screen').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  document.getElementById('user-label').textContent = formatCompanyLabel();
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
  if (state.user?.must_change_password) {
    showPasswordChange();
    return;
  }
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('password-change-screen').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  document.getElementById('user-label').textContent = formatCompanyLabel();
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
      if (result.must_change_password || result.user?.must_change_password) {
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

  if (state.token && state.user?.must_change_password) showPasswordChange();
  else if (state.token) showApp();
  else showLogin();
});

function router() {
  if (!state.token) {
    showLogin();
    return;
  }
  if (state.user?.must_change_password) {
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
    schedule: () => renderSchedule(renderCycle),
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
    'new-job': () => renderNewJob(renderCycle),
    'new-worker': renderNewWorker,
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
  return el('span', { class: `pill ${map[status] || 'pill-muted'}` }, status);
}

function riskPill(risk) {
  const map = { routine: 'pill-muted', complex: 'pill-warn', critical: 'pill-bad' };
  return el('span', { class: `pill ${map[risk] || 'pill-muted'}` }, risk);
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
  return el('span', { class: `pill ${map[status] || 'pill-muted'}` }, status);
}

function scheduleStatusPill(status) {
  const map = {
    draft: 'pill-muted',
    planned: 'pill-info',
    confirmed: 'pill-ok',
    completed: 'pill-muted',
    cancelled: 'pill-bad'
  };
  return el('span', { class: `pill ${map[status] || 'pill-muted'}` }, status);
}

function confidencePill(level = 'low') {
  const normalized = String(level || 'low').toLowerCase();
  const className = normalized === 'high'
    ? 'pill-ok'
    : (normalized === 'medium' ? 'pill-warn' : 'pill-bad');
  return el('span', { class: `pill ${className}` }, normalized);
}

function credPill(status) {
  const map = {
    valid: 'pill-ok',
    expiring_soon: 'pill-warn',
    expired: 'pill-bad',
    pending_verification: 'pill-info',
  };
  return el('span', { class: `pill ${map[status] || 'pill-muted'}` }, status);
}

function renderTagList(tags, emptyLabel = '-') {
  if (!tags || tags.length === 0) return el('span', { class: 'muted' }, emptyLabel);
  return el('ul', { class: 'tag-list' }, ...(tags || []).map((tag) => el('li', {}, String(tag))));
}

function flattenCatalogueGroups(grouped = {}) {
  const groups = [];
  for (const [category, categoryGroups] of Object.entries(grouped || {})) {
    for (const [groupLabel, items] of Object.entries(categoryGroups || {})) {
      groups.push({ category, groupLabel, items });
    }
  }
  return groups;
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
        el('span', {}, item.label),
        item.recommended_default ? el('span', { class: 'pill pill-info' }, 'default') : null
      ));
    }

    root.appendChild(card);
  }

  if (groups.length === 0) {
    root.appendChild(el('div', { class: 'empty' }, 'No requirement catalogue items available.'));
  }

  return root;
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
      el('span', { class: `pill ${asset.asset_status === 'active' ? 'pill-ok' : 'pill-warn'}` }, asset.asset_status || 'active'),
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
      signal.task_tag,
      `${stars(signal.rating)} (${signal.rating})`,
      signal.source
    ];
    if (signal.source === 'learned') {
      parts.push(`${signal.approval_count || 0} confirmed`);
      parts.push(`conf ${Number(signal.confidence || 0).toFixed(2)}`);
    }
    return el('span', { class: `signal-chip ${signal.source}` }, parts.join(' · '));
  }));
}

async function renderDashboard(renderCycle) {
  const view = document.getElementById('view');
  view.innerHTML = '';

  const metrics = await api('GET', '/metrics');
  if (isStaleRender(renderCycle)) return;

  view.appendChild(el('div', { class: 'toolbar' },
    el('h2', {}, 'Pilot dashboard'),
    el('div', { class: 'button-row' },
      el('a', { href: '#/workers/import' }, el('button', {}, 'Import workers')),
      el('a', { href: '#/new-worker' }, el('button', { class: 'secondary' }, '+ New worker')),
      el('a', { href: '#/new-job' }, el('button', { class: 'secondary' }, '+ New job'))
    )
  ));

  view.appendChild(buildSecurityPanel());

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
      label: 'Labour only',
      description: 'Use LIFTIQ for people, credentials, VOCs, scheduling, SmartRank, and audit. Hide plant and crane planning by default.'
    },
    {
      value: 'plant_and_labour',
      label: 'Plant + labour',
      description: 'Use LIFTIQ for workers, equipment, plant assets, crane planning, transport review, scheduling, SmartRank, and audit.'
    }
  ];
  form.appendChild(el('div', { class: 'mode-options' }, ...options.map((option) => {
    const input = el('input', { type: 'radio', name: 'operating_mode', value: option.value });
    input.checked = option.value === currentMode;
    return el('label', { class: 'mode-card' },
      input,
      el('span', {},
        el('strong', {}, option.label),
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

async function renderOurBusiness(renderCycle) {
  const view = document.getElementById('view');
  view.innerHTML = '';
  const [profile, catalogue, assetsPayload] = await Promise.all([
    loadCompanyProfile(true),
    loadCompanyCatalogue(true),
    loadCompanyAssets(true)
  ]);
  if (isStaleRender(renderCycle)) return;
  const mode = operatingMode(profile);
  const visibleCatalogue = filterCatalogueForOperatingMode(catalogue, mode);

  const form = el('form', { class: 'panel' });
  const errBox = el('div', { class: 'error' });
  const success = el('div', { class: 'status-note hidden' });

  form.appendChild(el('div', { class: 'toolbar' },
    el('div', {},
      el('h2', {}, 'Our Business'),
      el('div', { class: 'small muted' },
        mode === 'labour_only'
          ? 'Choose the credentials, VOCs, civil/access, rail, and energy requirements your labour allocation workflow uses.'
          : 'Choose the credentials, equipment, transport, civil/access, rail, energy, and VOC requirements your company actually uses.'
      )
    ),
    el('span', { class: 'pill pill-info' }, `${visibleCatalogue.enabled_count || 0} visible enabled`)
  ));
  view.appendChild(renderOperatingModePanel(profile));

  if (!catalogue.configured) {
    form.appendChild(el('div', { class: 'read-only-banner' },
      mode === 'labour_only'
        ? 'Labour-only defaults are shown because this company has not saved a catalogue profile yet. Plant/equipment defaults are hidden.'
        : 'Recommended defaults are shown because this company has not saved a catalogue profile yet. Save selections here to reduce the job form to relevant options.'
    ));
  }

  const search = el('input', {
    type: 'search',
    placeholder: 'Filter catalogue items...',
    'aria-label': 'Filter catalogue items'
  });
  const checklist = renderRequirementChecklist(visibleCatalogue);
  search.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    checklist.querySelectorAll('.check-row').forEach((row) => {
      const text = row.textContent.toLowerCase();
      row.classList.toggle('hidden', query && !text.includes(query));
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
      success.textContent = `Company setup saved. ${visibleCatalogue.items.length} visible item(s) reviewed.`;
      success.classList.remove('hidden');
      toast('Company setup saved', 'success');
    } catch (err) {
      errBox.textContent = err.error || 'Could not save company setup';
    }
  });

  view.appendChild(form);
  if (mode === 'plant_and_labour') {
    view.appendChild(renderAssetRegister(catalogue, assetsPayload));
  } else {
    view.appendChild(el('div', { class: 'panel' },
      el('h3', {}, 'Plant and asset register hidden'),
      el('p', { class: 'small muted' },
        'This company is configured as labour-only. Switch to Plant + labour above to manage equipment classes, transport items, and actual plant assets.'
      )
    ));
  }
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
        'Register actual machines by asset number / plant number under enabled equipment and transport classes. This is not fleet maintenance or availability automation.'
      )
    ),
    el('span', { class: 'pill pill-info' }, `${assets.length} active asset(s)`)
  ));

  if (registerItems.size === 0) {
    panel.appendChild(el('div', { class: 'empty' },
      'Enable an equipment or transport item above, then add plant numbers for actual machines.'
    ));
    return panel;
  }

  for (const item of Array.from(registerItems.values()).sort((a, b) => String(a.label).localeCompare(String(b.label)))) {
    const group = el('details', { class: 'asset-group', open: item.is_enabled ? 'true' : null });
    const existingAssets = assetsByItem.get(String(item.id)) || [];
    group.appendChild(el('summary', {},
      el('strong', {}, item.label),
      el('span', { class: 'small muted' }, ` ${item.group_label || item.category}`),
      !item.is_enabled ? el('span', { class: 'pill pill-warn', style: 'margin-left:8px;' }, 'class not enabled') : null
    ));

    if (!item.is_enabled) {
      group.appendChild(el('div', { class: 'alerts crane-form-alerts' },
        "This asset's catalogue class is not currently enabled in Our Business."
      ));
    }

    if (existingAssets.length === 0) {
      group.appendChild(el('div', { class: 'small muted' }, `No specific assets registered for ${item.label}.`));
    } else {
      group.appendChild(el('div', { class: 'asset-list' }, ...existingAssets.map((asset) =>
        el('div', { class: 'asset-row' },
          el('div', {},
            el('strong', {}, asset.asset_number),
            el('div', { class: 'small muted' }, asset.display_name || asset.catalogue_item?.label || item.label)
          ),
          el('span', { class: `pill ${asset.asset_status === 'active' ? 'pill-ok' : 'pill-warn'}` }, asset.asset_status),
          el('span', { class: 'small muted' }, asset.home_location || '-'),
          el('button', {
            type: 'button',
            class: 'secondary',
            onclick: async () => {
              try {
                await api('POST', `/company/assets/${asset.id}/archive`);
                companyAssetsCache = null;
                toast('Asset archived', 'success');
                router();
              } catch (err) {
                toast(err.error || 'Could not archive asset', 'error');
              }
            }
          }, 'Archive')
        )
      )));
    }

    const addForm = el('form', { class: 'asset-add-form' });
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
      el('button', { type: 'submit' }, 'Add asset')
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
        toast('Asset added', 'success');
        router();
      } catch (err) {
        errBox.textContent = err.error || 'Could not add asset';
      }
    });
    group.appendChild(addForm);
    panel.appendChild(group);
  }

  return panel;
}

function renderJobAssetSelector(catalogue = {}, assetsPayload = {}) {
  const panel = el('div', { class: 'asset-selector-panel' });
  const assetsByItem = assetsGroupedByCatalogueItem(assetsPayload.assets || []);
  const itemsById = new Map((catalogue.items || []).map((item) => [String(item.id), item]));

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
          `No specific assets registered for ${item.label}. The job will use the requirement only.`
        ));
        continue;
      }

      const select = el('select', { name: 'company_asset_ids' });
      select.appendChild(el('option', { value: '' }, `Any available ${item.label}`));
      for (const asset of assets) {
        select.appendChild(el('option', { value: String(asset.id) },
          `${asset.asset_number} - ${asset.display_name || item.label} (${asset.asset_status})`
        ));
      }
      panel.appendChild(buildFieldWrapper(`Select asset / plant number for ${item.label}`, select));
    }
  };

  panel.refresh = refresh;
  return panel;
}

function buildSecurityPanel() {
  const panel = el('div', { class: 'panel security-panel' });
  const copy = el('div', { class: 'security-copy' },
    el('h3', {}, 'Pilot security'),
    el('p', {},
      'The default seeded admin credentials are compromised. Rotate the pilot admin password before real partner data or external pilot use.'
    ),
    el('p', { class: 'small muted' },
      state.user?.email === 'admin@example.com'
        ? 'You are signed in with the seeded admin account. Rotate it now.'
        : 'If this environment still uses the default seeded admin password, rotate it now.'
    )
  );

  const actions = el('div', { class: 'security-actions' });
  if (state.user?.role !== 'admin') {
    actions.appendChild(el('h3', {}, 'Admin action required'));
    actions.appendChild(el('p', { class: 'small muted' },
      'Only an authenticated admin can rotate the pilot password from the console.'
    ));
  } else {
    const form = el('form');
    const errBox = el('div', { class: 'error' });
    const submit = el('button', { type: 'submit' }, 'Change password');
    form.appendChild(el('h3', {}, 'Change current admin password'));
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
    form.appendChild(el('div', { class: 'button-row' }, submit));
    form.appendChild(el('div', { class: 'status-note' },
      'A successful password change signs you out so the next login proves the new password works.'
    ));

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      await submitPasswordChange(form, submit, { errorNode: errBox, successNode: null });
    });

    actions.appendChild(form);
  }

  panel.appendChild(el('div', { class: 'security-grid' }, copy, actions));
  return panel;
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
              ? assigned.map((item) => `${item.worker_name} (${item.allocation_status || item.status})`).join(', ')
              : 'Unallocated'
          ),
          el('div', { class: 'small', style: 'margin-top:6px;' },
            el('strong', {}, 'Task tags: '),
            (job.task_tags || []).join(', ') || 'none'
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
    view.appendChild(el('div', { class: 'panel empty' }, 'No workers yet. Import the pilot sample or add your first worker manually.'));
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
      el('td', {}, worker.role),
      el('td', {}, worker.employment_type),
      el('td', {}, (worker.crane_classes || []).join(', ') || '-'),
      el('td', {}, statusPill(worker.status)),
      el('td', {}, worker.usual_depot || '-')
    ));
  }
  table.appendChild(body);
  view.appendChild(el('div', { class: 'panel' }, table));
}

function renderNewWorker() {
  const view = document.getElementById('view');
  view.innerHTML = '';

  const form = el('form', { class: 'panel' });
  const errBox = el('div', { class: 'error' });
  form.appendChild(el('h2', {}, 'Create worker'));
  form.appendChild(el('div', { class: 'row' },
    buildInput('name', 'Name', { required: true }),
    buildInput('email', 'Email', { type: 'email' }),
    buildSelect('role', 'Role', ROLE_OPTIONS, { required: true }),
    buildSelect('employment_type', 'Employment type', EMPLOYMENT_OPTIONS, { required: true }),
    buildSelect('status', 'Availability status', STATUS_OPTIONS),
    buildInput('crane_classes', 'Crane classes (comma-separated)', { placeholder: 'Franna, Mobile Crane' }),
    buildInput('usual_depot', 'Base location / depot'),
    buildInput('contact_number', 'Phone')
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
      role: fd.get('role'),
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
      el('a', { href: '/samples/employee-import-sample.tsv', target: '_blank' }, el('button', { type: 'button', class: 'secondary' }, 'Open sample TSV'))
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

  const [worker, credentials, fatigue, preferences] = await Promise.all([
    api('GET', `/workers/${workerId}`),
    api('GET', `/workers/${workerId}/credentials`),
    api('GET', `/workers/${workerId}/fatigue-records`),
    api('GET', `/workers/${workerId}/preferences`)
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
    buildSelect('role', 'Role', ROLE_OPTIONS, { value: worker.role || 'crane_operator' }),
    buildSelect('employment_type', 'Employment type', EMPLOYMENT_OPTIONS, { value: worker.employment_type || 'permanent' }),
    buildInput('contact_number', 'Phone', { value: worker.contact_number || '' }),
    buildInput('usual_depot', 'Base location / depot', { value: worker.usual_depot || '' }),
    buildInput('crane_classes', 'Crane classes (comma-separated)', { value: (worker.crane_classes || []).join(', ') }),
    buildInput('availability_note', 'Availability note', { value: worker.availability_note || '' })
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
      try {
        await api('PATCH', `/workers/${workerId}`, {
          name: fd.get('name'),
          email: fd.get('email') || null,
          status: fd.get('status'),
          role: fd.get('role'),
          employment_type: fd.get('employment_type'),
          contact_number: fd.get('contact_number') || null,
          crane_classes: splitCsv(fd.get('crane_classes')),
          usual_depot: fd.get('usual_depot') || null,
          availability_note: fd.get('availability_note') || null,
          notes: fd.get('notes') || null
        });
        toast('Worker updated', 'success');
        router();
      } catch (err) {
        editErr.textContent = err.error;
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
      'This will remove the worker from active dispatch and SmartRank recommendations. Existing audit history will be kept.'
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
        'Remove worker from active dispatch?\n\nThis will remove the worker from active dispatch and SmartRank recommendations. Existing audit history will be kept.'
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
            prefForm.elements.task_tag.value = preference.task_tag;
            prefForm.elements.rating.value = String(preference.rating);
            prefForm.elements.notes.value = preference.notes || '';
            prefMode.textContent = 'Edit manual task preference';
          }
        }, 'Edit'));
      } else {
        actionCell.appendChild(el('span', { class: 'small muted' }, 'Read-only'));
      }

      body.appendChild(el('tr', {},
        el('td', {}, preference.task_tag),
        el('td', {}, `${stars(preference.rating)} (${preference.rating})`),
        el('td', {}, el('span', { class: `pill ${preference.source === 'manual' ? 'pill-ok' : (preference.source === 'imported' ? 'pill-info' : 'pill-warn')}` }, preference.source)),
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
    buildInput('task_tag', 'Task tag', { required: true, placeholder: 'tower_crane, shutdown, night_shift' }),
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
    const table = el('table');
    table.appendChild(el('thead', {}, el('tr', {},
      el('th', {}, 'Type'),
      el('th', {}, 'Identifier'),
      el('th', {}, 'Issued'),
      el('th', {}, 'Expires'),
      el('th', {}, 'Status'),
      el('th', {}, 'Verified')
    )));
    const body = el('tbody');
    for (const credential of credentials) {
      body.appendChild(el('tr', {},
        el('td', {}, credential.type),
        el('td', {}, credential.identifier || '-'),
        el('td', {}, fmtDateOnly(credential.issue_date)),
        el('td', {}, fmtDateOnly(credential.expiry_date)),
        el('td', {}, credPill(credential.status)),
        el('td', {}, credential.verified ? 'Yes' : 'No')
      ));
    }
    table.appendChild(body);
    credPanel.appendChild(table);
  }
  if (workerArchived) {
    credPanel.appendChild(el('div', { class: 'small muted' },
      'Archived workers keep existing credential history, but new credential entries are disabled in the active pilot workflow.'
    ));
  } else {
    credPanel.appendChild(buildCredentialForm(workerId));
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
        el('td', {}, record.shift_type),
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

function buildCredentialForm(workerId) {
  const form = el('form', { style: 'margin-top:16px;' });
  const errBox = el('div', { class: 'error' });
  form.appendChild(el('h3', {}, 'Add credential'));
  form.appendChild(el('div', { class: 'row' },
    buildSelect('type', 'Type', CREDENTIAL_OPTIONS, { required: true }),
    buildInput('identifier', 'Identifier'),
    buildInput('issuing_body', 'Issuing body'),
    buildInput('issue_date', 'Issue date', { type: 'date' }),
    buildInput('expiry_date', 'Expiry date', { type: 'date' }),
    buildSelect('verified', 'Verified', ['false', 'true'])
  ));
  form.appendChild(errBox);
  form.appendChild(el('button', { type: 'submit' }, 'Add credential'));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errBox.textContent = '';
    const fd = new FormData(form);
    try {
      await api('POST', `/workers/${workerId}/credentials`, {
        type: fd.get('type'),
        identifier: fd.get('identifier') || null,
        issuing_body: fd.get('issuing_body') || null,
        issue_date: fd.get('issue_date') || null,
        expiry_date: fd.get('expiry_date') || null,
        verified: fd.get('verified') === 'true'
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
    'Review before creating. LIFTIQ does not verify job details automatically.'
  ));
  sourceForm.appendChild(buildTextareaField('Job brief text', textArea));
  sourceForm.appendChild(buildFileField('Upload .txt or .md', fileInput));
  sourceForm.appendChild(el('div', { class: 'status-note' },
    'TXT and Markdown are supported in this pilot. DOCX is not supported yet.'
  ));
  sourceForm.appendChild(sourceError);
  sourceForm.appendChild(el('div', { class: 'button-row' },
    el('button', { type: 'submit' }, 'Import job brief'),
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
      'Review before creating. LIFTIQ does not verify job details automatically.'
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
    const rolesField = buildInput('required_roles', 'Required roles (comma-separated)', { value: joinListValue(extracted.required_roles) });
    appendConfidenceNote(rolesField, confidence, 'required_roles');
    const credentialsField = buildInput('required_credentials', 'Required credentials (comma-separated)', { value: joinListValue(extracted.required_credentials) });
    appendConfidenceNote(credentialsField, confidence, 'required_credentials');
    const tagsField = buildInput('task_tags', 'Task tags (comma-separated)', { value: joinListValue(extracted.task_tags) });
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
    view.appendChild(el('div', { class: 'panel empty' }, 'No jobs yet. Create your first job to get started.'));
    return;
  }

  const table = el('table');
  table.appendChild(el('thead', {}, el('tr', {},
    el('th', {}, 'Schedule'),
    el('th', {}, 'Client'),
    el('th', {}, 'Site'),
    el('th', {}, 'Task tags'),
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
        el('div', { class: 'small muted' }, `Schedule: ${job.schedule?.status || job.schedule_status}`)
      ),
      el('td', {}, job.client_name),
      el('td', {}, el('a', { href: `#/jobs/${job.id}` }, job.site_name)),
      el('td', {}, (job.task_tags || []).join(', ') || '-'),
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

  const [companyProfile, craneModels, companyCatalogue, companyAssets] = await Promise.all([
    loadCompanyProfile(),
    loadCraneModels(),
    loadCompanyCatalogue(),
    loadCompanyAssets()
  ]);
  if (isStaleRender(renderCycle)) return;
  const mode = operatingMode(companyProfile);

  const detectedTimeZone = detectBrowserTimeZone() || 'Australia/Brisbane';
  const today = isoDateInTimeZone(new Date(), detectedTimeZone);
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
    buildInput('client_name', 'Client name', { required: true }),
    buildInput('site_name', 'Site name', { required: true }),
    buildInput('site_location', 'Site location'),
    buildInput('date', 'Scheduled date', { type: 'date', value: today }),
    buildInput('shift_start_time', 'Scheduled start time', { type: 'time' }),
    buildInput('scheduled_end_time', 'Scheduled end time', { type: 'time' }),
    buildFieldWrapper('Timezone', el('input', {
      name: 'job_timezone',
      value: detectedTimeZone,
      list: 'job-timezone-options',
      placeholder: 'Australia/Brisbane'
    })),
    buildSelect('schedule_status', 'Schedule status', SCHEDULE_STATUS_OPTIONS, { value: 'planned' }),
    buildSelect('shift_type', 'Shift type', SHIFT_OPTIONS, { required: true }),
    buildInput('estimated_duration_hours', 'Estimated duration (hours)', { type: 'number', step: '0.5' }),
    buildInput('crane_class_required', 'Crane class required', { placeholder: 'Franna, Tower Crane, 55T' }),
    buildInput('task_tags', 'Task tags (comma-separated)', { placeholder: 'tower_crane, shutdown, critical_lift' }),
    buildInput('crew_roles_required', 'Crew roles required (comma-separated)', { placeholder: 'crane_operator, dogman' }),
    buildInput('required_credentials', 'Required credentials (comma-separated)', { placeholder: 'high_risk_licence_crane, white_card' }),
    buildInput('site_conditions', 'Site conditions (comma-separated)'),
    buildSelect('lift_risk_level', 'Lift risk level', RISK_OPTIONS),
    buildSelect('travel_required', 'Travel required', ['false', 'true'])
  ));
  form.appendChild(el('datalist', { id: 'job-timezone-options' },
    ...COMMON_TIMEZONES.map((item) => el('option', { value: item }, item))
  ));

  const requirementsSection = el('div', { class: 'panel requirement-form-section' });
  const enabledCompanyCatalogue = filterCatalogueForOperatingMode(enabledCatalogueOnly(companyCatalogue), mode);
  requirementsSection.appendChild(el('h3', {}, 'Job requirements'));
  requirementsSection.appendChild(el('div', { class: 'small muted', style: 'margin-bottom:10px;' },
    mode === 'labour_only'
      ? 'Labour-only mode: credentials, VOCs, civil/access, rail, and energy requirements are shown. Use one-off notes for plant/equipment mentions.'
      : (companyCatalogue.configured
        ? 'Only company-enabled catalogue items are shown. Add one-off requirements for job-specific items.'
        : 'Recommended defaults are shown. Configure your company equipment and requirements in Our Business to reduce this list.')
  ));
  requirementsSection.appendChild(renderRequirementChecklist(enabledCompanyCatalogue));
  const assetSelectorPanel = mode === 'plant_and_labour'
    ? renderJobAssetSelector(enabledCompanyCatalogue, companyAssets)
    : null;
  if (assetSelectorPanel) requirementsSection.appendChild(assetSelectorPanel);
  requirementsSection.appendChild(buildInput('custom_requirements', mode === 'labour_only' ? 'Add one-off requirement or equipment/plant note' : 'Add one-off requirement', {
    placeholder: mode === 'labour_only'
      ? 'client induction, shutdown spotter, equipment note for review'
      : '40T Franna, special access ticket, client induction'
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
    'Operational planning support only. Review required language is intentional. LIFTIQ does not approve permits, compliance, or lift engineering.'
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
    `Default timezone from this browser: ${detectedTimeZone}. Planned and confirmed jobs require start, end, and timezone; draft jobs can be saved without a schedule window.`
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
      job_timezone: fd.get('job_timezone') || detectedTimeZone,
      schedule_status: fd.get('schedule_status') || 'planned',
      shift_type: fd.get('shift_type'),
      estimated_duration_hours: fd.get('estimated_duration_hours') ? Number(fd.get('estimated_duration_hours')) : null,
      crane_class_required: fd.get('crane_class_required') || null,
      task_tags: splitCsv(fd.get('task_tags')),
      crew_roles_required: splitCsv(fd.get('crew_roles_required')),
      required_credentials: splitCsv(fd.get('required_credentials')),
      site_conditions: splitCsv(fd.get('site_conditions')),
      lift_risk_level: fd.get('lift_risk_level'),
      travel_required: fd.get('travel_required') === 'true',
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

async function renderJobDetail(jobId, renderCycle) {
  const view = document.getElementById('view');
  view.innerHTML = '';

  const [job, allocations] = await Promise.all([
    api('GET', `/jobs/${jobId}`),
    api('GET', `/jobs/${jobId}/allocations`)
  ]);
  if (isStaleRender(renderCycle)) return;

  view.appendChild(el('div', { class: 'toolbar' },
    el('h2', {}, `${job.site_name} - ${job.client_name}`),
    el('a', { href: `#/jobs/${jobId}/smartrank` }, el('button', {}, 'Run SmartRank'))
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
  addKv('Crane class', job.crane_class_required || '-');
  addKv('Job description', job.job_description || '-');
  addKv('Task tags', renderTagList(job.task_tags, 'none'));
  addKv('Crew roles', (job.crew_roles_required || []).join(', ') || '-');
  addKv('Required credentials', (job.required_credentials || []).join(', ') || 'none');
  addKv('Site conditions', (job.site_conditions || []).join(', ') || '-');
  addKv('Risk level', riskPill(job.lift_risk_level));
  addKv('Risk notes', job.risk_notes || '-');
  addKv('Travel', job.travel_required ? 'Yes' : 'No');
  addKv('Travel notes', job.travel_notes || '-');
  addKv('Reference', job.reference || '-');
  addKv('Source note', job.source_note || '-');
  addKv('Notes', job.notes || '-');
  view.appendChild(el('div', { class: 'panel' }, kv));
  view.appendChild(renderStructuredRequirementsSummary(job.structured_requirements || []));
  view.appendChild(renderAssetAssignmentsSummary(job.asset_assignments || [], job.asset_assignment_warnings || []));
  view.appendChild(renderCranePlanningSummary(job.crane_planning));

  const allocPanel = el('div', { class: 'panel' });
  allocPanel.appendChild(el('h3', {}, `Allocations (${allocations.length})`));
  if (allocations.length === 0) {
    allocPanel.appendChild(el('div', { class: 'empty' },
      'No worker allocated yet. ',
      el('a', { href: `#/jobs/${jobId}/smartrank` }, 'Run SmartRank to allocate.')
    ));
  } else {
    for (const allocation of allocations) {
      allocPanel.appendChild(renderAllocationCard(allocation));
    }
  }
  view.appendChild(allocPanel);
}

function renderAllocationCard(allocation) {
  const card = el('div', { class: 'rank-card' });
  card.appendChild(el('div', { class: 'rank-head' },
    el('div', {},
      el('div', { class: 'rank-name' }, `Rank #${allocation.smartrank_position} (score ${allocation.smartrank_score})`),
      el('div', { class: 'rank-meta' }, `Allocated ${fmtDate(allocation.allocated_at)} · Status: ${allocation.status}`)
    )
  ));
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
    for (const warning of allocation.active_warnings) list.appendChild(el('li', {}, warning.detail || warning.type));
    card.appendChild(el('div', { class: 'alerts' },
      el('strong', {}, 'Warnings at allocation: '),
      list
    ));
  }
  card.appendChild(el('details', {},
    el('summary', {}, 'Snapshot'),
    el('pre', { class: 'mono' }, JSON.stringify(allocation.smartrank_snapshot, null, 2))
  ));
  return card;
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
      el('strong', {}, 'Task tags:'),
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
      (result.job.required_credentials || []).join(', ') || 'none'
    )
  ));

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
        isTop ? el('span', { class: 'pill pill-ok', style: 'margin-left:8px;' }, 'recommended') : null
      ),
      el('div', { class: 'rank-meta' },
        `${ranked.worker.role} · ${ranked.worker.employment_type} · ${ranked.worker.status}`
      )
    ),
    el('div', { class: 'rank-score' }, String(ranked.score))
  ));

  const breakdown = el('div', { class: 'breakdown' });
  for (const [factor, info] of Object.entries(ranked.score_breakdown || {})) {
    breakdown.appendChild(el('div', {},
      el('strong', {}, `${factor.replace(/_/g, ' ')}:`),
      ` ${info.score} x ${info.weight} = ${Number(info.weighted || 0).toFixed(1)}`
    ));
  }
  card.appendChild(breakdown);

  card.appendChild(el('div', { class: 'preference-section' },
    el('div', { class: 'small muted' }, 'Preference signals'),
    renderPreferenceSignals(ranked.preference_signals)
  ));

  card.appendChild(el('details', {},
    el('summary', {}, 'Factor details'),
    el('ul', {}, ...Object.entries(ranked.score_breakdown || {}).map(([key, info]) =>
      el('li', { class: 'small' }, `${key}: ${info.detail}`)
    ))
  ));

  if (hasWarnings) {
    const list = el('ul');
    for (const warning of ranked.warnings) list.appendChild(el('li', {}, warning.detail || warning.type));
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
      el('div', { class: 'rank-meta' }, `${blocked.worker.role} · ${blocked.worker.status}`)
    )
  ));

  const list = el('ul');
  for (const reason of blocked.blocks || []) {
    list.appendChild(el('li', {}, `${reason.type}: ${reason.detail || ''}`));
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
    for (const reason of blocked.blocks) list.appendChild(el('li', {}, reason.detail || reason.type));
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
  panel.appendChild(el('div', { class: 'small muted', style: 'margin-top:10px;' },
    'A confirmed allocation updates learned preference signals for matching task tags, but the dispatcher remains the final decision-maker.'
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
    const opt = el('option', { value: option }, option || '- all -');
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
  if (payload.review_reason) return payload.review_reason;
  if (payload.task_tag && payload.rating != null) return `${payload.task_tag} -> ${payload.rating} star`;
  if (payload.reason) return payload.reason;
  if (payload.from && payload.to) return `${payload.from} -> ${payload.to}`;
  if (payload.selected_rank) return `Selected rank #${payload.selected_rank}`;
  if (payload.import_id) return `Import ${shortId(payload.import_id)}`;
  if (payload.transport_type) return payload.transport_type;
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
  if (Array.isArray(payload.block_types) && payload.block_types.length) values.push(...payload.block_types);
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
  if (['warning_acknowledged', 'fatigue_warning_triggered', 'non_top_ranked_selected', 'credential_expiry_alert', 'learned_preference_applied', 'worker_removed', 'job_schedule_changed', 'job_brief_import_previewed'].includes(eventType)) {
    return 'pill-warn';
  }
  if (['job_counterweight_transport_assessed', 'transport_requirement_created'].includes(eventType)) {
    return 'pill-warn';
  }
  if (['allocation_confirmed', 'job_created', 'job_created_from_brief', 'worker_imported', 'preference_signal_created'].includes(eventType)) {
    return 'pill-ok';
  }
  return 'pill-info';
}

function auditEventsTable(events) {
  if (!events || events.length === 0) return el('div', { class: 'empty' }, 'No audit events.');

  const table = el('table');
  table.appendChild(el('thead', {}, el('tr', {},
    el('th', {}, 'Timestamp'),
    el('th', {}, 'Event'),
    el('th', {}, 'User'),
    el('th', {}, 'Refs'),
    el('th', {}, 'Reason'),
    el('th', {}, 'Warnings / blocks'),
    el('th', {}, 'Payload')
  )));

  const body = el('tbody');
  for (const event of events) {
    const refs = el('div', { class: 'audit-summary' },
      el('span', { class: 'small mono' }, `worker ${shortId(event.worker_id)}`),
      el('span', { class: 'small mono' }, `job ${shortId(event.job_id)}`)
    );
    const details = el('details', {},
      el('summary', {}, 'view'),
      el('pre', { class: 'mono' }, JSON.stringify(event.payload, null, 2))
    );

    body.appendChild(el('tr', {},
      el('td', { class: 'small' }, fmtDate(event.timestamp)),
      el('td', {}, el('span', { class: `pill ${auditEventPill(event.event_type)}` }, event.event_type)),
      el('td', { class: 'mono small' }, shortId(event.user_id)),
      el('td', {}, refs),
      el('td', { class: 'small' }, auditEventReason(event)),
      el('td', { class: 'small' }, auditEventSignals(event)),
      el('td', {}, details)
    ));
  }
  table.appendChild(body);
  return table;
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

  view.appendChild(el('div', { class: 'panel' },
    el('div', { class: 'small muted' }, `Period: ${metrics.period.from} to ${metrics.period.to}`),
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
  const select = el('select', { name, ...attrs });
  for (const option of options) {
    const value = String(option);
    const node = el('option', { value }, value);
    if (attrs.value != null && String(attrs.value) === value) node.selected = true;
    select.appendChild(node);
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
