'use strict';

// ─── Constants ────────────────────────────────────────────────────────────────

const CRED_TYPES = [
  ['high_risk_licence_crane',   'HRL — Crane Operation'],
  ['high_risk_licence_dogging', 'HRL — Dogging'],
  ['high_risk_licence_rigging', 'HRL — Rigging'],
  ['white_card',                'White Card'],
  ['msic_card',                 'MSIC Card'],
  ['site_induction',            'Site Induction'],
  ['client_induction',          'Client Induction'],
  ['medical_clearance',         'Medical Clearance'],
  ['drivers_licence',           "Driver's Licence"],
  ['other',                     'Other'],
];

const WORKER_ROLES = [
  ['crane_operator',     'Crane Operator'],
  ['dogman',             'Dogman'],
  ['rigger',             'Rigger'],
  ['traffic_controller', 'Traffic Controller'],
  ['supervisor',         'Supervisor'],
  ['allocator',          'Allocator'],
];

const EMP_TYPES = [
  ['permanent',   'Permanent'],
  ['casual',      'Casual'],
  ['contractor',  'Contractor'],
  ['labour_hire', 'Labour Hire'],
];

const SHIFT_TYPES = [
  ['day',   'Day'],
  ['night', 'Night'],
  ['split', 'Split'],
];

const RISK_LEVELS = [
  ['routine',  'Routine'],
  ['complex',  'Complex'],
  ['critical', 'Critical'],
];

const SCORE_FACTORS = [
  ['credential_match', 'Credential Match', 25],
  ['crane_experience', 'Crane Experience',  20],
  ['fatigue_risk',     'Fatigue Risk',      20],
  ['availability',     'Availability',      15],
  ['site_familiarity', 'Site Familiarity',  10],
  ['fairness',         'Fairness / Load',    5],
  ['travel',           'Travel Burden',      5],
];

const EVENT_LABELS = {
  smartrank_generated:       'SmartRank Run',
  credential_block_applied:  'Credential Block',
  fatigue_block_applied:     'Fatigue Block',
  fatigue_warning_triggered: 'Fatigue Warning',
  allocation_confirmed:      'Allocated',
  allocation_changed:        'Allocation Changed',
  allocation_rejected:       'Allocation Rejected',
  warning_acknowledged:      'Warning Override',
  non_top_ranked_selected:   'Non-Top Selected',
  credential_expiry_alert:   'Expiry Alert',
  job_created:               'Job Created',
  job_status_changed:        'Status Changed',
};

const EVENT_BADGE_COLORS = {
  smartrank_generated:       'badge-blue',
  credential_block_applied:  'badge-red',
  fatigue_block_applied:     'badge-red',
  fatigue_warning_triggered: 'badge-orange',
  allocation_confirmed:      'badge-green',
  allocation_changed:        'badge-orange',
  allocation_rejected:       'badge-red',
  warning_acknowledged:      'badge-orange',
  non_top_ranked_selected:   'badge-orange',
  credential_expiry_alert:   'badge-orange',
  job_created:               'badge-blue',
  job_status_changed:        'badge-blue',
};

// ─── State ────────────────────────────────────────────────────────────────────

let _token = localStorage.getItem('liftiq_token');
let _user  = null;
try { _user = JSON.parse(localStorage.getItem('liftiq_user')); } catch (_) {}

// Cached SmartRank results — used by allocation modal
let _smartrankData = null;

// ─── API ──────────────────────────────────────────────────────────────────────

async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (_token) opts.headers['Authorization'] = `Bearer ${_token}`;
  if (body !== undefined) opts.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch('/api' + path, opts);
  } catch (e) {
    showToast('Network error — is the backend server running?', 'error');
    throw e;
  }

  const data = await res.json();

  if (res.status === 401) {
    doLogout();
    return null;
  }
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = res.status;
    err.data   = data;
    throw err;
  }
  return data;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function setAuth(token, user) {
  _token = token;
  _user  = user;
  localStorage.setItem('liftiq_token', token);
  localStorage.setItem('liftiq_user',  JSON.stringify(user));
}

function doLogout() {
  _token = null;
  _user  = null;
  localStorage.removeItem('liftiq_token');
  localStorage.removeItem('liftiq_user');
  window.location.hash = '#login';
}

// ─── Router ───────────────────────────────────────────────────────────────────

function navigate(hash) {
  window.location.hash = hash;
}

async function route() {
  const hash = window.location.hash || '#login';

  if (!_token) {
    document.getElementById('main-layout').style.display = 'none';
    document.getElementById('login-page').style.display  = 'flex';
    if (hash !== '#login') { navigate('#login'); }
    return;
  }

  // Authenticated: show main layout
  document.getElementById('login-page').style.display  = 'none';
  document.getElementById('main-layout').style.display = 'grid';

  // Update sidebar user info
  const userEl = document.getElementById('sidebar-user');
  if (userEl && _user) {
    userEl.textContent = `${_user.name} · ${_user.role}`;
  }

  // Update active nav link
  document.querySelectorAll('.nav-link').forEach(el => {
    const href = el.getAttribute('href');
    const isActive = href === hash
      || (hash.startsWith('#worker/') && href === '#workers')
      || (hash.startsWith('#job/')    && href === '#jobs');
    el.classList.toggle('active', isActive);
  });

  // Show loading while rendering
  document.getElementById('content').innerHTML = '<div class="loading">Loading…</div>';

  try {
    if (hash === '#dashboard' || hash === '') {
      await renderDashboard();
    } else if (hash === '#workers') {
      await renderWorkers();
    } else if (hash === '#jobs') {
      await renderJobs();
    } else if (hash === '#audit') {
      await renderAudit();
    } else if (hash === '#metrics') {
      await renderMetrics();
    } else {
      const workerMatch    = hash.match(/^#worker\/([^/]+)$/);
      const smartrankMatch = hash.match(/^#job\/([^/]+)\/smartrank$/);
      const jobMatch       = hash.match(/^#job\/([^/]+)$/);

      if (workerMatch)    await renderWorkerDetail(workerMatch[1]);
      else if (smartrankMatch) await renderSmartRank(smartrankMatch[1]);
      else if (jobMatch)  await renderJobDetail(jobMatch[1]);
      else navigate('#dashboard');
    }
  } catch (err) {
    setContent(`<div class="error-state">Error: ${esc(err.message)}</div>`);
  }
}

window.addEventListener('hashchange', route);
window.addEventListener('load', route);

// ─── Login ────────────────────────────────────────────────────────────────────

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  const btn      = e.target.querySelector('button[type=submit]');

  errEl.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Signing in…';

  try {
    const data = await api('POST', '/auth/login', { email, password });
    if (!data) return;
    setAuth(data.token, data.user);
    navigate('#dashboard');
  } catch (err) {
    errEl.textContent = err.message || 'Login failed';
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

async function renderDashboard() {
  const [metrics, workers, jobs] = await Promise.all([
    api('GET', '/metrics'),
    api('GET', '/workers?status=available'),
    api('GET', '/jobs?status=open'),
  ]);

  setContent(`
    <div class="page-header">
      <div>
        <h1>Dashboard</h1>
        <p class="page-sub">Welcome back, ${esc(_user?.name || 'Dispatcher')}</p>
      </div>
    </div>

    <div class="metric-grid">
      ${metricCard('Total Jobs',        metrics.total_jobs,        'blue')}
      ${metricCard('Total Allocations', metrics.total_allocations, 'green')}
      ${metricCard('Credential Blocks', metrics.credential_blocks, 'red')}
      ${metricCard('Fatigue Blocks',    metrics.fatigue_blocks,    'red')}
      ${metricCard('Fatigue Warnings',  metrics.fatigue_warnings,  'orange')}
      ${metricCard('Warning Overrides', metrics.warning_overrides, 'orange')}
    </div>

    <div class="dash-grid">
      <div class="card">
        <div class="card-header">
          <h2>Available Workers <span class="count">(${workers.length})</span></h2>
          <a href="#workers" class="btn btn-sm btn-ghost">View all →</a>
        </div>
        ${workers.length === 0
          ? '<p class="empty">No available workers.</p>'
          : `<div class="worker-quick-list">
              ${workers.slice(0, 8).map(w => `
                <a href="#worker/${w.id}" class="worker-quick-item">
                  <span class="worker-name">${esc(w.name)}</span>
                  <span>${roleLabel(w.role)}</span>
                </a>
              `).join('')}
              ${workers.length > 8 ? `<p class="empty">…and ${workers.length - 8} more</p>` : ''}
            </div>`
        }
      </div>

      <div class="card">
        <div class="card-header">
          <h2>Open Jobs <span class="count">(${jobs.length})</span></h2>
          <a href="#jobs" class="btn btn-sm btn-ghost">View all →</a>
        </div>
        ${jobs.length === 0
          ? '<p class="empty">No open jobs.</p>'
          : `<div class="job-quick-list">
              ${jobs.slice(0, 8).map(j => `
                <a href="#job/${j.id}" class="job-quick-item">
                  <span class="job-name">${esc(j.client_name)} — ${esc(j.site_name)}</span>
                  <span>${fmtDate(j.date)}</span>
                </a>
              `).join('')}
              ${jobs.length > 8 ? `<p class="empty">…and ${jobs.length - 8} more</p>` : ''}
            </div>`
        }
      </div>
    </div>
  `);
}

// ─── Workers list ─────────────────────────────────────────────────────────────

async function renderWorkers() {
  const workers = await api('GET', '/workers');

  setContent(`
    <div class="page-header">
      <div>
        <h1>Workers</h1>
        <p class="page-sub">${workers.length} total</p>
      </div>
      <button class="btn btn-primary" onclick="openAddWorkerModal()">+ Add Worker</button>
    </div>

    ${workers.length === 0
      ? `<div class="empty-state">
          <p>No workers yet.</p>
          <button class="btn btn-primary" onclick="openAddWorkerModal()">Add First Worker</button>
         </div>`
      : `<div class="card">
          <table class="table">
            <thead>
              <tr>
                <th>Name</th><th>Role</th><th>Type</th>
                <th>Crane Classes</th><th>Depot</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${workers.map(w => `
                <tr class="clickable-row" onclick="navigate('#worker/${w.id}')">
                  <td><strong>${esc(w.name)}</strong></td>
                  <td>${roleLabel(w.role)}</td>
                  <td>${empTypeLabel(w.employment_type)}</td>
                  <td>${w.crane_classes.length
                    ? w.crane_classes.map(c => `<span class="tag">${esc(c)}</span>`).join(' ')
                    : '<span style="color:#9ca3af">—</span>'}</td>
                  <td>${esc(w.usual_depot || '—')}</td>
                  <td>${workerStatusBadge(w.status)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`
    }
  `);
}

// ─── Worker detail ────────────────────────────────────────────────────────────

async function renderWorkerDetail(id) {
  const [worker, credentials, fatigue] = await Promise.all([
    api('GET', `/workers/${id}`),
    api('GET', `/workers/${id}/credentials`),
    api('GET', `/workers/${id}/fatigue-records`),
  ]);

  setContent(`
    <div class="page-header">
      <div>
        <a href="#workers" class="back-link">← Workers</a>
        <h1>${esc(worker.name)}</h1>
        <p class="page-sub">${roleLabel(worker.role)} · ${empTypeLabel(worker.employment_type)}</p>
      </div>
      ${workerStatusBadge(worker.status)}
    </div>

    <div class="worker-layout">
      <div class="card worker-info">
        <h3 style="padding:1rem 1.25rem 0">Profile</h3>
        <dl class="info-list">
          <dt>Crane Classes</dt>
          <dd>${worker.crane_classes.length
            ? worker.crane_classes.map(c => `<span class="tag">${esc(c)}</span>`).join(' ')
            : 'None recorded'}</dd>
          <dt>Depot</dt>
          <dd>${esc(worker.usual_depot || '—')}</dd>
          <dt>Contact</dt>
          <dd>${esc(worker.contact_number || '—')}</dd>
          <dt>Availability Note</dt>
          <dd>${esc(worker.availability_note || '—')}</dd>
          ${worker.notes ? `<dt>Notes</dt><dd>${esc(worker.notes)}</dd>` : ''}
        </dl>
        <div class="status-actions">
          <p class="label">Set Status</p>
          <div class="btn-group">
            ${['available', 'unavailable', 'on_leave'].map(s => `
              <button class="btn btn-sm ${worker.status === s ? 'btn-primary' : 'btn-ghost'}"
                onclick="setWorkerStatus('${id}', '${s}')">
                ${s.replace('_', ' ')}
              </button>
            `).join('')}
          </div>
        </div>
      </div>

      <div>
        <div class="section-header">
          <h2>Credentials</h2>
          <button class="btn btn-sm btn-primary" onclick="openAddCredentialModal('${id}')">+ Add Credential</button>
        </div>

        ${credentials.length === 0
          ? '<div class="card"><p class="empty">No credentials recorded.</p></div>'
          : `<div class="card">
              <table class="table">
                <thead>
                  <tr><th>Type</th><th>Identifier</th><th>Issuing Body</th><th>Expires</th><th>Verified</th><th>Status</th></tr>
                </thead>
                <tbody>
                  ${credentials.map(c => `
                    <tr>
                      <td>${credTypeLabel(c.type)}</td>
                      <td class="mono">${esc(c.identifier || '—')}</td>
                      <td>${esc(c.issuing_body || '—')}</td>
                      <td>${c.expiry_date ? fmtDate(c.expiry_date) : '<span style="color:#9ca3af">No expiry</span>'}</td>
                      <td>${c.verified
                        ? '<span class="badge badge-green">Verified</span>'
                        : '<span class="badge badge-gray">Unverified</span>'}</td>
                      <td>${credStatusBadge(c.status)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>`
        }

        <div class="section-header" style="margin-top:1.5rem">
          <h2>Fatigue Records</h2>
          <button class="btn btn-sm btn-primary" onclick="openAddFatigueModal('${id}')">+ Add Shift</button>
        </div>

        ${fatigue.length === 0
          ? '<div class="card"><p class="empty">No fatigue records.</p></div>'
          : `<div class="card">
              <table class="table">
                <thead>
                  <tr><th>Shift Start</th><th>Shift End</th><th>Duration</th><th>Type</th><th>Travel</th><th>Self-Declared</th></tr>
                </thead>
                <tbody>
                  ${fatigue.slice(0, 30).map(f => `
                    <tr>
                      <td class="mono">${fmtDatetime(f.shift_start)}</td>
                      <td class="mono">${fmtDatetime(f.shift_end)}</td>
                      <td>${f.shift_length_hours}h</td>
                      <td>${capitalize(f.shift_type)}</td>
                      <td>${f.travel_hours ? f.travel_hours + 'h' : '—'}</td>
                      <td>${f.self_declared_fatigue
                        ? '<span class="badge badge-red">Yes</span>'
                        : '<span style="color:#9ca3af">No</span>'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>`
        }
      </div>
    </div>
  `);
}

async function setWorkerStatus(workerId, status) {
  try {
    await api('PATCH', `/workers/${workerId}`, { status });
    showToast('Status updated', 'success');
    renderWorkerDetail(workerId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openAddWorkerModal() {
  openModal('Add Worker', `
    <form id="add-worker-form" class="modal-form">
      <div class="form-row">
        <div class="form-group">
          <label>Name *</label>
          <input type="text" id="fw-name" required>
        </div>
        <div class="form-group">
          <label>Role *</label>
          <select id="fw-role" required>
            <option value="">Select role…</option>
            ${WORKER_ROLES.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Employment Type *</label>
          <select id="fw-emp" required>
            <option value="">Select…</option>
            ${EMP_TYPES.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Crane Classes <span style="color:#9ca3af">(comma-separated)</span></label>
          <input type="text" id="fw-classes" placeholder="e.g. 25T, 55T, 130T">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Usual Depot</label>
          <input type="text" id="fw-depot">
        </div>
        <div class="form-group">
          <label>Contact Number</label>
          <input type="text" id="fw-contact">
        </div>
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea id="fw-notes" rows="2"></textarea>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Add Worker</button>
      </div>
    </form>
  `);

  document.getElementById('add-worker-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
    const classes = document.getElementById('fw-classes').value
      .split(',').map(s => s.trim()).filter(Boolean);
    try {
      const worker = await api('POST', '/workers', {
        name:            document.getElementById('fw-name').value,
        role:            document.getElementById('fw-role').value,
        employment_type: document.getElementById('fw-emp').value,
        crane_classes:   classes,
        usual_depot:     document.getElementById('fw-depot').value,
        contact_number:  document.getElementById('fw-contact').value,
        notes:           document.getElementById('fw-notes').value,
      });
      closeModal();
      showToast('Worker added', 'success');
      navigate('#worker/' + worker.id);
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
    }
  });
}

function openAddCredentialModal(workerId) {
  openModal('Add Credential', `
    <form id="add-cred-form" class="modal-form">
      <div class="form-group">
        <label>Credential Type *</label>
        <select id="fc-type" required>
          <option value="">Select type…</option>
          ${CRED_TYPES.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Identifier / Licence Number</label>
          <input type="text" id="fc-id">
        </div>
        <div class="form-group">
          <label>Issuing Body</label>
          <input type="text" id="fc-body" placeholder="e.g. WorkSafe WA">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Issue Date</label>
          <input type="date" id="fc-issue">
        </div>
        <div class="form-group">
          <label>Expiry Date <span style="color:#9ca3af">(blank = no expiry)</span></label>
          <input type="date" id="fc-expiry">
        </div>
      </div>
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" id="fc-verified">
          Credential verified — document sighted
        </label>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Add Credential</button>
      </div>
    </form>
  `);

  document.getElementById('add-cred-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      await api('POST', `/workers/${workerId}/credentials`, {
        type:         document.getElementById('fc-type').value,
        identifier:   document.getElementById('fc-id').value || null,
        issuing_body: document.getElementById('fc-body').value || null,
        issue_date:   document.getElementById('fc-issue').value || null,
        expiry_date:  document.getElementById('fc-expiry').value || null,
        verified:     document.getElementById('fc-verified').checked,
      });
      closeModal();
      showToast('Credential added', 'success');
      renderWorkerDetail(workerId);
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
    }
  });
}

function openAddFatigueModal(workerId) {
  const today = new Date().toISOString().slice(0, 10);
  openModal('Add Fatigue Record', `
    <form id="add-fatigue-form" class="modal-form">
      <div class="form-row">
        <div class="form-group">
          <label>Shift Start *</label>
          <input type="datetime-local" id="ff-start" value="${today}T06:00" required>
        </div>
        <div class="form-group">
          <label>Shift End *</label>
          <input type="datetime-local" id="ff-end" value="${today}T14:00" required>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Shift Type *</label>
          <select id="ff-type" required>
            ${SHIFT_TYPES.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Travel Hours (one-way)</label>
          <input type="number" id="ff-travel" min="0" max="24" step="0.5" value="0">
        </div>
      </div>
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" id="ff-fatigue">
          Worker self-declared fatigue at check-in
        </label>
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea id="ff-notes" rows="2"></textarea>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Add Record</button>
      </div>
    </form>
  `);

  document.getElementById('add-fatigue-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
    const start = new Date(document.getElementById('ff-start').value);
    const end   = new Date(document.getElementById('ff-end').value);
    if (end <= start) {
      showToast('Shift end must be after shift start', 'error');
      btn.disabled = false;
      return;
    }
    try {
      await api('POST', `/workers/${workerId}/fatigue-records`, {
        shift_start:           start.toISOString(),
        shift_end:             end.toISOString(),
        shift_type:            document.getElementById('ff-type').value,
        travel_hours:          parseFloat(document.getElementById('ff-travel').value) || 0,
        self_declared_fatigue: document.getElementById('ff-fatigue').checked,
        notes:                 document.getElementById('ff-notes').value,
      });
      closeModal();
      showToast('Fatigue record added', 'success');
      renderWorkerDetail(workerId);
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
    }
  });
}

// ─── Jobs list ────────────────────────────────────────────────────────────────

async function renderJobs() {
  const jobs = await api('GET', '/jobs');

  setContent(`
    <div class="page-header">
      <div>
        <h1>Jobs</h1>
        <p class="page-sub">${jobs.length} total</p>
      </div>
      <button class="btn btn-primary" onclick="openAddJobModal()">+ Add Job</button>
    </div>

    ${jobs.length === 0
      ? `<div class="empty-state">
          <p>No jobs yet.</p>
          <button class="btn btn-primary" onclick="openAddJobModal()">Add First Job</button>
         </div>`
      : `<div class="card">
          <table class="table">
            <thead>
              <tr>
                <th>Reference</th><th>Client</th><th>Site</th>
                <th>Date</th><th>Shift</th><th>Crane</th><th>Risk</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${jobs.map(j => `
                <tr class="clickable-row" onclick="navigate('#job/${j.id}')">
                  <td class="mono">${esc(j.reference || '—')}</td>
                  <td><strong>${esc(j.client_name)}</strong></td>
                  <td>${esc(j.site_name)}</td>
                  <td>${fmtDate(j.date)}</td>
                  <td>${capitalize(j.shift_type)}</td>
                  <td>${esc(j.crane_class_required || '—')}</td>
                  <td>${riskBadge(j.lift_risk_level)}</td>
                  <td>${jobStatusBadge(j.status)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`
    }
  `);
}

// ─── Job detail ───────────────────────────────────────────────────────────────

async function renderJobDetail(id) {
  const [job, allocations] = await Promise.all([
    api('GET', `/jobs/${id}`),
    api('GET', `/jobs/${id}/allocations`),
  ]);

  const reqs = job.required_credentials || [];
  const crew = job.crew_roles_required  || [];

  setContent(`
    <div class="page-header">
      <div>
        <a href="#jobs" class="back-link">← Jobs</a>
        <h1>${esc(job.client_name)} — ${esc(job.site_name)}</h1>
        <p class="page-sub">${fmtDate(job.date)} · ${capitalize(job.shift_type)} shift${job.crane_class_required ? ' · ' + esc(job.crane_class_required) : ''}</p>
      </div>
      <div class="header-actions">
        ${riskBadge(job.lift_risk_level)}
        ${jobStatusBadge(job.status)}
        <a href="#job/${id}/smartrank" class="btn btn-primary">Run SmartRank →</a>
      </div>
    </div>

    <div class="job-layout">
      <div class="card job-info">
        <h3 style="padding:1rem 1.25rem 0">Job Details</h3>
        <dl class="info-list">
          <dt>Reference</dt>     <dd>${esc(job.reference || '—')}</dd>
          <dt>Site Location</dt> <dd>${esc(job.site_location || '—')}</dd>
          <dt>Shift Start</dt>   <dd>${esc(job.shift_start_time || '—')}</dd>
          <dt>Duration</dt>      <dd>${job.estimated_duration_hours ? job.estimated_duration_hours + 'h' : '—'}</dd>
          <dt>Travel</dt>        <dd>${job.travel_required ? `Yes — ${job.travel_hours_estimated || '?'}h` : 'No'}</dd>
          <dt>Site Conditions</dt>
          <dd>${(job.site_conditions || []).length
            ? job.site_conditions.map(s => `<span class="tag">${esc(s)}</span>`).join(' ')
            : '—'}</dd>
          <dt>Required Credentials</dt>
          <dd>${reqs.length
            ? reqs.map(t => `<span class="tag tag-orange">${credTypeLabel(t)}</span>`).join(' ')
            : '—'}</dd>
          <dt>Crew Required</dt>
          <dd>${crew.length
            ? crew.map(r => `<span class="tag">${roleLabel(r.role)} ×${r.count}</span>`).join(' ')
            : '—'}</dd>
          ${job.notes ? `<dt>Notes</dt><dd>${esc(job.notes)}</dd>` : ''}
        </dl>
        <div class="status-actions">
          <p class="label">Update Status</p>
          <div class="btn-group">
            ${['draft', 'open', 'in_progress', 'complete', 'cancelled'].map(s => `
              <button class="btn btn-sm ${job.status === s ? 'btn-primary' : 'btn-ghost'}"
                onclick="setJobStatus('${id}', '${s}')">
                ${s.replace('_', ' ')}
              </button>
            `).join('')}
          </div>
        </div>
      </div>

      <div>
        <div class="section-header">
          <h2>Crew Allocations</h2>
          <a href="#job/${id}/smartrank" class="btn btn-sm btn-primary">Run SmartRank →</a>
        </div>

        ${allocations.length === 0
          ? `<div class="card"><p class="empty">No allocations yet. <a href="#job/${id}/smartrank">Run SmartRank</a> to select crew.</p></div>`
          : `<div class="card">
              <table class="table">
                <thead>
                  <tr><th>Worker</th><th>Rank at Selection</th><th>Score</th><th>Warnings at Selection</th><th>Status</th><th>Allocated</th></tr>
                </thead>
                <tbody>
                  ${allocations.map(a => {
                    const wName = a.smartrank_snapshot?.ranking_summary
                      ?.find(r => r.worker_id === a.worker_id)?.worker_name
                      || a.worker_id.substring(0, 8) + '…';
                    return `
                      <tr>
                        <td><a href="#worker/${a.worker_id}">${esc(wName)}</a></td>
                        <td>#${a.smartrank_position}</td>
                        <td>${a.smartrank_score}</td>
                        <td>${(a.active_warnings || []).length
                          ? a.active_warnings.map(w => `<span class="badge badge-orange">${esc(w)}</span>`).join(' ')
                          : '—'}</td>
                        <td>${allocStatusBadge(a.status)}</td>
                        <td class="mono">${fmtDatetime(a.allocated_at)}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>`
        }
      </div>
    </div>
  `);
}

async function setJobStatus(jobId, status) {
  try {
    await api('PATCH', `/jobs/${jobId}`, { status });
    showToast('Status updated', 'success');
    renderJobDetail(jobId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openAddJobModal() {
  openModal('Add Job', `
    <form id="add-job-form" class="modal-form">
      <div class="form-row">
        <div class="form-group">
          <label>Reference / PO</label>
          <input type="text" id="fj-ref" placeholder="e.g. JOB-001">
        </div>
        <div class="form-group">
          <label>Client Name *</label>
          <input type="text" id="fj-client" required>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Site Name *</label>
          <input type="text" id="fj-site" required>
        </div>
        <div class="form-group">
          <label>Site Location / Address</label>
          <input type="text" id="fj-location">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Job Date *</label>
          <input type="date" id="fj-date" required>
        </div>
        <div class="form-group">
          <label>Shift Start Time</label>
          <input type="time" id="fj-time">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Shift Type *</label>
          <select id="fj-shift" required>
            ${SHIFT_TYPES.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Estimated Duration (hours)</label>
          <input type="number" id="fj-duration" min="0" max="24" step="0.5">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Crane Class Required</label>
          <input type="text" id="fj-crane" placeholder="e.g. 55T">
        </div>
        <div class="form-group">
          <label>Lift Risk Level *</label>
          <select id="fj-risk" required>
            ${RISK_LEVELS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Required Credentials</label>
        <div class="checkbox-grid">
          ${CRED_TYPES.map(([v, l]) => `
            <label class="checkbox-label">
              <input type="checkbox" class="fj-cred" value="${v}"> ${l}
            </label>
          `).join('')}
        </div>
      </div>
      <div class="form-group">
        <label>Crew Required <span style="color:#9ca3af">(e.g. crane_operator:1, dogman:2)</span></label>
        <input type="text" id="fj-crew" placeholder="crane_operator:1, dogman:2">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="checkbox-label" style="margin-top:1.5rem">
            <input type="checkbox" id="fj-travel"> Travel required
          </label>
        </div>
        <div class="form-group">
          <label>Estimated Travel Hours</label>
          <input type="number" id="fj-travel-h" min="0" max="24" step="0.5" value="0">
        </div>
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea id="fj-notes" rows="2"></textarea>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Create Job</button>
      </div>
    </form>
  `);

  document.getElementById('add-job-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;

    const reqCreds = Array.from(document.querySelectorAll('.fj-cred:checked'))
      .map(el => el.value);

    const crewStr = document.getElementById('fj-crew').value.trim();
    const crewRoles = crewStr
      ? crewStr.split(',').map(s => {
          const parts = s.trim().split(':');
          return { role: parts[0].trim(), count: parseInt(parts[1]) || 1 };
        }).filter(r => r.role)
      : [];

    try {
      const job = await api('POST', '/jobs', {
        reference:               document.getElementById('fj-ref').value || null,
        client_name:             document.getElementById('fj-client').value,
        site_name:               document.getElementById('fj-site').value,
        site_location:           document.getElementById('fj-location').value || null,
        date:                    document.getElementById('fj-date').value,
        shift_start_time:        document.getElementById('fj-time').value || null,
        shift_type:              document.getElementById('fj-shift').value,
        estimated_duration_hours: parseFloat(document.getElementById('fj-duration').value) || null,
        crane_class_required:    document.getElementById('fj-crane').value || null,
        lift_risk_level:         document.getElementById('fj-risk').value,
        required_credentials:    reqCreds,
        crew_roles_required:     crewRoles,
        travel_required:         document.getElementById('fj-travel').checked,
        travel_hours_estimated:  parseFloat(document.getElementById('fj-travel-h').value) || 0,
        notes:                   document.getElementById('fj-notes').value || null,
      });
      closeModal();
      showToast('Job created', 'success');
      navigate('#job/' + job.id);
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
    }
  });
}

// ─── SmartRank ────────────────────────────────────────────────────────────────

async function renderSmartRank(jobId) {
  const data = await api('GET', `/jobs/${jobId}/smartrank`);
  _smartrankData = data; // cache for allocate modal

  const { job, ranked, blocked } = data;

  setContent(`
    <div class="page-header">
      <div>
        <a href="#job/${jobId}" class="back-link">← Job Detail</a>
        <h1>SmartRank — ${esc(job.client_name)} @ ${esc(job.site_name)}</h1>
        <p class="page-sub">${fmtDate(job.date)} · ${capitalize(job.shift_type)} shift${job.crane_class_required ? ' · ' + esc(job.crane_class_required) : ''}</p>
      </div>
      ${riskBadge(job.lift_risk_level)}
    </div>

    ${ranked.length > 0 ? `
      <div class="section-header">
        <h2>Ranked Workers <span class="count">(${ranked.length} available)</span></h2>
      </div>
      <div class="ranked-list">
        ${ranked.map(r => `
          <div class="ranked-card ${r.warnings.length ? 'has-warnings' : ''}">
            <div class="rank-header">
              <div class="rank-left">
                <span class="rank-badge">#${r.rank}</span>
                <div>
                  <a href="#worker/${r.worker.id}" class="worker-link">${esc(r.worker.name)}</a>
                  <div class="worker-meta">
                    ${roleLabel(r.worker.role)} · ${esc(r.worker.usual_depot || 'No depot')} · ${empTypeLabel(r.worker.employment_type)}
                  </div>
                </div>
              </div>
              <div class="rank-right">
                <div class="score-display">
                  <span class="score-value">${r.score}</span>
                  <span class="score-label"> /100</span>
                </div>
                <button class="btn btn-primary btn-sm"
                  onclick="openAllocateModal('${jobId}', '${r.worker.id}')">
                  Allocate
                </button>
              </div>
            </div>
            ${r.warnings.length ? `
              <div class="warnings-section">
                ${r.warnings.map(w => `<span class="badge badge-orange">⚠ ${esc(w)}</span>`).join(' ')}
              </div>
            ` : ''}
            <div class="breakdown-section">
              ${renderScoreBreakdown(r.score_breakdown)}
            </div>
          </div>
        `).join('')}
      </div>
    ` : `
      <div class="card"><p class="empty">No available, non-blocked workers for this job.</p></div>
    `}

    ${blocked.length > 0 ? `
      <div class="section-header" style="margin-top:2rem">
        <h2>Blocked Workers <span class="count">(${blocked.length})</span></h2>
      </div>
      <div class="card">
        <table class="table">
          <thead>
            <tr><th>Worker</th><th>Role</th><th>Block Reasons</th><th>Warnings</th></tr>
          </thead>
          <tbody>
            ${blocked.map(b => `
              <tr>
                <td><a href="#worker/${b.worker.id}">${esc(b.worker.name)}</a></td>
                <td>${roleLabel(b.worker.role)}</td>
                <td>${b.blocks.map(bl => `<span class="badge badge-red">🚫 ${esc(typeof bl === 'string' ? bl : bl.reason || JSON.stringify(bl))}</span>`).join(' ')}</td>
                <td>${b.warnings.length
                  ? b.warnings.map(w => `<span class="badge badge-orange">${esc(w)}</span>`).join(' ')
                  : '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}
  `);
}

function renderScoreBreakdown(breakdown) {
  if (!breakdown) return '';
  return `<table class="breakdown-table"><tbody>
    ${SCORE_FACTORS.map(([key, label, wt]) => {
      const f = breakdown[key];
      if (!f) return '';
      const pct = Math.round(f.score || 0);
      const barClass = pct < 40 ? 'bar-red' : pct < 75 ? 'bar-orange' : 'bar-green';
      return `
        <tr>
          <td class="bd-label">${label} <span style="color:#9ca3af;font-weight:400">${wt}%</span></td>
          <td class="bd-bar">
            <div class="bar-track">
              <div class="bar-fill ${barClass}" style="width:${pct}%"></div>
            </div>
          </td>
          <td class="bd-pct">${pct}</td>
          <td class="bd-detail">${esc(f.detail || '')}</td>
        </tr>
      `;
    }).join('')}
  </tbody></table>`;
}

function openAllocateModal(jobId, workerId) {
  if (!_smartrankData) {
    showToast('SmartRank data not available — please refresh', 'error');
    return;
  }
  const r = _smartrankData.ranked.find(r => r.worker.id === workerId);
  if (!r) {
    showToast('Worker not found in ranking', 'error');
    return;
  }
  const { worker, rank, score, warnings } = r;
  const hasWarnings = warnings.length > 0;

  openModal(`Allocate — ${worker.name}`, `
    <div class="allocate-modal" style="padding:1.5rem">
      <div class="allocate-summary">
        <div class="allocate-worker">
          <strong>${esc(worker.name)}</strong>
          <span>${roleLabel(worker.role)}</span>
        </div>
        <div class="allocate-score">
          <span class="rank-badge">#${rank}</span>
          <span class="score-value" style="font-size:1.25rem">${score}/100</span>
        </div>
      </div>

      ${hasWarnings ? `
        <div class="warning-box">
          <p class="warning-title">⚠ Active Warnings — override reason required to proceed</p>
          <ul>${warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul>
        </div>
      ` : `
        <div class="ok-box">✓ No active warnings. Ready to confirm allocation.</div>
      `}

      ${rank > 1 ? `
        <div class="info-box">
          ℹ This worker is ranked #${rank}, not the top recommendation. This will be logged in AuditIQ.
        </div>
      ` : ''}

      ${hasWarnings ? `
        <div class="form-group">
          <label>Override Reason * <span style="color:#9ca3af;font-weight:400">(required when warnings are active)</span></label>
          <textarea id="alloc-reason" rows="3"
            placeholder="Explain why this worker is being selected despite active warnings…"></textarea>
        </div>
      ` : ''}

      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary"
          onclick="confirmAllocation('${jobId}', '${workerId}', ${hasWarnings})">
          Confirm Allocation
        </button>
      </div>
    </div>
  `);
}

async function confirmAllocation(jobId, workerId, hasWarnings) {
  const reason = hasWarnings
    ? document.getElementById('alloc-reason')?.value?.trim()
    : null;

  if (hasWarnings && !reason) {
    showToast('Override reason is required when warnings are active', 'error');
    return;
  }

  const body = { worker_id: workerId };
  if (reason) body.override_reason = reason;

  try {
    await api('POST', `/jobs/${jobId}/allocations`, body);
    closeModal();
    showToast('Allocation confirmed and logged to AuditIQ', 'success');
    navigate('#job/' + jobId);
  } catch (err) {
    // Show block details if available
    const msg = err.data?.blocks?.join('; ') || err.message;
    showToast(msg, 'error');
  }
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

async function renderAudit() {
  const result = await api('GET', '/audit-events?limit=100&offset=0');
  const events = result.events || [];

  setContent(`
    <div class="page-header">
      <div>
        <h1>Audit Log</h1>
        <p class="page-sub">${result.total} total records — append-only</p>
      </div>
    </div>

    <div class="card">
      <table class="table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Event</th>
            <th>Worker</th>
            <th>Job</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          ${events.length === 0
            ? '<tr><td colspan="5" class="empty">No audit events yet</td></tr>'
            : events.map(e => `
              <tr>
                <td class="mono" style="white-space:nowrap">${fmtDatetime(e.timestamp)}</td>
                <td>${eventTypeBadge(e.event_type)}</td>
                <td>${e.worker_id
                  ? `<a href="#worker/${e.worker_id}">${e.worker_id.substring(0, 8)}…</a>`
                  : '—'}</td>
                <td>${e.job_id
                  ? `<a href="#job/${e.job_id}">${e.job_id.substring(0, 8)}…</a>`
                  : '—'}</td>
                <td style="font-size:0.775rem;color:#6b7280">${auditPayloadSummary(e)}</td>
              </tr>
            `).join('')}
        </tbody>
      </table>
      ${result.total > 100 ? `<p class="empty">Showing 100 of ${result.total} events</p>` : ''}
    </div>
  `);
}

function auditPayloadSummary(event) {
  const p = event.payload || {};
  switch (event.event_type) {
    case 'smartrank_generated':
      return `${p.ranked_count} ranked · ${p.blocked_count} blocked`;
    case 'credential_block_applied':
    case 'fatigue_block_applied':
      return esc((p.blocks || []).join('; ') || p.reason || '');
    case 'allocation_confirmed':
      return `Rank #${p.smartrank_position} · Score ${p.score}`;
    case 'warning_acknowledged':
      return esc(p.override_reason || '');
    case 'non_top_ranked_selected':
      return `Selected #${p.selected_rank} (top was ${esc(p.top_ranked_worker_name || '?')})`;
    case 'fatigue_warning_triggered':
      return esc((p.warnings || []).join('; '));
    default:
      return '';
  }
}

// ─── Pilot Metrics ────────────────────────────────────────────────────────────

async function renderMetrics() {
  const m = await api('GET', '/metrics');
  const topRankedPct = m.total_allocations > 0
    ? Math.round((m.top_ranked_selections / m.total_allocations) * 100)
    : 0;

  setContent(`
    <div class="page-header">
      <div>
        <h1>Pilot Metrics</h1>
        <p class="page-sub">Live since pilot start · All data is real</p>
      </div>
    </div>

    <div class="metric-grid metric-grid-lg">
      ${metricCard('Total Jobs',           m.total_jobs,           'blue')}
      ${metricCard('Total Allocations',    m.total_allocations,    'green')}
      ${metricCard('Top-Ranked Selected',  m.top_ranked_selections,'green',  `${topRankedPct}% of allocations`)}
      ${metricCard('Non-Top Selected',     m.lower_ranked_selections, 'orange')}
      ${metricCard('Credential Blocks',    m.credential_blocks,    'red',    'Hard blocks — credential missing or expired')}
      ${metricCard('Fatigue Blocks',       m.fatigue_blocks,       'red',    'Hard blocks — rest or weekly hour threshold')}
      ${metricCard('Fatigue Warnings',     m.fatigue_warnings,     'orange', 'Warnings triggered')}
      ${metricCard('Warning Overrides',    m.warning_overrides,    'orange', 'Overrides acknowledged with reason')}
      ${metricCard('Total Audit Events',   m.total_audit_events,   'blue',   'Immutable decision records')}
    </div>

    <div class="card" style="margin-top:1.5rem">
      <div class="card-header"><h2>Pilot Success Thresholds</h2></div>
      <table class="table">
        <thead>
          <tr><th>Metric</th><th>Minimum Signal</th><th>Your Pilot</th><th>Strong Signal</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Credential blocks</td>
            <td>≥ 1/month</td>
            <td>${statusCell(m.credential_blocks, 1)}</td>
            <td>Issue prevented from reaching site</td>
          </tr>
          <tr>
            <td>Fatigue warnings triggered</td>
            <td>≥ 1/week</td>
            <td>${statusCell(m.fatigue_warnings, 1)}</td>
            <td>≥ 1 allocation changed due to fatigue</td>
          </tr>
          <tr>
            <td>SmartRank allocations</td>
            <td>> 70% via LIFTIQ</td>
            <td>${statusCell(m.total_allocations, 1)}</td>
            <td>> 90%, dispatcher self-initiating</td>
          </tr>
          <tr>
            <td>Top-ranked selection rate</td>
            <td>—</td>
            <td><span class="badge badge-blue">${topRankedPct}%</span></td>
            <td>Increasing over time = dispatcher trust</td>
          </tr>
          <tr>
            <td>Override documentation</td>
            <td>Some overrides with reasons</td>
            <td>${statusCell(m.warning_overrides, 0)}</td>
            <td>Decreasing over time as trust builds</td>
          </tr>
        </tbody>
      </table>
    </div>
  `);
}

function statusCell(value, min) {
  const ok = value > min;
  return `<span class="badge ${ok ? 'badge-green' : 'badge-gray'}">${value}</span>`;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function openModal(title, bodyHtml) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  document.getElementById('modal-body').innerHTML = '';
}

document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

// ─── Toast ────────────────────────────────────────────────────────────────────

function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast toast-${type} toast-show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.className = 'toast'; }, 3500);
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function setContent(html) {
  document.getElementById('content').innerHTML = html;
}

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function capitalize(str) {
  if (!str) return '—';
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr.length === 10 ? dateStr + 'T00:00:00' : dateStr);
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (_) { return dateStr; }
}

function fmtDatetime(dt) {
  if (!dt) return '—';
  try {
    const d = new Date(dt);
    return d.toLocaleString('en-AU', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch (_) { return dt; }
}

function roleLabel(role) {
  return Object.fromEntries(WORKER_ROLES)[role] || capitalize(role);
}

function empTypeLabel(t) {
  return Object.fromEntries(EMP_TYPES)[t] || capitalize(t);
}

function credTypeLabel(t) {
  return Object.fromEntries(CRED_TYPES)[t] || capitalize(t);
}

function workerStatusBadge(status) {
  const map = {
    available:   'badge-green',
    allocated:   'badge-blue',
    unavailable: 'badge-red',
    on_leave:    'badge-orange',
    inactive:    'badge-gray',
  };
  return `<span class="badge ${map[status] || 'badge-gray'}">${capitalize(status)}</span>`;
}

function credStatusBadge(status) {
  const colorMap = { valid: 'badge-green', expiring_soon: 'badge-orange', expired: 'badge-red', pending_verification: 'badge-gray' };
  const labelMap = { valid: 'Valid', expiring_soon: 'Expiring Soon', expired: 'Expired', pending_verification: 'Pending' };
  return `<span class="badge ${colorMap[status] || 'badge-gray'}">${labelMap[status] || capitalize(status)}</span>`;
}

function jobStatusBadge(status) {
  const colorMap = { draft: 'badge-gray', open: 'badge-blue', allocated: 'badge-green', in_progress: 'badge-purple', complete: 'badge-green', cancelled: 'badge-red' };
  const labelMap = { draft: 'Draft', open: 'Open', allocated: 'Allocated', in_progress: 'In Progress', complete: 'Complete', cancelled: 'Cancelled' };
  return `<span class="badge ${colorMap[status] || 'badge-gray'}">${labelMap[status] || capitalize(status)}</span>`;
}

function riskBadge(risk) {
  const map = { routine: 'badge-gray', complex: 'badge-orange', critical: 'badge-red' };
  return `<span class="badge ${map[risk] || 'badge-gray'}">${capitalize(risk)}</span>`;
}

function allocStatusBadge(status) {
  const map = { confirmed: 'badge-green', changed: 'badge-orange', cancelled: 'badge-red' };
  return `<span class="badge ${map[status] || 'badge-gray'}">${capitalize(status)}</span>`;
}

function eventTypeBadge(type) {
  return `<span class="badge ${EVENT_BADGE_COLORS[type] || 'badge-gray'}">${EVENT_LABELS[type] || capitalize(type)}</span>`;
}

function metricCard(label, value, color, sub) {
  return `
    <div class="metric-card metric-card-${color}">
      <div class="metric-value">${value ?? '—'}</div>
      <div class="metric-label">${label}</div>
      ${sub ? `<div class="metric-sub">${sub}</div>` : ''}
    </div>
  `;
}
