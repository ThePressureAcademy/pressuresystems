'use strict';

const express = require('express');
const { getDb } = require('../db');
const { requireAuth, requireInternalAdmin } = require('../middleware/auth');
const { appendAuditEvent } = require('../services/audit');
const { listPilotActivity } = require('../services/pilot-activity-monitor');

const router = express.Router();

router.get('/pilot-activity', requireAuth, requireInternalAdmin, (req, res) => {
  const db = getDb();
  const result = listPilotActivity(db, {
    status: req.query.status,
    days: req.query.days,
    company_id: req.query.company_id,
    engagement: req.query.engagement
  });

  appendAuditEvent(db, {
    companyId: req.user.company_id,
    eventType: 'internal_pilot_monitor_viewed',
    userId: req.user.id,
    payload: {
      window_days: result.window_days,
      company_count: result.companies.length,
      status: req.query.status || 'active',
      engagement: req.query.engagement || null,
      company_filter_applied: Boolean(req.query.company_id)
    }
  });

  res.json(result);
});

module.exports = router;
