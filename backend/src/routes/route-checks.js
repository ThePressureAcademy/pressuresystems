'use strict';

const express = require('express');
const { getDb } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { requireRouteCheckEnabled, routeCheckSettings } = require('../services/routecheck-config');
const {
  addExternalRouteLink,
  addRouteNote,
  approveRouteCheck,
  createRouteCheck,
  dashboardSummary,
  getRouteCheck,
  listRouteChecks,
  recordOperatorAcknowledgement,
  sendNotesToOperator,
  updatePermitStatus,
  updateRouteCheckStatus
} = require('../services/route-checks');

const router = express.Router();

router.use(requireAuth);

router.get('/config', (req, res) => {
  const settings = routeCheckSettings();
  if (!settings.enabled) return res.status(404).json({ error: 'RouteCheck is not enabled for this environment' });
  return res.json({
    ...settings,
    role: req.user.role,
    can_edit: ['admin', 'dispatcher'].includes(req.user.role),
    can_override: req.user.role === 'admin'
  });
});

router.use(requireRouteCheckEnabled);

function sendError(res, error) {
  return res.status(error.status || 400).json({ error: error.message || 'RouteCheck request failed' });
}

router.get('/', (req, res) => {
  const db = getDb();
  return res.json({
    route_checks: listRouteChecks(db, req.user.company_id, req.query || {}),
    summary: dashboardSummary(db, req.user.company_id)
  });
});

router.post('/', (req, res) => {
  const db = getDb();
  try {
    return res.status(201).json(createRouteCheck(db, req.user, req.body || {}));
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const routeCheck = getRouteCheck(db, req.user.company_id, req.params.id);
  if (!routeCheck) return res.status(404).json({ error: 'RouteCheck not found' });
  return res.json(routeCheck);
});

router.patch('/:id/status', (req, res) => {
  const db = getDb();
  try {
    const routeCheck = updateRouteCheckStatus(db, req.user, req.params.id, req.body || {});
    if (!routeCheck) return res.status(404).json({ error: 'RouteCheck not found' });
    return res.json(routeCheck);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/:id/notes', (req, res) => {
  const db = getDb();
  try {
    const routeCheck = addRouteNote(db, req.user, req.params.id, req.body || {});
    if (!routeCheck) return res.status(404).json({ error: 'RouteCheck not found' });
    return res.status(201).json(routeCheck);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/:id/external-links', (req, res) => {
  const db = getDb();
  try {
    const routeCheck = addExternalRouteLink(db, req.user, req.params.id, req.body || {});
    if (!routeCheck) return res.status(404).json({ error: 'RouteCheck not found' });
    return res.status(201).json(routeCheck);
  } catch (error) {
    return sendError(res, error);
  }
});

router.patch('/:id/permit', (req, res) => {
  const db = getDb();
  try {
    const routeCheck = updatePermitStatus(db, req.user, req.params.id, req.body || {});
    if (!routeCheck) return res.status(404).json({ error: 'RouteCheck not found' });
    return res.json(routeCheck);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/:id/approve', (req, res) => {
  const db = getDb();
  try {
    const routeCheck = approveRouteCheck(db, req.user, req.params.id, req.body || {});
    if (!routeCheck) return res.status(404).json({ error: 'RouteCheck not found' });
    return res.json(routeCheck);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/:id/send-to-operator', (req, res) => {
  const db = getDb();
  try {
    const routeCheck = sendNotesToOperator(db, req.user, req.params.id, req.body || {});
    if (!routeCheck) return res.status(404).json({ error: 'RouteCheck not found' });
    return res.json(routeCheck);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/:id/operator-ack', (req, res) => {
  const db = getDb();
  try {
    const routeCheck = recordOperatorAcknowledgement(db, req.user, req.params.id, req.body || {});
    if (!routeCheck) return res.status(404).json({ error: 'RouteCheck not found' });
    return res.json(routeCheck);
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/:id/audit', (req, res) => {
  const db = getDb();
  const routeCheck = getRouteCheck(db, req.user.company_id, req.params.id);
  if (!routeCheck) return res.status(404).json({ error: 'RouteCheck not found' });
  return res.json({ events: routeCheck.events });
});

module.exports = router;
