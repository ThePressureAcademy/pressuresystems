'use strict';

const { randomUUID } = require('crypto');
const { workerRoleLabel, normalizeWorkerRole } = require('./intake-catalogues');

const SITE_LOG_STATUSES = new Set([
  'scheduled',
  'signed_in',
  'signed_out',
  'absent',
  'removed',
  'manual_entry'
]);

function normalizeText(value) {
  const text = String(value || '').trim();
  return text || null;
}

function assertDate(value) {
  const date = normalizeText(value);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const error = new Error('date is required in YYYY-MM-DD format');
    error.status = 400;
    throw error;
  }
  return date;
}

function normalizeTimestamp(value, fieldName) {
  if (value == null || value === '') return null;
  const text = String(value).trim();
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    const error = new Error(`${fieldName} must be a valid timestamp`);
    error.status = 400;
    throw error;
  }
  return parsed.toISOString();
}

function assertStatus(value) {
  const status = String(value || 'scheduled').trim();
  if (!SITE_LOG_STATUSES.has(status)) {
    const error = new Error(`status must be one of: ${Array.from(SITE_LOG_STATUSES).join(', ')}`);
    error.status = 400;
    throw error;
  }
  return status;
}

function serializeEntry(row) {
  if (!row) return null;
  return {
    id: row.id,
    site_log_id: row.site_log_id,
    worker_id: row.worker_id,
    worker_name: row.worker_name_snapshot,
    worker_name_snapshot: row.worker_name_snapshot,
    role: row.role,
    role_label: row.role ? workerRoleLabel(row.role) : null,
    company_asset_id: row.company_asset_id,
    asset_name: row.asset_name_snapshot,
    asset_name_snapshot: row.asset_name_snapshot,
    sign_in_time: row.sign_in_time,
    sign_out_time: row.sign_out_time,
    status: row.status,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function serializeLog(row, entries = []) {
  if (!row) return null;
  return {
    id: row.id,
    date: row.date,
    site_name: row.site_name,
    job_id: row.job_id,
    job_name: row.job_name,
    client_name: row.client_name,
    location: row.location,
    notes: row.notes,
    created_by_user_id: row.created_by_user_id,
    updated_by_user_id: row.updated_by_user_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    entries
  };
}

function getSiteLog(db, companyId, siteLogId) {
  return db.prepare(`
    SELECT *
    FROM site_logs
    WHERE id = ? AND company_id = ?
  `).get(siteLogId, companyId);
}

function getSiteLogEntry(db, companyId, siteLogId, entryId) {
  return db.prepare(`
    SELECT *
    FROM site_log_entries
    WHERE id = ? AND site_log_id = ? AND company_id = ?
  `).get(entryId, siteLogId, companyId);
}

function listEntries(db, companyId, siteLogId, filters = {}) {
  const clauses = [`company_id = ?`, `site_log_id = ?`];
  const params = [companyId, siteLogId];

  if (filters.worker_id) {
    clauses.push(`worker_id = ?`);
    params.push(filters.worker_id);
  }
  if (filters.status) {
    clauses.push(`status = ?`);
    params.push(filters.status);
  }
  if (filters.role) {
    clauses.push(`role = ?`);
    params.push(filters.role);
  }
  if (filters.worker_search) {
    clauses.push(`lower(worker_name_snapshot) LIKE ?`);
    params.push(`%${String(filters.worker_search).trim().toLowerCase()}%`);
  }

  return db.prepare(`
    SELECT *
    FROM site_log_entries
    WHERE ${clauses.join(' AND ')}
    ORDER BY
      CASE status
        WHEN 'signed_in' THEN 1
        WHEN 'scheduled' THEN 2
        WHEN 'manual_entry' THEN 3
        WHEN 'signed_out' THEN 4
        WHEN 'absent' THEN 5
        ELSE 6
      END,
      worker_name_snapshot COLLATE NOCASE ASC
  `).all(...params).map(serializeEntry);
}

function listSiteLogs(db, companyId, filters = {}) {
  const clauses = [`company_id = ?`];
  const params = [companyId];

  if (filters.date) {
    clauses.push(`date = ?`);
    params.push(assertDate(filters.date));
  }
  if (filters.site) {
    clauses.push(`lower(site_name) LIKE ?`);
    params.push(`%${String(filters.site).trim().toLowerCase()}%`);
  }
  if (filters.job_id) {
    clauses.push(`job_id = ?`);
    params.push(filters.job_id);
  }

  const rows = db.prepare(`
    SELECT *
    FROM site_logs
    WHERE ${clauses.join(' AND ')}
    ORDER BY date DESC, site_name COLLATE NOCASE ASC, created_at DESC
    LIMIT 100
  `).all(...params);

  return rows
    .map((row) => serializeLog(row, listEntries(db, companyId, row.id, filters)))
    .filter((log) => {
      if (filters.worker_id || filters.worker_search || filters.status || filters.role) {
        return log.entries.length > 0;
      }
      return true;
    });
}

function createSiteLog(db, user, input = {}) {
  const date = assertDate(input.date);
  let job = null;
  if (input.job_id) {
    job = db.prepare(`
      SELECT *
      FROM jobs
      WHERE id = ? AND company_id = ? AND archived_at IS NULL
    `).get(input.job_id, user.company_id);
    if (!job) {
      const error = new Error('Job not found');
      error.status = 404;
      throw error;
    }
  }

  const siteName = normalizeText(input.site_name) || job?.site_name;
  if (!siteName) {
    const error = new Error('site_name is required');
    error.status = 400;
    throw error;
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO site_logs (
      id, company_id, date, site_name, job_id, job_name, client_name, location, notes,
      created_by_user_id, updated_by_user_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    user.company_id,
    date,
    siteName,
    job?.id || normalizeText(input.job_id),
    normalizeText(input.job_name) || job?.reference || job?.site_name || null,
    normalizeText(input.client_name) || job?.client_name || null,
    normalizeText(input.location) || job?.site_location || null,
    normalizeText(input.notes),
    user.id,
    user.id,
    now,
    now
  );

  return serializeLog(getSiteLog(db, user.company_id, id), []);
}

function updateSiteLog(db, user, siteLogId, input = {}) {
  const existing = getSiteLog(db, user.company_id, siteLogId);
  if (!existing) return null;
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE site_logs
    SET date = ?,
        site_name = ?,
        job_name = ?,
        client_name = ?,
        location = ?,
        notes = ?,
        updated_by_user_id = ?,
        updated_at = ?
    WHERE id = ? AND company_id = ?
  `).run(
    Object.prototype.hasOwnProperty.call(input, 'date') ? assertDate(input.date) : existing.date,
    Object.prototype.hasOwnProperty.call(input, 'site_name') ? normalizeText(input.site_name) : existing.site_name,
    Object.prototype.hasOwnProperty.call(input, 'job_name') ? normalizeText(input.job_name) : existing.job_name,
    Object.prototype.hasOwnProperty.call(input, 'client_name') ? normalizeText(input.client_name) : existing.client_name,
    Object.prototype.hasOwnProperty.call(input, 'location') ? normalizeText(input.location) : existing.location,
    Object.prototype.hasOwnProperty.call(input, 'notes') ? normalizeText(input.notes) : existing.notes,
    user.id,
    now,
    siteLogId,
    user.company_id
  );

  return serializeLog(getSiteLog(db, user.company_id, siteLogId), listEntries(db, user.company_id, siteLogId));
}

function workerSnapshot(db, companyId, workerId) {
  const worker = db.prepare(`
    SELECT *
    FROM workers
    WHERE id = ? AND company_id = ? AND archived_at IS NULL
  `).get(workerId, companyId);
  if (!worker) {
    const error = new Error('Worker not found');
    error.status = 404;
    throw error;
  }
  return worker;
}

function assetSnapshot(db, companyId, assetId) {
  if (!assetId) return null;
  const asset = db.prepare(`
    SELECT ca.*, rci.label AS catalogue_label
    FROM company_assets ca
    LEFT JOIN requirement_catalogue_items rci ON rci.id = ca.catalogue_item_id
    WHERE ca.id = ? AND ca.company_id = ? AND ca.asset_status != 'retired'
  `).get(Number(assetId), companyId);
  if (!asset) {
    const error = new Error('Asset not found');
    error.status = 404;
    throw error;
  }
  return {
    id: asset.id,
    name: asset.display_name || `${asset.catalogue_label || 'Asset'} / ${asset.asset_number}`
  };
}

function addSiteLogEntry(db, user, siteLogId, input = {}) {
  const log = getSiteLog(db, user.company_id, siteLogId);
  if (!log) {
    const error = new Error('Site log not found');
    error.status = 404;
    throw error;
  }
  const worker = workerSnapshot(db, user.company_id, input.worker_id);
  const asset = assetSnapshot(db, user.company_id, input.company_asset_id || input.asset_id);
  const status = assertStatus(input.status || 'scheduled');
  const role = normalizeWorkerRole(input.role) || normalizeWorkerRole(worker.role) || null;
  const signInTime = normalizeTimestamp(input.sign_in_time, 'sign_in_time');
  const signOutTime = normalizeTimestamp(input.sign_out_time, 'sign_out_time');
  if (signInTime && signOutTime && signOutTime < signInTime) {
    const error = new Error('sign_out_time cannot be before sign_in_time');
    error.status = 400;
    throw error;
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO site_log_entries (
      id, company_id, site_log_id, worker_id, worker_name_snapshot, role,
      company_asset_id, asset_name_snapshot, sign_in_time, sign_out_time, status, notes,
      created_by_user_id, updated_by_user_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    user.company_id,
    siteLogId,
    worker.id,
    worker.name,
    role,
    asset?.id || null,
    asset?.name || null,
    signInTime,
    signOutTime,
    signOutTime ? 'signed_out' : (signInTime ? 'signed_in' : status),
    normalizeText(input.notes),
    user.id,
    user.id,
    now,
    now
  );

  return serializeEntry(getSiteLogEntry(db, user.company_id, siteLogId, id));
}

function updateSiteLogEntry(db, user, siteLogId, entryId, input = {}) {
  const existing = getSiteLogEntry(db, user.company_id, siteLogId, entryId);
  if (!existing) return null;
  if (existing.status === 'removed') {
    const error = new Error('Removed site log entries cannot be edited');
    error.status = 409;
    throw error;
  }

  const asset = Object.prototype.hasOwnProperty.call(input, 'company_asset_id') || Object.prototype.hasOwnProperty.call(input, 'asset_id')
    ? assetSnapshot(db, user.company_id, input.company_asset_id || input.asset_id)
    : null;
  const nextSignIn = Object.prototype.hasOwnProperty.call(input, 'sign_in_time')
    ? normalizeTimestamp(input.sign_in_time, 'sign_in_time')
    : existing.sign_in_time;
  const nextSignOut = Object.prototype.hasOwnProperty.call(input, 'sign_out_time')
    ? normalizeTimestamp(input.sign_out_time, 'sign_out_time')
    : existing.sign_out_time;
  if (nextSignIn && nextSignOut && nextSignOut < nextSignIn) {
    const error = new Error('sign_out_time cannot be before sign_in_time');
    error.status = 400;
    throw error;
  }

  const nextStatus = Object.prototype.hasOwnProperty.call(input, 'status')
    ? assertStatus(input.status)
    : (nextSignOut ? 'signed_out' : (nextSignIn ? 'signed_in' : existing.status));

  db.prepare(`
    UPDATE site_log_entries
    SET role = ?,
        company_asset_id = ?,
        asset_name_snapshot = ?,
        sign_in_time = ?,
        sign_out_time = ?,
        status = ?,
        notes = ?,
        updated_by_user_id = ?,
        updated_at = ?
    WHERE id = ? AND site_log_id = ? AND company_id = ?
  `).run(
    Object.prototype.hasOwnProperty.call(input, 'role')
      ? (normalizeWorkerRole(input.role) || normalizeText(input.role))
      : existing.role,
    asset ? asset.id : existing.company_asset_id,
    asset ? asset.name : existing.asset_name_snapshot,
    nextSignIn,
    nextSignOut,
    nextStatus,
    Object.prototype.hasOwnProperty.call(input, 'notes') ? normalizeText(input.notes) : existing.notes,
    user.id,
    new Date().toISOString(),
    entryId,
    siteLogId,
    user.company_id
  );

  return serializeEntry(getSiteLogEntry(db, user.company_id, siteLogId, entryId));
}

function signInEntry(db, user, siteLogId, entryId, timestamp) {
  const existing = getSiteLogEntry(db, user.company_id, siteLogId, entryId);
  if (!existing) return null;
  if (existing.status === 'removed') {
    const error = new Error('Removed site log entries cannot be signed in');
    error.status = 409;
    throw error;
  }
  const signInTime = normalizeTimestamp(timestamp || new Date().toISOString(), 'sign_in_time');
  db.prepare(`
    UPDATE site_log_entries
    SET sign_in_time = ?,
        sign_out_time = NULL,
        status = 'signed_in',
        updated_by_user_id = ?,
        updated_at = ?
    WHERE id = ? AND site_log_id = ? AND company_id = ?
  `).run(signInTime, user.id, new Date().toISOString(), entryId, siteLogId, user.company_id);
  return {
    previous_status: existing.status,
    entry: serializeEntry(getSiteLogEntry(db, user.company_id, siteLogId, entryId))
  };
}

function signOutEntry(db, user, siteLogId, entryId, timestamp) {
  const existing = getSiteLogEntry(db, user.company_id, siteLogId, entryId);
  if (!existing) return null;
  if (existing.status === 'removed') {
    const error = new Error('Removed site log entries cannot be signed out');
    error.status = 409;
    throw error;
  }
  if (!existing.sign_in_time) {
    const error = new Error('Worker must be signed in before sign out');
    error.status = 400;
    throw error;
  }
  const signOutTime = normalizeTimestamp(timestamp || new Date().toISOString(), 'sign_out_time');
  if (signOutTime < existing.sign_in_time) {
    const error = new Error('sign_out_time cannot be before sign_in_time');
    error.status = 400;
    throw error;
  }
  db.prepare(`
    UPDATE site_log_entries
    SET sign_out_time = ?,
        status = 'signed_out',
        updated_by_user_id = ?,
        updated_at = ?
    WHERE id = ? AND site_log_id = ? AND company_id = ?
  `).run(signOutTime, user.id, new Date().toISOString(), entryId, siteLogId, user.company_id);
  return {
    previous_status: existing.status,
    entry: serializeEntry(getSiteLogEntry(db, user.company_id, siteLogId, entryId))
  };
}

function removeSiteLogEntry(db, user, siteLogId, entryId, notes = null) {
  const existing = getSiteLogEntry(db, user.company_id, siteLogId, entryId);
  if (!existing) return null;
  db.prepare(`
    UPDATE site_log_entries
    SET status = 'removed',
        notes = COALESCE(?, notes),
        updated_by_user_id = ?,
        updated_at = ?
    WHERE id = ? AND site_log_id = ? AND company_id = ?
  `).run(normalizeText(notes), user.id, new Date().toISOString(), entryId, siteLogId, user.company_id);
  return {
    previous_status: existing.status,
    entry: serializeEntry(getSiteLogEntry(db, user.company_id, siteLogId, entryId))
  };
}

module.exports = {
  SITE_LOG_STATUSES,
  addSiteLogEntry,
  createSiteLog,
  getSiteLog,
  listEntries,
  listSiteLogs,
  removeSiteLogEntry,
  signInEntry,
  signOutEntry,
  updateSiteLog,
  updateSiteLogEntry
};
