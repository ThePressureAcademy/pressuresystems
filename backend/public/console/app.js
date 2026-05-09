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
const normalizeTag = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');
const stars = (rating) => '★'.repeat(Math.max(0, Number(rating) || 0));

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
    throw { status: res.status, error: (data && data.error) || `HTTP ${res.status}`, data };
  }
  return data;
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

function setLoginNote(message = '') {
  const node = document.getElementById('login-note');
  node.textContent = message;
  node.classList.toggle('hidden', !message);
}

function logout() {
  nextRenderCycle();
  state.token = null;
  state.user = null;
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

function showApp() {
  if (state.user?.must_change_password) {
    showPasswordChange();
    return;
  }
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('password-change-screen').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  document.getElementById('user-label').textContent = state.user
    ? `${state.user.name} - ${state.user.role}`
    : '';
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

  const renderCycle = nextRenderCycle();
  const { route, rest } = getHashState();
  document.querySelectorAll('#nav a').forEach((link) => {
    link.classList.toggle('active', link.dataset.route === route);
  });

  const view = document.getElementById('view');
  view.innerHTML = '<div class="empty">Loading...</div>';

  const routes = {
    dashboard: () => renderDashboard(renderCycle),
    workers: () => {
      if (rest[0] === 'import') return renderWorkerImport(renderCycle);
      return rest[0] ? renderWorkerDetail(rest[0], renderCycle) : renderWorkersList(renderCycle);
    },
    jobs: () => {
      if (!rest[0]) return renderJobsList(renderCycle);
      if (rest[1] === 'smartrank') return renderSmartRank(rest[0], renderCycle);
      if (rest[1] === 'allocate') return renderAllocate(rest[0], rest[2], renderCycle);
      return renderJobDetail(rest[0], renderCycle);
    },
    audit: () => renderAudit(renderCycle),
    metrics: () => renderMetrics(renderCycle),
    'new-job': renderNewJob,
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
      parts.push(`${signal.approval_count || 0} approved`);
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
      el('th', {}, 'Approved'),
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

async function renderJobsList(renderCycle) {
  const view = document.getElementById('view');
  view.innerHTML = '';

  const jobs = await api('GET', '/jobs');
  if (isStaleRender(renderCycle)) return;

  view.appendChild(el('div', { class: 'toolbar' },
    el('h2', {}, 'Jobs'),
    el('a', { href: '#/new-job' }, el('button', {}, '+ New job'))
  ));

  if (jobs.length === 0) {
    view.appendChild(el('div', { class: 'panel empty' }, 'No jobs yet. Create your first job to get started.'));
    return;
  }

  const table = el('table');
  table.appendChild(el('thead', {}, el('tr', {},
    el('th', {}, 'Date'),
    el('th', {}, 'Client'),
    el('th', {}, 'Site'),
    el('th', {}, 'Task tags'),
    el('th', {}, 'Shift'),
    el('th', {}, 'Risk'),
    el('th', {}, 'Status'),
    el('th', {}, 'Actions')
  )));
  const body = el('tbody');
  for (const job of jobs) {
    body.appendChild(el('tr', {},
      el('td', {}, fmtDateOnly(job.date)),
      el('td', {}, job.client_name),
      el('td', {}, el('a', { href: `#/jobs/${job.id}` }, job.site_name)),
      el('td', {}, (job.task_tags || []).join(', ') || '-'),
      el('td', {}, job.shift_type),
      el('td', {}, riskPill(job.lift_risk_level)),
      el('td', {}, jobStatusPill(job.status)),
      el('td', {}, el('a', { href: `#/jobs/${job.id}/smartrank` }, 'SmartRank'))
    ));
  }
  table.appendChild(body);
  view.appendChild(el('div', { class: 'panel' }, table));
}

function renderNewJob() {
  const view = document.getElementById('view');
  view.innerHTML = '';

  const today = new Date().toISOString().slice(0, 10);
  const form = el('form', { class: 'panel' });
  const errBox = el('div', { class: 'error' });
  form.appendChild(el('h2', {}, 'Create job'));
  form.appendChild(el('div', { class: 'row' },
    buildInput('reference', 'Reference'),
    buildInput('client_name', 'Client name', { required: true }),
    buildInput('site_name', 'Site name', { required: true }),
    buildInput('site_location', 'Site location'),
    buildInput('date', 'Date', { type: 'date', required: true, value: today }),
    buildInput('shift_start_time', 'Shift start time', { type: 'time' }),
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
  form.appendChild(buildTextarea('notes', 'Notes'));
  form.appendChild(errBox);
  form.appendChild(el('div', { class: 'button-row' },
    el('button', { type: 'submit' }, 'Create job'),
    el('a', { href: '#/jobs' }, el('button', { type: 'button', class: 'secondary' }, 'Cancel'))
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
      date: fd.get('date'),
      shift_start_time: fd.get('shift_start_time') || null,
      shift_type: fd.get('shift_type'),
      estimated_duration_hours: fd.get('estimated_duration_hours') ? Number(fd.get('estimated_duration_hours')) : null,
      crane_class_required: fd.get('crane_class_required') || null,
      task_tags: splitCsv(fd.get('task_tags')),
      crew_roles_required: splitCsv(fd.get('crew_roles_required')),
      required_credentials: splitCsv(fd.get('required_credentials')),
      site_conditions: splitCsv(fd.get('site_conditions')),
      lift_risk_level: fd.get('lift_risk_level'),
      travel_required: fd.get('travel_required') === 'true',
      notes: fd.get('notes') || null
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
  addKv('Date', fmtDateOnly(job.date));
  addKv('Shift', `${job.shift_type}${job.shift_start_time ? ` @ ${job.shift_start_time}` : ''}`);
  addKv('Crane class', job.crane_class_required || '-');
  addKv('Task tags', renderTagList(job.task_tags, 'none'));
  addKv('Crew roles', (job.crew_roles_required || []).join(', ') || '-');
  addKv('Required credentials', (job.required_credentials || []).join(', ') || 'none');
  addKv('Site conditions', (job.site_conditions || []).join(', ') || '-');
  addKv('Risk level', riskPill(job.lift_risk_level));
  addKv('Travel', job.travel_required ? 'Yes' : 'No');
  addKv('Reference', job.reference || '-');
  addKv('Notes', job.notes || '-');
  view.appendChild(el('div', { class: 'panel' }, kv));

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
    el('div', { class: 'small muted', style: 'margin-top:8px;' },
      'Dispatcher-approved learning may adjust the task preference factor, but it never overrides hard blocks or hides warnings.'
    ),
    el('div', { class: 'button-row', style: 'margin-top:10px;' },
      el('strong', {}, 'Task tags:'),
      renderTagList(result.job.task_tags, 'none')
    ),
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
  if (payload.task_tag && payload.rating != null) return `${payload.task_tag} -> ${payload.rating} star`;
  if (payload.reason) return payload.reason;
  if (payload.from && payload.to) return `${payload.from} -> ${payload.to}`;
  if (payload.selected_rank) return `Selected rank #${payload.selected_rank}`;
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
  if (payload.approval_count != null) values.push(`${payload.approval_count} approved allocation(s)`);
  if (payload.confidence != null) values.push(`conf ${Number(payload.confidence).toFixed(2)}`);
  if (!values.length) return '-';
  return values.slice(0, 4).join(' | ');
}

function auditEventPill(eventType) {
  if (['allocation_rejected', 'credential_block_applied', 'fatigue_block_applied', 'availability_block_applied'].includes(eventType)) {
    return 'pill-bad';
  }
  if (['warning_acknowledged', 'fatigue_warning_triggered', 'non_top_ranked_selected', 'credential_expiry_alert', 'learned_preference_applied', 'worker_removed'].includes(eventType)) {
    return 'pill-warn';
  }
  if (['allocation_confirmed', 'job_created', 'worker_imported', 'preference_signal_created'].includes(eventType)) {
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
