'use strict';

const express = require('express');
const { getDb } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { listGlobalCatalogue } = require('../services/job-requirement-catalogue');

const router = express.Router();

router.get('/requirements', requireAuth, (_req, res) => {
  const db = getDb();
  res.json(listGlobalCatalogue(db));
});

module.exports = router;
