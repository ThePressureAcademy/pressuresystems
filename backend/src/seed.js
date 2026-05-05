'use strict';

/**
 * Seeds an initial company + admin user so a pilot can begin.
 *
 * Usage:
 *   cp .env.example .env   # edit SEED_* vars
 *   node src/seed.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const bcrypt     = require('bcryptjs');
const { randomUUID } = require('crypto');
const { getDb }  = require('./db');

const companyName   = process.env.SEED_COMPANY_NAME    || 'Pilot Crane Company';
const adminEmail    = process.env.SEED_ADMIN_EMAIL     || 'admin@example.com';
const adminPassword = process.env.SEED_ADMIN_PASSWORD  || 'changeme123';
const adminName     = process.env.SEED_ADMIN_NAME      || 'LIFTIQ Admin';

if (adminPassword === 'changeme123') {
  console.warn('WARNING: Using default seed password. Set SEED_ADMIN_PASSWORD in .env before sharing.');
}

const db = getDb();

const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(adminEmail);
if (existing) {
  console.log(`User ${adminEmail} already exists. Skipping seed.`);
  process.exit(0);
}

const companyId = randomUUID();
const userId    = randomUUID();
const hash      = bcrypt.hashSync(adminPassword, 10);

db.transaction(() => {
  db.prepare(`
    INSERT INTO companies (id, name, locations, operating_regions, status, pilot_start_date)
    VALUES (?, ?, '[]', '[]', 'pilot', date('now'))
  `).run(companyId, companyName);

  db.prepare(`
    INSERT INTO users (id, company_id, name, email, password_hash, role)
    VALUES (?, ?, ?, ?, ?, 'admin')
  `).run(userId, companyId, adminName, adminEmail, hash);
})();

console.log(`Seeded:`);
console.log(`  Company : ${companyName} (${companyId})`);
console.log(`  Admin   : ${adminEmail}`);
console.log(`  Password: ${adminPassword}`);
console.log(`\nLogin with POST /api/auth/login { email, password }`);
