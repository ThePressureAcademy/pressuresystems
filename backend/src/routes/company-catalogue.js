'use strict';

const express = require('express');
const { getDb } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { appendAuditEvent } = require('../services/audit');
const {
  OPERATING_MODES,
  normalizeOperatingMode,
  serializeCompanyAccess
} = require('../services/company-access');
const {
  listCompanyCatalogueSelections,
  updateCompanyCatalogueSelections
} = require('../services/job-requirement-catalogue');
const {
  archiveCompanyAsset,
  createCompanyAsset,
  listCompanyAssets,
  updateCompanyAsset
} = require('../services/company-assets');

const router = express.Router();

function getCompanyProfile(db, companyId) {
  return db.prepare(`SELECT * FROM companies WHERE id = ?`).get(companyId);
}

router.get('/profile', requireAuth, (req, res) => {
  const db = getDb();
  const company = getCompanyProfile(db, req.user.company_id);
  if (!company) return res.status(404).json({ error: 'Company not found' });
  return res.json(serializeCompanyAccess(company));
});

router.patch('/profile', requireAuth, requireRole('admin'), (req, res) => {
  const nextMode = req.body?.operating_mode;
  if (!OPERATING_MODES.includes(nextMode)) {
    return res.status(400).json({ error: 'operating_mode must be labour_only or plant_and_labour' });
  }

  const db = getDb();
  const company = getCompanyProfile(db, req.user.company_id);
  if (!company) return res.status(404).json({ error: 'Company not found' });
  const oldMode = normalizeOperatingMode(company.operating_mode);
  const normalizedMode = normalizeOperatingMode(nextMode);

  db.prepare(`
    UPDATE companies
    SET operating_mode = ?
    WHERE id = ?
  `).run(normalizedMode, req.user.company_id);

  if (oldMode !== normalizedMode) {
    appendAuditEvent(db, {
      companyId: req.user.company_id,
      eventType: 'company_operating_mode_updated',
      userId: req.user.id,
      payload: {
        old_mode: oldMode,
        new_mode: normalizedMode
      }
    });
  }

  return res.json(serializeCompanyAccess(getCompanyProfile(db, req.user.company_id)));
});

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

router.get('/assets', requireAuth, (req, res) => {
  const db = getDb();
  res.json(listCompanyAssets(db, req.user.company_id, {
    includeArchived: req.query.include_archived === 'true'
  }));
});

router.post('/assets', requireAuth, requireRole('admin'), (req, res) => {
  const db = getDb();
  try {
    const asset = createCompanyAsset(db, req.user.company_id, req.body || {});
    appendAuditEvent(db, {
      companyId: req.user.company_id,
      eventType: 'company_asset_created',
      userId: req.user.id,
      payload: {
        asset_id: asset.id,
        asset_number: asset.asset_number,
        catalogue_item_id: asset.catalogue_item_id,
        catalogue_item_label: asset.catalogue_item.label,
        status: asset.asset_status
      }
    });
    res.status(201).json(asset);
  } catch (error) {
    const duplicate = /UNIQUE constraint failed/i.test(error.message);
    res.status(duplicate ? 409 : 400).json({
      error: duplicate ? 'asset_number already exists for this company' : error.message
    });
  }
});

router.patch('/assets/:id', requireAuth, requireRole('admin'), (req, res) => {
  const db = getDb();
  try {
    const asset = updateCompanyAsset(db, req.user.company_id, req.params.id, req.body || {});
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    appendAuditEvent(db, {
      companyId: req.user.company_id,
      eventType: 'company_asset_updated',
      userId: req.user.id,
      payload: {
        asset_id: asset.id,
        asset_number: asset.asset_number,
        catalogue_item_id: asset.catalogue_item_id,
        catalogue_item_label: asset.catalogue_item.label,
        status: asset.asset_status
      }
    });
    return res.json(asset);
  } catch (error) {
    const duplicate = /UNIQUE constraint failed/i.test(error.message);
    return res.status(duplicate ? 409 : 400).json({
      error: duplicate ? 'asset_number already exists for this company' : error.message
    });
  }
});

router.post('/assets/:id/archive', requireAuth, requireRole('admin'), (req, res) => {
  const db = getDb();
  const asset = archiveCompanyAsset(db, req.user.company_id, req.params.id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  appendAuditEvent(db, {
    companyId: req.user.company_id,
    eventType: 'company_asset_archived',
    userId: req.user.id,
    payload: {
      asset_id: asset.id,
      asset_number: asset.asset_number,
      catalogue_item_id: asset.catalogue_item_id,
      catalogue_item_label: asset.catalogue_item.label,
      status: asset.asset_status
    }
  });
  return res.json(asset);
});

module.exports = router;
