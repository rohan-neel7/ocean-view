import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { OceanGridStore } from '../../src/engine/ocean/OceanGridStore.js';
import { createCanonicalGridScalar } from '../../src/engine/ocean/CanonicalGridScalar.js';

describe('OceanView — OceanGridStore Multidimensional Engine', () => {
  test('OceanGridStore ingests and retrieves grid fields across time and variables', () => {
    const store = new OceanGridStore({ maxMemoryMb: 64, maxFields: 10 });

    const lats = [10, 15, 20];
    const lons = [65, 70, 75];

    const sstT0 = createCanonicalGridScalar({
      id: 'sst:t0',
      source: 'INCOIS_MOM6',
      variable: 'sea_surface_temperature',
      unit: '°C',
      timestamp: '2026-08-27T00:00:00Z',
      dimensions: { latCount: 3, lonCount: 3 },
      latitudes: lats,
      longitudes: lons,
      data: new Float32Array([28, 28.5, 29, 27.5, 28, 28.5, 27, 27.5, 28]),
    });

    const sstT1 = createCanonicalGridScalar({
      id: 'sst:t1',
      source: 'INCOIS_MOM6',
      variable: 'sea_surface_temperature',
      unit: '°C',
      timestamp: '2026-08-27T03:00:00Z',
      dimensions: { latCount: 3, lonCount: 3 },
      latitudes: lats,
      longitudes: lons,
      data: new Float32Array([28.2, 28.7, 29.2, 27.7, 28.2, 28.7, 27.2, 27.7, 28.2]),
    });

    store.setGrid(sstT0);
    store.setGrid(sstT1);

    assert.equal(store.getGrid('sst:t0').getValue(0, 0), 28.0);
    assert.equal(store.getGrid('sst:t1').getValue(0, 0), 28.2);

    const timesteps = store.getAvailableTimeSteps('sea_surface_temperature');
    assert.equal(timesteps.length, 2);

    const closest = store.getGridByTime('sea_surface_temperature', '2026-08-27T02:45:00Z');
    assert.equal(closest.id, 'sst:t1');

    const all = store.getAll();
    assert.equal(all.length, 2);
    assert.equal(all[0].id, 'sst:t0');
  });

  test('OceanGridStore enforces memory bounds with LRU eviction', () => {
    // 1 MB limit = approx 250,000 Float32 elements
    const store = new OceanGridStore({ maxMemoryMb: 1, maxFields: 3 });

    for (let i = 0; i < 5; i++) {
      const g = createCanonicalGridScalar({
        id: `grid:${i}`,
        source: 'INCOIS',
        variable: 'test_var',
        unit: '°C',
        dimensions: { latCount: 10, lonCount: 10 },
        latitudes: [10],
        longitudes: [70],
        data: new Float32Array(100),
      });
      store.setGrid(g);
    }

    const stats = store.getStats();
    assert.ok(stats.fieldCount <= 3, 'Store must not exceed maxFields limit');
    assert.equal(store.getGrid('grid:0'), null, 'Oldest grid should have been evicted');
    assert.ok(store.getGrid('grid:4') !== null, 'Latest grid must be retained');
  });
});
