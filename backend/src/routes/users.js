'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const { getDb } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// All routes are company-scoped via req.user.company_id

// GET /api/users
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const users = db.prepare(`
    SELECT id, name, email, role, status, created_at, last_login_at
    FROM users WHERE company_id = ? ORDER BY name
  `).all(req.user.company_id);
  res.json(users);
});

// POST /api/users — admin only
router.post('/', requireAuth, requireRole('admin'), (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'name, email, password, and role are required' });
  }
  const validRoles = ['admin', 'dispatcher', 'supervisor', 'viewer'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${validRoles.join(', ')}` });
  }

  const db = getDb();
  const exists = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email.toLowerCase());
  if (exists) return res.status(409).json({ error: 'Email already in use' });

  const id   = randomUUID();
  const hash = bcrypt.hashSync(password, 10);

  db.prepare(`
    INSERT INTO users (id, company_id, name, email, password_hash, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, req.user.company_id, name, email.toLowerCase(), hash, role);

  const user = db.prepare(
    `SELECT id, name, email, role, status, created_at FROM users WHERE id = ?`
  ).get(id);
  res.status(201).json(user);
});

// GET /api/users/:id
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const user = db.prepare(`
    SELECT id, name, email, role, status, created_at, last_login_at
    FROM users WHERE id = ? AND company_id = ?
  `).get(req.params.id, req.user.company_id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// PATCH /api/users/:id — admin only
router.patch('/:id', requireAuth, requireRole('admin'), (req, res) => {
  const db = getDb();
  const { name, role, status, password } = req.body;

  // Prevent demoting the only admin
  if (role && role !== 'admin') {
    const user = db.prepare(`SELECT role FROM users WHERE id = ? AND company_id = ?`)
      .get(req.params.id, req.user.company_id);
    if (user?.role === 'admin') {
      const adminCount = db.prepare(
        `SELECT COUNT(*) as n FROM users WHERE company_id = ? AND role = 'admin' AND status = 'active'`
      ).get(req.user.company_id).n;
      if (adminCount <= 1) {
        return res.status(422).json({ error: 'Cannot remove the only admin user' });
      }
    }
  }

  const hashUpdate = password ? bcrypt.hashSync(password, 10) : null;

  db.prepare(`
    UPDATE users
    SET name          = COALESCE(?, name),
        role          = COALESCE(?, role),
        status        = COALESCE(?, status),
        password_hash = COALESCE(?, password_hash)
    WHERE id = ? AND company_id = ?
  `).run(name || null, role || null, status || null, hashUpdate, req.params.id, req.user.company_id);

  const updated = db.prepare(
    `SELECT id, name, email, role, status, created_at FROM users WHERE id = ?`
  ).get(req.params.id);
  if (!updated) return res.status(404).json({ error: 'User not found' });
  res.json(updated);
});

module.exports = router;
