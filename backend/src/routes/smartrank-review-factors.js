'use strict';

const express = require('express');
const { getDb } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { appendAuditEvent } = require('../services/audit');
const {
  APPLY_TYPES,
  REVIEW_FACTOR_CATEGORIES,
  REVIEW_FACTOR_SEVERITIES,
  archiveReviewFactor,
  createReviewFactor,
  getReviewFactor,
  listReviewFactors,
  updateReviewFactor
} = require('../services/smartrank-review-factors');

const router = express.Router();

function sendError(res, error) {
  return res.status(error.status || 400).json({
    error: error.message || 'SmartRank Review Factor request failed',
    field: error.field || null
  });
}

function metadataPayload(factor) {
  return {
    review_factor_id: factor.id,
    worker_id: factor.worker_id,
    category: factor.category,
    severity: factor.severity,
    active: factor.active
  };
}

router.get('/options', requireAuth, (_req, res) => {
  return res.json({
    categories: Object.entries(REVIEW_FACTOR_CATEGORIES).map(([value, label]) => ({ value, label })),
    severities: Object.entries(REVIEW_FACTOR_SEVERITIES).map(([value, label]) => ({ value, label })),
    apply_types: Object.entries(APPLY_TYPES).map(([value, label]) => ({ value, label }))
  });
});

router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  return res.json({
    review_factors: listReviewFactors(db, req.user.company_id, {
      workerId: req.query.worker_id || null,
      includeInactive: req.query.include_inactive === '1' || req.query.include_inactive === 'true'
    })
  });
});

router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const factor = getReviewFactor(db, req.user.company_id, req.params.id);
  if (!factor) return res.status(404).json({ error: 'SmartRank Review Factor not found' });
  return res.json(factor);
});

router.post('/', requireAuth, requireRole('admin'), (req, res) => {
  const db = getDb();
  try {
    const factor = createReviewFactor(db, req.user.company_id, req.user.id, req.body || {});
    appendAuditEvent(db, {
      companyId: req.user.company_id,
      eventType: 'smartrank_review_factor_created',
      userId: req.user.id,
      workerId: factor.worker_id,
      payload: metadataPayload(factor)
    });
    return res.status(201).json(factor);
  } catch (error) {
    return sendError(res, error);
  }
});

router.patch('/:id', requireAuth, requireRole('admin'), (req, res) => {
  const db = getDb();
  try {
    const factor = updateReviewFactor(db, req.user.company_id, req.params.id, req.body || {});
    if (!factor) return res.status(404).json({ error: 'SmartRank Review Factor not found' });
    appendAuditEvent(db, {
      companyId: req.user.company_id,
      eventType: 'smartrank_review_factor_updated',
      userId: req.user.id,
      workerId: factor.worker_id,
      payload: metadataPayload(factor)
    });
    return res.json(factor);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/:id/archive', requireAuth, requireRole('admin'), (req, res) => {
  const db = getDb();
  const factor = archiveReviewFactor(db, req.user.company_id, req.params.id, req.user.id);
  if (!factor) return res.status(404).json({ error: 'SmartRank Review Factor not found' });
  appendAuditEvent(db, {
    companyId: req.user.company_id,
    eventType: 'smartrank_review_factor_archived',
    userId: req.user.id,
    workerId: factor.worker_id,
    payload: metadataPayload(factor)
  });
  return res.json(factor);
});

module.exports = router;
