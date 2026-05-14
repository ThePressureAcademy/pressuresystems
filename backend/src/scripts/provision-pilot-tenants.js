'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const { getDb } = require('../db');
const {
  normalizeAccessStatus,
  normalizePilotType,
  normalizeSlug
} = require('../services/company-access');

const ADMIN_ENV = {
  'borgers-cranes-rigging': {
    email: 'BORGERS_ADMIN_EMAIL',
    password: 'BORGERS_ADMIN_PASSWORD'
  },
  'smithbridge-universal-cranes': {
    email: 'SMITHBRIDGE_ADMIN_EMAIL',
    password: 'SMITHBRIDGE_ADMIN_PASSWORD'
  },
  'getsome-hire-test': {
    email: 'GETSOME_ADMIN_EMAIL',
    password: 'GETSOME_ADMIN_PASSWORD'
  }
};

function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function parseSqliteDate(value) {
  if (!value) return null;
  const text = String(value).includes('T')
    ? String(value)
    : `${String(value).replace(' ', 'T')}Z`;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolvePilotExpiry(existing, company) {
  if (existing?.pilot_expires_at) return existing.pilot_expires_at;
  if (existing && company.slug === 'getsome-hire-test') {
    const createdAt = parseSqliteDate(existing.created_at);
    if (createdAt) return addDays(createdAt, 14).toISOString();
  }
  return company.pilot_expires_at || null;
}

function pilotCompanies(now = new Date()) {
  const startsAt = now.toISOString();
  return [
    {
      name: 'Borgers Cranes & Rigging',
      display_name: 'Borgers Cranes & Rigging',
      slug: 'borgers-cranes-rigging',
      pilot_type: 'founding_partner',
      access_status: 'active',
      timezone: 'Australia/Brisbane',
      pilot_starts_at: startsAt,
      pilot_expires_at: null,
      notes: 'Pilot tenant provisioned for separate DispatchTalon access.'
    },
    {
      name: 'Smithbridge Group / Universal Cranes',
      display_name: 'Smithbridge Group / Universal Cranes',
      slug: 'smithbridge-universal-cranes',
      pilot_type: 'founding_partner',
      access_status: 'active',
      timezone: 'Australia/Brisbane',
      pilot_starts_at: startsAt,
      pilot_expires_at: null,
      notes: 'Pilot tenant provisioned for separate DispatchTalon access.'
    },
    {
      name: 'Getsome Hire',
      display_name: 'Getsome Hire',
      slug: 'getsome-hire-test',
      pilot_type: 'testing_partner',
      access_status: 'active',
      timezone: 'Australia/Brisbane',
      pilot_starts_at: startsAt,
      pilot_expires_at: addDays(now, 14).toISOString(),
      notes: '14-day test portal. Access expiry is not billing or subscription enforcement.'
    }
  ];
}

function upsertCompany(db, company) {
  const slug = normalizeSlug(company.slug);
  const existing = db.prepare(`SELECT * FROM companies WHERE slug = ?`).get(slug);
  const companyId = existing?.id || randomUUID();
  const pilotStartDate = String(company.pilot_starts_at || new Date().toISOString()).slice(0, 10);

  if (existing) {
    const pilotExpiresAt = resolvePilotExpiry(existing, company);
    db.prepare(`
      UPDATE companies
      SET name = ?,
          display_name = ?,
          timezone = ?,
          access_status = ?,
          pilot_type = ?,
          pilot_starts_at = COALESCE(pilot_starts_at, ?),
          pilot_expires_at = ?,
          notes = ?
      WHERE id = ?
    `).run(
      company.name,
      company.display_name,
      company.timezone,
      normalizeAccessStatus(company.access_status),
      normalizePilotType(company.pilot_type),
      company.pilot_starts_at || null,
      pilotExpiresAt,
      company.notes || null,
      existing.id
    );
    return { id: existing.id, slug, action: 'updated' };
  }

  db.prepare(`
    INSERT INTO companies (
      id, name, slug, display_name, timezone, locations, operating_regions,
      status, pilot_start_date, access_status, pilot_type, pilot_starts_at,
      pilot_expires_at, notes
    )
    VALUES (?, ?, ?, ?, ?, '[]', '[]', 'pilot', ?, ?, ?, ?, ?, ?)
  `).run(
    companyId,
    company.name,
    slug,
    company.display_name,
    company.timezone,
    pilotStartDate,
    normalizeAccessStatus(company.access_status),
    normalizePilotType(company.pilot_type),
    company.pilot_starts_at || null,
    company.pilot_expires_at || null,
    company.notes || null
  );

  return { id: companyId, slug, action: 'created' };
}

function upsertAdmin(db, companyId, email, password) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const existing = db.prepare(`SELECT * FROM users WHERE email = ?`).get(normalizedEmail);
  if (existing && existing.company_id !== companyId) {
    throw new Error(`Admin email ${normalizedEmail} already belongs to another company.`);
  }

  const hash = bcrypt.hashSync(password, 10);
  if (existing) {
    db.prepare(`
      UPDATE users
      SET password_hash = ?,
          role = 'admin',
          status = 'active',
          must_change_password = 1
      WHERE id = ?
    `).run(hash, existing.id);
    return { id: existing.id, email: normalizedEmail, action: 'updated' };
  }

  const userId = randomUUID();
  db.prepare(`
    INSERT INTO users (
      id, company_id, name, email, password_hash, role, status, must_change_password
    )
    VALUES (?, ?, ?, ?, ?, 'admin', 'active', 1)
  `).run(
    userId,
    companyId,
    'Pilot Admin',
    normalizedEmail,
    hash
  );

  return { id: userId, email: normalizedEmail, action: 'created' };
}

function provisionPilotTenants(db = getDb(), options = {}) {
  const env = options.env || process.env;
  const logger = options.logger || console;
  const now = options.now || new Date();
  const companies = options.companies || pilotCompanies(now);
  const results = [];
  let adminPairsFound = 0;

  db.transaction(() => {
    for (const company of companies) {
      const companyResult = upsertCompany(db, company);
      const envKeys = ADMIN_ENV[companyResult.slug];
      const email = envKeys ? env[envKeys.email] : null;
      const password = envKeys ? env[envKeys.password] : null;
      const output = {
        company_slug: companyResult.slug,
        company_action: companyResult.action,
        pilot_expires_at: company.pilot_expires_at || null,
        admin_email: null,
        admin_action: 'skipped'
      };

      if (!email || !password) {
        logger.warn(
          `Missing ${envKeys?.email || 'ADMIN_EMAIL'} or ${envKeys?.password || 'ADMIN_PASSWORD'}; admin not created for ${companyResult.slug}.`
        );
      } else {
        adminPairsFound += 1;
        const adminResult = upsertAdmin(db, companyResult.id, email, password);
        output.admin_email = adminResult.email;
        output.admin_action = adminResult.action;
      }
      results.push(output);
    }
  })();

  if (adminPairsFound === 0) {
    throw new Error('No pilot admin environment variable pairs were supplied. Companies were provisioned, but no admin users were created.');
  }

  return results;
}

function runCli() {
  try {
    const results = provisionPilotTenants();
    for (const result of results) {
      console.log(`Company ${result.company_slug}: ${result.company_action}`);
      if (result.pilot_expires_at) console.log(`Pilot expiry: ${result.pilot_expires_at}`);
      if (result.admin_email) {
        console.log(`Admin ${result.admin_email}: ${result.admin_action}; must_change_password=yes`);
      } else {
        console.log('Admin: skipped; missing email or password environment variable');
      }
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runCli();
}

module.exports = {
  ADMIN_ENV,
  pilotCompanies,
  provisionPilotTenants,
  upsertAdmin,
  upsertCompany
};
