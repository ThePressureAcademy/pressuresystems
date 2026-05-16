'use strict';

const { randomUUID } = require('crypto');
const { appendAuditEvent } = require('./audit');
const { formatDisplayLabel, normalizeWorkerRoles, workerRoleLabel } = require('./intake-catalogues');

function trimText(value) {
  const normalized = String(value || '').trim();
  return normalized ? normalized : null;
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatDate(value) {
  if (!value) return 'date to be confirmed';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  if (!year || !month || !day) return String(value);
  return `${day}/${month}/${year}`;
}

function localTimeFromDateTime(value) {
  if (!value) return null;
  const text = String(value);
  if (text.includes(' ')) return text.split(' ')[1]?.slice(0, 5) || null;
  if (text.includes('T')) return text.split('T')[1]?.slice(0, 5) || null;
  return null;
}

function allocationTimeWindow(context) {
  const start = localTimeFromDateTime(context.scheduled_start_local)
    || localTimeFromDateTime(context.allocation_start_at_utc)
    || context.shift_start_time
    || 'start time TBC';
  const end = localTimeFromDateTime(context.scheduled_end_local)
    || localTimeFromDateTime(context.allocation_end_at_utc)
    || 'finish TBC';
  return `${start}-${end}`;
}

function roleForMessage(context) {
  const roleCoverage = parseJsonArray(context.role_coverage_keys);
  if (roleCoverage.length > 0) {
    return roleCoverage.map(workerRoleLabel).join(' / ');
  }
  const requiredRoles = parseJsonArray(context.crew_roles_required);
  const workerRoles = normalizeWorkerRoles(context.worker_roles || context.worker_role);
  const matched = requiredRoles.find((role) => workerRoles.includes(role));
  return formatDisplayLabel(matched || requiredRoles[0] || workerRoles[0] || context.worker_role || 'allocated worker');
}

function jobTitleForMessage(context) {
  return trimText(context.reference)
    || trimText(context.job_description)
    || trimText(context.site_name)
    || trimText(context.client_name)
    || 'this job';
}

function siteForMessage(context) {
  return [context.site_name, context.site_location]
    .map(trimText)
    .filter(Boolean)
    .join(', ') || 'site to be confirmed';
}

function buildAllocationSmsMessage(context) {
  return `DispatchTalon: You have been allocated to ${jobTitleForMessage(context)} on ${formatDate(context.date)}, ${allocationTimeWindow(context)} at ${siteForMessage(context)}. Role: ${roleForMessage(context)}. Reply directly to your dispatcher to confirm.`;
}

function serializeNotification(row) {
  if (!row) return null;
  return {
    id: row.id,
    company_id: row.company_id,
    allocation_id: row.allocation_id,
    job_id: row.job_id,
    worker_id: row.worker_id,
    channel: row.channel,
    status: row.status,
    recipient_phone: row.recipient_phone,
    message_body_snapshot: row.message_body_snapshot,
    provider: row.provider,
    provider_message_id: row.provider_message_id,
    sent_at: row.sent_at,
    delivered_at: row.delivered_at,
    responded_at: row.responded_at,
    response_text: row.response_text,
    created_by_user_id: row.created_by_user_id,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function getAllocationContext(db, { companyId, jobId, allocationId, workerId }) {
  let sql = `
    SELECT
      a.*,
      j.reference,
      j.client_name,
      j.site_name,
      j.site_location,
      j.job_description,
      j.date,
      j.shift_start_time,
      j.crew_roles_required,
      j.scheduled_start_local,
      j.scheduled_end_local,
      w.name AS worker_name,
      w.contact_number AS worker_phone,
      w.role AS worker_role,
      w.roles AS worker_roles,
      (
        SELECT json_group_array(role_key)
        FROM allocation_role_coverages arc
        WHERE arc.company_id = a.company_id
          AND arc.job_id = a.job_id
          AND arc.allocation_id = a.id
      ) AS role_coverage_keys
    FROM allocations a
    JOIN jobs j ON j.id = a.job_id AND j.company_id = a.company_id
    JOIN workers w ON w.id = a.worker_id AND w.company_id = a.company_id
    WHERE a.company_id = ? AND a.job_id = ?
  `;
  const params = [companyId, jobId];
  if (allocationId) {
    sql += ` AND a.id = ?`;
    params.push(allocationId);
  } else if (workerId) {
    sql += ` AND a.worker_id = ?`;
    params.push(workerId);
  } else {
    throw new Error('allocation_id is required');
  }
  sql += ` ORDER BY a.allocated_at DESC LIMIT 1`;
  return db.prepare(sql).get(...params);
}

function warningForContext(context) {
  return trimText(context.worker_phone)
    ? null
    : 'Worker mobile number required for SMS. Use manual contact and update worker profile.';
}

function createPreviewNotification(db, { user, jobId, allocationId, workerId }) {
  const context = getAllocationContext(db, {
    companyId: user.company_id,
    jobId,
    allocationId,
    workerId
  });
  if (!context) {
    const error = new Error('Allocation not found');
    error.status = 404;
    throw error;
  }

  const now = new Date().toISOString();
  const notificationId = randomUUID();
  const message = buildAllocationSmsMessage(context);
  const recipientPhone = trimText(context.worker_phone);
  db.prepare(`
    INSERT INTO allocation_notifications (
      id, company_id, allocation_id, job_id, worker_id, channel, status,
      recipient_phone, message_body_snapshot, created_by_user_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'sms', 'previewed', ?, ?, ?, ?, ?)
  `).run(
    notificationId,
    user.company_id,
    context.id,
    jobId,
    context.worker_id,
    recipientPhone,
    message,
    user.id,
    now,
    now
  );

  appendAuditEvent(db, {
    companyId: user.company_id,
    eventType: 'allocation_publish_previewed',
    userId: user.id,
    workerId: context.worker_id,
    jobId,
    allocationId: context.id,
    payload: {
      notification_id: notificationId,
      channel: 'sms',
      has_mobile: Boolean(recipientPhone)
    }
  });

  const notification = db.prepare(`SELECT * FROM allocation_notifications WHERE id = ?`).get(notificationId);
  return {
    notification: serializeNotification(notification),
    sms_preview: message,
    warning: warningForContext(context),
    allocation: {
      id: context.id,
      worker_id: context.worker_id,
      worker_name: context.worker_name
    }
  };
}

function publishManualNotification(db, { user, jobId, allocationId, workerId, notificationId, manualContactAcknowledged }) {
  const context = getAllocationContext(db, {
    companyId: user.company_id,
    jobId,
    allocationId,
    workerId
  });
  if (!context) {
    const error = new Error('Allocation not found');
    error.status = 404;
    throw error;
  }

  const recipientPhone = trimText(context.worker_phone);
  if (!recipientPhone && !manualContactAcknowledged) {
    const error = new Error('Worker mobile number required for SMS. Acknowledge manual contact before marking this published.');
    error.status = 400;
    error.warning = warningForContext(context);
    throw error;
  }

  const now = new Date().toISOString();
  const message = buildAllocationSmsMessage(context);
  let row = null;
  if (notificationId) {
    row = db.prepare(`
      SELECT *
      FROM allocation_notifications
      WHERE id = ? AND company_id = ? AND job_id = ? AND allocation_id = ?
    `).get(notificationId, user.company_id, jobId, context.id);
    if (!row) {
      const error = new Error('Notification preview not found');
      error.status = 404;
      throw error;
    }
    db.prepare(`
      UPDATE allocation_notifications
      SET status = 'published_manual',
          recipient_phone = ?,
          message_body_snapshot = ?,
          provider = 'manual_copy',
          updated_at = ?
      WHERE id = ?
    `).run(recipientPhone, message, now, notificationId);
  } else {
    notificationId = randomUUID();
    db.prepare(`
      INSERT INTO allocation_notifications (
        id, company_id, allocation_id, job_id, worker_id, channel, status,
        recipient_phone, message_body_snapshot, provider, created_by_user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'sms', 'published_manual', ?, ?, 'manual_copy', ?, ?, ?)
    `).run(
      notificationId,
      user.company_id,
      context.id,
      jobId,
      context.worker_id,
      recipientPhone,
      message,
      user.id,
      now,
      now
    );
  }

  appendAuditEvent(db, {
    companyId: user.company_id,
    eventType: 'allocation_published_manual',
    userId: user.id,
    workerId: context.worker_id,
    jobId,
    allocationId: context.id,
    payload: {
      notification_id: notificationId,
      channel: 'sms',
      provider: 'manual_copy',
      has_mobile: Boolean(recipientPhone),
      manual_contact_acknowledged: Boolean(manualContactAcknowledged)
    }
  });

  row = db.prepare(`SELECT * FROM allocation_notifications WHERE id = ?`).get(notificationId);
  return {
    notification: serializeNotification(row),
    warning: warningForContext(context)
  };
}

function listAllocationNotifications(db, { companyId, jobId }) {
  return db.prepare(`
    SELECT *
    FROM allocation_notifications
    WHERE company_id = ? AND job_id = ?
    ORDER BY updated_at DESC, created_at DESC
  `).all(companyId, jobId).map(serializeNotification);
}

module.exports = {
  buildAllocationSmsMessage,
  createPreviewNotification,
  listAllocationNotifications,
  publishManualNotification
};
