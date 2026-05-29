'use strict';

const fs = require('fs');
const express = require('express');
const { getDb } = require('../db');
const { requireAuth, requireRole, requireInternalAdmin } = require('../middleware/auth');
const { appendAuditEvent } = require('../services/audit');
const {
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
} = require('../services/source-uploads');

const router = express.Router();

const uploadBodyParser = express.raw({
  type: 'application/octet-stream',
  limit: MAX_FILE_SIZE_BYTES
});

function decodeHeader(value = '') {
  try {
    return decodeURIComponent(String(value || ''));
  } catch {
    return String(value || '');
  }
}

function truthyHeader(value) {
  return ['1', 'true', 'yes', 'confirmed'].includes(String(value || '').trim().toLowerCase());
}

function uploadConfig() {
  return {
    categories: CATEGORY_LABELS,
    review_statuses: REVIEW_STATUS_LABELS,
    limits: {
      max_file_size_bytes: MAX_FILE_SIZE_BYTES,
      max_files_per_batch: MAX_FILES_PER_BATCH,
      max_tenant_bytes: MAX_TENANT_BYTES,
      accepted_extensions: Array.from(ALLOWED_EXTENSIONS.keys()).map((extension) => extension.replace(/^\./, ''))
    }
  };
}

function uploadAuditPayload(upload) {
  return {
    upload_id: upload.id,
    original_filename: upload.original_filename,
    file_size_bytes: upload.file_size_bytes,
    mime_type: upload.mime_type,
    extension: upload.extension,
    category: upload.category,
    review_status: upload.review_status
  };
}

function sendPublicError(res, err) {
  if (err?.status && err.status < 500) {
    res.status(err.status).json({ error: err.message });
    return true;
  }
  return false;
}

router.get('/', requireAuth, (req, res) => {
  if (req.query.scope === 'all' && !req.user.is_internal_admin) {
    return res.status(403).json({ error: 'Internal admin access required' });
  }
  const db = getDb();
  let uploads;
  try {
    uploads = listSourceUploads(db, req.user, {
      scope: req.query.scope,
      status: req.query.status,
      includeDeleted: req.query.include_deleted === '1'
    });
  } catch (err) {
    if (sendPublicError(res, err)) return;
    throw err;
  }
  res.json({
    ...uploadConfig(),
    uploads
  });
});

router.post(
  '/',
  requireAuth,
  requireRole('admin', 'dispatcher', 'supervisor'),
  uploadBodyParser,
  (req, res) => {
    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).json({ error: 'Upload the source document as a file.' });
    }
    if (!truthyHeader(req.headers['x-source-upload-authorised'])) {
      return res.status(400).json({
        error: 'Confirm you are authorised to share this file for DispatchTalon pilot setup review.'
      });
    }
    if (!truthyHeader(req.headers['x-source-upload-review-only'])) {
      return res.status(400).json({
        error: 'Confirm this upload is for assisted review only and will not update live records automatically.'
      });
    }

    const batchCount = Number.parseInt(req.headers['x-source-upload-batch-count'] || '1', 10);
    if (Number.isFinite(batchCount) && batchCount > MAX_FILES_PER_BATCH) {
      return res.status(400).json({ error: 'Upload up to 5 files in one pilot setup batch.' });
    }

    const db = getDb();
    let upload;
    try {
      upload = createSourceUpload(db, req.user, {
        originalFilename: req.headers['x-source-upload-filename'],
        mimeType: req.headers['x-source-upload-mime-type'] || req.headers['content-type'],
        category: decodeHeader(req.headers['x-source-upload-category']),
        notes: decodeHeader(req.headers['x-source-upload-notes']),
        buffer: req.body
      });
    } catch (err) {
      if (sendPublicError(res, err)) return;
      throw err;
    }

    appendAuditEvent(db, {
      companyId: req.user.company_id,
      eventType: 'source_upload_created',
      userId: req.user.id,
      payload: uploadAuditPayload(upload)
    });

    res.status(201).json({
      message: 'Your file has been uploaded for pilot setup review. The DispatchTalon team will review the source document and help turn relevant worker, asset, or credential information into structured pilot data. No live records have been updated yet.',
      upload
    });
  }
);

router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const row = loadUpload(db, req.params.id, req.user, req.user.is_internal_admin ? { scope: 'all' } : {});
  if (!row || row.review_status === 'deleted') {
    return res.status(404).json({ error: 'Source upload not found' });
  }
  res.json({
    upload: serializeUpload(row, { internal: req.user.is_internal_admin })
  });
});

router.get('/:id/download', requireAuth, requireInternalAdmin, (req, res) => {
  const db = getDb();
  const result = getDownloadPath(db, req.user, req.params.id);
  if (!result) {
    return res.status(404).json({ error: 'Source upload not found' });
  }
  if (!fs.existsSync(result.path)) {
    return res.status(404).json({ error: 'Source upload file is not available on storage' });
  }
  res.download(result.path, result.row.original_filename);
});

router.patch('/:id/status', requireAuth, requireInternalAdmin, (req, res) => {
  const db = getDb();
  let result;
  try {
    result = updateSourceUploadStatus(db, req.user, req.params.id, {
      review_status: req.body?.review_status,
      review_notes: req.body?.review_notes
    });
  } catch (err) {
    if (sendPublicError(res, err)) return;
    throw err;
  }
  if (!result) {
    return res.status(404).json({ error: 'Source upload not found' });
  }

  appendAuditEvent(db, {
    companyId: result.after.company_id,
    eventType: 'source_upload_status_updated',
    userId: req.user.id,
    payload: {
      upload_id: result.after.id,
      from: result.before.review_status,
      to: result.after.review_status,
      review_notes_present: Boolean(result.after.review_notes)
    }
  });

  res.json({ upload: result.after });
});

router.delete('/:id', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  const db = getDb();
  const before = loadUpload(db, req.params.id, req.user, req.user.is_internal_admin ? { scope: 'all' } : {});
  let upload;
  try {
    upload = deleteSourceUpload(db, req.user, req.params.id);
  } catch (err) {
    if (sendPublicError(res, err)) return;
    throw err;
  }
  if (!upload) {
    return res.status(404).json({ error: 'Source upload not found' });
  }

  appendAuditEvent(db, {
    companyId: before?.company_id || req.user.company_id,
    eventType: 'source_upload_deleted',
    userId: req.user.id,
    payload: {
      upload_id: upload.id,
      original_filename: upload.original_filename,
      category: upload.category,
      review_status: upload.review_status
    }
  });

  res.json({ upload });
});

router.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'This file is too large for pilot setup review. Upload files up to 10MB.'
    });
  }
  next(err);
});

module.exports = router;
