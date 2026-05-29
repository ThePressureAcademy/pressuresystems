'use strict';

const { randomUUID } = require('crypto');
const {
  CREDENTIAL_GROUPS,
  credentialDisplayLabel,
  keyify,
  normalizeCredentialType
} = require('./intake-catalogues');

const CREDENTIAL_TYPE_CATEGORIES = new Set([
  'site_access',
  'licence',
  'high_risk_work',
  'induction',
  'VOC',
  'medical',
  'client_requirement',
  'other'
]);

function normalizeText(value) {
  const text = String(value || '').trim();
  return text || null;
}

function normalizeCategory(value) {
  const category = String(value || 'other').trim();
  return CREDENTIAL_TYPE_CATEGORIES.has(category) ? category : 'other';
}

function categoryForDefaultGroup(group) {
  if (group === 'High Risk Work') return 'high_risk_work';
  if (group === 'VOC') return 'VOC';
  if (group === 'Safety / Site') return 'site_access';
  if (group === 'Heavy Vehicle') return 'licence';
  if (group === 'Working at Height') return 'site_access';
  if (group === 'Rail') return 'site_access';
  if (group === 'Energy / Electrical') return 'licence';
  if (group === 'Civil / Plant') return 'licence';
  if (group === 'Trade certificates' || group === 'Qualifications') return 'licence';
  return 'other';
}

function defaultCredentialTypes() {
  return CREDENTIAL_GROUPS
    .filter((group) => group.group !== 'Legacy records')
    .flatMap((group) => group.options.map(([value, label]) => ({
      id: `default:${value}`,
      value,
      type: value,
      label,
      name: label,
      category: categoryForDefaultGroup(group.group),
      group: group.group,
      region: null,
      description: null,
      is_default: true,
      active: true
    })));
}

function serializeCustomCredentialType(row) {
  if (!row) return null;
  return {
    id: row.id,
    value: row.normalized_key,
    type: row.normalized_key,
    label: row.name,
    name: row.name,
    category: row.category,
    group: 'Business-specific credential',
    region: row.region,
    description: row.description,
    is_default: Boolean(row.is_default),
    active: Boolean(row.active),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function listCustomCredentialTypes(db, companyId, options = {}) {
  const includeInactive = Boolean(options.includeInactive);
  return db.prepare(`
    SELECT *
    FROM credential_types
    WHERE company_id = ?
      ${includeInactive ? '' : 'AND active = 1'}
    ORDER BY active DESC, name COLLATE NOCASE ASC
  `).all(companyId).map(serializeCustomCredentialType);
}

function groupedCredentialTypes(db, companyId, options = {}) {
  const defaults = defaultCredentialTypes();
  const custom = listCustomCredentialTypes(db, companyId, options);
  return {
    defaults,
    custom,
    groups: [
      ...defaults.reduce((groups, item) => {
        let group = groups.find((candidate) => candidate.group === item.group);
        if (!group) {
          group = { group: item.group, options: [] };
          groups.push(group);
        }
        group.options.push({ value: item.value, label: item.label });
        return groups;
      }, []),
      ...(custom.length ? [{
        group: 'Business-specific credential',
        options: custom.map((item) => ({ value: item.id, label: item.label }))
      }] : [])
    ]
  };
}

function customCredentialKey(name) {
  const key = keyify(name);
  return key ? `custom_${key}` : '';
}

function createCredentialType(db, companyId, userId, input = {}) {
  const name = normalizeText(input.name);
  if (!name) {
    const error = new Error('Credential type name is required');
    error.status = 400;
    throw error;
  }
  if (name.length > 100) {
    const error = new Error('Credential type name must be 100 characters or fewer');
    error.status = 400;
    throw error;
  }

  const normalizedKey = customCredentialKey(name);
  const existing = db.prepare(`
    SELECT *
    FROM credential_types
    WHERE company_id = ? AND normalized_key = ?
  `).get(companyId, normalizedKey);

  const now = new Date().toISOString();
  if (existing) {
    if (existing.active) {
      const error = new Error('Credential type already exists for this company');
      error.status = 409;
      throw error;
    }
    db.prepare(`
      UPDATE credential_types
      SET name = ?,
          category = ?,
          region = ?,
          description = ?,
          active = 1,
          updated_at = ?
      WHERE id = ? AND company_id = ?
    `).run(
      name,
      normalizeCategory(input.category),
      normalizeText(input.region),
      normalizeText(input.description),
      now,
      existing.id,
      companyId
    );
    return serializeCustomCredentialType(db.prepare(`SELECT * FROM credential_types WHERE id = ?`).get(existing.id));
  }

  const id = randomUUID();
  db.prepare(`
    INSERT INTO credential_types (
      id, company_id, name, normalized_key, category, region, description,
      is_default, active, created_by_user_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?, ?)
  `).run(
    id,
    companyId,
    name,
    normalizedKey,
    normalizeCategory(input.category),
    normalizeText(input.region),
    normalizeText(input.description),
    userId,
    now,
    now
  );

  return serializeCustomCredentialType(db.prepare(`SELECT * FROM credential_types WHERE id = ?`).get(id));
}

function updateCredentialType(db, companyId, credentialTypeId, input = {}) {
  const existing = db.prepare(`
    SELECT *
    FROM credential_types
    WHERE id = ? AND company_id = ?
  `).get(credentialTypeId, companyId);
  if (!existing) return null;

  const nextName = Object.prototype.hasOwnProperty.call(input, 'name')
    ? normalizeText(input.name)
    : existing.name;
  if (!nextName) {
    const error = new Error('Credential type name is required');
    error.status = 400;
    throw error;
  }

  const nextKey = customCredentialKey(nextName);
  const duplicate = db.prepare(`
    SELECT id
    FROM credential_types
    WHERE company_id = ? AND normalized_key = ? AND id != ?
  `).get(companyId, nextKey, credentialTypeId);
  if (duplicate) {
    const error = new Error('Credential type already exists for this company');
    error.status = 409;
    throw error;
  }

  db.prepare(`
    UPDATE credential_types
    SET name = ?,
        normalized_key = ?,
        category = ?,
        region = ?,
        description = ?,
        active = ?,
        updated_at = ?
    WHERE id = ? AND company_id = ?
  `).run(
    nextName,
    nextKey,
    Object.prototype.hasOwnProperty.call(input, 'category') ? normalizeCategory(input.category) : existing.category,
    Object.prototype.hasOwnProperty.call(input, 'region') ? normalizeText(input.region) : existing.region,
    Object.prototype.hasOwnProperty.call(input, 'description') ? normalizeText(input.description) : existing.description,
    Object.prototype.hasOwnProperty.call(input, 'active') ? (input.active ? 1 : 0) : existing.active,
    new Date().toISOString(),
    credentialTypeId,
    companyId
  );

  return serializeCustomCredentialType(db.prepare(`SELECT * FROM credential_types WHERE id = ?`).get(credentialTypeId));
}

function archiveCredentialType(db, companyId, credentialTypeId) {
  const existing = db.prepare(`
    SELECT *
    FROM credential_types
    WHERE id = ? AND company_id = ?
  `).get(credentialTypeId, companyId);
  if (!existing) return null;
  db.prepare(`
    UPDATE credential_types
    SET active = 0,
        updated_at = ?
    WHERE id = ? AND company_id = ?
  `).run(new Date().toISOString(), credentialTypeId, companyId);
  return serializeCustomCredentialType(db.prepare(`SELECT * FROM credential_types WHERE id = ?`).get(credentialTypeId));
}

function resolveCredentialTypeSelection(db, companyId, input = {}) {
  const customId = normalizeText(input.credential_type_id);
  if (customId) {
    const custom = db.prepare(`
      SELECT *
      FROM credential_types
      WHERE id = ? AND company_id = ? AND active = 1
    `).get(customId, companyId);
    if (!custom) {
      const error = new Error('Credential type is not recognised');
      error.status = 400;
      throw error;
    }
    return {
      credential_type_id: custom.id,
      type: custom.normalized_key,
      label: custom.name,
      category: custom.category,
      is_custom: true
    };
  }

  const normalizedType = normalizeCredentialType(input.type);
  if (!normalizedType) {
    const error = new Error('Credential type is not recognised');
    error.status = 400;
    throw error;
  }
  if (normalizedType.startsWith('custom_')) {
    const error = new Error('Custom credential types must be selected from this company register');
    error.status = 400;
    throw error;
  }
  return {
    credential_type_id: null,
    type: normalizedType,
    label: credentialDisplayLabel(normalizedType),
    category: null,
    is_custom: false
  };
}

module.exports = {
  CREDENTIAL_TYPE_CATEGORIES,
  archiveCredentialType,
  createCredentialType,
  defaultCredentialTypes,
  groupedCredentialTypes,
  listCustomCredentialTypes,
  resolveCredentialTypeSelection,
  updateCredentialType
};
