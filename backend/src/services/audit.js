'use strict';

const { randomUUID } = require('crypto');

/**
 * Appends an audit event. Never updates or deletes — the database trigger enforces this too.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {object} event
 * @param {string} event.companyId
 * @param {string} event.eventType
 * @param {string} [event.userId]
 * @param {string} [event.workerId]
 * @param {string} [event.jobId]
 * @param {string} [event.allocationId]
 * @param {object} [event.payload]
 * @returns {string} The new audit event id
 */
function appendAuditEvent(db, { companyId, eventType, userId, workerId, jobId, allocationId, payload }) {
  const id = randomUUID();
  db.prepare(`
    INSERT INTO audit_events
      (id, company_id, event_type, user_id, worker_id, job_id, allocation_id, payload, timestamp)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    id,
    companyId,
    eventType,
    userId        || null,
    workerId      || null,
    jobId         || null,
    allocationId  || null,
    JSON.stringify(payload || {})
  );
  return id;
}

module.exports = { appendAuditEvent };
