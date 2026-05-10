'use strict';

const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const LEGACY_ADMIN_EMAIL = 'admin@example.com';
const REPLACEMENT_ADMIN_EMAIL = 'operations@raymonds.com.au';
const REPLACEMENT_ADMIN_NAME = 'Operations Admin';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function firstCompanyId(db) {
  const row = db.prepare(`
    SELECT id
    FROM companies
    ORDER BY created_at ASC, id ASC
    LIMIT 1
  `).get();
  return row?.id || null;
}

function disabledLegacyEmail(userId) {
  return `disabled-admin+${String(userId).slice(0, 8)}@example.invalid`;
}

function rotateAdminCredentials(db, options = {}) {
  const replacementEmail = normalizeEmail(options.replacementEmail || REPLACEMENT_ADMIN_EMAIL);
  const replacementName = String(options.replacementName || REPLACEMENT_ADMIN_NAME).trim() || REPLACEMENT_ADMIN_NAME;
  const bootstrapPassword = String(options.bootstrapPassword || '');
  const legacyEmail = normalizeEmail(options.legacyEmail || LEGACY_ADMIN_EMAIL);

  if (!replacementEmail) throw new Error('Replacement admin email is required');
  if (!bootstrapPassword) throw new Error('Bootstrap password is required');

  return db.transaction(() => {
    const legacyUser = db.prepare(`SELECT * FROM users WHERE email = ?`).get(legacyEmail);
    const replacementUser = db.prepare(`SELECT * FROM users WHERE email = ?`).get(replacementEmail);

    if (legacyUser && replacementUser && legacyUser.company_id !== replacementUser.company_id) {
      throw new Error('Legacy admin and replacement admin belong to different companies');
    }

    const companyId = replacementUser?.company_id || legacyUser?.company_id || firstCompanyId(db);
    if (!companyId) {
      throw new Error('No company exists in the database. Seed a company before rotating admin credentials.');
    }

    const now = new Date().toISOString();
    const passwordHash = bcrypt.hashSync(bootstrapPassword, 10);
    const replacementId = replacementUser?.id || randomUUID();

    if (replacementUser) {
      db.prepare(`
        UPDATE users
        SET company_id = ?,
            name = ?,
            role = 'admin',
            status = 'active',
            password_hash = ?,
            must_change_password = 1
        WHERE id = ?
      `).run(
        companyId,
        replacementUser.name || replacementName,
        passwordHash,
        replacementId
      );
    } else {
      db.prepare(`
        INSERT INTO users (
          id, company_id, name, email, password_hash, role, status, must_change_password, created_at
        ) VALUES (?, ?, ?, ?, ?, 'admin', 'active', 1, ?)
      `).run(
        replacementId,
        companyId,
        replacementName,
        replacementEmail,
        passwordHash,
        now
      );
    }

    let oldAdminAction = 'not_found';
    if (legacyUser && legacyUser.id !== replacementId) {
      db.prepare(`
        UPDATE users
        SET email = ?,
            role = 'viewer',
            status = 'deactivated',
            must_change_password = 0
        WHERE id = ?
      `).run(disabledLegacyEmail(legacyUser.id), legacyUser.id);
      oldAdminAction = 'disabled';
    } else if (legacyUser && legacyUser.id === replacementId) {
      oldAdminAction = 'reused_same_user';
    }

    const updatedUser = db.prepare(`
      SELECT id, company_id, name, email, role, status, must_change_password
      FROM users
      WHERE id = ?
    `).get(replacementId);

    return {
      replacementAdminEmail: updatedUser.email,
      replacementAdminId: updatedUser.id,
      companyId: updatedUser.company_id,
      role: updatedUser.role,
      status: updatedUser.status,
      mustChangePassword: Boolean(updatedUser.must_change_password),
      oldAdminAction
    };
  })();
}

module.exports = {
  LEGACY_ADMIN_EMAIL,
  REPLACEMENT_ADMIN_EMAIL,
  REPLACEMENT_ADMIN_NAME,
  rotateAdminCredentials
};
