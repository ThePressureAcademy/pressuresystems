'use strict';

const DEFAULT_ROUTE_CHECK_THRESHOLDS = Object.freeze({
  width_m: 2.5,
  height_m: 4.3,
  length_m: 12.5,
  gross_weight_kg: 12000
});

const ROUTECHECK_ASSET_KEYWORDS = [
  'mobile_crane',
  'crawler_crane',
  'crawler_crane_transport',
  'tilt_tray',
  'semi',
  'semi_trailer',
  'heavy_rigid',
  'escort_vehicle',
  'osom',
  'oversize',
  'overmass',
  'low_loader'
];

function numberOrNull(value) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function riskLevelFromScore(score) {
  if (score >= 6) return 'critical';
  if (score >= 4) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function assetDescriptor(asset = {}) {
  return [
    asset.catalogue_normalized_key,
    asset.catalogue_label,
    asset.catalogue_group_label,
    asset.catalogue_category,
    asset.display_name,
    asset.asset_number,
    asset.vehicle_class,
    asset.permit_category
  ].map(normalizeText).join(' ');
}

function isRouteCheckAsset(asset) {
  const descriptor = assetDescriptor(asset);
  return ROUTECHECK_ASSET_KEYWORDS.some((keyword) => descriptor.includes(keyword));
}

function isNightMovement(job = {}) {
  if (normalizeText(job.shift_type) === 'night') return true;
  const start = normalizeText(job.shift_start_time || job.scheduled_start_local);
  const match = start.match(/\b(\d{1,2}):(\d{2})\b/);
  if (!match) return false;
  const hour = Number(match[1]);
  return hour >= 18 || hour < 5;
}

function evaluateRouteCheckRequirement({ job = {}, asset = null, vehicleProfile = null, notes = [] } = {}) {
  const profile = vehicleProfile || asset || {};
  const reasons = [];
  const warnings = [];
  let score = 0;
  let required = false;

  if (asset && isRouteCheckAsset({ ...asset, ...profile })) {
    required = true;
    reasons.push('Assigned asset class requires route/access review.');
    score += normalizeText(asset.catalogue_normalized_key).includes('osom') ? 2 : 1;
  }

  const width = numberOrNull(profile.width_m);
  const height = numberOrNull(profile.height_m);
  const length = numberOrNull(profile.length_m);
  const weight = numberOrNull(profile.gross_weight_kg);

  if (width != null && width > DEFAULT_ROUTE_CHECK_THRESHOLDS.width_m) {
    required = true;
    score += 2;
    reasons.push('Vehicle width exceeds MVP route-review threshold.');
  }
  if (height != null && height > DEFAULT_ROUTE_CHECK_THRESHOLDS.height_m) {
    required = true;
    score += 2;
    reasons.push('Vehicle height exceeds MVP route-review threshold.');
  }
  if (length != null && length > DEFAULT_ROUTE_CHECK_THRESHOLDS.length_m) {
    required = true;
    score += 1;
    reasons.push('Vehicle length exceeds MVP route-review threshold.');
  }
  if (weight != null && weight > DEFAULT_ROUTE_CHECK_THRESHOLDS.gross_weight_kg) {
    required = true;
    score += 2;
    reasons.push('Vehicle gross weight exceeds MVP route-review threshold.');
  }

  if (asset && required && [width, height, length, weight].some((value) => value == null)) {
    score += 2;
    warnings.push('Vehicle profile dimensions or weight are incomplete.');
  }

  const descriptor = assetDescriptor({ ...asset, ...profile });
  if (descriptor.includes('permit') || descriptor.includes('oversize') || descriptor.includes('overmass') || descriptor.includes('osom')) {
    required = true;
    score += 2;
    reasons.push('Asset or permit category suggests permit/access review.');
  }

  if (isNightMovement(job) && asset && isRouteCheckAsset({ ...asset, ...profile })) {
    required = true;
    score += 1;
    reasons.push('Night movement with route-review asset.');
  }

  const noteText = (notes || []).map((note) => `${note.note_type || ''} ${note.note_text || ''}`).join(' ').toLowerCase();
  if (/bridge|road restriction|known access issue|restricted entry|site access|escort|pilot/.test(noteText)) {
    required = true;
    score += 2;
    reasons.push('Route/access note indicates review context.');
  }
  if (/operator issue|issue found/.test(noteText)) {
    score = Math.max(score, 6);
    reasons.push('Operator has flagged a route/access issue.');
  }

  return {
    route_required: required,
    risk_score: score,
    risk_level: riskLevelFromScore(score),
    reasons,
    warnings,
    thresholds: DEFAULT_ROUTE_CHECK_THRESHOLDS
  };
}

module.exports = {
  DEFAULT_ROUTE_CHECK_THRESHOLDS,
  evaluateRouteCheckRequirement,
  riskLevelFromScore
};
