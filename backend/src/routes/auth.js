'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    company_id: user.company_id,
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
  if (nextPassword === 'changeme123') {
    return 'The temporary bootstrap password cannot be reused.';
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
  const user = db.prepare(
    `SELECT * FROM users WHERE email = ? AND status = 'active'`
  ).get(email.toLowerCase().trim());

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
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
    must_change_password: Boolean(user.must_change_password)
  });
});

router.get('/me', requireAuth, (req, res) => {
  const db = getDb();
  const user = db.prepare(
    `SELECT id, name, email, role, company_id, status, must_change_password, created_at, last_login_at
     FROM users WHERE id = ?`
  ).get(req.user.id);

  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
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
