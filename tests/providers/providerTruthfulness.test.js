import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CURRENT_PROVIDERS } from '../../src/engine/providers/definitions/current.js';
import { ProviderRegistry } from '../../src/engine/providers/ProviderRegistry.js';
import { ProviderHealthTracker } from '../../src/engine/providers/providerHealth.js';
import { ProviderStatus } from '../../src/engine/providers/providerTypes.js';

describe('OceanView — Provider Truthfulness & Security Invariants', () => {
  test('Truthfulness 1: Unconnected providers are explicitly marked PLANNED or STATIC, never falsely LIVE', () => {
    const registry = new ProviderRegistry();
    for (const p of CURRENT_PROVIDERS) registry.register(p);

    const planned = registry.getPlanned();
    assert.ok(planned.length >= 4, 'Planned providers must be catalogued honestly');

    for (const p of planned) {
      assert.notEqual(p.runtimeState, 'LIVE', `Provider "${p.id}" cannot claim LIVE while disconnected`);
    }
  });

  test('Truthfulness 2: Demonstration provider is labeled SIMULATION and TIER_D', () => {
    const demo = CURRENT_PROVIDERS.find((p) => p.id === 'SYNTHETIC_DEMO_OCEAN');
    assert.ok(demo);
    assert.equal(demo.tier, 'TIER_D');
    assert.equal(demo.runtimeState, 'SIMULATION');
    assert.equal(demo.connected, true);
  });

  test('Security Invariant: Provider definitions never expose raw credentials', () => {
    for (const p of CURRENT_PROVIDERS) {
      for (const [k, v] of Object.entries(p)) {
        if (typeof v === 'string') {
          assert.ok(
            !v.startsWith('AIza') && !v.startsWith('sk-') && !v.startsWith('Bearer'),
            `Found exposed key string in property "${k}" of provider "${p.id}"`
          );
        }
      }
    }
  });

  test('Health Isolation: Consecutive failures transition provider to DEGRADED and FAILED without crashing', () => {
    const health = new ProviderHealthTracker();

    health.recordSuccess('SYNTHETIC_DEMO_OCEAN', 45);
    assert.equal(health.getStatus('SYNTHETIC_DEMO_OCEAN'), ProviderStatus.HEALTHY);

    health.recordFailure('INCOIS_OCEAN_MODELS', 'Timeout 504');
    assert.equal(health.getStatus('INCOIS_OCEAN_MODELS'), ProviderStatus.DEGRADED);

    health.recordFailure('INCOIS_OCEAN_MODELS', 'Timeout 504');
    health.recordFailure('INCOIS_OCEAN_MODELS', 'Timeout 504');
    assert.equal(health.getStatus('INCOIS_OCEAN_MODELS'), ProviderStatus.FAILED);
  });
});
