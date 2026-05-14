'use strict';

const {
  credentialDisplayLabel,
  credentialMatchesRequirement,
  normalizeCredentialType,
  normalizeCredentialTypes
} = require('./intake-catalogues');

const EXPIRY_WARNING_DAYS = 30;

/**
 * Evaluates a worker's credentials against a job's required credential types.
 *
 * Returns:
 *   hardBlocked  — true if worker cannot be allocated (missing or expired required credential)
 *   blocks       — array of block reasons
 *   warnings     — array of warning reasons (expiring soon)
 *   credentialScore — 0–100 factor used in SmartRank (0 if blocked, else 75–100)
 *
 * @param {object[]} credentials  All credentials for this worker
 * @param {string[]} requiredTypes  Credential types required by the job
 * @param {Date}     today
 */
function computeCredentialStatus(credentials, requiredTypes, today = new Date()) {
  const todayStr = today.toISOString().slice(0, 10);

  const warnDate = new Date(today);
  warnDate.setDate(warnDate.getDate() + EXPIRY_WARNING_DAYS);
  const warnDateStr = warnDate.toISOString().slice(0, 10);

  const blocks = [];
  const warnings = [];

  const normalizedRequiredTypes = normalizeCredentialTypes(requiredTypes);

  if (!normalizedRequiredTypes || normalizedRequiredTypes.length === 0) {
    return { hardBlocked: false, blocks, warnings, credentialScore: 100 };
  }

  const normalizedCredentials = (credentials || [])
    .map((cred) => ({ ...cred, normalized_type: normalizeCredentialType(cred.type) }))
    .filter((cred) => cred.normalized_type);

  for (const reqType of normalizedRequiredTypes) {
    const label = credentialDisplayLabel(reqType);
    const workerCreds = normalizedCredentials.filter((cred) =>
      credentialMatchesRequirement(cred.normalized_type, reqType)
    );

    if (workerCreds.length === 0) {
      blocks.push({
        type: 'credential_missing',
        credential_type: reqType,
        detail: `Missing required credential: ${label}`
      });
      continue;
    }

    // Find any non-expired credential of this type
    const validCreds = workerCreds.filter(c => {
      if (!c.expiry_date) return true;            // no expiry = always valid
      return c.expiry_date > todayStr;
    });

    if (validCreds.length === 0) {
      const latest = workerCreds.sort((a, b) =>
        (b.expiry_date || '9999') > (a.expiry_date || '9999') ? 1 : -1
      )[0];
      blocks.push({
        type: 'credential_expired',
        credential_type: reqType,
        detail: `Expired credential: ${label} (expired ${latest.expiry_date})`
      });
      continue;
    }

    // Check if any valid credential is expiring soon
    const expiringSoon = validCreds.filter(c => {
      if (!c.expiry_date) return false;
      return c.expiry_date >= todayStr && c.expiry_date <= warnDateStr;
    });

    if (expiringSoon.length > 0) {
      warnings.push({
        type: 'credential_expiring_soon',
        credential_type: reqType,
        detail: `Credential expiring soon: ${label} (expires ${expiringSoon[0].expiry_date})`
      });
    }
  }

  if (blocks.length > 0) {
    return { hardBlocked: true, blocks, warnings, credentialScore: 0 };
  }

  // Score: 100 if all clean, 75 if some expiring soon
  const credentialScore = warnings.length > 0 ? 75 : 100;
  return { hardBlocked: false, blocks, warnings, credentialScore };
}

module.exports = { computeCredentialStatus };
