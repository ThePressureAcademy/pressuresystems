'use strict';

function envFlag(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || raw === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(raw).trim().toLowerCase());
}

function isRouteCheckEnabled() {
  return envFlag('ROUTECHECK_ENABLED', false);
}

function routeCheckSettings() {
  return {
    enabled: isRouteCheckEnabled(),
    provider_mode: process.env.ROUTECHECK_PROVIDER_MODE || 'manual',
    allow_external_links: envFlag('ROUTECHECK_ALLOW_EXTERNAL_LINKS', true),
    require_acknowledgement: envFlag('ROUTECHECK_REQUIRE_ACKNOWLEDGEMENT', true),
    block_dispatch_on_critical: envFlag('ROUTECHECK_BLOCK_DISPATCH_ON_CRITICAL', true)
  };
}

function requireRouteCheckEnabled(req, res, next) {
  if (!isRouteCheckEnabled()) {
    return res.status(404).json({ error: 'RouteCheck is not enabled for this environment' });
  }
  next();
}

module.exports = {
  envFlag,
  isRouteCheckEnabled,
  requireRouteCheckEnabled,
  routeCheckSettings
};
