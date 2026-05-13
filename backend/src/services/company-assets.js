'use strict';

const ASSET_STATUSES = new Set(['active', 'inactive', 'unavailable', 'retired']);
const ASSET_CATALOGUE_CATEGORIES = new Set(['equipment', 'transport']);

function normalizeAssetNumber(value) {
  return String(value || '').trim().toUpperCase();
}

function parseAssetIds(input = {}) {
  const rawIds = [];
  if (input.company_asset_id != null && input.company_asset_id !== '') rawIds.push(input.company_asset_id);
  if (input.selected_company_asset_id != null && input.selected_company_asset_id !== '') rawIds.push(input.selected_company_asset_id);
  if (Array.isArray(input.company_asset_ids)) rawIds.push(...input.company_asset_ids);
  if (Array.isArray(input.selected_company_asset_ids)) rawIds.push(...input.selected_company_asset_ids);
  return Array.from(new Set(rawIds.map((id) => Number(id)).filter(Number.isFinite)));
}

function serializeAsset(row) {
  if (!row) return null;
  const displayName = row.display_name || `${row.catalogue_label || 'Asset'} / ${row.asset_number}`;
  const isCatalogueEnabled = row.company_is_enabled == null ? undefined : Boolean(row.company_is_enabled);
  const warnings = [];
  if (isCatalogueEnabled === false) {
    warnings.push("This asset's catalogue class is not currently enabled in Our Business.");
  }
  if (row.asset_status && row.asset_status !== 'active') {
    warnings.push('Selected asset is not active in dispatch.');
  }

  return {
    id: row.id,
    company_id: row.company_id,
    catalogue_item_id: row.catalogue_item_id,
    asset_number: row.asset_number,
    display_name: displayName,
    asset_status: row.asset_status,
    home_location: row.home_location,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    catalogue_item: {
      id: row.catalogue_item_id,
      category: row.catalogue_category,
      group_label: row.catalogue_group_label,
      code: row.catalogue_code,
      label: row.catalogue_label,
      normalized_key: row.catalogue_normalized_key
    },
    is_catalogue_enabled: isCatalogueEnabled,
    warnings
  };
}

function loadAssetCatalogueItem(db, catalogueItemId) {
  return db.prepare(`
    SELECT *
    FROM requirement_catalogue_items
    WHERE id = ? AND is_active = 1
  `).get(Number(catalogueItemId));
}

function ensureAssetCatalogueItem(db, catalogueItemId) {
  const item = loadAssetCatalogueItem(db, catalogueItemId);
  if (!item) throw new Error('Catalogue item not found');
  if (!ASSET_CATALOGUE_CATEGORIES.has(item.category)) {
    throw new Error('Only equipment or transport catalogue items can be registered as company assets.');
  }
  return item;
}

function listCompanyAssets(db, companyId, options = {}) {
  const includeArchived = Boolean(options.includeArchived);
  const rows = db.prepare(`
    SELECT
      ca.*,
      rci.category AS catalogue_category,
      rci.group_label AS catalogue_group_label,
      rci.code AS catalogue_code,
      rci.label AS catalogue_label,
      rci.normalized_key AS catalogue_normalized_key,
      ccs.is_enabled AS company_is_enabled
    FROM company_assets ca
    JOIN requirement_catalogue_items rci ON rci.id = ca.catalogue_item_id
    LEFT JOIN company_catalogue_selections ccs
      ON ccs.catalogue_item_id = ca.catalogue_item_id
      AND ccs.company_id = ca.company_id
    WHERE ca.company_id = ?
      ${includeArchived ? '' : "AND ca.asset_status != 'retired'"}
    ORDER BY rci.category, rci.group_label, rci.label, ca.asset_number
  `).all(companyId).map(serializeAsset);

  const grouped = {};
  for (const asset of rows) {
    const key = asset.catalogue_item.normalized_key;
    grouped[key] = grouped[key] || {
      catalogue_item: asset.catalogue_item,
      assets: []
    };
    grouped[key].assets.push(asset);
  }

  return { assets: rows, grouped };
}

function createCompanyAsset(db, companyId, input = {}) {
  const catalogueItem = ensureAssetCatalogueItem(db, input.catalogue_item_id);
  const assetNumber = normalizeAssetNumber(input.asset_number);
  if (!assetNumber) throw new Error('asset_number is required');
  const status = String(input.asset_status || 'active').trim() || 'active';
  if (!ASSET_STATUSES.has(status)) {
    throw new Error(`asset_status must be one of: ${Array.from(ASSET_STATUSES).join(', ')}`);
  }

  const now = new Date().toISOString();
  const displayName = String(input.display_name || '').trim() || `${catalogueItem.label} / ${assetNumber}`;
  const result = db.prepare(`
    INSERT INTO company_assets (
      company_id, catalogue_item_id, asset_number, display_name, asset_status,
      home_location, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    companyId,
    catalogueItem.id,
    assetNumber,
    displayName,
    status,
    input.home_location ? String(input.home_location).trim() : null,
    input.notes ? String(input.notes).trim() : null,
    now,
    now
  );

  return getCompanyAsset(db, companyId, result.lastInsertRowid);
}

function getCompanyAsset(db, companyId, assetId) {
  const row = db.prepare(`
    SELECT
      ca.*,
      rci.category AS catalogue_category,
      rci.group_label AS catalogue_group_label,
      rci.code AS catalogue_code,
      rci.label AS catalogue_label,
      rci.normalized_key AS catalogue_normalized_key,
      ccs.is_enabled AS company_is_enabled
    FROM company_assets ca
    JOIN requirement_catalogue_items rci ON rci.id = ca.catalogue_item_id
    LEFT JOIN company_catalogue_selections ccs
      ON ccs.catalogue_item_id = ca.catalogue_item_id
      AND ccs.company_id = ca.company_id
    WHERE ca.id = ? AND ca.company_id = ?
  `).get(Number(assetId), companyId);
  return serializeAsset(row);
}

function updateCompanyAsset(db, companyId, assetId, input = {}) {
  const existing = getCompanyAsset(db, companyId, assetId);
  if (!existing) return null;

  let nextCatalogueItemId = existing.catalogue_item_id;
  if (input.catalogue_item_id !== undefined && input.catalogue_item_id !== null && input.catalogue_item_id !== '') {
    const nextCatalogueItem = ensureAssetCatalogueItem(db, input.catalogue_item_id);
    nextCatalogueItemId = nextCatalogueItem.id;
  }

  const assetNumber = input.asset_number !== undefined
    ? normalizeAssetNumber(input.asset_number)
    : existing.asset_number;
  if (!assetNumber) throw new Error('asset_number is required');

  const status = input.asset_status !== undefined
    ? String(input.asset_status || '').trim()
    : existing.asset_status;
  if (!ASSET_STATUSES.has(status)) {
    throw new Error(`asset_status must be one of: ${Array.from(ASSET_STATUSES).join(', ')}`);
  }

  db.prepare(`
    UPDATE company_assets
    SET catalogue_item_id = ?,
        asset_number = ?,
        display_name = ?,
        asset_status = ?,
        home_location = ?,
        notes = ?,
        updated_at = ?
    WHERE id = ? AND company_id = ?
  `).run(
    nextCatalogueItemId,
    assetNumber,
    input.display_name !== undefined ? (String(input.display_name || '').trim() || null) : existing.display_name,
    status,
    input.home_location !== undefined ? (String(input.home_location || '').trim() || null) : existing.home_location,
    input.notes !== undefined ? (String(input.notes || '').trim() || null) : existing.notes,
    new Date().toISOString(),
    Number(assetId),
    companyId
  );

  return getCompanyAsset(db, companyId, assetId);
}

function archiveCompanyAsset(db, companyId, assetId) {
  const existing = getCompanyAsset(db, companyId, assetId);
  if (!existing) return null;
  db.prepare(`
    UPDATE company_assets
    SET asset_status = 'retired', updated_at = ?
    WHERE id = ? AND company_id = ?
  `).run(new Date().toISOString(), Number(assetId), companyId);
  return getCompanyAsset(db, companyId, assetId);
}

function listJobAssetAssignments(db, companyId, jobId) {
  return db.prepare(`
    SELECT
      jaa.id AS assignment_id,
      jaa.source AS assignment_source,
      jaa.created_at AS assigned_at,
      ca.*,
      rci.category AS catalogue_category,
      rci.group_label AS catalogue_group_label,
      rci.code AS catalogue_code,
      rci.label AS catalogue_label,
      rci.normalized_key AS catalogue_normalized_key,
      ccs.is_enabled AS company_is_enabled
    FROM job_asset_assignments jaa
    JOIN company_assets ca ON ca.id = jaa.company_asset_id
    JOIN requirement_catalogue_items rci ON rci.id = ca.catalogue_item_id
    LEFT JOIN company_catalogue_selections ccs
      ON ccs.catalogue_item_id = ca.catalogue_item_id
      AND ccs.company_id = ca.company_id
    WHERE jaa.company_id = ? AND jaa.job_id = ?
    ORDER BY jaa.id
  `).all(companyId, jobId).map((row) => ({
    assignment_id: row.assignment_id,
    source: row.assignment_source,
    assigned_at: row.assigned_at,
    asset: serializeAsset(row)
  }));
}

function persistJobAssetAssignments(db, {
  companyId,
  jobId,
  userId = null,
  assetIds = [],
  source = 'manual'
}) {
  const ids = Array.from(new Set((assetIds || []).map((id) => Number(id)).filter(Number.isFinite)));
  const now = new Date().toISOString();
  const validAssets = ids.length
    ? db.prepare(`
        SELECT id
        FROM company_assets
        WHERE company_id = ? AND id IN (${ids.map(() => '?').join(',')})
      `).all(companyId, ...ids)
    : [];
  const validIds = new Set(validAssets.map((row) => Number(row.id)));
  if (ids.length !== validIds.size) {
    throw new Error('Selected asset not found');
  }

  db.transaction(() => {
    db.prepare(`DELETE FROM job_asset_assignments WHERE company_id = ? AND job_id = ?`).run(companyId, jobId);
    for (const id of ids) {
      if (!validIds.has(id)) continue;
      db.prepare(`
        INSERT INTO job_asset_assignments (
          company_id, job_id, company_asset_id, source, created_by_user_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(company_id, job_id, company_asset_id) DO UPDATE SET
          source = excluded.source,
          created_by_user_id = excluded.created_by_user_id
      `).run(companyId, jobId, id, source, userId, now);
    }
  })();

  return listJobAssetAssignments(db, companyId, jobId);
}

function hasAssetPayload(input = {}) {
  return parseAssetIds(input).length > 0;
}

function mapAssetReferencesFromText(db, companyId, text) {
  const body = String(text || '');
  const references = Array.from(new Set(
    (body.match(/\b[A-Z]{2,6}\d{0,3}-\d{2,4}\b/gi) || [])
      .map(normalizeAssetNumber)
  ));
  const matchedAssets = [];
  const unknownAssetNumbers = [];
  if (references.length > 0) {
    const rows = db.prepare(`
      SELECT
        ca.*,
        rci.category AS catalogue_category,
        rci.group_label AS catalogue_group_label,
        rci.code AS catalogue_code,
        rci.label AS catalogue_label,
        rci.normalized_key AS catalogue_normalized_key,
        ccs.is_enabled AS company_is_enabled
      FROM company_assets ca
      JOIN requirement_catalogue_items rci ON rci.id = ca.catalogue_item_id
      LEFT JOIN company_catalogue_selections ccs
        ON ccs.catalogue_item_id = ca.catalogue_item_id
        AND ccs.company_id = ca.company_id
      WHERE ca.company_id = ?
        AND ca.asset_number IN (${references.map(() => '?').join(',')})
    `).all(companyId, ...references);
    const found = new Set(rows.map((row) => normalizeAssetNumber(row.asset_number)));
    matchedAssets.push(...rows.map(serializeAsset));
    unknownAssetNumbers.push(...references.filter((ref) => !found.has(ref)));
  }

  const warnings = unknownAssetNumbers.length > 0
    ? ['Asset reference mentioned but not found in company asset register.']
    : [];

  return {
    matched_assets: matchedAssets,
    matched_asset_ids: matchedAssets.map((asset) => asset.id),
    unknown_asset_numbers: unknownAssetNumbers,
    warnings
  };
}

function applyAssetAssignmentsToJob(db, companyId, job) {
  if (!job?.id) return job;
  const assignments = listJobAssetAssignments(db, companyId, job.id);
  const warnings = assignments.flatMap((assignment) => assignment.asset.warnings || []);
  return {
    ...job,
    asset_assignments: assignments,
    selected_company_assets: assignments.map((assignment) => assignment.asset),
    asset_assignment_warnings: Array.from(new Set(warnings))
  };
}

module.exports = {
  ASSET_STATUSES,
  applyAssetAssignmentsToJob,
  archiveCompanyAsset,
  createCompanyAsset,
  getCompanyAsset,
  hasAssetPayload,
  listCompanyAssets,
  listJobAssetAssignments,
  mapAssetReferencesFromText,
  parseAssetIds,
  persistJobAssetAssignments,
  updateCompanyAsset
};
