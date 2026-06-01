'use strict';

class ManualRoutingProvider {
  constructor() {
    this.providerName = 'manual';
  }

  async createRoute() {
    return {
      status: 'manual_required',
      routeUrl: null,
      warnings: ['Manual route review required']
    };
  }

  async getRouteStatus() {
    return { status: 'manual_required' };
  }

  async getRouteLink() {
    return null;
  }

  async getWarnings() {
    return ['Manual route review required'];
  }

  async syncVehicleProfile() {
    return { status: 'not_supported_in_phase_1' };
  }

  async syncJobRouteRequest() {
    return { status: 'manual_required' };
  }
}

function getRoutingProvider() {
  return new ManualRoutingProvider();
}

module.exports = {
  ManualRoutingProvider,
  getRoutingProvider
};
