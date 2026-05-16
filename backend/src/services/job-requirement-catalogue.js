'use strict';

const {
  HRWL_CODES,
  normalizeCredentialType
} = require('./intake-catalogues');

const CATALOGUE_SOURCE = 'research/liftiq-job-intake-catalogue-research.md';
const CATALOGUE_CONFIDENCE = 'medium';
const PLANT_REQUIREMENT_CATEGORIES = new Set(['equipment', 'transport']);
const LABOUR_REQUIREMENT_CATEGORIES = new Set(['credential', 'voc', 'civil', 'rail', 'energy']);
const INACTIVE_CATALOGUE_KEYS = new Set(['equipment_franna_pick_and_carry']);
const REQUIREMENT_GROUP_ORDER = [
  'High Risk Work',
  'VOC',
  'Working at Height',
  'Safety / Site',
  'Heavy Vehicle',
  'Rail',
  'Energy / Electrical',
  'Civil / Plant'
];

function normalizeKeyPart(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function item(category, groupLabel, code, label, key, description = null, sourceConfidence = CATALOGUE_CONFIDENCE) {
  return {
    category,
    group_label: groupLabel,
    code,
    label,
    normalized_key: key || [category, groupLabel, code].map(normalizeKeyPart).filter(Boolean).join('_'),
    description,
    source: CATALOGUE_SOURCE,
    source_confidence: sourceConfidence
  };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function requirementGroupOrder(groupLabel) {
  const index = REQUIREMENT_GROUP_ORDER.indexOf(groupLabel);
  return index === -1 ? REQUIREMENT_GROUP_ORDER.length : index;
}

const HIGH_RISK_WORK = HRWL_CODES
  .map((code) => item(
    'credential',
    'High Risk Work',
    code,
    `${code} High Risk Work Licence`,
    `credential_hrwl_${normalizeKeyPart(code)}`
  ));

const VOCS = [
  ...HRWL_CODES,
  'Excavator',
  'Front End Loader',
  'Telehandler',
  'Skid Steer',
  'Grader',
  'Roller',
  'Driller',
  'Piling Rig'
]
  .map((code) => item(
    'voc',
    'VOC',
    `VOC-${String(code).toUpperCase()}`,
    `VOC ${code}`,
    `voc_${normalizeKeyPart(code)}`
  ));

const TRADE_CERTIFICATES = [
  ['CARPENTRY', 'Trade Certificate Carpentry', 'credential_trade_certificate_carpentry'],
  ['ELECTRICAL', 'Trade Certificate Electrical', 'credential_trade_certificate_electrical'],
  ['PLUMBING', 'Trade Certificate Plumbing', 'credential_trade_certificate_plumbing'],
  ['PLASTERING', 'Trade Certificate Plastering', 'credential_trade_certificate_plastering'],
  ['BOILER_MAKER', 'Trade Certificate Boiler Maker', 'credential_trade_certificate_boiler_maker'],
  ['SHEET_METAL_WORKER', 'Trade Certificate Sheet Metal Worker', 'credential_trade_certificate_sheet_metal_worker']
].map(([code, label, key]) => item('credential', 'Trade Certificates', code, label, key));

const QUALIFICATIONS = [
  item('credential', 'Qualifications', 'DIPLOMA', 'Diploma', 'credential_qualification_diploma')
];

const WORKING_AT_HEIGHT = [
  item('credential', 'Working at Height', 'WAH', 'Working at Height', 'credential_working_at_height_wah')
];

const SAFETY_SITE_CREDENTIALS = [
  item('credential', 'Safety / Site', 'CONFINED_SPACE', 'Confined Space', 'credential_confined_space'),
  item('credential', 'Safety / Site', 'BA', 'Operate Breathing Apparatus', 'credential_operate_breathing_apparatus'),
  item('credential', 'Safety / Site', 'HSR', 'Health and Safety Representative', 'credential_health_and_safety_representative'),
  item('credential', 'Safety / Site', 'FIRST_AID', 'First Aid', 'credential_first_aid'),
  item('credential', 'Safety / Site', 'SITE_INDUCTION', 'Site Induction', 'credential_site_induction'),
  item('credential', 'Safety / Site', 'CLIENT_INDUCTION', 'Client Induction', 'credential_client_induction')
];

const CIVIL_ACCESS = [
  item('civil', 'Civil / Plant', 'EXCAVATOR', 'Excavator', 'civil_excavator'),
  item('civil', 'Civil / Plant', 'FRONT_END_LOADER', 'Front End Loader', 'civil_front_end_loader'),
  item('civil', 'Civil / Plant', 'TELEHANDLER', 'Telehandler', 'civil_telehandler'),
  item('civil', 'Civil / Plant', 'SKID_STEER', 'Skid Steer', 'civil_skid_steer'),
  item('civil', 'Civil / Plant', 'GRADER', 'Grader', 'civil_grader'),
  item('civil', 'Civil / Plant', 'ROLLER', 'Roller', 'civil_roller'),
  item('civil', 'Civil / Plant', 'DRILLER', 'Driller', 'civil_driller'),
  item('civil', 'Civil / Plant', 'PILING_RIG', 'Piling Rig', 'civil_piling_rig'),
  item('civil', 'Civil / Plant', 'FORKLIFT', 'Forklift', 'civil_forklift')
];

const MOBILE_CRANES = [
  '13T City', '16T City', '20T City', '45T', '50T', '55T', '60T', '90T', '100T', '120T',
  '150T', '160T', '200T', '220T', '230T', '250T', '300T', '350T', '400T', '450T',
  '500T', '650T', '700T', '750T', '800T', '1000T', '1200T'
].map((code) => item(
  'equipment',
  'Mobile Crane',
  code,
  `${code} Mobile Crane`,
  `equipment_mobile_crane_${normalizeKeyPart(code)}`
));

const CRAWLER_CRANES = [
  '2T', '3T', '5T', '12T', '14T', '20T', '40T', '50T', '60T', '90T', '100T', '110T',
  '150T', '160T', '180T', '200T', '250T', '280T', '300T', '320T', '350T', '400T',
  '500T', '600T', '650T', '750T', '1000T', '1200T', '1650T'
].map((code) => item(
  'equipment',
  'Crawler Crane',
  code,
  `${code} Crawler Crane`,
  `equipment_crawler_crane_${normalizeKeyPart(code)}`
));

const ARTICULATED_CRANE_CAPACITIES = [
  '12T', '15T', '20T', '22T', '25T', '27T', '28T', '30T', '40T'
];

const ARTICULATED_CRANES = ARTICULATED_CRANE_CAPACITIES.map((code) => item(
  'equipment',
  'Articulated / Pick-and-Carry',
  code,
  `${code} Articulated / Pick-and-Carry Crane`,
  `equipment_articulated_crane_${normalizeKeyPart(code)}`
));

const CATALOGUE_ITEMS = [
  item('credential', 'Safety / Site', 'WHITE_CARD', 'White Card', 'credential_white_card', 'General construction induction card.', 'high'),
  ...TRADE_CERTIFICATES,
  ...QUALIFICATIONS,
  ...HIGH_RISK_WORK,
  ...WORKING_AT_HEIGHT,
  ...SAFETY_SITE_CREDENTIALS,
  item('credential', 'Heavy Vehicle', 'MC', 'MC Heavy Vehicle Licence', 'credential_heavy_vehicle_mc'),
  item('credential', 'Heavy Vehicle', 'HC', 'HC Heavy Vehicle Licence', 'credential_heavy_vehicle_hc'),
  item('credential', 'Heavy Vehicle', 'HR', 'HR Heavy Vehicle Licence', 'credential_heavy_vehicle_hr'),
  ...CIVIL_ACCESS,
  item('energy', 'Energy / Electrical', 'ELECTRICAL_SPOTTER', 'Electrical Spotter', 'energy_electrical_spotter'),
  item('rail', 'Rail', 'RIW', 'RIW', 'rail_riw'),
  item('rail', 'Rail', 'SARC', 'SARC', 'rail_sarc'),
  item('rail', 'Rail', 'WETT', 'WETT', 'rail_wett'),
  ...VOCS,
  ...MOBILE_CRANES,
  ...CRAWLER_CRANES,
  ...ARTICULATED_CRANES,
  item('equipment', 'Crane Type', 'MINI_SPIDER_CRANE', 'Mini / Spider Crane', 'equipment_mini_spider_crane', 'Compact spider/mini crane category for restricted access work.', 'high'),
  item('equipment', 'Crane Type', 'ROUGH_TERRAIN_CRANE', 'Rough Terrain Crane', 'equipment_rough_terrain_crane', 'Public fleet category seen on Australian crane hire pages.', 'high'),
  item('equipment', 'Crane Type', 'TRUCK_MOUNTED_SLEWING_CRANE', 'Truck-Mounted Slewing Crane', 'equipment_truck_mounted_slewing_crane', 'Truck-mounted crane category seen on Australian fleet pages.', 'high'),
  item('equipment', 'Access Equipment', 'TRAVEL_TOWER_EWP', 'Travel Tower / EWP', 'equipment_travel_tower_ewp', 'Access equipment category for travel towers and elevated work platforms.', 'high'),
  item('transport', 'Transport', 'BODY_TRUCK', 'Body Truck', 'transport_body_truck'),
  item('transport', 'Transport', 'TILT_TRAY', 'Tilt Tray', 'transport_tilt_tray'),
  item('transport', 'Transport', 'SEMI_TRAILER', 'Semi-Trailer', 'transport_semi_trailer'),
  item('transport', 'Transport', 'LOW_LOADER', 'Low Loader', 'transport_low_loader'),
  item('transport', 'Transport', 'SUPER_TILT', 'Super Tilt', 'transport_super_tilt'),
  item('transport', 'Transport', 'SPMT_MODULAR_TRANSPORT', 'SPMT / Modular Transport', 'transport_spmt_modular_transport', 'Specialist heavy transport planning item; review required.', 'medium')
];

const RECOMMENDED_DEFAULT_KEYS = new Set([
  'credential_white_card',
  'credential_hrwl_c6',
  'credential_hrwl_dg',
  'credential_hrwl_rb',
  'credential_working_at_height_wah',
  'credential_heavy_vehicle_mc',
  'equipment_mobile_crane_50t',
  'equipment_mobile_crane_100t',
  'transport_low_loader',
  'transport_semi_trailer'
]);

const LABOUR_ONLY_DEFAULT_KEYS = new Set([
  'credential_white_card',
  'credential_hrwl_c6',
  'credential_hrwl_dg',
  'credential_hrwl_rb',
  'credential_working_at_height_wah',
  'credential_heavy_vehicle_mc',
  'rail_riw',
  'energy_electrical_spotter',
  'civil_excavator',
  'civil_front_end_loader',
  'civil_telehandler'
]);

const LEGACY_CREDENTIAL_BY_KEY = {
  credential_white_card: 'white_card',
  credential_working_at_height_wah: 'working_at_height',
  credential_confined_space: 'confined_space',
  credential_operate_breathing_apparatus: 'operate_breathing_apparatus',
  credential_health_and_safety_representative: 'health_and_safety_representative',
  credential_first_aid: 'first_aid',
  credential_site_induction: 'site_induction',
  credential_client_induction: 'client_induction',
  credential_trade_certificate_carpentry: 'trade_certificate_carpentry',
  credential_trade_certificate_electrical: 'trade_certificate_electrical',
  credential_trade_certificate_plumbing: 'trade_certificate_plumbing',
  credential_trade_certificate_plastering: 'trade_certificate_plastering',
  credential_trade_certificate_boiler_maker: 'trade_certificate_boiler_maker',
  credential_trade_certificate_sheet_metal_worker: 'trade_certificate_sheet_metal_worker',
  credential_qualification_diploma: 'qualification_diploma',
  credential_heavy_vehicle_mc: 'drivers_licence',
  credential_heavy_vehicle_hc: 'drivers_licence',
  credential_heavy_vehicle_hr: 'drivers_licence',
  rail_riw: 'rail_riw',
  rail_sarc: 'rail_sarc',
  rail_wett: 'rail_wett',
  energy_electrical_spotter: 'electrical_spotter',
  civil_excavator: 'machinery_excavator',
  civil_front_end_loader: 'machinery_front_end_loader',
  civil_telehandler: 'machinery_telehandler',
  civil_skid_steer: 'machinery_skid_steer',
  civil_grader: 'machinery_grader',
  civil_roller: 'machinery_roller',
  civil_driller: 'machinery_driller',
  civil_piling_rig: 'machinery_piling_rig',
  civil_forklift: 'machinery_forklift'
};

for (const code of HRWL_CODES) {
  const key = normalizeKeyPart(code);
  LEGACY_CREDENTIAL_BY_KEY[`credential_hrwl_${key}`] = normalizeCredentialType(`hrwl_${key}`);
}

for (const code of [
  ...HRWL_CODES,
  'Excavator',
  'Front End Loader',
  'Telehandler',
  'Skid Steer',
  'Grader',
  'Roller',
  'Driller',
  'Piling Rig'
]) {
  const key = normalizeKeyPart(code);
  LEGACY_CREDENTIAL_BY_KEY[`voc_${key}`] = normalizeCredentialType(`voc_${key}`);
}

const VOC_TERM_MAPPERS = [
  ...HRWL_CODES.map((code) => ({
    pattern: new RegExp(`\\bvoc[-\\s]*${escapeRegExp(code)}\\b`, 'i'),
    key: `voc_${normalizeKeyPart(code)}`
  })),
  { pattern: /\bvoc[-\s]*co\b/i, key: 'voc_c0' },
  { pattern: /\bvoc[-\s]*(?:front[\s-]*end[\s-]*loader|loader)\b/i, key: 'voc_front_end_loader' },
  { pattern: /\bvoc[-\s]*excavator\b/i, key: 'voc_excavator' },
  { pattern: /\bvoc[-\s]*telehandler\b/i, key: 'voc_telehandler' },
  { pattern: /\bvoc[-\s]*skid[\s-]*steer\b/i, key: 'voc_skid_steer' },
  { pattern: /\bvoc[-\s]*grader\b/i, key: 'voc_grader' },
  { pattern: /\bvoc[-\s]*roller\b/i, key: 'voc_roller' },
  { pattern: /\bvoc[-\s]*driller\b/i, key: 'voc_driller' },
  { pattern: /\bvoc[-\s]*piling[\s-]*rig\b/i, key: 'voc_piling_rig' }
];

const FRANNA_CAPACITY_MAPPERS = ARTICULATED_CRANE_CAPACITIES.map((code) => {
  const tonnes = code.replace(/[^0-9]/g, '');
  return {
    pattern: new RegExp(`\\b${tonnes}\\s*t(?:onne)?\\s+(?:franna|pick[\\s-]*and[\\s-]*carry)\\b`, 'i'),
    key: `equipment_articulated_crane_${normalizeKeyPart(code)}`
  };
});

const TERM_MAPPERS = [
  ...VOC_TERM_MAPPERS,
  { pattern: /\bwhite\s+card\b/i, key: 'credential_white_card' },
  { pattern: /(?<!voc[-\s])\b(?:hrwl[-\s]*)?c0\b|(?<!voc[-\s])\b(?:hrwl[-\s]*)?co\b/i, key: 'credential_hrwl_c0' },
  { pattern: /(?<!voc[-\s])\b(?:hrwl[-\s]*)?c1\b/i, key: 'credential_hrwl_c1' },
  { pattern: /(?<!voc[-\s])\b(?:hrwl[-\s]*)?c2\b/i, key: 'credential_hrwl_c2' },
  { pattern: /(?<!voc[-\s])\b(?:hrwl[-\s]*)?c6\b/i, key: 'credential_hrwl_c6' },
  { pattern: /(?<!voc[-\s])\b(?:hrwl[-\s]*)?cn\b/i, key: 'credential_hrwl_cn' },
  { pattern: /(?<!voc[-\s])\b(?:hrwl[-\s]*)?dg\b|\bdogman\b|\bdogging\b/i, key: 'credential_hrwl_dg' },
  { pattern: /(?<!voc[-\s])\b(?:hrwl[-\s]*)?rb\b/i, key: 'credential_hrwl_rb' },
  { pattern: /(?<!voc[-\s])\b(?:hrwl[-\s]*)?ri\b|\brigger\b|\brigging\b/i, key: 'credential_hrwl_ri' },
  { pattern: /(?<!voc[-\s])\b(?:hrwl[-\s]*)?ra\b/i, key: 'credential_hrwl_ra' },
  { pattern: /(?<!voc[-\s])\b(?:hrwl[-\s]*)?wp\b/i, key: 'credential_hrwl_wp' },
  { pattern: /(?<!voc[-\s])\b(?:hrwl[-\s]*)?lf\b/i, key: 'credential_hrwl_lf' },
  { pattern: /(?<!voc[-\s])\b(?:hrwl[-\s]*)?sa\b/i, key: 'credential_hrwl_sa' },
  { pattern: /(?<!voc[-\s])\b(?:hrwl[-\s]*)?si\b/i, key: 'credential_hrwl_si' },
  { pattern: /\bworking\s+at\s+heights?\b|\bwah\b/i, key: 'credential_working_at_height_wah' },
  { pattern: /\bconfined\s+space\b/i, key: 'credential_confined_space' },
  { pattern: /\bfirst\s+aid\b/i, key: 'credential_first_aid' },
  { pattern: /\bsite\s+induction\b/i, key: 'credential_site_induction' },
  { pattern: /\bclient\s+induction\b/i, key: 'credential_client_induction' },
  { pattern: /\briw\b/i, key: 'rail_riw' },
  { pattern: /\bsarc\b/i, key: 'rail_sarc' },
  { pattern: /\bwett\b/i, key: 'rail_wett' },
  { pattern: /\bmc\b/i, key: 'credential_heavy_vehicle_mc' },
  { pattern: /\bhc\b/i, key: 'credential_heavy_vehicle_hc' },
  { pattern: /\bhr\b/i, key: 'credential_heavy_vehicle_hr' },
  { pattern: /\blow[\s-]*loader\b/i, key: 'transport_low_loader' },
  { pattern: /\bsemi[\s-]*trailer\b/i, key: 'transport_semi_trailer' },
  { pattern: /\b100\s*t(?:onne)?\s+(?:mobile\s+)?crane\b/i, key: 'equipment_mobile_crane_100t' },
  { pattern: /\b50\s*t(?:onne)?\s+(?:mobile\s+)?crane\b/i, key: 'equipment_mobile_crane_50t' },
  ...FRANNA_CAPACITY_MAPPERS,
  { pattern: /\btelehandler\b/i, key: 'civil_telehandler' },
  { pattern: /\bfront[\s-]*end[\s-]*loader\b/i, key: 'civil_front_end_loader' },
  { pattern: /\bexcavator\b/i, key: 'civil_excavator' },
  { pattern: /\benergex\s+spotter\b|\belectrical\s+spotter\b/i, key: 'energy_electrical_spotter' },
  { pattern: /\bspider\s+crane\b|\bmini\s+crane\b/i, key: 'equipment_mini_spider_crane' },
  { pattern: /\btravel\s+tower\b|\bewp\b/i, key: 'equipment_travel_tower_ewp' }
];

const CUSTOM_TERM_MAPPERS = [
  {
    pattern: /\bfranna\b|\bpick[\s-]*and[\s-]*carry\b/i,
    category: 'equipment',
    label: 'Articulated / Pick-and-Carry Crane',
    notes: 'Parsed from Franna or pick-and-carry terminology without a matched capacity. Confirm exact equipment requirement before allocation.'
  }
];

function bool(value) {
  return Boolean(Number(value));
}

function serializeItem(row, enabled = undefined) {
  if (!row) return null;
  const payload = {
    id: row.id,
    category: row.category,
    group_label: row.group_label,
    code: row.code,
    label: row.label,
    normalized_key: row.normalized_key,
    description: row.description,
    is_active: bool(row.is_active),
    source: row.source,
    source_confidence: row.source_confidence,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
  if (enabled !== undefined) payload.is_enabled = Boolean(enabled);
  return payload;
}

function groupItems(items) {
  const grouped = {};
  const sortedItems = [...(items || [])].sort((a, b) =>
    requirementGroupOrder(a.group_label) - requirementGroupOrder(b.group_label)
    || String(a.group_label || '').localeCompare(String(b.group_label || ''))
    || String(a.category || '').localeCompare(String(b.category || ''))
  );
  for (const itemRow of sortedItems) {
    grouped[itemRow.category] = grouped[itemRow.category] || {};
    grouped[itemRow.category][itemRow.group_label] = grouped[itemRow.category][itemRow.group_label] || [];
    grouped[itemRow.category][itemRow.group_label].push(itemRow);
  }
  return grouped;
}

function seedRequirementCatalogue(db) {
  const now = new Date().toISOString();
  const upsert = db.prepare(`
    INSERT INTO requirement_catalogue_items (
      category, group_label, code, label, normalized_key, description,
      is_active, source, source_confidence, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
    ON CONFLICT(normalized_key) DO UPDATE SET
      category = excluded.category,
      group_label = excluded.group_label,
      code = excluded.code,
      label = excluded.label,
      description = excluded.description,
      is_active = 1,
      source = excluded.source,
      source_confidence = excluded.source_confidence,
      updated_at = excluded.updated_at
  `);

  const seen = new Set();
  for (const catalogueItem of CATALOGUE_ITEMS) {
    if (seen.has(catalogueItem.normalized_key)) {
      throw new Error(`Duplicate requirement catalogue key: ${catalogueItem.normalized_key}`);
    }
    seen.add(catalogueItem.normalized_key);
    upsert.run(
      catalogueItem.category,
      catalogueItem.group_label,
      catalogueItem.code,
      catalogueItem.label,
      catalogueItem.normalized_key,
      catalogueItem.description,
      catalogueItem.source,
      catalogueItem.source_confidence,
      now,
      now
    );
  }

  if (INACTIVE_CATALOGUE_KEYS.size > 0) {
    db.prepare(`
      UPDATE requirement_catalogue_items
      SET is_active = 0, updated_at = ?
      WHERE normalized_key IN (${Array.from(INACTIVE_CATALOGUE_KEYS).map(() => '?').join(',')})
    `).run(now, ...Array.from(INACTIVE_CATALOGUE_KEYS));
  }
}

function listGlobalCatalogue(db) {
  const items = db.prepare(`
    SELECT *
    FROM requirement_catalogue_items
    WHERE is_active = 1
    ORDER BY category, group_label, id
  `).all().map((row) => serializeItem(row));
  return { items, grouped: groupItems(items) };
}

function companyHasSelections(db, companyId) {
  const row = db.prepare(`
    SELECT COUNT(*) AS count
    FROM company_catalogue_selections
    WHERE company_id = ?
  `).get(companyId);
  return Number(row?.count || 0) > 0;
}

function getCompanyOperatingMode(db, companyId) {
  const row = db.prepare(`
    SELECT operating_mode
    FROM companies
    WHERE id = ?
  `).get(companyId);
  return row?.operating_mode === 'labour_only' ? 'labour_only' : 'plant_and_labour';
}

function defaultKeysForOperatingMode(mode) {
  return mode === 'labour_only' ? LABOUR_ONLY_DEFAULT_KEYS : RECOMMENDED_DEFAULT_KEYS;
}

function listCompanyCatalogueSelections(db, companyId) {
  const configured = companyHasSelections(db, companyId);
  const operatingMode = getCompanyOperatingMode(db, companyId);
  const defaultKeys = defaultKeysForOperatingMode(operatingMode);
  const rows = db.prepare(`
    SELECT
      rci.*,
      ccs.is_enabled AS company_is_enabled,
      ccs.display_order,
      ccs.notes AS selection_notes
    FROM requirement_catalogue_items rci
    LEFT JOIN company_catalogue_selections ccs
      ON ccs.catalogue_item_id = rci.id AND ccs.company_id = ?
    WHERE rci.is_active = 1
    ORDER BY rci.category, rci.group_label, COALESCE(ccs.display_order, rci.id), rci.id
  `).all(companyId);

  const items = rows.map((row) => {
    const enabled = configured
      ? Boolean(row.company_is_enabled)
      : false;
    return {
      ...serializeItem(row, enabled),
      display_order: row.display_order,
      selection_notes: row.selection_notes,
      recommended_default: defaultKeys.has(row.normalized_key)
    };
  });

  return {
    configured,
    operating_mode: operatingMode,
    items,
    grouped: groupItems(items),
    enabled_count: items.filter((itemRow) => itemRow.is_enabled).length,
    recommended_count: items.filter((itemRow) => itemRow.recommended_default).length,
    requires_setup: !configured
  };
}

function listCompanyEnabledCatalogue(db, companyId) {
  const selections = listCompanyCatalogueSelections(db, companyId);
  const items = selections.items.filter((itemRow) => itemRow.is_enabled);
  return {
    configured: selections.configured,
    items,
    grouped: groupItems(items),
    enabled_count: items.length
  };
}

function updateCompanyCatalogueSelections(db, companyId, catalogueItemIds = []) {
  const ids = Array.from(new Set((catalogueItemIds || []).map((id) => Number(id)).filter(Number.isFinite)));
  const activeItems = ids.length > 0
    ? db.prepare(`
        SELECT id
        FROM requirement_catalogue_items
        WHERE is_active = 1 AND id IN (${ids.map(() => '?').join(',')})
      `).all(...ids)
    : [];
  const activeIds = new Set(activeItems.map((row) => Number(row.id)));
  const now = new Date().toISOString();

  db.transaction(() => {
    db.prepare(`
      UPDATE company_catalogue_selections
      SET is_enabled = 0, updated_at = ?
      WHERE company_id = ?
    `).run(now, companyId);

    ids.forEach((id, index) => {
      if (!activeIds.has(id)) return;
      db.prepare(`
        INSERT INTO company_catalogue_selections (
          company_id, catalogue_item_id, is_enabled, display_order, created_at, updated_at
        ) VALUES (?, ?, 1, ?, ?, ?)
        ON CONFLICT(company_id, catalogue_item_id) DO UPDATE SET
          is_enabled = 1,
          display_order = excluded.display_order,
          updated_at = excluded.updated_at
      `).run(companyId, id, index + 1, now, now);
    });
  })();

  return listCompanyCatalogueSelections(db, companyId);
}

function getCatalogueItemsByIds(db, ids = []) {
  const normalizedIds = Array.from(new Set((ids || []).map((id) => Number(id)).filter(Number.isFinite)));
  if (normalizedIds.length === 0) return [];
  return db.prepare(`
    SELECT *
    FROM requirement_catalogue_items
    WHERE is_active = 1 AND id IN (${normalizedIds.map(() => '?').join(',')})
  `).all(...normalizedIds);
}

function getCatalogueItemsByKeys(db, keys = []) {
  const normalizedKeys = Array.from(new Set((keys || []).map((key) => String(key || '').trim()).filter(Boolean)));
  if (normalizedKeys.length === 0) return [];
  return db.prepare(`
    SELECT *
    FROM requirement_catalogue_items
    WHERE is_active = 1 AND normalized_key IN (${normalizedKeys.map(() => '?').join(',')})
  `).all(...normalizedKeys);
}

function customRequirementInput(value) {
  if (typeof value === 'string') {
    return { category: 'custom', label: value.trim(), notes: null };
  }
  return {
    category: String(value?.category || 'custom').trim() || 'custom',
    label: String(value?.label || '').trim(),
    notes: value?.notes ? String(value.notes).trim() : null
  };
}

function listJobRequirements(db, companyId, jobId) {
  const rows = db.prepare(`
    SELECT
      jri.*,
      rci.group_label,
      rci.code,
      rci.label AS catalogue_label,
      rci.normalized_key AS catalogue_normalized_key,
      rci.description AS catalogue_description,
      rci.source_confidence AS catalogue_source_confidence,
      jcr.label AS custom_label,
      jcr.normalized_key AS custom_normalized_key,
      jcr.notes AS custom_notes
    FROM job_requirement_items jri
    LEFT JOIN requirement_catalogue_items rci ON rci.id = jri.catalogue_item_id
    LEFT JOIN job_custom_requirements jcr ON jcr.id = jri.custom_requirement_id
    WHERE jri.company_id = ? AND jri.job_id = ?
    ORDER BY jri.id
  `).all(companyId, jobId);

  const items = rows.map((row) => ({
    id: row.id,
    company_id: row.company_id,
    job_id: row.job_id,
    category: row.category,
    source: row.source,
    created_at: row.created_at,
    catalogue_item_id: row.catalogue_item_id,
    custom_requirement_id: row.custom_requirement_id,
    group_label: row.group_label || null,
    code: row.code || null,
    label: row.catalogue_label || row.custom_label,
    normalized_key: row.catalogue_normalized_key || row.custom_normalized_key,
    description: row.catalogue_description || null,
    source_confidence: row.catalogue_source_confidence || null,
    notes: row.custom_notes || null,
    is_custom: Boolean(row.custom_requirement_id)
  }));

  return { items, grouped: groupItems(items) };
}

function persistJobRequirements(db, {
  companyId,
  jobId,
  userId = null,
  catalogueItemIds = [],
  catalogueItemKeys = [],
  customRequirements = [],
  source = 'catalogue'
}) {
  const idItems = getCatalogueItemsByIds(db, catalogueItemIds);
  const keyItems = getCatalogueItemsByKeys(db, catalogueItemKeys);
  const itemsById = new Map([...idItems, ...keyItems].map((row) => [Number(row.id), row]));
  const catalogueRows = Array.from(itemsById.values());
  const customRows = (customRequirements || [])
    .map(customRequirementInput)
    .filter((entry) => entry.label);
  const now = new Date().toISOString();

  db.transaction(() => {
    db.prepare(`DELETE FROM job_requirement_items WHERE company_id = ? AND job_id = ?`).run(companyId, jobId);
    db.prepare(`DELETE FROM job_custom_requirements WHERE company_id = ? AND job_id = ?`).run(companyId, jobId);

    for (const row of catalogueRows) {
      db.prepare(`
        INSERT INTO job_requirement_items (
          company_id, job_id, catalogue_item_id, custom_requirement_id, category, source, created_at
        ) VALUES (?, ?, ?, NULL, ?, ?, ?)
      `).run(companyId, jobId, row.id, row.category, source, now);
    }

    for (const custom of customRows) {
      const normalized = `custom_${normalizeKeyPart(custom.category)}_${normalizeKeyPart(custom.label)}`;
      const result = db.prepare(`
        INSERT INTO job_custom_requirements (
          company_id, job_id, category, label, normalized_key, notes, created_by_user_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(companyId, jobId, custom.category, custom.label, normalized, custom.notes, userId, now);

      db.prepare(`
        INSERT INTO job_requirement_items (
          company_id, job_id, catalogue_item_id, custom_requirement_id, category, source, created_at
        ) VALUES (?, ?, NULL, ?, ?, 'custom', ?)
      `).run(companyId, jobId, result.lastInsertRowid, custom.category, now);
    }
  })();

  return listJobRequirements(db, companyId, jobId);
}

function addCustomRequirementToJob(db, { companyId, jobId, userId, category, label, notes = null }) {
  const custom = customRequirementInput({ category, label, notes });
  if (!custom.label) throw new Error('label is required');
  const now = new Date().toISOString();
  const normalized = `custom_${normalizeKeyPart(custom.category)}_${normalizeKeyPart(custom.label)}`;
  const result = db.prepare(`
    INSERT INTO job_custom_requirements (
      company_id, job_id, category, label, normalized_key, notes, created_by_user_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(companyId, jobId, custom.category, custom.label, normalized, custom.notes, userId, now);

  const link = db.prepare(`
    INSERT INTO job_requirement_items (
      company_id, job_id, catalogue_item_id, custom_requirement_id, category, source, created_at
    ) VALUES (?, ?, NULL, ?, ?, 'custom', ?)
  `).run(companyId, jobId, result.lastInsertRowid, custom.category, now);

  return db.prepare(`
    SELECT
      jri.*,
      jcr.label AS custom_label,
      jcr.normalized_key AS custom_normalized_key,
      jcr.notes AS custom_notes
    FROM job_requirement_items jri
    JOIN job_custom_requirements jcr ON jcr.id = jri.custom_requirement_id
    WHERE jri.id = ?
  `).get(link.lastInsertRowid);
}

function mapParsedTermsToCatalogue(db, companyId, text) {
  const keys = [];
  const body = String(text || '');
  for (const mapper of TERM_MAPPERS) {
    if (mapper.pattern.test(body)) keys.push(mapper.key);
  }
  const matchedKeySet = new Set(keys);

  const matchedItems = getCatalogueItemsByKeys(db, keys).map((row) => serializeItem(row));
  const enabled = listCompanyEnabledCatalogue(db, companyId).items;
  const operatingMode = getCompanyOperatingMode(db, companyId);
  const enabledKeys = new Set(enabled.map((row) => row.normalized_key));
  const selected = [];
  const suggested = [];
  const oneOffCustom = [];
  let labourOnlyPlantMentioned = false;

  for (const matched of matchedItems) {
    if (operatingMode === 'labour_only' && PLANT_REQUIREMENT_CATEGORIES.has(matched.category)) {
      labourOnlyPlantMentioned = true;
      oneOffCustom.push({
        category: 'custom',
        label: matched.label,
        notes: 'Parsed from brief as an equipment or transport mention while company is configured as labour-only.'
      });
      continue;
    }
    if (enabledKeys.has(matched.normalized_key)) {
      selected.push({ ...matched, is_enabled: true });
    } else {
      suggested.push({ ...matched, is_enabled: false });
    }
  }

  for (const mapper of CUSTOM_TERM_MAPPERS) {
    if (!mapper.pattern.test(body)) continue;
    const mappedToArticulatedCapacity = Array.from(matchedKeySet)
      .some((key) => key.startsWith('equipment_articulated_crane_'));
    if (mappedToArticulatedCapacity) continue;
    oneOffCustom.push({
      category: mapper.category,
      label: mapper.label,
      notes: mapper.notes
    });
  }

  const warnings = suggested.length > 0
    ? ['Some parsed requirements are not enabled in your company setup. Confirm before creating job.']
    : [];
  if (labourOnlyPlantMentioned) {
    warnings.push('This job brief mentions equipment or transport, but this company is configured as labour-only. Confirm whether DispatchTalon should track this for the job.');
  }

  return {
    selected_catalogue_items: selected,
    suggested_catalogue_items: suggested,
    one_off_custom_requirements: oneOffCustom,
    selected_catalogue_item_ids: selected.map((row) => row.id),
    selected_catalogue_item_keys: selected.map((row) => row.normalized_key),
    suggested_catalogue_item_keys: suggested.map((row) => row.normalized_key),
    warnings
  };
}

function structuredRequirementsToLegacyCredentials(requirements = []) {
  return Array.from(new Set((requirements || [])
    .filter((row) => row.catalogue_item_id && ['credential', 'voc', 'civil', 'rail', 'energy'].includes(row.category))
    .map((row) => LEGACY_CREDENTIAL_BY_KEY[row.normalized_key])
    .filter(Boolean)));
}

function structuredRequirementsToTaskTags(requirements = []) {
  return Array.from(new Set((requirements || [])
    .filter((row) => ['equipment', 'transport', 'civil', 'rail', 'energy'].includes(row.category))
    .flatMap((row) => {
      const tags = [normalizeKeyPart(row.normalized_key)];
      if (row.category === 'transport') tags.push('transport_review');
      if (row.category === 'equipment') tags.push(normalizeKeyPart(row.label));
      return tags;
    })
    .filter(Boolean)));
}

function applyStructuredRequirementsToJob(db, companyId, job) {
  if (!job?.id) return job;
  const requirements = listJobRequirements(db, companyId, job.id).items;
  if (requirements.length === 0) {
    return { ...job, structured_requirements: [], manual_requirement_review_required: false };
  }

  const existingCredentials = Array.isArray(job.required_credentials) ? job.required_credentials : [];
  const existingTags = Array.isArray(job.task_tags) ? job.task_tags : [];
  const legacyCredentials = structuredRequirementsToLegacyCredentials(requirements);
  const taskTags = structuredRequirementsToTaskTags(requirements);
  const unmappedCredentialItems = requirements.filter((row) =>
    ['credential', 'voc', 'rail', 'energy', 'civil'].includes(row.category)
    && row.catalogue_item_id
    && !LEGACY_CREDENTIAL_BY_KEY[row.normalized_key]
  );
  const customItems = requirements.filter((row) => row.is_custom);
  const transportItems = requirements.filter((row) => row.category === 'transport');

  return {
    ...job,
    required_credentials: Array.from(new Set([...existingCredentials, ...legacyCredentials])),
    task_tags: Array.from(new Set([...existingTags, ...taskTags])),
    structured_requirements: requirements,
    manual_requirement_review_required: customItems.length > 0 || unmappedCredentialItems.length > 0,
    transport_requirement_review_required: transportItems.length > 0,
    structured_requirement_warnings: [
      ...(customItems.length > 0 ? ['One-off custom requirement requires manual review.'] : []),
      ...(unmappedCredentialItems.length > 0 ? ['Some structured requirements cannot be automatically checked against current worker credential types.'] : []),
      ...(transportItems.length > 0 ? ['Transport requirement selected. Confirm vehicle, route, access, and review requirements before dispatch.'] : [])
    ]
  };
}

function hasRequirementPayload(input = {}) {
  return Object.prototype.hasOwnProperty.call(input, 'requirement_item_ids')
    || Object.prototype.hasOwnProperty.call(input, 'requirement_item_keys')
    || Object.prototype.hasOwnProperty.call(input, 'custom_requirements');
}

module.exports = {
  CATALOGUE_ITEMS,
  LABOUR_ONLY_DEFAULT_KEYS,
  LABOUR_REQUIREMENT_CATEGORIES,
  PLANT_REQUIREMENT_CATEGORIES,
  RECOMMENDED_DEFAULT_KEYS,
  applyStructuredRequirementsToJob,
  addCustomRequirementToJob,
  getCompanyOperatingMode,
  hasRequirementPayload,
  listCompanyCatalogueSelections,
  listCompanyEnabledCatalogue,
  listGlobalCatalogue,
  listJobRequirements,
  mapParsedTermsToCatalogue,
  normalizeKeyPart,
  persistJobRequirements,
  seedRequirementCatalogue,
  updateCompanyCatalogueSelections
};
