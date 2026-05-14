'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');
const {
  blockedCompanyResponse,
  effectiveAccessStatus,
  serializeCompanyAccess
} = require('../services/company-access');

const router = express.Router();

function serializeUser(user) {
  const company = user.company || {
    id: user.company_id,
    name: user.company_name,
    slug: user.company_slug,
    display_name: user.company_display_name,
    access_status: user.company_access_status,
    pilot_type: user.company_pilot_type,
    pilot_start_date: user.company_pilot_start_date,
    pilot_starts_at: user.company_pilot_starts_at,
    pilot_expires_at: user.company_pilot_expires_at,
    operating_mode: user.company_operating_mode,
    timezone: user.company_timezone,
    notes: user.company_notes
  };
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    company_id: user.company_id,
    company: serializeCompanyAccess(company),
    must_change_password: Boolean(user.must_change_password)
  };
}

function validatePasswordStrength(currentPassword, nextPassword) {
  if (!nextPassword || nextPassword.length < 10) {
    return 'Use at least 10 characters.';
  }
  if (nextPassword === currentPassword) {
    return 'New password must be different from the current password.';
  }
  if (!/[A-Z]/.test(nextPassword)) {
    return 'Include at least one uppercase letter.';
  }
  if (!/[a-z]/.test(nextPassword)) {
    return 'Include at least one lowercase letter.';
  }
  if (!/[0-9]/.test(nextPassword)) {
    return 'Include at least one number.';
  }
  if (!/[^A-Za-z0-9]/.test(nextPassword)) {
    return 'Include at least one symbol.';
  }
  return null;
}

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const db = getDb();
  const user = db.prepare(`
    SELECT
      u.*,
      c.name AS company_name,
      c.slug AS company_slug,
      c.display_name AS company_display_name,
      c.access_status AS company_access_status,
      c.pilot_type AS company_pilot_type,
      c.pilot_start_date AS company_pilot_start_date,
      c.pilot_starts_at AS company_pilot_starts_at,
      c.pilot_expires_at AS company_pilot_expires_at,
      c.operating_mode AS company_operating_mode,
      c.timezone AS company_timezone,
      c.notes AS company_notes
    FROM users u
    JOIN companies c ON c.id = u.company_id
    WHERE u.email = ? AND u.status = 'active'
  `).get(email.toLowerCase().trim());

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const company = {
    id: user.company_id,
    name: user.company_name,
    slug: user.company_slug,
    display_name: user.company_display_name,
    access_status: user.company_access_status,
    pilot_type: user.company_pilot_type,
    pilot_start_date: user.company_pilot_start_date,
    pilot_starts_at: user.company_pilot_starts_at,
    pilot_expires_at: user.company_pilot_expires_at,
    operating_mode: user.company_operating_mode,
    timezone: user.company_timezone,
    notes: user.company_notes
  };
  const companyBlock = blockedCompanyResponse(company);
  if (companyBlock?.company_access_status === 'suspended') {
    return res.status(403).json(companyBlock);
  }

  db.prepare(`UPDATE users SET last_login_at = datetime('now') WHERE id = ?`).run(user.id);

  const token = signToken({
    id:         user.id,
    company_id: user.company_id,
    role:       user.role,
    name:       user.name
  });

  res.json({
    token,
    user: serializeUser(user),
    must_change_password: Boolean(user.must_change_password),
    company_access_status: effectiveAccessStatus(company)
  });
});

router.get('/me', requireAuth, (req, res) => {
  const db = getDb();
  const user = db.prepare(`
    SELECT
      u.id,
      u.name,
      u.email,
      u.role,
      u.company_id,
      u.status,
      u.must_change_password,
      u.created_at,
      u.last_login_at,
      c.name AS company_name,
      c.slug AS company_slug,
      c.display_name AS company_display_name,
      c.access_status AS company_access_status,
      c.pilot_type AS company_pilot_type,
      c.pilot_start_date AS company_pilot_start_date,
      c.pilot_starts_at AS company_pilot_starts_at,
      c.pilot_expires_at AS company_pilot_expires_at,
      c.operating_mode AS company_operating_mode,
      c.timezone AS company_timezone,
      c.notes AS company_notes
    FROM users u
    JOIN companies c ON c.id = u.company_id
    WHERE u.id = ?
  `).get(req.user.id);

  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(serializeUser(user));
});

router.post('/change-password', requireAuth, (req, res) => {
  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'current_password and new_password are required' });
  }

  const db = getDb();
  const user = db.prepare(`
    SELECT id, password_hash, must_change_password
    FROM users
    WHERE id = ? AND status = 'active'
  `).get(req.user.id);

  if (!user || !bcrypt.compareSync(current_password, user.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const passwordError = validatePasswordStrength(current_password, new_password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare(`
    UPDATE users
    SET password_hash = ?, must_change_password = 0
    WHERE id = ?
  `).run(hash, req.user.id);

  res.json({ success: true, message: 'Password updated. Please sign in again.' });
});

module.exports = router;
