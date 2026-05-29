'use strict';

const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_FILES_PER_BATCH = 5;
const MAX_TENANT_BYTES = 50 * 1024 * 1024;
const MAX_NOTES_LENGTH = 1000;

const CATEGORY_LABELS = {
  worker_list: 'Worker list',
  asset_plant_list: 'Asset / plant list',
  credential_ticket_records: 'Credential / ticket records',
  roster_allocation_sheet: 'Roster / allocation sheet',
  job_history: 'Job history',
  client_site_notes: 'Client / site notes',
  equipment_list: 'Equipment list',
  insurance_compliance_schedule: 'Insurance / compliance schedule',
  internal_report: 'Internal report',
  other: 'Other'
};

const REVIEW_STATUS_LABELS = {
  pending_review: 'Pending review',
  under_review: 'Reviewing',
  needs_clarification: 'Needs clarification',
  ready_for_structuring: 'Ready for structuring',
  structured: 'Structured',
  rejected: 'Rejected',
  deleted: 'Deleted'
};

const ALLOWED_EXTENSIONS = new Map([
  ['.csv', ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain', 'application/octet-stream']],
  ['.xlsx', ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip', 'application/octet-stream']],
  ['.xls', ['application/vnd.ms-excel', 'application/octet-stream']],
  ['.pdf', ['application/pdf', 'application/octet-stream']],
  ['.doc', ['application/msword', 'application/octet-stream']],
  ['.docx', ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/octet-stream']],
  ['.png', ['image/png', 'application/octet-stream']],
  ['.jpg', ['image/jpeg', 'application/octet-stream']],
  ['.jpeg', ['image/jpeg', 'application/octet-stream']],
  ['.webp', ['image/webp', 'application/octet-stream']]
]);

const SIGNATURE_CHECKS = {
  '.pdf': (buffer) => buffer.slice(0, 4).toString('ascii') === '%PDF',
  '.png': (buffer) => buffer.length >= 8
    && buffer[0] === 0x89
    && buffer[1] === 0x50
    && buffer[2] === 0x4e
    && buffer[3] === 0x47,
  '.jpg': (buffer) => buffer.length >= 3
    && buffer[0] === 0xff
    && buffer[1] === 0xd8
    && buffer[2] === 0xff,
  '.jpeg': (buffer) => SIGNATURE_CHECKS['.jpg'](buffer),
  '.webp': (buffer) => buffer.length >= 12
    && buffer.slice(0, 4).toString('ascii') === 'RIFF'
    && buffer.slice(8, 12).toString('ascii') === 'WEBP',
  '.xlsx': (buffer) => buffer.slice(0, 2).toString('ascii') === 'PK',
  '.docx': (buffer) => buffer.slice(0, 2).toString('ascii') === 'PK',
  '.xls': (buffer) => buffer.length >= 8
    && buffer[0] === 0xd0
    && buffer[1] === 0xcf
    && buffer[2] === 0x11
    && buffer[3] === 0xe0,
  '.doc': (buffer) => SIGNATURE_CHECKS['.xls'](buffer)
};

function publicError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function decodeHeaderValue(value = '') {
  try {
    return decodeURIComponent(String(value || ''));
  } catch {
    return String(value || '');
  }
}

function sanitizeOriginalFilename(value) {
  const raw = decodeHeaderValue(value)
    .replace(/\0/g, '')
    .split(/[\\/]/)
    .pop()
    .trim();
  const cleaned = raw.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ');
  return cleaned.slice(0, 180) || 'source-document';
}

function extensionFor(filename) {
  return path.extname(filename || '').toLowerCase();
}

function sanitizePathSegment(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'tenant';
}

function storageBaseDir() {
  if (process.env.SOURCE_UPLOAD_DIR) return path.resolve(process.env.SOURCE_UPLOAD_DIR);
  const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/liftiq.db');
  return path.join(path.dirname(path.resolve(dbPath)), 'source-uploads');
}

function storagePathForKey(storedKey) {
  const base = storageBaseDir();
  const target = path.resolve(base, storedKey);
  if (!target.startsWith(base + path.sep)) {
    throw publicError(400, 'Invalid upload storage key');
  }
  return target;
}

function validateCategory(category) {
  if (!Object.prototype.hasOwnProperty.call(CATEGORY_LABELS, category)) {
    throw publicError(400, 'Select what this document contains before uploading.');
  }
  return category;
}

function validateReviewStatus(status) {
  if (!Object.prototype.hasOwnProperty.call(REVIEW_STATUS_LABELS, status)) {
    throw publicError(400, 'Unsupported review status.');
  }
  return status;
}

function validateFile({ filename, mimeType, buffer }) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw publicError(400, 'Choose a source document before uploading.');
  }
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw publicError(413, 'This file is too large for pilot setup review. Upload files up to 10MB.');
  }

  const extension = extensionFor(filename);
  const allowedMimes = ALLOWED_EXTENSIONS.get(extension);
  if (!allowedMimes) {
    throw publicError(400, 'This file type is not supported for pilot setup review. Please upload PDF, Word, Excel, CSV, JPG, PNG, or WEBP.');
  }

  const normalizedMime = String(mimeType || 'application/octet-stream').toLowerCase().split(';')[0].trim() || 'application/octet-stream';
  if (!allowedMimes.includes(normalizedMime)) {
    throw publicError(400, 'This file type is not supported for pilot setup review. Please upload PDF, Word, Excel, CSV, JPG, PNG, or WEBP.');
  }

  const signatureCheck = SIGNATURE_CHECKS[extension];
  if (signatureCheck && !signatureCheck(buffer)) {
    throw publicError(400, 'The uploaded file does not match the selected file type. Please check the file and upload it again.');
  }

  return { extension, mimeType: normalizedMime };
}

function tenantStoredBytes(db, companyId) {
  const row = db.prepare(`
    SELECT COALESCE(SUM(file_size_bytes), 0) AS bytes
    FROM source_uploads
    WHERE company_id = ? AND review_status != 'deleted'
  `).get(companyId);
  return Number(row?.bytes || 0);
}

function serializeUpload(row, options = {}) {
  if (!row) return null;
  const output = {
    id: row.id,
    uploaded_by_email: row.uploaded_by_email,
    original_filename: row.original_filename,
    file_size_bytes: row.file_size_bytes,
    mime_type: row.mime_type,
    extension: row.extension,
    category: row.category,
    category_label: CATEGORY_LABELS[row.category] || row.category,
    notes: row.notes,
    review_status: row.review_status,
    review_status_label: REVIEW_STATUS_LABELS[row.review_status] || row.review_status,
    review_notes: row.review_notes,
    created_at: row.created_at,
    reviewed_at: row.reviewed_at,
    deleted_at: row.deleted_at
  };
  if (options.internal) {
    output.tenant_id = row.tenant_id;
    output.company_id = row.company_id;
    output.uploaded_by_user_id = row.uploaded_by_user_id;
    output.reviewed_by_user_id = row.reviewed_by_user_id;
    output.deleted_by_user_id = row.deleted_by_user_id;
    output.stored_key = row.stored_key;
  }
  return output;
}

function loadUpload(db, id, user, options = {}) {
  const row = options.scope === 'all' && user.is_internal_admin
    ? db.prepare(`SELECT * FROM source_uploads WHERE id = ?`).get(id)
    : db.prepare(`SELECT * FROM source_uploads WHERE id = ? AND company_id = ?`).get(id, user.company_id);
  return row || null;
}

function createSourceUpload(db, user, input) {
  const originalFilename = sanitizeOriginalFilename(input.originalFilename);
  const category = validateCategory(input.category);
  const notes = String(input.notes || '').trim().slice(0, MAX_NOTES_LENGTH) || null;
  const { extension, mimeType } = validateFile({
    filename: originalFilename,
    mimeType: input.mimeType,
    buffer: input.buffer
  });

  const existingBytes = tenantStoredBytes(db, user.company_id);
  if (existingBytes + input.buffer.length > MAX_TENANT_BYTES) {
    throw publicError(413, 'This tenant has reached the pilot source-document upload limit. Contact DispatchTalon before uploading more files.');
  }

  const id = randomUUID();
  const tenantSegment = sanitizePathSegment(user.company_id);
  const storedKey = `${tenantSegment}/${id}${extension}`;
  const target = storagePathForKey(storedKey);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, input.buffer, { flag: 'wx', mode: 0o600 });

  try {
    db.prepare(`
      INSERT INTO source_uploads (
        id, tenant_id, company_id, uploaded_by_user_id, uploaded_by_email,
        original_filename, stored_key, file_size_bytes, mime_type, extension,
        category, notes, review_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_review')
    `).run(
      id,
      user.company_id,
      user.company_id,
      user.id,
      user.email || null,
      originalFilename,
      storedKey,
      input.buffer.length,
      mimeType,
      extension.replace(/^\./, ''),
      category,
      notes
    );
  } catch (err) {
    try { fs.unlinkSync(target); } catch {}
    throw err;
  }

  return serializeUpload(db.prepare(`SELECT * FROM source_uploads WHERE id = ?`).get(id));
}

function listSourceUploads(db, user, options = {}) {
  const internal = options.scope === 'all' && user.is_internal_admin;
  const status = options.status && validateReviewStatus(options.status);
  const params = [];
  const where = [];

  if (!internal) {
    where.push('company_id = ?');
    params.push(user.company_id);
  }
  if (status) {
    where.push('review_status = ?');
    params.push(status);
  } else if (!options.includeDeleted) {
    where.push(`review_status != 'deleted'`);
  }

  const sql = `
    SELECT *
    FROM source_uploads
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY created_at DESC
    LIMIT 200
  `;
  return db.prepare(sql).all(...params).map((row) => serializeUpload(row, { internal }));
}

function updateSourceUploadStatus(db, user, id, input) {
  if (!user.is_internal_admin) {
    throw publicError(403, 'Internal admin access required');
  }
  const status = validateReviewStatus(input.review_status);
  if (status === 'deleted') {
    throw publicError(400, 'Use delete to remove a source upload.');
  }
  const reviewNotes = String(input.review_notes || '').trim().slice(0, MAX_NOTES_LENGTH) || null;
  const current = loadUpload(db, id, user, { scope: 'all' });
  if (!current) return null;

  db.prepare(`
    UPDATE source_uploads
    SET review_status = ?,
        review_notes = ?,
        reviewed_at = datetime('now'),
        reviewed_by_user_id = ?
    WHERE id = ?
  `).run(status, reviewNotes, user.id, id);

  return {
    before: serializeUpload(current, { internal: true }),
    after: serializeUpload(db.prepare(`SELECT * FROM source_uploads WHERE id = ?`).get(id), { internal: true })
  };
}

function deleteSourceUpload(db, user, id) {
  const current = loadUpload(db, id, user, user.is_internal_admin ? { scope: 'all' } : {});
  if (!current) return null;
  if (current.review_status === 'deleted') {
    return serializeUpload(current, { internal: user.is_internal_admin });
  }

  const target = storagePathForKey(current.stored_key);
  try { fs.unlinkSync(target); } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  db.prepare(`
    UPDATE source_uploads
    SET review_status = 'deleted',
        deleted_at = datetime('now'),
        deleted_by_user_id = ?,
        reviewed_at = COALESCE(reviewed_at, datetime('now')),
        reviewed_by_user_id = COALESCE(reviewed_by_user_id, ?)
    WHERE id = ?
  `).run(user.id, user.id, id);

  return serializeUpload(db.prepare(`SELECT * FROM source_uploads WHERE id = ?`).get(id), { internal: user.is_internal_admin });
}

function getDownloadPath(db, user, id) {
  if (!user.is_internal_admin) {
    throw publicError(403, 'Internal admin access required');
  }
  const row = loadUpload(db, id, user, { scope: 'all' });
  if (!row || row.review_status === 'deleted') return null;
  return {
    row,
    path: storagePathForKey(row.stored_key)
  };
}

module.exports = {
  ALLOWED_EXTENSIONS,
  CATEGORY_LABELS,
  MAX_FILES_PER_BATCH,
  MAX_FILE_SIZE_BYTES,
  MAX_TENANT_BYTES,
  REVIEW_STATUS_LABELS,
  createSourceUpload,
  deleteSourceUpload,
  getDownloadPath,
  listSourceUploads,
  loadUpload,
  serializeUpload,
  updateSourceUploadStatus
};
