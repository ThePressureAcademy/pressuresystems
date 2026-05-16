'use strict';

const express = require('express');
const { getDb } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { buildCsvExport } = require('../services/csv-export');

const router = express.Router();

router.get('/:exportType.csv', requireAuth, (req, res) => {
  const db = getDb();
  const result = buildCsvExport(db, req.user, req.params.exportType, req.query);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(result.csv);
});

module.exports = router;
