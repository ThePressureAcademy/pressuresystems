'use strict';

const express = require('express');
const { getDb } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { appendAuditEvent } = require('../services/audit');
const {
  listCompanyCatalogueSelections,
  updateCompanyCatalogueSelections
} = require('../services/job-requirement-catalogue');

const router = express.Router();

router.get('/catalogue-selections', requireAuth, (req, res) => {
  const db = getDb();
  res.json(listCompanyCatalogueSelections(db, req.user.company_id));
});

router.post('/catalogue-selections', requireAuth, requireRole('admin'), (req, res) => {
  const itemIds = Array.isArray(req.body?.catalogue_item_ids)
    ? req.body.catalogue_item_ids
    : (Array.isArray(req.body?.enabled_item_ids) ? req.body.enabled_item_ids : []);

  const db = getDb();
  const selections = updateCompanyCatalogueSelections(db, req.user.company_id, itemIds);

  appendAuditEvent(db, {
    companyId: req.user.company_id,
    eventType: 'company_catalogue_updated',
    userId: req.user.id,
    payload: {
      enabled_count: selections.enabled_count,
      enabled_item_ids: selections.items
        .filter((item) => item.is_enabled)
        .map((item) => item.id)
    }
  });

  res.json(selections);
});

module.exports = router;
