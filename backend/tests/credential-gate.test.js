'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { computeCredentialStatus } = require('../src/services/credential-gate');

const TODAY = new Date('2026-05-05');

describe('computeCredentialStatus', () => {

  test('passes when no credentials required', () => {
    const result = computeCredentialStatus([], [], TODAY);
    assert.equal(result.hardBlocked, false);
    assert.equal(result.blocks.length, 0);
    assert.equal(result.credentialScore, 100);
  });

  test('blocks when required credential is missing entirely', () => {
    const result = computeCredentialStatus(
      [],  // worker has no credentials
      ['high_risk_licence_crane'],
      TODAY
    );
    assert.equal(result.hardBlocked, true);
    assert.equal(result.blocks.length, 1);
    assert.equal(result.blocks[0].type, 'credential_missing');
    assert.equal(result.blocks[0].credential_type, 'high_risk_licence_crane');
  });

  test('blocks when required credential is expired', () => {
    const credentials = [{
      id: 'c1', type: 'high_risk_licence_crane',
      expiry_date: '2026-01-01',  // expired before TODAY
      status: 'expired'
    }];
    const result = computeCredentialStatus(credentials, ['high_risk_licence_crane'], TODAY);
    assert.equal(result.hardBlocked, true);
    assert.equal(result.blocks.some(b => b.type === 'credential_expired'), true);
  });

  test('blocks when all credentials of a required type are expired', () => {
    const credentials = [
      { id: 'c1', type: 'high_risk_licence_crane', expiry_date: '2025-06-01' },
      { id: 'c2', type: 'high_risk_licence_crane', expiry_date: '2025-12-01' }
    ];
    const result = computeCredentialStatus(credentials, ['high_risk_licence_crane'], TODAY);
    assert.equal(result.hardBlocked, true);
  });

  test('passes when valid credential exists alongside an expired one', () => {
    const credentials = [
      { id: 'c1', type: 'high_risk_licence_crane', expiry_date: '2025-01-01' }, // expired
      { id: 'c2', type: 'high_risk_licence_crane', expiry_date: '2028-01-01' }  // valid
    ];
    const result = computeCredentialStatus(credentials, ['high_risk_licence_crane'], TODAY);
    assert.equal(result.hardBlocked, false);
  });

  test('warns when credential expires within 30 days', () => {
    const expiringSoon = new Date(TODAY);
    expiringSoon.setDate(TODAY.getDate() + 15);  // 15 days away

    const credentials = [{
      id: 'c1', type: 'high_risk_licence_crane',
      expiry_date: expiringSoon.toISOString().slice(0, 10)
    }];
    const result = computeCredentialStatus(credentials, ['high_risk_licence_crane'], TODAY);
    assert.equal(result.hardBlocked, false);
    assert.equal(result.warnings.some(w => w.type === 'credential_expiring_soon'), true);
    assert.equal(result.credentialScore, 75);
  });

  test('does not warn when credential expires beyond 30 days', () => {
    const farExpiry = new Date(TODAY);
    farExpiry.setDate(TODAY.getDate() + 60);

    const credentials = [{
      id: 'c1', type: 'high_risk_licence_crane',
      expiry_date: farExpiry.toISOString().slice(0, 10)
    }];
    const result = computeCredentialStatus(credentials, ['high_risk_licence_crane'], TODAY);
    assert.equal(result.hardBlocked, false);
    assert.equal(result.warnings.length, 0);
    assert.equal(result.credentialScore, 100);
  });

  test('passes for credentials with no expiry date', () => {
    const credentials = [{
      id: 'c1', type: 'white_card',
      expiry_date: null  // no expiry
    }];
    const result = computeCredentialStatus(credentials, ['white_card'], TODAY);
    assert.equal(result.hardBlocked, false);
    assert.equal(result.blocks.length, 0);
  });

  test('blocks one and warns another when multiple required types', () => {
    const expiringSoon = new Date(TODAY);
    expiringSoon.setDate(TODAY.getDate() + 10);

    const credentials = [
      { id: 'c1', type: 'white_card', expiry_date: null },
      // msic_card expiring soon
      { id: 'c2', type: 'msic_card', expiry_date: expiringSoon.toISOString().slice(0, 10) }
      // high_risk_licence_crane is missing
    ];
    const result = computeCredentialStatus(
      credentials,
      ['high_risk_licence_crane', 'white_card', 'msic_card'],
      TODAY
    );
    assert.equal(result.hardBlocked, true);
    assert.equal(result.blocks.some(b => b.credential_type === 'high_risk_licence_crane'), true);
    // warnings may still be populated for non-blocking issues
  });

});
