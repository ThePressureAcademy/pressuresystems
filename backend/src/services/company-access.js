'use strict';

const ACCESS_STATUSES = ['active', 'suspended', 'expired'];
const PILOT_TYPES = ['internal', 'testing_partner', 'founding_partner', 'commercial_pilot'];

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeAccessStatus(value) {
  return ACCESS_STATUSES.includes(value) ? value : 'active';
}

function normalizePilotType(value) {
  return PILOT_TYPES.includes(value) ? value : 'internal';
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isPilotExpired(company, now = new Date()) {
  if (!company) return false;
  if (company.access_status === 'expired') return true;
  const expiresAt = parseDate(company.pilot_expires_at);
  return Boolean(expiresAt && expiresAt.getTime() <= now.getTime());
}

function effectiveAccessStatus(company, now = new Date()) {
  if (!company) return 'expired';
  if (company.access_status === 'suspended') return 'suspended';
  if (isPilotExpired(company, now)) return 'expired';
  return 'active';
}

function daysRemaining(company, now = new Date()) {
  const expiresAt = parseDate(company?.pilot_expires_at);
  if (!expiresAt) return null;
  const diffMs = expiresAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

function serializeCompanyAccess(company, now = new Date()) {
  if (!company) return null;
  const status = effectiveAccessStatus(company, now);
  const displayName = company.display_name || company.name;
  return {
    id: company.id,
    name: company.name,
    slug: company.slug || null,
    display_name: displayName,
    access_status: company.access_status || 'active',
    effective_access_status: status,
    pilot_type: company.pilot_type || 'internal',
    pilot_starts_at: company.pilot_starts_at || company.pilot_start_date || null,
    pilot_expires_at: company.pilot_expires_at || null,
    timezone: company.timezone || 'Australia/Brisbane',
    days_remaining: daysRemaining(company, now),
    expired: status === 'expired',
    suspended: status === 'suspended'
  };
}

function blockedCompanyResponse(company, now = new Date()) {
  const status = effectiveAccessStatus(company, now);
  if (status === 'suspended') {
    return {
      error: 'Pilot access suspended',
      message: 'This pilot portal is suspended. Contact Pressure Systems to restore access.',
      company_access_status: status,
      company: serializeCompanyAccess(company, now)
    };
  }
  if (status === 'expired') {
    return {
      error: 'Pilot access expired',
      message: 'This test portal has expired. Contact Pressure Systems to extend access.',
      company_access_status: status,
      company: serializeCompanyAccess(company, now)
    };
  }
  return null;
}

module.exports = {
  ACCESS_STATUSES,
  PILOT_TYPES,
  blockedCompanyResponse,
  daysRemaining,
  effectiveAccessStatus,
  isPilotExpired,
  normalizeAccessStatus,
  normalizePilotType,
  normalizeSlug,
  serializeCompanyAccess
};
