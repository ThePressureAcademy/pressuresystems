'use strict';

const express = require('express');
const { getDb } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { appendAuditEvent } = require('../services/audit');
const {
  archiveCredentialType,
  createCredentialType,
  groupedCredentialTypes,
  updateCredentialType
} = require('../services/credential-types');

const router = express.Router();

function sendError(res, error) {
  res.status(error.status || 400).json({ error: error.message || 'Credential type request failed' });
}

router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const includeInactive = req.query.include_inactive === 'true' || req.query.include_inactive === '1';
  res.json(groupedCredentialTypes(db, req.user.company_id, {
    includeInactive
  }));
});

router.post('/', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  const db = getDb();
  try {
    const credentialType = createCredentialType(db, req.user.company_id, req.user.id, req.body || {});
    appendAuditEvent(db, {
      companyId: req.user.company_id,
      eventType: 'credential_type_created',
      userId: req.user.id,
      payload: {
        credential_type_id: credentialType.id,
        name: credentialType.name,
        category: credentialType.category
      }
    });
    res.status(201).json(credentialType);
  } catch (error) {
    sendError(res, error);
  }
});

router.patch('/:id', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  const db = getDb();
  try {
    const credentialType = updateCredentialType(db, req.user.company_id, req.params.id, req.body || {});
    if (!credentialType) return res.status(404).json({ error: 'Credential type not found' });
    appendAuditEvent(db, {
      companyId: req.user.company_id,
      eventType: 'credential_type_updated',
      userId: req.user.id,
      payload: {
        credential_type_id: credentialType.id,
        name: credentialType.name,
        category: credentialType.category,
        active: credentialType.active
      }
    });
    return res.json(credentialType);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/:id/archive', requireAuth, requireRole('admin', 'dispatcher'), (req, res) => {
  const db = getDb();
  const credentialType = archiveCredentialType(db, req.user.company_id, req.params.id);
  if (!credentialType) return res.status(404).json({ error: 'Credential type not found' });
  appendAuditEvent(db, {
    companyId: req.user.company_id,
    eventType: 'credential_type_archived',
    userId: req.user.id,
    payload: {
      credential_type_id: credentialType.id,
      name: credentialType.name
    }
  });
  return res.json(credentialType);
});

module.exports = router;
