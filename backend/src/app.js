'use strict';

const path    = require('path');
const express = require('express');

const app = express();

app.use(express.json());

// Health check — no auth required
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'liftiq-backend', version: '0.1.0' });
});

app.use('/api/auth',         require('./routes/auth'));
app.use('/api/companies',    require('./routes/companies'));
app.use('/api/users',        require('./routes/users'));
app.use('/api/workers',      require('./routes/workers'));
app.use('/api/jobs',         require('./routes/jobs'));
app.use('/api/audit-events', require('./routes/audit-events'));
app.use('/api/metrics',      require('./routes/metrics'));

// 404 for unknown API paths
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ─── Pilot console (static SPA) ───────────────────────────────────────────────
const CONSOLE_DIR = path.join(__dirname, '../public/console');
app.use('/console', express.static(CONSOLE_DIR, { index: 'index.html' }));
app.get('/console/*', (req, res) => {
  res.sendFile(path.join(CONSOLE_DIR, 'index.html'));
});
app.get('/', (req, res) => res.redirect('/console/'));

// Error handler
app.use((err, req, res, _next) => {
  console.error(err.stack || err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
