'use strict';

const express = require('express');
const { getDb } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { appendAuditEvent } = require('../services/audit');
const {
  addSiteLogEntry,
  createSiteLog,
  listSiteLogs,
  removeSiteLogEntry,
  signInEntry,
  signOutEntry,
  updateSiteLog,
  updateSiteLogEntry
} = require('../services/site-logs');

const router = express.Router();
const canEdit = requireRole('admin', 'dispatcher', 'supervisor');

function sendError(res, error) {
  res.status(error.status || 400).json({ error: error.message || 'Site log request failed' });
}

router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  res.json({
    logs: listSiteLogs(db, req.user.company_id, {
      date: req.query.date,
      site: req.query.site,
      job_id: req.query.job_id,
      worker_id: req.query.worker_id,
      worker_search: req.query.worker,
      role: req.query.role,
      status: req.query.status
    })
  });
});

router.post('/', requireAuth, canEdit, (req, res) => {
  const db = getDb();
  try {
    const log = createSiteLog(db, req.user, req.body || {});
    appendAuditEvent(db, {
      companyId: req.user.company_id,
      eventType: 'site_log_created',
      userId: req.user.id,
      payload: {
        site_log_id: log.id,
        date: log.date,
        site_name: log.site_name,
        job_id: log.job_id
      }
    });
    res.status(201).json(log);
  } catch (error) {
    sendError(res, error);
  }
});

router.patch('/:id', requireAuth, canEdit, (req, res) => {
  const db = getDb();
  try {
    const log = updateSiteLog(db, req.user, req.params.id, req.body || {});
    if (!log) return res.status(404).json({ error: 'Site log not found' });
    appendAuditEvent(db, {
      companyId: req.user.company_id,
      eventType: 'site_log_updated',
      userId: req.user.id,
      payload: {
        site_log_id: log.id,
        date: log.date,
        site_name: log.site_name
      }
    });
    return res.json(log);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/:id/entries', requireAuth, canEdit, (req, res) => {
  const db = getDb();
  try {
    const entry = addSiteLogEntry(db, req.user, req.params.id, req.body || {});
    appendAuditEvent(db, {
      companyId: req.user.company_id,
      eventType: 'site_log_entry_added',
      userId: req.user.id,
      workerId: entry.worker_id,
      payload: {
        site_log_id: req.params.id,
        site_log_entry_id: entry.id,
        worker_name: entry.worker_name,
        status: entry.status
      }
    });
    res.status(201).json(entry);
  } catch (error) {
    sendError(res, error);
  }
});

router.patch('/:id/entries/:entryId', requireAuth, canEdit, (req, res) => {
  const db = getDb();
  try {
    const entry = updateSiteLogEntry(db, req.user, req.params.id, req.params.entryId, req.body || {});
    if (!entry) return res.status(404).json({ error: 'Site log entry not found' });
    appendAuditEvent(db, {
      companyId: req.user.company_id,
      eventType: 'site_log_entry_updated',
      userId: req.user.id,
      workerId: entry.worker_id,
      payload: {
        site_log_id: req.params.id,
        site_log_entry_id: entry.id,
        status: entry.status
      }
    });
    return res.json(entry);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/:id/entries/:entryId/sign-in', requireAuth, canEdit, (req, res) => {
  const db = getDb();
  try {
    const result = signInEntry(db, req.user, req.params.id, req.params.entryId, req.body?.timestamp);
    if (!result) return res.status(404).json({ error: 'Site log entry not found' });
    appendAuditEvent(db, {
      companyId: req.user.company_id,
      eventType: 'site_log_worker_signed_in',
      userId: req.user.id,
      workerId: result.entry.worker_id,
      payload: {
        site_log_id: req.params.id,
        site_log_entry_id: result.entry.id,
        previous_status: result.previous_status,
        sign_in_time: result.entry.sign_in_time
      }
    });
    return res.json(result.entry);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/:id/entries/:entryId/sign-out', requireAuth, canEdit, (req, res) => {
  const db = getDb();
  try {
    const result = signOutEntry(db, req.user, req.params.id, req.params.entryId, req.body?.timestamp);
    if (!result) return res.status(404).json({ error: 'Site log entry not found' });
    appendAuditEvent(db, {
      companyId: req.user.company_id,
      eventType: 'site_log_worker_signed_out',
      userId: req.user.id,
      workerId: result.entry.worker_id,
      payload: {
        site_log_id: req.params.id,
        site_log_entry_id: result.entry.id,
        previous_status: result.previous_status,
        sign_out_time: result.entry.sign_out_time
      }
    });
    return res.json(result.entry);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/:id/entries/:entryId/remove', requireAuth, canEdit, (req, res) => {
  const db = getDb();
  const result = removeSiteLogEntry(db, req.user, req.params.id, req.params.entryId, req.body?.notes);
  if (!result) return res.status(404).json({ error: 'Site log entry not found' });
  appendAuditEvent(db, {
    companyId: req.user.company_id,
    eventType: 'site_log_entry_removed',
    userId: req.user.id,
    workerId: result.entry.worker_id,
    payload: {
      site_log_id: req.params.id,
      site_log_entry_id: result.entry.id,
      previous_status: result.previous_status
    }
  });
  return res.json(result.entry);
});

module.exports = router;
