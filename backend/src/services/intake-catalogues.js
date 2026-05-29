'use strict';

function keyify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function titleCase(value) {
  const text = String(value || '').replace(/_/g, ' ').trim();
  if (!text) return '';
  return text.split(/\s+/).map((part) => {
    const upper = part.toUpperCase();
    if (['VOC', 'RIW', 'SARC', 'WETT', 'EWP', 'HRWL', 'MSIC'].includes(upper)) return upper;
    if (/^[A-Z]{1,3}\d?$/.test(upper)) return upper;
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  }).join(' ');
}

function formatDisplayLabel(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const normalized = keyify(raw);
  return DISPLAY_LABEL_BY_KEY[normalized] || titleCase(raw);
}

const WORKER_ROLE_GROUPS = [
  {
    group: 'Crane / lifting',
    options: [
      ['heavy_lift_crane_operator', 'Heavy Lift Crane Operator'],
      ['crane_operator', 'Crane Operator'],
      ['crane_supervisor', 'Crane Supervisor'],
      ['rigging_supervisor', 'Rigging Supervisor'],
      ['lift_supervisor', 'Lift Supervisor'],
      ['lift_engineer', 'Lift Engineer'],
      ['dogman', 'Dogman'],
      ['rigger', 'Rigger']
    ]
  },
  {
    group: 'Trades',
    options: [
      ['steel_erector', 'Steel Erector'],
      ['cad_specialist', 'CAD Specialist'],
      ['electrician', 'Electrician'],
      ['carpenter', 'Carpenter'],
      ['boiler_maker', 'Boiler Maker'],
      ['welder', 'Welder'],
      ['steel_fixer', 'Steel Fixer'],
      ['scaffolder', 'Scaffolder'],
      ['plumber', 'Plumber']
    ]
  },
  {
    group: 'Civil / plant',
    options: [
      ['plant_operator', 'Plant Operator'],
      ['civil_labourer', 'Civil Labourer'],
      ['excavator_operator', 'Excavator Operator'],
      ['skid_steer_operator', 'Skid Steer Operator'],
      ['grader_operator', 'Grader Operator'],
      ['roller_operator', 'Roller Operator'],
      ['forklift_operator', 'Forklift Operator'],
      ['ewp_operator', 'EWP Operator'],
      ['piling_offsider', 'Piling Offsider'],
      ['driller', 'Driller'],
      ['drill_offsider', 'Drill Offsider']
    ]
  },
  {
    group: 'Transport',
    options: [
      ['truck_driver', 'Truck Driver'],
      ['truck_mounted_attenuator_operator', 'Truck Mounted Attenuator Operator'],
      ['courier', 'Courier']
    ]
  },
  {
    group: 'Site support',
    options: [
      ['traffic_controller', 'Traffic Controller'],
      ['electrical_spotter', 'Electrical Spotter'],
      ['labourer', 'Labourer'],
      ['leading_hand', 'Leading Hand'],
      ['supervisor', 'Supervisor'],
      ['project_supervisor', 'Project Supervisor'],
      ['trades_assistant', 'Trades Assistant'],
      ['trade_assistant', 'Trade Assistant'],
      ['general_spotter', 'General Spotter'],
      ['cleaner', 'Cleaner'],
      ['allocator', 'Allocator']
    ]
  }
];

const WORKER_ROLE_LABELS = Object.fromEntries(
  WORKER_ROLE_GROUPS.flatMap((group) => group.options.map(([key, label]) => [key, label]))
);

const ROLE_ALIASES = {
  operator: 'crane_operator',
  crane_operator: 'crane_operator',
  crane_op: 'crane_operator',
  dogman: 'dogman',
  dogging: 'dogman',
  rigger: 'rigger',
  rigging: 'rigger',
  traffic_controller: 'traffic_controller',
  traffic_control: 'traffic_controller',
  supervisor: 'supervisor',
  allocator: 'allocator',
  weilder: 'welder',
  welder: 'welder',
  boilermaker: 'boiler_maker',
  boiler_maker: 'boiler_maker',
  trade_assistant: 'trade_assistant',
  trades_assistant: 'trades_assistant',
  lift_supervisor: 'lift_supervisor',
  project_supervisor: 'project_supervisor',
  electrical_spotter: 'electrical_spotter',
  spotter: 'general_spotter',
  truck_driver: 'truck_driver',
  driver: 'truck_driver'
};

const LEGACY_PRIMARY_ROLE_BY_ROLE = {
  heavy_lift_crane_operator: 'crane_operator',
  crane_operator: 'crane_operator',
  crane_supervisor: 'supervisor',
  rigging_supervisor: 'supervisor',
  lift_supervisor: 'supervisor',
  lift_engineer: 'supervisor',
  dogman: 'dogman',
  rigger: 'rigger',
  traffic_controller: 'traffic_controller',
  electrical_spotter: 'traffic_controller',
  supervisor: 'supervisor',
  leading_hand: 'supervisor',
  project_supervisor: 'supervisor',
  allocator: 'allocator'
};

const HRWL_CODES = [
  'SB', 'SI', 'SA', 'DG', 'RB', 'RI', 'RA', 'CT', 'CS', 'CD', 'CP', 'C2', 'C6',
  'C1', 'C0', 'CB', 'CV', 'CN', 'LF', 'LO', 'ES', 'EA', 'AI', 'PB', 'RS', 'WP'
];

const VOC_CODES = [
  ...HRWL_CODES,
  'Excavator',
  'Front End Loader',
  'Telehandler',
  'Skid Steer',
  'Grader',
  'Roller',
  'Driller',
  'Piling Rig'
];

const CREDENTIAL_GROUP_ORDER = [
  'High Risk Work',
  'VOC',
  'Working at Height',
  'Safety / Site',
  'Heavy Vehicle',
  'Rail',
  'Energy / Electrical',
  'Civil / Plant',
  'Trade certificates',
  'Qualifications'
];

function credentialGroupOrder(groupName) {
  const index = CREDENTIAL_GROUP_ORDER.indexOf(groupName);
  return index === -1 ? CREDENTIAL_GROUP_ORDER.length : index;
}

const CREDENTIAL_GROUPS = [
  {
    group: 'Trade certificates',
    options: [
      ['trade_certificate_carpentry', 'Trade Certificate Carpentry'],
      ['trade_certificate_electrical', 'Trade Certificate Electrical'],
      ['trade_certificate_plumbing', 'Trade Certificate Plumbing'],
      ['trade_certificate_plastering', 'Trade Certificate Plastering'],
      ['trade_certificate_boiler_maker', 'Trade Certificate Boiler Maker'],
      ['trade_certificate_sheet_metal_worker', 'Trade Certificate Sheet Metal Worker']
    ]
  },
  {
    group: 'Qualifications',
    options: [
      ['qualification_diploma', 'Diploma']
    ]
  },
  {
    group: 'High Risk Work',
    options: HRWL_CODES.map((code) => [`hrwl_${code.toLowerCase().replace('c0', 'c0')}`, code])
  },
  {
    group: 'VOC',
    options: VOC_CODES.map((code) => {
      const key = `voc_${keyify(code === 'C0' ? 'c0' : code)}`;
      return [key, `VOC ${code}`];
    })
  },
  {
    group: 'Working at Height',
    options: [
      ['working_at_height', 'Working at Height']
    ]
  },
  {
    group: 'Safety / Site',
    options: [
      ['white_card', 'White Card'],
      ['confined_space', 'Confined Space'],
      ['operate_breathing_apparatus', 'Operate Breathing Apparatus'],
      ['health_and_safety_representative', 'Health and Safety Representative'],
      ['first_aid', 'First Aid'],
      ['site_induction', 'Site Induction'],
      ['client_induction', 'Client Induction'],
      ['medical_clearance', 'Medical Clearance'],
      ['msic_card', 'MSIC Card'],
      ['drivers_licence', 'Driver Licence'],
      ['other', 'Other']
    ]
  },
  {
    group: 'Heavy Vehicle',
    options: [
      ['heavy_vehicle_mc', 'MC Heavy Vehicle Licence'],
      ['heavy_vehicle_hc', 'HC Heavy Vehicle Licence'],
      ['heavy_vehicle_hr', 'HR Heavy Vehicle Licence']
    ]
  },
  {
    group: 'Rail',
    options: [
      ['rail_riw', 'RIW'],
      ['rail_sarc', 'SARC'],
      ['rail_wett', 'WETT']
    ]
  },
  {
    group: 'Energy / Electrical',
    options: [
      ['electrical_spotter', 'Electrical Spotter']
    ]
  },
  {
    group: 'Civil / Plant',
    options: [
      ['machinery_excavator', 'Excavator'],
      ['machinery_front_end_loader', 'Front End Loader'],
      ['machinery_telehandler', 'Telehandler'],
      ['machinery_skid_steer', 'Skid Steer'],
      ['machinery_grader', 'Grader'],
      ['machinery_roller', 'Roller'],
      ['machinery_driller', 'Driller'],
      ['machinery_piling_rig', 'Piling Rig'],
      ['machinery_forklift', 'Forklift']
    ]
  },
  {
    group: 'Legacy records',
    options: [
      ['high_risk_licence_crane', 'High Risk Work Crane'],
      ['high_risk_licence_dogging', 'High Risk Work Dogging'],
      ['high_risk_licence_rigging', 'High Risk Work Rigging']
    ]
  }
];

const CREDENTIAL_LABELS = Object.fromEntries(
  CREDENTIAL_GROUPS.flatMap((group) => group.options.map(([key, label]) => [key, label]))
);

const CREDENTIAL_ALIASES = {
  credential_white_card: 'white_card',
  whitecard: 'white_card',
  credential_working_at_height_wah: 'working_at_height',
  working_at_heights: 'working_at_height',
  working_at_height: 'working_at_height',
  wah: 'working_at_height',
  confined_spaces: 'confined_space',
  breathing_apparatus: 'operate_breathing_apparatus',
  hsr: 'health_and_safety_representative',
  firstaid: 'first_aid',
  first_aid: 'first_aid',
  energy_electrical_spotter: 'electrical_spotter',
  electrical_spotter: 'electrical_spotter',
  rail_riw: 'rail_riw',
  rail_sarc: 'rail_sarc',
  rail_wett: 'rail_wett',
  riw: 'rail_riw',
  sarc: 'rail_sarc',
  wett: 'rail_wett',
  civil_excavator: 'machinery_excavator',
  civil_front_end_loader: 'machinery_front_end_loader',
  civil_telehandler: 'machinery_telehandler',
  credential_heavy_vehicle_mc: 'heavy_vehicle_mc',
  credential_heavy_vehicle_hc: 'heavy_vehicle_hc',
  credential_heavy_vehicle_hr: 'heavy_vehicle_hr',
  mc: 'heavy_vehicle_mc',
  hc: 'heavy_vehicle_hc',
  hr: 'heavy_vehicle_hr',
  forklift: 'machinery_forklift',
  lf: 'hrwl_lf',
  dg: 'hrwl_dg',
  c6: 'hrwl_c6',
  c1: 'hrwl_c1',
  c2: 'hrwl_c2',
  c0: 'hrwl_c0',
  co: 'hrwl_c0',
  hrwl_co: 'hrwl_c0',
  credential_hrwl_co: 'hrwl_c0',
  high_risk_licence_crane: 'high_risk_licence_crane',
  high_risk_licence_dogging: 'high_risk_licence_dogging',
  high_risk_licence_rigging: 'high_risk_licence_rigging'
};

for (const code of HRWL_CODES) {
  const lower = code.toLowerCase();
  CREDENTIAL_ALIASES[`hrwl_${lower}`] = `hrwl_${lower}`;
  CREDENTIAL_ALIASES[`credential_hrwl_${lower}`] = `hrwl_${lower}`;
}
for (const code of VOC_CODES) {
  const key = keyify(code === 'C0' ? 'c0' : code);
  CREDENTIAL_ALIASES[`voc_${key}`] = `voc_${key}`;
}

const SITE_CONDITION_GROUPS = [
  {
    group: 'Ground',
    options: [
      ['sloped_ground', 'Sloped ground'],
      ['poor_ground_conditions', 'Poor ground conditions'],
      ['soft_ground_conditions', 'Soft ground conditions'],
      ['clear_ground_conditions', 'Clear ground conditions'],
      ['excellent_ground_conditions', 'Excellent ground conditions'],
      ['uneven_ground', 'Uneven ground']
    ]
  },
  {
    group: 'Access',
    options: [
      ['clear_access_and_egress', 'Clear access and egress'],
      ['poor_access_and_egress', 'Poor access and egress'],
      ['restricted_access', 'Restricted access'],
      ['limited_setup_area', 'Limited setup area'],
      ['low_overhead_clearance', 'Low overhead clearance']
    ]
  },
  {
    group: 'Overhead hazards',
    options: [
      ['overhead_trees', 'Overhead trees'],
      ['overhead_powerlines', 'Overhead powerlines'],
      ['nearby_structures', 'Nearby structures']
    ]
  },
  {
    group: 'Public / traffic interface',
    options: [
      ['pedestrians_nearby', 'Pedestrians nearby'],
      ['traffic_interface', 'Traffic interface'],
      ['public_interface', 'Public interface'],
      ['congested_worksite', 'Congested worksite'],
      ['live_plant_nearby', 'Live plant nearby']
    ]
  },
  {
    group: 'Services / environment',
    options: [
      ['underground_services', 'Underground services'],
      ['poor_lighting', 'Poor lighting'],
      ['night_work', 'Night work'],
      ['wet_weather_exposure', 'Wet weather exposure'],
      ['wind_exposure', 'Wind exposure']
    ]
  }
];

const SITE_CONDITION_LABELS = Object.fromEntries(
  SITE_CONDITION_GROUPS.flatMap((group) => group.options.map(([key, label]) => [key, label]))
);

const SITE_CONDITION_ALIASES = {
  sloped: 'sloped_ground',
  poor_ground: 'poor_ground_conditions',
  soft_ground: 'soft_ground_conditions',
  clear_ground: 'clear_ground_conditions',
  excellent_ground: 'excellent_ground_conditions',
  poor_access: 'poor_access_and_egress',
  clear_access: 'clear_access_and_egress',
  access_restrictions: 'restricted_access',
  restricted_access: 'restricted_access',
  underground_service: 'underground_services',
  underground_services: 'underground_services',
  overhead_tree: 'overhead_trees',
  overhead_trees: 'overhead_trees',
  overhead_powerline: 'overhead_powerlines',
  overhead_powerlines: 'overhead_powerlines',
  pedestrians: 'pedestrians_nearby',
  pedestrian_interface: 'pedestrians_nearby',
  congested_site: 'congested_worksite',
  congested_worksite: 'congested_worksite',
  poor_lighting: 'poor_lighting'
};

const SITE_REVIEW_KEYS = new Set([
  'sloped_ground',
  'poor_ground_conditions',
  'soft_ground_conditions',
  'uneven_ground',
  'poor_access_and_egress',
  'restricted_access',
  'limited_setup_area',
  'low_overhead_clearance',
  'overhead_trees',
  'overhead_powerlines',
  'nearby_structures',
  'pedestrians_nearby',
  'traffic_interface',
  'public_interface',
  'congested_worksite',
  'live_plant_nearby',
  'underground_services',
  'poor_lighting',
  'night_work',
  'wet_weather_exposure',
  'wind_exposure'
]);

const DISPLAY_LABEL_BY_KEY = {
  ...WORKER_ROLE_LABELS,
  ...CREDENTIAL_LABELS,
  ...SITE_CONDITION_LABELS,
  labour_only: 'Labour only',
  plant_and_labour: 'Plant + labour',
  active: 'Active',
  inactive: 'Inactive',
  available: 'Available',
  allocated: 'Allocated',
  unavailable: 'Unavailable',
  on_leave: 'On leave',
  labour_hire: 'Labour hire',
  high_risk_work: 'High Risk Work',
  job_requirement_items: 'Job requirements',
  mobile_crane: 'Mobile Crane'
};

function parseList(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === '') return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Fall through to comma/pipe splitting.
    }
    return value.split(/[|,]/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function unique(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

function normalizeWorkerRole(value) {
  const key = keyify(value);
  return ROLE_ALIASES[key] || (WORKER_ROLE_LABELS[key] ? key : null);
}

function normalizeWorkerRoles(value) {
  return unique(parseList(value).map(normalizeWorkerRole));
}

function workerRoleLabel(value) {
  return WORKER_ROLE_LABELS[normalizeWorkerRole(value)] || formatDisplayLabel(value);
}

function legacyPrimaryRoleForRoles(roles = [], fallback = 'allocator') {
  for (const role of normalizeWorkerRoles(roles)) {
    if (LEGACY_PRIMARY_ROLE_BY_ROLE[role]) return LEGACY_PRIMARY_ROLE_BY_ROLE[role];
  }
  const legacy = normalizeWorkerRole(fallback);
  return LEGACY_PRIMARY_ROLE_BY_ROLE[legacy] || 'allocator';
}

function normalizeCredentialType(value) {
  const key = keyify(value);
  if (!key) return null;
  if (CREDENTIAL_ALIASES[key]) return CREDENTIAL_ALIASES[key];
  if (CREDENTIAL_LABELS[key]) return key;
  if (key.startsWith('custom_')) return key;
  if (key.startsWith('credential_hrwl_')) {
    const suffix = key.replace('credential_hrwl_', '').replace(/^co$/, 'c0');
    const candidate = `hrwl_${suffix}`;
    if (CREDENTIAL_LABELS[candidate]) return candidate;
  }
  if (key.startsWith('voc_')) {
    const suffix = key.replace('voc_', '').replace(/^co$/, 'c0');
    const candidate = `voc_${suffix}`;
    if (CREDENTIAL_LABELS[candidate]) return candidate;
  }
  return null;
}

function normalizeCredentialTypes(value) {
  return unique(parseList(value).map(normalizeCredentialType));
}

function credentialDisplayLabel(value) {
  const normalized = normalizeCredentialType(value);
  return CREDENTIAL_LABELS[normalized] || formatDisplayLabel(value);
}

const LEGACY_CREDENTIAL_COMPATIBILITY = {
  high_risk_licence_crane: new Set([
    'hrwl_c0', 'hrwl_c1', 'hrwl_c2', 'hrwl_c6', 'hrwl_cb', 'hrwl_cd', 'hrwl_cn',
    'hrwl_cp', 'hrwl_cs', 'hrwl_ct', 'hrwl_cv'
  ]),
  high_risk_licence_dogging: new Set(['hrwl_dg']),
  high_risk_licence_rigging: new Set(['hrwl_ra', 'hrwl_rb', 'hrwl_ri']),
  drivers_licence: new Set(['heavy_vehicle_mc', 'heavy_vehicle_hc', 'heavy_vehicle_hr'])
};

function credentialMatchesRequirement(workerType, requiredType) {
  const worker = normalizeCredentialType(workerType);
  const required = normalizeCredentialType(requiredType);
  if (!worker || !required) return false;
  if (worker === required) return true;
  return Boolean(
    LEGACY_CREDENTIAL_COMPATIBILITY[worker]?.has(required)
    || LEGACY_CREDENTIAL_COMPATIBILITY[required]?.has(worker)
  );
}

function normalizeSiteCondition(value) {
  const key = keyify(value);
  return SITE_CONDITION_ALIASES[key] || (SITE_CONDITION_LABELS[key] ? key : null);
}

function normalizeSiteConditions(value) {
  return unique(parseList(value).map(normalizeSiteCondition));
}

function siteConditionLabel(value) {
  const normalized = normalizeSiteCondition(value);
  return SITE_CONDITION_LABELS[normalized] || formatDisplayLabel(value);
}

function siteConditionReviewLabels(values = []) {
  return normalizeSiteConditions(values)
    .filter((key) => SITE_REVIEW_KEYS.has(key))
    .map(siteConditionLabel);
}

function intakeOptionsPayload() {
  return {
    worker_role_groups: WORKER_ROLE_GROUPS.map((group) => ({
      group: group.group,
      options: group.options.map(([value, label]) => ({ value, label }))
    })),
    credential_groups: CREDENTIAL_GROUPS
      .filter((group) => group.group !== 'Legacy records')
      .slice()
      .sort((a, b) => credentialGroupOrder(a.group) - credentialGroupOrder(b.group) || a.group.localeCompare(b.group))
      .map((group) => ({
        group: group.group,
        options: group.options.map(([value, label]) => ({ value, label }))
      })),
    site_condition_groups: SITE_CONDITION_GROUPS.map((group) => ({
      group: group.group,
      options: group.options.map(([value, label]) => ({ value, label }))
    }))
  };
}

module.exports = {
  CREDENTIAL_GROUPS,
  CREDENTIAL_LABELS,
  CREDENTIAL_TYPE_KEYS: Object.keys(CREDENTIAL_LABELS),
  HRWL_CODES,
  SITE_CONDITION_GROUPS,
  SITE_CONDITION_LABELS,
  WORKER_ROLE_GROUPS,
  WORKER_ROLE_LABELS,
  credentialDisplayLabel,
  credentialMatchesRequirement,
  formatDisplayLabel,
  intakeOptionsPayload,
  keyify,
  legacyPrimaryRoleForRoles,
  normalizeCredentialType,
  normalizeCredentialTypes,
  normalizeSiteCondition,
  normalizeSiteConditions,
  normalizeWorkerRole,
  normalizeWorkerRoles,
  siteConditionLabel,
  siteConditionReviewLabels,
  workerRoleLabel
};
