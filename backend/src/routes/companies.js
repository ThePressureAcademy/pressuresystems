'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const { getDb } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  normalizeAccessStatus,
  normalizePilotType,
  normalizeSlug,
  serializeCompanyAccess
} = require('../services/company-access');

const router = express.Router();

// Middleware: verify the request is for the authenticated user's company
function requireOwnCompany(req, res, next) {
  if (req.user.company_id !== req.params.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
}

// POST /api/companies — create company + initial admin user
// Requires X-Admin-Token header matching ADMIN_TOKEN env var (Phase 1 bootstrap only)
router.post('/', (req, res) => {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken || req.headers['x-admin-token'] !== adminToken) {
    return res.status(403).json({ error: 'Admin token required to create a company' });
  }

  const { name, slug, display_name, abn, locations, operating_regions, pilot_start_date,
          access_status, pilot_type, pilot_starts_at, pilot_expires_at, timezone, notes,
          admin_name, admin_email, admin_password } = req.body;

  if (!name || !admin_name || !admin_email || !admin_password) {
    return res.status(400).json({
      error: 'name, admin_name, admin_email, and admin_password are required'
    });
  }

  const db = getDb();

  const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(admin_email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'Email already in use' });

  const companyId = randomUUID();
  const userId    = randomUUID();
  const hash      = bcrypt.hashSync(admin_password, 10);
  const resolvedPilotStart = pilot_starts_at || pilot_start_date || new Date().toISOString();
  const resolvedSlug = slug ? normalizeSlug(slug) : null;

  const create = db.transaction(() => {
    db.prepare(`
      INSERT INTO companies (
        id, name, slug, display_name, abn, timezone, locations, operating_regions,
        status, pilot_start_date, access_status, pilot_type, pilot_starts_at,
        pilot_expires_at, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pilot', ?, ?, ?, ?, ?, ?)
    `).run(
      companyId,
      name,
      resolvedSlug || null,
      display_name || name,
      abn || null,
      timezone || 'Australia/Brisbane',
      JSON.stringify(locations || []),
      JSON.stringify(operating_regions || []),
      String(resolvedPilotStart).slice(0, 10),
      normalizeAccessStatus(access_status),
      normalizePilotType(pilot_type),
      resolvedPilotStart,
      pilot_expires_at || null,
      notes || null
    );

    db.prepare(`
      INSERT INTO users (id, company_id, name, email, password_hash, role, must_change_password)
      VALUES (?, ?, ?, ?, ?, 'admin', 1)
    `).run(userId, companyId, admin_name, admin_email.toLowerCase().trim(), hash);
  });

  create();

  const company = db.prepare(`SELECT * FROM companies WHERE id = ?`).get(companyId);
  company.locations         = JSON.parse(company.locations);
  company.operating_regions = JSON.parse(company.operating_regions);

  res.status(201).json({ company: { ...company, access: serializeCompanyAccess(company) }, admin_user_id: userId });
});

// GET /api/companies/:id
router.get('/:id', requireAuth, requireOwnCompany, (req, res) => {
  const db = getDb();
  const company = db.prepare(`SELECT * FROM companies WHERE id = ?`).get(req.params.id);
  if (!company) return res.status(404).json({ error: 'Company not found' });
  company.locations         = JSON.parse(company.locations);
  company.operating_regions = JSON.parse(company.operating_regions);
  res.json(company);
});

// PATCH /api/companies/:id — admin only
router.patch('/:id', requireAuth, requireOwnCompany, requireRole('admin'), (req, res) => {
  const db = getDb();
  const {
    name,
    slug,
    display_name,
    abn,
    locations,
    operating_regions,
    status,
    pilot_start_date,
    access_status,
    pilot_type,
    pilot_starts_at,
    pilot_expires_at,
    timezone,
    notes
  } = req.body;

  db.prepare(`
    UPDATE companies
    SET name = COALESCE(?, name),
        slug = COALESCE(?, slug),
        display_name = COALESCE(?, display_name),
        abn  = COALESCE(?, abn),
        timezone = COALESCE(?, timezone),
        locations = COALESCE(?, locations),
        operating_regions = COALESCE(?, operating_regions),
        status = COALESCE(?, status),
        pilot_start_date = COALESCE(?, pilot_start_date),
        access_status = COALESCE(?, access_status),
        pilot_type = COALESCE(?, pilot_type),
        pilot_starts_at = COALESCE(?, pilot_starts_at),
        pilot_expires_at = COALESCE(?, pilot_expires_at),
        notes = COALESCE(?, notes)
    WHERE id = ?
  `).run(
    name || null,
    slug ? normalizeSlug(slug) : null,
    display_name || null,
    abn  || null,
    timezone || null,
    locations         ? JSON.stringify(locations)         : null,
    operating_regions ? JSON.stringify(operating_regions) : null,
    status            || null,
    pilot_start_date  || null,
    access_status ? normalizeAccessStatus(access_status) : null,
    pilot_type ? normalizePilotType(pilot_type) : null,
    pilot_starts_at || null,
    pilot_expires_at || null,
    notes || null,
    req.params.id
  );

  const company = db.prepare(`SELECT * FROM companies WHERE id = ?`).get(req.params.id);
  company.locations         = JSON.parse(company.locations);
  company.operating_regions = JSON.parse(company.operating_regions);
  res.json(company);
});

module.exports = router;
