/**
 * OceanView — Provider Runtime Health Tracker
 * Monitors provider connection health, failure isolation, and degradation.
 */

import { ProviderStatus } from './providerTypes.js';

export class ProviderHealthTracker {
  constructor() {
    this.records = new Map();
  }

  getRecord(providerId) {
    if (!this.records.has(providerId)) {
      this.records.set(providerId, {
        providerId,
        status: ProviderStatus.UNKNOWN,
        consecutiveFailures: 0,
        lastSuccessAt: null,
        lastFailureAt: null,
        lastLatencyMs: null,
        lastError: null,
      });
    }
    return this.records.get(providerId);
  }

  recordSuccess(providerId, latencyMs = null) {
    const r = this.getRecord(providerId);
    r.status = ProviderStatus.HEALTHY;
    r.consecutiveFailures = 0;
    r.lastSuccessAt = new Date().toISOString();
    r.lastLatencyMs = latencyMs;
    r.lastError = null;
  }

  recordFailure(providerId, error) {
    const r = this.getRecord(providerId);
    r.consecutiveFailures++;
    r.lastFailureAt = new Date().toISOString();
    r.lastError = typeof error === 'string' ? error : (error?.message || 'Network error');

    if (r.consecutiveFailures >= 3) {
      r.status = ProviderStatus.FAILED;
    } else {
      r.status = ProviderStatus.DEGRADED;
    }
  }

  getStatus(providerId) {
    return this.getRecord(providerId).status;
  }

  snapshot() {
    const res = {};
    for (const [id, rec] of this.records.entries()) {
      res[id] = { ...rec };
    }
    return res;
  }
}
