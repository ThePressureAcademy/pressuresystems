'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { getDb } = require('../db');
const {
  REPLACEMENT_ADMIN_EMAIL,
  REPLACEMENT_ADMIN_NAME,
  rotateAdminCredentials
} = require('../services/admin-rotation');

const replacementEmail = process.env.ROTATE_ADMIN_EMAIL || REPLACEMENT_ADMIN_EMAIL;
const replacementName = process.env.ROTATE_ADMIN_NAME || REPLACEMENT_ADMIN_NAME;
const bootstrapPassword = process.env.ROTATE_ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD || 'changeme123';

const result = rotateAdminCredentials(getDb(), {
  replacementEmail,
  replacementName,
  bootstrapPassword
});

console.log(`Replacement admin email: ${result.replacementAdminEmail}`);
console.log(`Replacement admin role: ${result.role}`);
console.log(`Replacement admin status: ${result.status}`);
console.log(`Old seeded admin action: ${result.oldAdminAction}`);
console.log(`Must change password on next sign-in: ${result.mustChangePassword ? 'yes' : 'no'}`);
