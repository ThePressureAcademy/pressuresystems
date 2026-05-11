'use strict';

const express = require('express');
const { getDb } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  listCraneModels,
  listCraneTravelStates
} = require('../services/crane-model-catalog');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  res.json(listCraneModels(db));
});

router.get('/:id/travel-states', requireAuth, (req, res) => {
  const db = getDb();
  const craneModelId = Number(req.params.id);
  if (!Number.isFinite(craneModelId)) {
    return res.status(400).json({ error: 'Crane model id must be numeric' });
  }

  const states = listCraneTravelStates(db, craneModelId);
  if (!states.length) {
    return res.status(404).json({ error: 'Crane travel states not found' });
  }

  return res.json(states);
});

router.post('/', requireAuth, requireRole('admin'), (req, res) => {
  return res.status(501).json({
    error: 'Crane model creation is not enabled in this pilot. Seed or governed admin tooling is required.'
  });
});

module.exports = router;
