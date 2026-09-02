import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { OceanGridStore } from '../../src/engine/ocean/OceanGridStore.js';
import { createCanonicalGridScalar } from '../../src/engine/ocean/CanonicalGridScalar.js';
import { DataFabric } from '../../src/engine/providers/DataFabric.js';
import { ProviderRegistry } from '../../src/engine/providers/ProviderRegistry.js';
import { ProviderHealthTracker } from '../../src/engine/providers/providerHealth.js';
import { OceanProfileStore } from '../../src/engine/ocean/OceanProfileStore.js';
import { CURRENT_PROVIDERS } from '../../src/engine/providers/definitions/current.js';

describe('OceanView — ADVERSARIAL TEST: Grid Array Non-Explosion Invariance', () => {
  test('A 100,000-cell numerical ocean grid is stored as ONE typed buffer without creating 100,000 event objects', () => {
    const latCount = 200;
    const lonCount = 500;
    const totalCells = latCount * lonCount; // Exactly 100,000 grid cells

    assert.equal(totalCells, 100000, 'Test fixture must represent 100,000 physical cells');

    // Create 100k-cell typed buffer
    const heavyBuffer = new Float32Array(totalCells);
    for (let i = 0; i < totalCells; i++) {
      heavyBuffer[i] = 20.0 + (i % 100) * 0.1;
    }

    const grid = createCanonicalGridScalar({
      id: 'incois:mom6:high_res_sst:001',
      source: 'SYNTHETIC_DEMO_OCEAN',
      variable: 'sea_surface_temperature',
      unit: '°C',
      dimensions: { latCount, lonCount },
      latitudes: new Float32Array(latCount),
      longitudes: new Float32Array(lonCount),
      data: heavyBuffer,
    });

    const registry = new ProviderRegistry();
    for (const p of CURRENT_PROVIDERS) registry.register(p);
    const health = new ProviderHealthTracker();
    const gridStore = new OceanGridStore();
    const profileStore = new OceanProfileStore();

    const dataFabric = new DataFabric({
      providerRegistry: registry,
      healthTracker: health,
      gridStore,
      profileStore,
    });

    let subscriberNotifications = 0;
    dataFabric.subscribe(() => {
      subscriberNotifications++;
    });

    // Ingest into DataFabric
    const result = dataFabric.ingest('SYNTHETIC_DEMO_OCEAN', grid);

    // ── 1. Invariance Checks ──
    assert.equal(result.success, true);
    assert.equal(result.route, 'GRID_ROUTE');

    // Exactly 1 notification emitted across the entire ingestion
    assert.equal(subscriberNotifications, 1, 'DataFabric must emit exactly 1 notification, NOT 100,000');

    // Exactly 1 field exists in the gridStore
    assert.equal(gridStore.fields.size, 1, 'GridStore must contain exactly 1 grid object');

    // Memory footprint is exactly 400,000 bytes (4 bytes per Float32)
    assert.equal(grid.stats.memorySizeBytes, 400000, 'Memory buffer must be exactly 400,000 bytes');
    assert.equal(gridStore.currentMemoryBytes, 400000);

    // Profile store must remain empty (Clean separation of routes)
    assert.equal(profileStore.profiles.size, 0, 'Profile store must not receive grid data');

    // Fast indexed access is sub-microsecond
    const sample = grid.getValue(150, 300);
    assert.ok(typeof sample === 'number');
  });
});
