'use strict';

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  token: null,
  user: null,
};

const TOKEN_KEY = 'liftiq.token';
const USER_KEY  = 'liftiq.user';

// ─── DOM helpers ──────────────────────────────────────────────────────────────
const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
};

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const fmtDate = (s) => {
  if (!s) return '—';
  try { return new Date(s).toLocaleString(); } catch { return s; }
};

const fmtDateOnly = (s) => {
  if (!s) return '—';
  return s.length > 10 ? s.slice(0, 10) : s;
};

// ─── Toast ────────────────────────────────────────────────────────────────────
let toastTimer = null;
function toast(message, kind = 'info') {
  const t = document.getElementById('toast');
  t.textContent = message;
  t.className = `toast ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 4500);
}

// ─── API ──────────────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); }
    catch { data = { error: text }; }
  }

  if (res.status === 401 && state.token) {
    logout();
    throw { status: 401, error: 'Session expired — please sign in again.', data };
  }

  if (!res.ok) {
    throw { status: res.status, error: (data && data.error) || `HTTP ${res.status}`, data };
  }
  return data;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
function loadSession() {
  const t = localStorage.getItem(TOKEN_KEY);
  const u = localStorage.getItem(USER_KEY);
  if (t && u) {
    state.token = t;
    try { state.user = JSON.parse(u); } catch { state.user = null; }
  }
}

function saveSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  showLogin();
}

// ─── Screen visibility ────────────────────────────────────────────────────────
function showLogin() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app-shell').classList.add('hidden');
  document.getElementById('login-error').textContent = '';
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  document.getElementById('user-label').textContent = state.user
    ? `${state.user.name} · ${state.user.role}`
    : '';
  if (!location.hash) location.hash = '#/dashboard';
  else router();
}

// ─── Login form ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadSession();

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const email = data.get('email').trim();
    const password = data.get('password');
    const errEl = document.getElementById('login-error');
    errEl.textContent = '';
    try {
      const result = await api('POST', '/auth/login', { email, password });
      saveSession(result.token, result.user);
      showApp();
    } catch (err) {
      errEl.textContent = err.error || 'Login failed';
    }
  });

  document.getElementById('logout').addEventListener('click', logout);
  window.addEventListener('hashchange', router);

  if (state.token) showApp();
  else showLogin();
});

// ─── Router ───────────────────────────────────────────────────────────────────
function router() {
  if (!state.token) { showLogin(); return; }
  const hash = location.hash.replace(/^#\/?/, '') || 'dashboard';
  const [route, ...rest] = hash.split('/');

  // Highlight active nav
  document.querySelectorAll('#nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.route === route);
  });

  const view = document.getElementById('view');
  view.innerHTML = '<div class="empty">Loading…</div>';

  const routes = {
    'dashboard': renderDashboard,
    'workers':   () => rest[0] ? renderWorkerDetail(rest[0]) : renderWorkersList(),
    'jobs':      () => {
      if (!rest[0]) return renderJobsList();
      if (rest[1] === 'smartrank') return renderSmartRank(rest[0]);
      if (rest[1] === 'allocate')  return renderAllocate(rest[0], rest[2]);
      return renderJobDetail(rest[0]);
    },
    'audit':   renderAudit,
    'metrics': renderMetrics,
    'new-job': renderNewJob,
    'new-worker': renderNewWorker,
  };

  const handler = routes[route] || renderDashboard;
  Promise.resolve(handler()).catch(err => {
    view.innerHTML = '';
    view.appendChild(el('div', { class: 'panel' },
      el('h2', {}, 'Something went wrong'),
      el('p', { class: 'error' }, err.error || String(err))
    ));
  });
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
async function renderDashboard() {
  const view = document.getElementById('view');
  view.innerHTML = '';

  const metrics = await api('GET', '/metrics');

  const tile = (label, value) => el('div', { class: 'metric-tile' },
    el('div', { class: 'label' }, label),
    el('div', { class: 'value' }, String(value))
  );

  view.appendChild(el('div', { class: 'toolbar' },
    el('h2', {}, 'Pilot dashboard'),
    el('div', {},
      el('a', { href: '#/new-job' }, el('button', {}, '+ New job')),
      ' ',
      el('a', { href: '#/new-worker' }, el('button', { class: 'secondary' }, '+ New worker'))
    )
  ));

  const tiles = el('div', { class: 'metrics-grid' });
  tiles.appendChild(tile('Total jobs', metrics.total_jobs));
  tiles.appendChild(tile('Total allocations', metrics.total_allocations));
  tiles.appendChild(tile('Top-ranked selections', metrics.top_ranked_selections));
  tiles.appendChild(tile('Lower-ranked selections', metrics.lower_ranked_selections));
  tiles.appendChild(tile('Credential blocks', metrics.credential_blocks));
  tiles.appendChild(tile('Fatigue blocks', metrics.fatigue_blocks));
  tiles.appendChild(tile('Fatigue warnings', metrics.fatigue_warnings));
  tiles.appendChild(tile('Warning overrides', metrics.warning_overrides));
  tiles.appendChild(tile('Allocation rejections', metrics.allocation_rejections));
  tiles.appendChild(tile('Audit events', metrics.total_audit_events));

  view.appendChild(el('div', { class: 'panel' }, tiles));

  // Recent audit events preview
  const audit = await api('GET', '/audit-events?limit=8');
  const auditPanel = el('div', { class: 'panel' },
    el('div', { class: 'toolbar' },
      el('h3', {}, 'Recent activity'),
      el('a', { href: '#/audit' }, 'View all →')
    ),
    auditEventsTable(audit.events)
  );
  view.appendChild(auditPanel);
}

// ─── Workers list ─────────────────────────────────────────────────────────────
async function renderWorkersList() {
  const view = document.getElementById('view');
  view.innerHTML = '';

  const workers = await api('GET', '/workers');

  view.appendChild(el('div', { class: 'toolbar' },
    el('h2', {}, 'Workers'),
    el('a', { href: '#/new-worker' }, el('button', {}, '+ New worker'))
  ));

  if (workers.length === 0) {
    view.appendChild(el('div', { class: 'panel empty' }, 'No workers yet. Add your first worker to get started.'));
    return;
  }

  const tbl = el('table');
  tbl.appendChild(el('thead', {}, el('tr', {},
    el('th', {}, 'Name'),
    el('th', {}, 'Role'),
    el('th', {}, 'Employment'),
    el('th', {}, 'Crane classes'),
    el('th', {}, 'Status'),
    el('th', {}, 'Depot')
  )));
  const tb = el('tbody');
  for (const w of workers) {
    tb.appendChild(el('tr', {},
      el('td', {}, el('a', { href: `#/workers/${w.id}` }, w.name)),
      el('td', {}, w.role),
      el('td', {}, w.employment_type),
      el('td', {}, (w.crane_classes || []).join(', ') || '—'),
      el('td', {}, statusPill(w.status)),
      el('td', {}, w.usual_depot || '—')
    ));
  }
  tbl.appendChild(tb);
  view.appendChild(el('div', { class: 'panel' }, tbl));
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

// ─── New worker ───────────────────────────────────────────────────────────────
function renderNewWorker() {
  const view = document.getElementById('view');
  view.innerHTML = '';

  const form = el('form', { class: 'panel' });
  form.appendChild(el('h2', {}, 'Create worker'));

  const fields = [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'role', label: 'Role', type: 'select', required: true,
      options: ['crane_operator', 'dogman', 'rigger', 'traffic_controller', 'supervisor', 'allocator'] },
    { name: 'employment_type', label: 'Employment type', type: 'select', required: true,
      options: ['permanent', 'casual', 'contractor', 'labour_hire'] },
    { name: 'crane_classes', label: 'Crane classes (comma-separated, e.g. 25T,55T,130T)', type: 'text' },
    { name: 'usual_depot', label: 'Usual depot', type: 'text' },
    { name: 'contact_number', label: 'Contact number', type: 'text' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ];

  for (const f of fields) {
    const lbl = el('label', {}, el('span', {}, f.label));
    let input;
    if (f.type === 'select') {
      input = el('select', { name: f.name });
      for (const opt of f.options) input.appendChild(el('option', { value: opt }, opt));
    } else if (f.type === 'textarea') {
      input = el('textarea', { name: f.name });
    } else {
      input = el('input', { name: f.name, type: f.type });
    }
    if (f.required) input.required = true;
    lbl.appendChild(input);
    form.appendChild(lbl);
  }

  const errBox = el('div', { class: 'error' });
  form.appendChild(errBox);
  form.appendChild(el('div', {},
    el('button', { type: 'submit' }, 'Create worker'),
    ' ',
    el('a', { href: '#/workers' }, el('button', { type: 'button', class: 'secondary' }, 'Cancel'))
  ));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const body = {
      name: fd.get('name'),
      role: fd.get('role'),
      employment_type: fd.get('employment_type'),
      crane_classes: (fd.get('crane_classes') || '').split(',').map(s => s.trim()).filter(Boolean),
      usual_depot: fd.get('usual_depot') || null,
      contact_number: fd.get('contact_number') || null,
      notes: fd.get('notes') || null,
    };
    try {
      const w = await api('POST', '/workers', body);
      toast('Worker created', 'success');
      location.hash = `#/workers/${w.id}`;
    } catch (err) {
      errBox.textContent = err.error;
    }
  });

  view.appendChild(form);
}

// ─── Worker detail (with credentials + fatigue) ───────────────────────────────
async function renderWorkerDetail(workerId) {
  const view = document.getElementById('view');
  view.innerHTML = '';

  const [worker, credentials, fatigue] = await Promise.all([
    api('GET', `/workers/${workerId}`),
    api('GET', `/workers/${workerId}/credentials`),
    api('GET', `/workers/${workerId}/fatigue-records`),
  ]);

  view.appendChild(el('div', { class: 'toolbar' },
    el('h2', {}, worker.name),
    el('a', { href: '#/workers' }, el('button', { class: 'secondary' }, '← All workers'))
  ));

  // Worker basics + edit
  const editForm = el('form', { class: 'panel' });
  editForm.appendChild(el('h3', {}, 'Worker details'));

  const grid = el('div', { class: 'row' });
  const statusSelect = el('select', { name: 'status' },
    ...['available', 'allocated', 'unavailable', 'on_leave', 'inactive'].map(s =>
      el('option', { value: s, ...(worker.status === s ? { selected: 'selected' } : {}) }, s))
  );
  grid.appendChild(el('label', {}, el('span', {}, 'Status'), statusSelect));
  grid.appendChild(el('label', {},
    el('span', {}, 'Crane classes (comma-separated)'),
    el('input', { name: 'crane_classes', value: (worker.crane_classes || []).join(', ') })
  ));
  grid.appendChild(el('label', {},
    el('span', {}, 'Usual depot'),
    el('input', { name: 'usual_depot', value: worker.usual_depot || '' })
  ));
  grid.appendChild(el('label', {},
    el('span', {}, 'Availability note'),
    el('input', { name: 'availability_note', value: worker.availability_note || '' })
  ));
  editForm.appendChild(grid);

  const editErr = el('div', { class: 'error' });
  editForm.appendChild(editErr);
  editForm.appendChild(el('button', { type: 'submit' }, 'Save changes'));
  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(editForm);
    try {
      await api('PATCH', `/workers/${workerId}`, {
        status: fd.get('status'),
        crane_classes: (fd.get('crane_classes') || '').split(',').map(s => s.trim()).filter(Boolean),
        usual_depot: fd.get('usual_depot') || null,
        availability_note: fd.get('availability_note') || null,
      });
      toast('Worker updated', 'success');
      router();
    } catch (err) {
      editErr.textContent = err.error;
    }
  });
  view.appendChild(editForm);

  // Credentials section
  const credPanel = el('div', { class: 'panel' });
  credPanel.appendChild(el('h3', {}, `Credentials (${credentials.length})`));

  if (credentials.length === 0) {
    credPanel.appendChild(el('div', { class: 'empty' }, 'No credentials recorded.'));
  } else {
    const t = el('table');
    t.appendChild(el('thead', {}, el('tr', {},
      el('th', {}, 'Type'), el('th', {}, 'Identifier'),
      el('th', {}, 'Issued'), el('th', {}, 'Expires'),
      el('th', {}, 'Status'), el('th', {}, 'Verified')
    )));
    const tb = el('tbody');
    for (const c of credentials) {
      tb.appendChild(el('tr', {},
        el('td', {}, c.type),
        el('td', {}, c.identifier || '—'),
        el('td', {}, fmtDateOnly(c.issue_date)),
        el('td', {}, fmtDateOnly(c.expiry_date)),
        el('td', {}, credPill(c.status)),
        el('td', {}, c.verified ? 'Yes' : 'No')
      ));
    }
    t.appendChild(tb);
    credPanel.appendChild(t);
  }

  credPanel.appendChild(buildCredentialForm(workerId));
  view.appendChild(credPanel);

  // Fatigue section
  const fatPanel = el('div', { class: 'panel' });
  fatPanel.appendChild(el('h3', {}, `Fatigue records (${fatigue.length})`));
  if (fatigue.length === 0) {
    fatPanel.appendChild(el('div', { class: 'empty' }, 'No fatigue records recorded.'));
  } else {
    const t = el('table');
    t.appendChild(el('thead', {}, el('tr', {},
      el('th', {}, 'Shift start'), el('th', {}, 'Shift end'),
      el('th', {}, 'Length'), el('th', {}, 'Type'),
      el('th', {}, 'Travel'), el('th', {}, 'Self-fatigue')
    )));
    const tb = el('tbody');
    for (const r of fatigue.slice(0, 30)) {
      tb.appendChild(el('tr', {},
        el('td', {}, fmtDate(r.shift_start)),
        el('td', {}, fmtDate(r.shift_end)),
        el('td', {}, `${r.shift_length_hours.toFixed(1)}h`),
        el('td', {}, r.shift_type),
        el('td', {}, `${r.travel_hours || 0}h`),
        el('td', {}, r.self_declared_fatigue ? el('span', { class: 'pill pill-warn' }, 'declared') : '—')
      ));
    }
    t.appendChild(tb);
    fatPanel.appendChild(t);
  }

  fatPanel.appendChild(buildFatigueForm(workerId));
  view.appendChild(fatPanel);
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

function buildCredentialForm(workerId) {
  const form = el('form', { style: 'margin-top:16px;' });
  form.appendChild(el('h3', {}, 'Add credential'));
  const grid = el('div', { class: 'row' });

  const types = [
    'high_risk_licence_crane', 'high_risk_licence_dogging', 'high_risk_licence_rigging',
    'white_card', 'msic_card', 'site_induction', 'client_induction',
    'medical_clearance', 'drivers_licence', 'other'
  ];

  grid.appendChild(el('label', {},
    el('span', {}, 'Type'),
    el('select', { name: 'type', required: true },
      ...types.map(t => el('option', { value: t }, t)))
  ));
  grid.appendChild(el('label', {},
    el('span', {}, 'Identifier (licence #, etc.)'),
    el('input', { name: 'identifier' })
  ));
  grid.appendChild(el('label', {},
    el('span', {}, 'Issuing body'),
    el('input', { name: 'issuing_body' })
  ));
  grid.appendChild(el('label', {},
    el('span', {}, 'Issue date'),
    el('input', { name: 'issue_date', type: 'date' })
  ));
  grid.appendChild(el('label', {},
    el('span', {}, 'Expiry date'),
    el('input', { name: 'expiry_date', type: 'date' })
  ));
  grid.appendChild(el('label', {},
    el('span', {}, 'Verified'),
    el('select', { name: 'verified' },
      el('option', { value: 'false' }, 'No'),
      el('option', { value: 'true' }, 'Yes'))
  ));

  form.appendChild(grid);
  const errBox = el('div', { class: 'error' });
  form.appendChild(errBox);
  form.appendChild(el('button', { type: 'submit' }, 'Add credential'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    try {
      await api('POST', `/workers/${workerId}/credentials`, {
        type: fd.get('type'),
        identifier: fd.get('identifier') || null,
        issuing_body: fd.get('issuing_body') || null,
        issue_date: fd.get('issue_date') || null,
        expiry_date: fd.get('expiry_date') || null,
        verified: fd.get('verified') === 'true',
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
  form.appendChild(el('h3', {}, 'Add fatigue / shift record'));
  const grid = el('div', { class: 'row' });

  grid.appendChild(el('label', {},
    el('span', {}, 'Shift start'),
    el('input', { name: 'shift_start', type: 'datetime-local', required: true })
  ));
  grid.appendChild(el('label', {},
    el('span', {}, 'Shift end'),
    el('input', { name: 'shift_end', type: 'datetime-local', required: true })
  ));
  grid.appendChild(el('label', {},
    el('span', {}, 'Shift type'),
    el('select', { name: 'shift_type', required: true },
      el('option', { value: 'day' }, 'day'),
      el('option', { value: 'night' }, 'night'),
      el('option', { value: 'split' }, 'split'))
  ));
  grid.appendChild(el('label', {},
    el('span', {}, 'Travel hours'),
    el('input', { name: 'travel_hours', type: 'number', step: '0.5', value: '0' })
  ));
  grid.appendChild(el('label', {},
    el('span', {}, 'Self-declared fatigue'),
    el('select', { name: 'self_declared_fatigue' },
      el('option', { value: 'false' }, 'No'),
      el('option', { value: 'true' }, 'Yes'))
  ));
  grid.appendChild(el('label', {},
    el('span', {}, 'Notes'),
    el('input', { name: 'notes' })
  ));

  form.appendChild(grid);
  const errBox = el('div', { class: 'error' });
  form.appendChild(errBox);
  form.appendChild(el('button', { type: 'submit' }, 'Record shift'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    try {
      await api('POST', `/workers/${workerId}/fatigue-records`, {
        shift_start: new Date(fd.get('shift_start')).toISOString(),
        shift_end: new Date(fd.get('shift_end')).toISOString(),
        shift_type: fd.get('shift_type'),
        travel_hours: Number(fd.get('travel_hours') || 0),
        self_declared_fatigue: fd.get('self_declared_fatigue') === 'true',
        notes: fd.get('notes') || null,
      });
      toast('Fatigue record added', 'success');
      router();
    } catch (err) {
      errBox.textContent = err.error;
    }
  });

  return form;
}

// ─── Jobs list ────────────────────────────────────────────────────────────────
async function renderJobsList() {
  const view = document.getElementById('view');
  view.innerHTML = '';

  const jobs = await api('GET', '/jobs');

  view.appendChild(el('div', { class: 'toolbar' },
    el('h2', {}, 'Jobs'),
    el('a', { href: '#/new-job' }, el('button', {}, '+ New job'))
  ));

  if (jobs.length === 0) {
    view.appendChild(el('div', { class: 'panel empty' }, 'No jobs yet. Create your first job to get started.'));
    return;
  }

  const t = el('table');
  t.appendChild(el('thead', {}, el('tr', {},
    el('th', {}, 'Date'), el('th', {}, 'Client'),
    el('th', {}, 'Site'), el('th', {}, 'Shift'),
    el('th', {}, 'Risk'), el('th', {}, 'Status'),
    el('th', {}, 'Actions')
  )));
  const tb = el('tbody');
  for (const j of jobs) {
    tb.appendChild(el('tr', {},
      el('td', {}, fmtDateOnly(j.date)),
      el('td', {}, j.client_name),
      el('td', {}, el('a', { href: `#/jobs/${j.id}` }, j.site_name)),
      el('td', {}, j.shift_type),
      el('td', {}, riskPill(j.lift_risk_level)),
      el('td', {}, jobStatusPill(j.status)),
      el('td', {},
        el('a', { href: `#/jobs/${j.id}/smartrank` }, 'SmartRank')
      )
    ));
  }
  t.appendChild(tb);
  view.appendChild(el('div', { class: 'panel' }, t));
}

function jobStatusPill(s) {
  const map = {
    open: 'pill-info', draft: 'pill-muted', allocated: 'pill-ok',
    in_progress: 'pill-warn', complete: 'pill-muted', cancelled: 'pill-bad'
  };
  return el('span', { class: `pill ${map[s] || 'pill-muted'}` }, s);
}

function riskPill(r) {
  const map = { routine: 'pill-muted', complex: 'pill-warn', critical: 'pill-bad' };
  return el('span', { class: `pill ${map[r] || 'pill-muted'}` }, r);
}

// ─── New job ──────────────────────────────────────────────────────────────────
function renderNewJob() {
  const view = document.getElementById('view');
  view.innerHTML = '';

  const form = el('form', { class: 'panel' });
  form.appendChild(el('h2', {}, 'Create job'));

  const today = new Date().toISOString().slice(0, 10);
  const grid = el('div', { class: 'row' });

  grid.appendChild(el('label', {},
    el('span', {}, 'Reference (optional)'),
    el('input', { name: 'reference' })
  ));
  grid.appendChild(el('label', {},
    el('span', {}, 'Client name *'),
    el('input', { name: 'client_name', required: true })
  ));
  grid.appendChild(el('label', {},
    el('span', {}, 'Site name *'),
    el('input', { name: 'site_name', required: true })
  ));
  grid.appendChild(el('label', {},
    el('span', {}, 'Site location'),
    el('input', { name: 'site_location' })
  ));
  grid.appendChild(el('label', {},
    el('span', {}, 'Date *'),
    el('input', { name: 'date', type: 'date', required: true, value: today })
  ));
  grid.appendChild(el('label', {},
    el('span', {}, 'Shift start time'),
    el('input', { name: 'shift_start_time', type: 'time' })
  ));
  grid.appendChild(el('label', {},
    el('span', {}, 'Shift type *'),
    el('select', { name: 'shift_type', required: true },
      el('option', { value: 'day' }, 'day'),
      el('option', { value: 'night' }, 'night'),
      el('option', { value: 'split' }, 'split'))
  ));
  grid.appendChild(el('label', {},
    el('span', {}, 'Estimated duration (hours)'),
    el('input', { name: 'estimated_duration_hours', type: 'number', step: '0.5' })
  ));
  grid.appendChild(el('label', {},
    el('span', {}, 'Crane class required'),
    el('input', { name: 'crane_class_required', placeholder: 'e.g. 55T' })
  ));
  grid.appendChild(el('label', {},
    el('span', {}, 'Crew roles required (comma-separated)'),
    el('input', { name: 'crew_roles_required', placeholder: 'crane_operator, dogman' })
  ));
  grid.appendChild(el('label', {},
    el('span', {}, 'Required credentials (comma-separated)'),
    el('input', { name: 'required_credentials',
      placeholder: 'high_risk_licence_crane, white_card' })
  ));
  grid.appendChild(el('label', {},
    el('span', {}, 'Site conditions (comma-separated)'),
    el('input', { name: 'site_conditions' })
  ));
  grid.appendChild(el('label', {},
    el('span', {}, 'Lift risk level'),
    el('select', { name: 'lift_risk_level' },
      el('option', { value: 'routine' }, 'routine'),
      el('option', { value: 'complex' }, 'complex'),
      el('option', { value: 'critical' }, 'critical'))
  ));
  grid.appendChild(el('label', {},
    el('span', {}, 'Travel required'),
    el('select', { name: 'travel_required' },
      el('option', { value: 'false' }, 'No'),
      el('option', { value: 'true' }, 'Yes'))
  ));
  grid.appendChild(el('label', {},
    el('span', {}, 'Notes'),
    el('input', { name: 'notes' })
  ));

  form.appendChild(grid);
  const errBox = el('div', { class: 'error' });
  form.appendChild(errBox);
  form.appendChild(el('div', {},
    el('button', { type: 'submit' }, 'Create job'),
    ' ',
    el('a', { href: '#/jobs' }, el('button', { type: 'button', class: 'secondary' }, 'Cancel'))
  ));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const splitCsv = (v) => (v || '').split(',').map(s => s.trim()).filter(Boolean);
    const body = {
      reference: fd.get('reference') || null,
      client_name: fd.get('client_name'),
      site_name: fd.get('site_name'),
      site_location: fd.get('site_location') || null,
      date: fd.get('date'),
      shift_start_time: fd.get('shift_start_time') || null,
      shift_type: fd.get('shift_type'),
      estimated_duration_hours: fd.get('estimated_duration_hours')
        ? Number(fd.get('estimated_duration_hours')) : null,
      crane_class_required: fd.get('crane_class_required') || null,
      crew_roles_required: splitCsv(fd.get('crew_roles_required')),
      required_credentials: splitCsv(fd.get('required_credentials')),
      site_conditions: splitCsv(fd.get('site_conditions')),
      lift_risk_level: fd.get('lift_risk_level'),
      travel_required: fd.get('travel_required') === 'true',
      notes: fd.get('notes') || null,
    };
    try {
      const j = await api('POST', '/jobs', body);
      toast('Job created', 'success');
      location.hash = `#/jobs/${j.id}`;
    } catch (err) {
      errBox.textContent = err.error;
    }
  });

  view.appendChild(form);
}

// ─── Job detail ───────────────────────────────────────────────────────────────
async function renderJobDetail(jobId) {
  const view = document.getElementById('view');
  view.innerHTML = '';

  const [job, allocations] = await Promise.all([
    api('GET', `/jobs/${jobId}`),
    api('GET', `/jobs/${jobId}/allocations`),
  ]);

  view.appendChild(el('div', { class: 'toolbar' },
    el('h2', {}, `${job.site_name} — ${job.client_name}`),
    el('div', {},
      el('a', { href: `#/jobs/${jobId}/smartrank` },
        el('button', {}, 'Run SmartRank →'))
    )
  ));

  const kv = el('div', { class: 'kv' });
  const kvAdd = (k, v) => { kv.appendChild(el('div', {}, k)); kv.appendChild(el('div', {}, v == null ? '—' : (typeof v === 'string' ? v : JSON.stringify(v)))); };

  kvAdd('Status', '');
  kv.lastChild.innerHTML = '';
  kv.lastChild.appendChild(jobStatusPill(job.status));
  kvAdd('Date', fmtDateOnly(job.date));
  kvAdd('Shift', `${job.shift_type}${job.shift_start_time ? ' @ ' + job.shift_start_time : ''}`);
  kvAdd('Crane class', job.crane_class_required);
  kvAdd('Crew roles', (job.crew_roles_required || []).join(', ') || '—');
  kvAdd('Required credentials', (job.required_credentials || []).join(', ') || 'None');
  kvAdd('Site conditions', (job.site_conditions || []).join(', ') || '—');
  kvAdd('Risk level', '');
  kv.lastChild.innerHTML = '';
  kv.lastChild.appendChild(riskPill(job.lift_risk_level));
  kvAdd('Travel', job.travel_required ? 'Yes' : 'No');
  kvAdd('Reference', job.reference);
  kvAdd('Notes', job.notes);

  view.appendChild(el('div', { class: 'panel' }, kv));

  // Allocations
  const allocPanel = el('div', { class: 'panel' });
  allocPanel.appendChild(el('h3', {}, `Allocations (${allocations.length})`));
  if (allocations.length === 0) {
    allocPanel.appendChild(el('div', { class: 'empty' },
      'No worker allocated yet. ',
      el('a', { href: `#/jobs/${jobId}/smartrank` }, 'Run SmartRank to allocate.')
    ));
  } else {
    for (const a of allocations) {
      allocPanel.appendChild(renderAllocationCard(a));
    }
  }
  view.appendChild(allocPanel);
}

function renderAllocationCard(a) {
  const card = el('div', { class: 'rank-card' });
  card.appendChild(el('div', { class: 'rank-head' },
    el('div', {},
      el('div', { class: 'rank-name' }, `Rank #${a.smartrank_position} (score ${a.smartrank_score})`),
      el('div', { class: 'rank-meta' }, `Allocated ${fmtDate(a.allocated_at)} · Status: ${a.status}`)
    )
  ));
  if (a.override_reason) {
    card.appendChild(el('div', { class: 'alerts' },
      el('strong', {}, 'Override reason: '),
      a.override_reason
    ));
  }
  if (a.active_warnings && a.active_warnings.length) {
    const ul = el('ul');
    for (const w of a.active_warnings) ul.appendChild(el('li', {}, w.detail || w.type));
    card.appendChild(el('div', { class: 'alerts' },
      el('strong', {}, 'Warnings at allocation: '),
      ul
    ));
  }
  card.appendChild(el('details', {},
    el('summary', {}, 'Snapshot (score breakdown)'),
    el('pre', { class: 'mono' }, JSON.stringify(a.smartrank_snapshot, null, 2))
  ));
  return card;
}

// ─── SmartRank ────────────────────────────────────────────────────────────────
async function renderSmartRank(jobId) {
  const view = document.getElementById('view');
  view.innerHTML = '';

  const result = await api('GET', `/jobs/${jobId}/smartrank`);

  view.appendChild(el('div', { class: 'toolbar' },
    el('h2', {}, `SmartRank — ${result.job.site_name}`),
    el('a', { href: `#/jobs/${jobId}` }, el('button', { class: 'secondary' }, '← Back to job'))
  ));

  view.appendChild(el('div', { class: 'panel' },
    el('div', { class: 'small muted' }, `Generated ${fmtDate(result.generated_at)} · ${result.ranked.length} ranked, ${result.blocked.length} blocked`),
    el('div', { style: 'margin-top:8px;' },
      el('strong', {}, 'Required credentials: '),
      (result.job.required_credentials || []).join(', ') || el('span', { class: 'muted' }, 'none')
    )
  ));

  // Ranked
  if (result.ranked.length === 0) {
    view.appendChild(el('div', { class: 'panel empty' }, 'No eligible workers for this job.'));
  } else {
    view.appendChild(el('h3', { style: 'margin-bottom:8px;' }, `Ranked workers (${result.ranked.length})`));
    for (const r of result.ranked) {
      view.appendChild(renderRankCard(jobId, r, r.rank === 1));
    }
  }

  // Blocked
  if (result.blocked.length > 0) {
    view.appendChild(el('h3', { style: 'margin-top:24px; margin-bottom:8px;' },
      `Blocked workers (${result.blocked.length})`));
    for (const b of result.blocked) {
      view.appendChild(renderBlockedCard(b));
    }
  }
}

function renderRankCard(jobId, r, isTop) {
  const hasWarnings = r.warnings && r.warnings.length > 0;
  const card = el('div', { class: `rank-card ${isTop ? 'top' : (hasWarnings ? 'warn' : '')}` });

  card.appendChild(el('div', { class: 'rank-head' },
    el('div', {},
      el('div', { class: 'rank-name' },
        `#${r.rank} ${r.worker.name}`,
        isTop ? el('span', { class: 'pill pill-ok', style: 'margin-left:8px;' }, 'recommended') : null
      ),
      el('div', { class: 'rank-meta' },
        `${r.worker.role} · ${r.worker.employment_type} · ${r.worker.status}`
      )
    ),
    el('div', { class: 'rank-score' }, `${r.score}`)
  ));

  // Score breakdown
  const breakdown = el('div', { class: 'breakdown' });
  for (const [factor, info] of Object.entries(r.score_breakdown)) {
    breakdown.appendChild(el('div', {},
      el('strong', {}, `${factor.replace(/_/g, ' ')}:`),
      ` ${info.score} × ${info.weight} = ${info.weighted.toFixed(1)}`
    ));
  }
  card.appendChild(breakdown);

  // Detail line per factor
  card.appendChild(el('details', {},
    el('summary', {}, 'Factor details'),
    el('ul', {}, ...Object.entries(r.score_breakdown).map(([k, v]) =>
      el('li', { class: 'small' }, `${k}: ${v.detail}`)
    ))
  ));

  // Warnings
  if (hasWarnings) {
    const ul = el('ul');
    for (const w of r.warnings) ul.appendChild(el('li', {}, w.detail || w.type));
    card.appendChild(el('div', { class: 'alerts' },
      el('strong', {}, 'Warnings: '),
      ul
    ));
  }

  // Action: allocate
  card.appendChild(el('div', { class: 'actions' },
    el('a', { href: `#/jobs/${jobId}/allocate/${r.worker.id}` },
      el('button', {}, isTop ? 'Allocate' : 'Allocate (override)')
    )
  ));

  return card;
}

function renderBlockedCard(b) {
  const card = el('div', { class: 'rank-card blocked' });
  card.appendChild(el('div', { class: 'rank-head' },
    el('div', {},
      el('div', { class: 'rank-name' }, `${b.worker.name} `,
        el('span', { class: 'pill pill-bad', style: 'margin-left:8px;' }, 'blocked')),
      el('div', { class: 'rank-meta' },
        `${b.worker.role} · ${b.worker.status}`)
    )
  ));
  const ul = el('ul');
  for (const blk of b.blocks) {
    ul.appendChild(el('li', {}, `${blk.type}: ${blk.detail || ''}`));
  }
  card.appendChild(el('div', { class: 'alerts' },
    el('strong', {}, 'Block reasons:'), ul
  ));
  return card;
}

// ─── Allocate ─────────────────────────────────────────────────────────────────
async function renderAllocate(jobId, workerId) {
  const view = document.getElementById('view');
  view.innerHTML = '';

  // Re-run SmartRank to get current entry for this worker
  const result = await api('GET', `/jobs/${jobId}/smartrank`);
  const ranked = result.ranked.find(r => r.worker.id === workerId);
  const blocked = result.blocked.find(b => b.worker.id === workerId);

  view.appendChild(el('div', { class: 'toolbar' },
    el('h2', {}, 'Confirm allocation'),
    el('a', { href: `#/jobs/${jobId}/smartrank` },
      el('button', { class: 'secondary' }, '← Back to SmartRank'))
  ));

  if (blocked) {
    const card = el('div', { class: 'panel' });
    card.appendChild(el('h3', {}, `${blocked.worker.name}`));
    card.appendChild(el('div', { class: 'pill pill-bad' }, 'Hard-blocked — cannot allocate'));
    const ul = el('ul');
    for (const blk of blocked.blocks) ul.appendChild(el('li', {}, blk.detail || blk.type));
    card.appendChild(el('div', { class: 'alerts', style: 'margin-top:10px;' },
      el('strong', {}, 'Block reasons:'), ul
    ));
    view.appendChild(card);
    return;
  }

  if (!ranked) {
    view.appendChild(el('div', { class: 'panel' },
      el('p', {}, 'Worker is not currently in the ranked list. Re-run SmartRank.')));
    return;
  }

  const isTop = ranked.rank === 1;
  const hasWarnings = ranked.warnings.length > 0;
  const requiresReason = !isTop || hasWarnings;

  const panel = el('div', { class: 'panel' });
  panel.appendChild(el('h3', {}, `${ranked.worker.name} — rank #${ranked.rank}, score ${ranked.score}`));
  if (!isTop) {
    panel.appendChild(el('div', { class: 'pill pill-warn' },
      `Lower-ranked selection (top is rank #1: ${result.ranked[0].worker.name})`));
  }
  if (hasWarnings) {
    const ul = el('ul');
    for (const w of ranked.warnings) ul.appendChild(el('li', {}, w.detail || w.type));
    panel.appendChild(el('div', { class: 'alerts', style: 'margin-top:10px;' },
      el('strong', {}, 'Warnings: '), ul));
  }

  const form = el('form');
  if (requiresReason) {
    form.appendChild(el('label', {},
      el('span', {}, 'Override reason (required) *'),
      el('textarea', { name: 'override_reason', required: true,
        placeholder: hasWarnings
          ? 'Explain why this allocation is acceptable despite warnings…'
          : 'Explain why a lower-ranked worker is being selected…' })
    ));
  }
  const errBox = el('div', { class: 'error' });
  form.appendChild(errBox);

  const successBox = el('div', { class: 'panel hidden' });
  form.appendChild(el('div', {},
    el('button', { type: 'submit' }, 'Confirm allocation'),
    ' ',
    el('a', { href: `#/jobs/${jobId}/smartrank` },
      el('button', { type: 'button', class: 'secondary' }, 'Cancel'))
  ));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.textContent = '';
    const fd = new FormData(form);
    const body = { worker_id: workerId };
    if (requiresReason) body.override_reason = fd.get('override_reason');
    try {
      const alloc = await api('POST', `/jobs/${jobId}/allocations`, body);
      toast('Allocation confirmed', 'success');
      successBox.classList.remove('hidden');
      successBox.innerHTML = '';
      successBox.appendChild(el('h3', {}, 'Allocation confirmed ✓'));
      successBox.appendChild(el('div', { class: 'kv' },
        el('div', {}, 'Allocation ID'), el('div', { class: 'mono' }, alloc.id),
        el('div', {}, 'Worker'), el('div', {}, ranked.worker.name),
        el('div', {}, 'SmartRank position'), el('div', {}, `#${alloc.smartrank_position} (score ${alloc.smartrank_score})`),
        el('div', {}, 'Allocated at'), el('div', {}, fmtDate(alloc.allocated_at))
      ));
      successBox.appendChild(el('details', { open: 'open' },
        el('summary', {}, 'Snapshot summary'),
        el('pre', { class: 'mono' },
          JSON.stringify(alloc.smartrank_snapshot, null, 2))
      ));
      successBox.appendChild(el('div', { style: 'margin-top:12px;' },
        el('a', { href: `#/jobs/${jobId}` }, el('button', {}, 'View job'))
      ));
      // Hide the form once submitted
      form.querySelectorAll('button, input, textarea').forEach(b => b.disabled = true);
    } catch (err) {
      errBox.innerHTML = '';
      errBox.appendChild(el('strong', {}, `Allocation rejected (HTTP ${err.status}): `));
      errBox.appendChild(document.createTextNode(err.error));
      if (err.data && err.data.blocks) {
        const ul = el('ul');
        for (const b of err.data.blocks) ul.appendChild(el('li', {}, b.detail || b.type));
        errBox.appendChild(ul);
      }
      if (err.data && err.data.warnings) {
        const ul = el('ul');
        for (const w of err.data.warnings) ul.appendChild(el('li', {}, w.detail || w.type));
        errBox.appendChild(ul);
      }
    }
  });

  panel.appendChild(form);
  panel.appendChild(successBox);
  view.appendChild(panel);
}

// ─── Audit log ────────────────────────────────────────────────────────────────
async function renderAudit() {
  const view = document.getElementById('view');
  view.innerHTML = '';

  const url = new URL(location.href);
  const eventType = url.searchParams.get('event_type') || '';

  view.appendChild(el('div', { class: 'toolbar' },
    el('h2', {}, 'Audit log'),
    el('div', {})
  ));

  view.appendChild(el('div', { class: 'read-only-banner' },
    'Read-only — audit events are append-only and cannot be modified.'));

  const filter = el('div', { class: 'panel' });
  filter.appendChild(el('label', {},
    el('span', {}, 'Filter by event type'),
    (() => {
      const sel = el('select', { id: 'audit-filter' });
      const options = ['', 'smartrank_generated', 'allocation_confirmed', 'allocation_rejected',
        'allocation_changed', 'warning_acknowledged', 'non_top_ranked_selected',
        'job_created', 'job_status_changed',
        'credential_block_applied', 'fatigue_block_applied', 'fatigue_warning_triggered',
        'availability_block_applied', 'credential_expiry_alert'];
      for (const o of options) {
        const opt = el('option', { value: o }, o || '— all —');
        if (o === eventType) opt.selected = true;
        sel.appendChild(opt);
      }
      sel.addEventListener('change', (e) => {
        const v = e.target.value;
        if (v) location.hash = `#/audit?event_type=${encodeURIComponent(v)}`;
        else location.hash = '#/audit';
      });
      return sel;
    })()
  ));
  view.appendChild(filter);

  const qs = eventType ? `?event_type=${encodeURIComponent(eventType)}&limit=100` : '?limit=100';
  const audit = await api('GET', `/audit-events${qs}`);

  const panel = el('div', { class: 'panel' });
  panel.appendChild(el('div', { class: 'small muted' },
    `${audit.events.length} of ${audit.total} events shown`));
  panel.appendChild(auditEventsTable(audit.events));
  view.appendChild(panel);
}

// Workaround for hash query strings: parse from location.hash
function parseHashQuery() {
  const m = location.hash.match(/\?(.+)$/);
  if (!m) return new URLSearchParams();
  return new URLSearchParams(m[1]);
}

function auditEventsTable(events) {
  if (!events || events.length === 0) {
    return el('div', { class: 'empty' }, 'No audit events.');
  }
  const t = el('table');
  t.appendChild(el('thead', {}, el('tr', {},
    el('th', {}, 'Timestamp'), el('th', {}, 'Event'),
    el('th', {}, 'Worker'), el('th', {}, 'Job'),
    el('th', {}, 'Payload')
  )));
  const tb = el('tbody');
  for (const e of events) {
    const evtPill = ['allocation_rejected', 'credential_block_applied', 'fatigue_block_applied', 'availability_block_applied']
      .includes(e.event_type) ? 'pill-bad'
      : ['warning_acknowledged', 'fatigue_warning_triggered', 'non_top_ranked_selected', 'credential_expiry_alert']
      .includes(e.event_type) ? 'pill-warn'
      : ['allocation_confirmed', 'job_created'].includes(e.event_type) ? 'pill-ok'
      : 'pill-info';

    const payloadDetails = el('details', {},
      el('summary', {}, 'view'),
      el('pre', { class: 'mono' }, JSON.stringify(e.payload, null, 2))
    );

    tb.appendChild(el('tr', {},
      el('td', { class: 'small' }, fmtDate(e.timestamp)),
      el('td', {}, el('span', { class: `pill ${evtPill}` }, e.event_type)),
      el('td', { class: 'mono small' }, e.worker_id ? e.worker_id.slice(0, 8) : '—'),
      el('td', { class: 'mono small' }, e.job_id ? e.job_id.slice(0, 8) : '—'),
      el('td', {}, payloadDetails)
    ));
  }
  t.appendChild(tb);
  return t;
}

// ─── Pilot metrics ────────────────────────────────────────────────────────────
async function renderMetrics() {
  const view = document.getElementById('view');
  view.innerHTML = '';

  view.appendChild(el('div', { class: 'toolbar' },
    el('h2', {}, 'Pilot metrics'),
    el('button', {
      class: 'secondary',
      onclick: () => window.print()
    }, 'Print / save as PDF')
  ));

  const m = await api('GET', '/metrics');

  view.appendChild(el('div', { class: 'panel' },
    el('div', { class: 'small muted' },
      `Period: ${m.period.from} to ${m.period.to}`),
    el('div', { class: 'metrics-grid', style: 'margin-top:14px;' },
      ...[
        ['Total jobs', m.total_jobs],
        ['Total allocations', m.total_allocations],
        ['Top-ranked selections', m.top_ranked_selections],
        ['Lower-ranked selections', m.lower_ranked_selections],
        ['Credential blocks', m.credential_blocks],
        ['Fatigue blocks', m.fatigue_blocks],
        ['Fatigue warnings', m.fatigue_warnings],
        ['Availability blocks', m.availability_blocks],
        ['Warning overrides', m.warning_overrides],
        ['Allocation rejections', m.allocation_rejections],
        ['Total audit events', m.total_audit_events],
      ].map(([label, value]) => el('div', { class: 'metric-tile' },
        el('div', { class: 'label' }, label),
        el('div', { class: 'value' }, String(value))
      ))
    )
  ));

  view.appendChild(el('div', { class: 'panel small muted' },
    'These metrics are derived from append-only audit events. ',
    'Values reflect the entire pilot history for this company.'
  ));
}
