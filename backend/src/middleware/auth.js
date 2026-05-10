'use strict';

const jwt = require('jsonwebtoken');
const { getDb } = require('../db');

function getSecret() {
  return process.env.JWT_SECRET || 'dev-secret-change-in-production';
}

function loadActiveUser(userId) {
  const db = getDb();
  return db.prepare(`
    SELECT id, company_id, name, email, role, status, must_change_password
    FROM users
    WHERE id = ?
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
  try {
    const payload = jwt.verify(header.slice(7), getSecret());
    const user = loadActiveUser(payload.id);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.user = {
      id: user.id,
      company_id: user.company_id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      must_change_password: Boolean(user.must_change_password)
    };
    if (req.user.must_change_password && !passwordChangeAllowed(req)) {
      return res.status(403).json({
        error: 'Password change required before accessing the console',
        must_change_password: true
      });
    }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
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

function signToken(payload) {
  return jwt.sign(payload, getSecret(), { expiresIn: '12h' });
}

module.exports = { requireAuth, requireRole, signToken };
