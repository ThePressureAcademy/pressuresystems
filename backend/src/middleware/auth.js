'use strict';

const jwt = require('jsonwebtoken');
const { getDb } = require('../db');
const { appendAuditEvent } = require('../services/audit');
const {
  blockedCompanyResponse,
  effectiveAccessStatus,
  serializeCompanyAccess
} = require('../services/company-access');

function getSecret() {
  return process.env.JWT_SECRET || 'dev-secret-change-in-production';
}

function loadActiveUser(userId) {
  const db = getDb();
  return db.prepare(`
    SELECT
      u.id,
      u.company_id,
      u.name,
      u.email,
      u.role,
      u.status,
      u.is_internal_admin,
      u.must_change_password,
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
  `).get(userId);
}

function passwordChangeAllowed(req) {
  return req.baseUrl === '/api/auth'
    && (req.path === '/change-password' || req.path === '/me');
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  let payload;
  try {
    payload = jwt.verify(header.slice(7), getSecret());
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const db = getDb();
  const user = loadActiveUser(payload.id);
  if (!user || user.status !== 'active') {
    return res.status(401).json({ error: 'Invalid or expired token' });
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
  req.user = {
    id: user.id,
    company_id: user.company_id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    is_internal_admin: Boolean(user.is_internal_admin),
    must_change_password: Boolean(user.must_change_password),
    company: serializeCompanyAccess(company)
  };
  if (effectiveAccessStatus(company) === 'expired' && !passwordChangeAllowed(req)) {
    return res.status(403).json(companyBlock);
  }
  if (req.user.must_change_password && !passwordChangeAllowed(req)) {
    appendAuditEvent(db, {
      companyId: user.company_id,
      eventType: 'protected_route_blocked_password_change',
      userId: user.id,
      payload: {
        method: req.method,
        route: req.baseUrl || req.path || 'protected_route'
      }
    });
    return res.status(403).json({
      error: 'Password change required before accessing the console',
      must_change_password: true
    });
  }
  next();
}

// Returns middleware that accepts any of the given roles
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Requires role: ${roles.join(' or ')}` });
    }
    next();
  };
}

function requireInternalAdmin(req, res, next) {
  if (!req.user?.is_internal_admin) {
    return res.status(403).json({ error: 'Internal admin access required' });
  }
  next();
}

function signToken(payload) {
  return jwt.sign(payload, getSecret(), { expiresIn: '12h' });
}

module.exports = { requireAuth, requireRole, requireInternalAdmin, signToken };
