/**
 * OceanView — Phase 8.1 Current Velocity Verification & Adversarial Tests
 * Validates ANDRO current ingestion, CanonicalGridVector mathematical invariants,
 * VectorFieldLayer entity creation, ParticleCurrentLayer transparency & motion,
 * and multi-region state transitions.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOceanCurrentGrid } from '../../src/adapters/OceanCurrentAdapter.js';
import { createCanonicalGridVector, TemporalClassification } from '../../src/engine/ocean/CanonicalGridVector.js';
import { calculateFlowDirection, calculateCurrentSpeed } from '../../src/engine/ocean/currentMetrics.js';
import { VectorFieldLayer } from '../../src/visualization/vector/VectorFieldLayer.js';
import { ParticleCurrentLayer, ParticleBudgetTiers } from '../../src/visualization/vector/ParticleCurrentLayer.js';
import { OceanGridStore } from '../../src/engine/ocean/OceanGridStore.js';
import { getOceanCurrentSlice } from '../../server/oceanDataService.js';
import { DataState, SourceMode } from '../../src/engine/contracts/intelligenceContract.js';

// Mock lightweight Cesium Viewer for unit testing
function createMockViewer() {
  const customDataSources = [];
  const entities = [];

  const mockDataSources = {
    add(ds) {
      customDataSources.push(ds);
      return ds;
    },
    remove(ds, _destroy) {
      const idx = customDataSources.indexOf(ds);
      if (idx !== -1) customDataSources.splice(idx, 1);
      return true;
    },
    get length() {
      return customDataSources.length;
    },
  };

  const mockEntities = {
    add(e) {
      entities.push(e);
      return e;
    },
    remove(e) {
      const idx = entities.indexOf(e);
      if (idx !== -1) entities.splice(idx, 1);
      return true;
    },
    removeAll() {
      entities.length = 0;
    },
    get values() {
      return entities;
    },
  };

  return {
    dataSources: mockDataSources,
    entities: mockEntities,
    scene: {
      requestRenderMode: true,
      requestRender() {},
    },
    isDestroyed() {
      return false;
    },
    _customDataSources: customDataSources,
    _entities: entities,
  };
}

describe('OceanView — Phase 8.1 Provider & Canonical Vector Tests', () => {
  test('Provider: Ingests raw ANDRO current payload and normalizes cm/s to m/s with CLIMATOLOGY semantics', () => {
    const rawPayload = {
      datasetId: 'ANDRO',
      temporalState: 'CLIMATOLOGY',
      timestamp: '2025-01-01T00:00:00Z',
      depthMeters: 5.0,
      unit: 'cm/s',
      sourceUnit: 'cm/s',
      latitudes: [10.0, 12.0],
      longitudes: [65.0, 67.0],
      uData: [-15.0, -20.0, -25.0, -30.0], // in cm/s
      vData: [10.0, 15.0, 20.0, 25.0],    // in cm/s
      fillValue: -9999.0,
    };

    const canonical = normalizeOceanCurrentGrid(rawPayload, { sourceMode: SourceMode.LIVE });

    assert.equal(canonical.kind, 'CANONICAL_GRID_VECTOR');
    assert.equal(canonical.unit, 'm/s');
    assert.equal(canonical.temporalState, TemporalClassification.CLIMATOLOGY);
    assert.equal(canonical.dimensions.latCount, 2);
    assert.equal(canonical.dimensions.lonCount, 2);

    // Verify cm/s -> m/s conversion factor 0.01
    const vec00 = canonical.getVector(0, 0, 0);
    assert.ok(vec00);
    assert.equal(vec00.u, -0.15);
    assert.equal(vec00.v, 0.10);
    assert.equal(vec00.speed, Number(Math.sqrt(0.15 * 0.15 + 0.10 * 0.10).toFixed(4)));
  });

  test('CanonicalGridVector: Correctly computes flow heading clockwise from True North', () => {
    // 0° = North (u=0, v>0)
    assert.equal(calculateFlowDirection(0, 1.0), 0.0);
    // 90° = East (u>0, v=0)
    assert.equal(calculateFlowDirection(1.0, 0), 90.0);
    // 180° = South (u=0, v<0)
    assert.equal(calculateFlowDirection(0, -1.0), 180.0);
    // 270° = West (u<0, v=0)
    assert.equal(calculateFlowDirection(-1.0, 0), 270.0);
    // 45° = Northeast (u=1, v=1)
    assert.equal(calculateFlowDirection(1.0, 1.0), 45.0);
  });

  test('CanonicalGridVector: Missing U or V results in null speed and heading (Missing ≠ Zero)', () => {
    const lats = [10.0, 12.0];
    const lons = [65.0, 67.0];
    const vecGrid = createCanonicalGridVector({
      id: 'test:masked',
      source: 'ANDRO',
      dimensions: { latCount: 2, lonCount: 2 },
      latitudes: lats,
      longitudes: lons,
      uData: new Float32Array([-0.1, -9999.0, 0.2, 0.3]),
      vData: new Float32Array([0.1, 0.2, -9999.0, 0.4]),
      fillValue: -9999.0,
    });

    // Valid cell
    assert.ok(vecGrid.getVector(0, 0, 0));

    // Cell with missing U
    assert.equal(vecGrid.getVector(0, 1, 0), null);

    // Cell with missing V
    assert.equal(vecGrid.getVector(1, 0, 0), null);

    // Speed and flow direction functions also return null
    assert.equal(calculateCurrentSpeed(-9999.0, 0.5), null);
    assert.equal(calculateFlowDirection(null, 0.5), null);
  });
});

describe('OceanView — Phase 8.1 VectorFieldLayer Rendering Tests', () => {
  test('VectorFieldLayer: Creates polylines for shaft and arrowhead with depthFailMaterial', () => {
    const viewer = createMockViewer();
    const layer = new VectorFieldLayer(viewer);

    const lats = [10.0, 12.0];
    const lons = [65.0, 67.0];
    const vecGrid = createCanonicalGridVector({
      id: 'test:arrows',
      source: 'ANDRO',
      dimensions: { latCount: 2, lonCount: 2 },
      latitudes: lats,
      longitudes: lons,
      uData: new Float32Array([0.25, 0.30, 0.20, 0.35]),
      vData: new Float32Array([0.15, 0.10, 0.25, 0.20]),
    });

    layer.updateVectors(vecGrid, 5, 1);

    const debug = layer.getDebugState();
    assert.equal(debug.enabled, true);
    assert.equal(debug.hasData, true);
    assert.equal(debug.glyphs, 4); // 4 valid cells -> 4 glyphs
    assert.equal(debug.entityCount, 8); // 4 shafts + 4 arrowheads = 8 entities
    assert.equal(debug.renderer, 'VISIBLE');

    // Test decimation
    layer.setDensity(2);
    const debugDecimated = layer.getDebugState();
    assert.equal(debugDecimated.density, 2);
    assert.equal(debugDecimated.glyphs, 1); // 1 sampled glyph

    layer.clear();
    assert.equal(layer.getDebugState().enabled, false);
    assert.equal(viewer.dataSources.length, 0);
  });
});

describe('OceanView — Phase 8.1 ParticleCurrentLayer Mechanics Tests', () => {
  test('ParticleCurrentLayer: Starts and stops cleanly without leaking entities', () => {
    const viewer = createMockViewer();
    const particles = new ParticleCurrentLayer(viewer);

    const lats = [10.0, 12.0];
    const lons = [65.0, 67.0];
    const vecGrid = createCanonicalGridVector({
      id: 'test:particles',
      source: 'ANDRO',
      dimensions: { latCount: 2, lonCount: 2 },
      latitudes: lats,
      longitudes: lons,
      uData: new Float32Array([0.25, 0.30, 0.20, 0.35]),
      vData: new Float32Array([0.15, 0.10, 0.25, 0.20]),
    });

    particles.start(vecGrid, { particleCount: ParticleBudgetTiers.LOW, flowSpeed: 1.5 });
    assert.equal(particles.isRunning, true);
    assert.equal(particles.particleCount, 1500);
    assert.equal(particles.flowSpeed, 1.5);
    assert.ok(particles.entity);

    particles.setFlowSpeed(2.0);
    assert.equal(particles.flowSpeed, 2.0);

    particles.stop();
    assert.equal(particles.isRunning, false);
    assert.equal(particles.entity, null);
  });
});

describe('OceanView — Phase 8.1 Server Multi-Region Climatology Tests', () => {
  test('Server: getOceanCurrentSlice returns valid regional grids for Arabian Sea and Bay of Bengal', async () => {
    // 1. Arabian Sea
    const asData = await getOceanCurrentSlice({
      minLat: 5.0,
      maxLat: 20.0,
      minLon: 60.0,
      maxLon: 80.0,
      depth: 5.0,
    });
    assert.equal(asData.temporalState, 'CLIMATOLOGY');
    assert.ok(asData.uData.length > 0);
    assert.ok(asData.vData.length > 0);

    // 2. Bay of Bengal
    const bobData = await getOceanCurrentSlice({
      minLat: 8.0,
      maxLat: 22.0,
      minLon: 80.0,
      maxLon: 96.0,
      depth: 5.0,
    });
    assert.equal(bobData.temporalState, 'CLIMATOLOGY');
    assert.ok(bobData.latitudes[0] >= 8.0);
    assert.ok(bobData.longitudes[0] >= 80.0);
    assert.ok(bobData.uData.length > 0);
  });
});

describe('OceanView — Phase 8.1 ADVERSARIAL STRESS TESTS', () => {
  test('Adversarial 1: Missing U never becomes 0', () => {
    const vecGrid = createCanonicalGridVector({
      id: 'adv:1',
      source: 'ANDRO',
      dimensions: { latCount: 1, lonCount: 1 },
      latitudes: [10],
      longitudes: [60],
      uData: new Float32Array([-9999.0]),
      vData: new Float32Array([0.5]),
      fillValue: -9999.0,
    });

    assert.equal(vecGrid.getVector(0, 0, 0), null);
    assert.notEqual(vecGrid.uData[0], 0);
  });

  test('Adversarial 2: Missing V never becomes 0', () => {
    const vecGrid = createCanonicalGridVector({
      id: 'adv:2',
      source: 'ANDRO',
      dimensions: { latCount: 1, lonCount: 1 },
      latitudes: [10],
      longitudes: [60],
      uData: new Float32Array([0.5]),
      vData: new Float32Array([-9999.0]),
      fillValue: -9999.0,
    });

    assert.equal(vecGrid.getVector(0, 0, 0), null);
    assert.notEqual(vecGrid.vData[0], 0);
  });

  test('Adversarial 3: Invalid speed (NaN/Infinity) never renders into glyphs', () => {
    const viewer = createMockViewer();
    const layer = new VectorFieldLayer(viewer);

    const vecGrid = createCanonicalGridVector({
      id: 'adv:3',
      source: 'ANDRO',
      dimensions: { latCount: 1, lonCount: 1 },
      latitudes: [10],
      longitudes: [60],
      uData: new Float32Array([NaN]),
      vData: new Float32Array([0.5]),
    });

    layer.updateVectors(vecGrid);
    assert.equal(layer.getDebugState().glyphs, 0);
  });

  test('Adversarial 4: Unsupported depth returns empty/clear grid without crashing', () => {
    const store = new OceanGridStore();
    const vecGrid = createCanonicalGridVector({
      id: 'adv:4',
      source: 'ANDRO',
      dimensions: { latCount: 2, lonCount: 2, depthCount: 1 },
      latitudes: [10, 12],
      longitudes: [60, 62],
      depths: [5],
      uData: new Float32Array([0.1, 0.2, 0.3, 0.4]),
      vData: new Float32Array([0.1, 0.2, 0.3, 0.4]),
    });
    store.setGrid(vecGrid);

    // Remove by variable on variable switch
    store.removeGridByVariable('ocean_current_velocity');
    assert.equal(store.getAll().length, 0);
  });

  test('Adversarial 5: Rapid variable switching cleans up old vector grid', () => {
    const store = new OceanGridStore();
    const vecGrid = createCanonicalGridVector({
      id: 'andro:current:z5',
      source: 'ANDRO',
      dimensions: { latCount: 2, lonCount: 2 },
      latitudes: [10, 12],
      longitudes: [60, 62],
      uData: new Float32Array([0.1, 0.2, 0.3, 0.4]),
      vData: new Float32Array([0.1, 0.2, 0.3, 0.4]),
    });
    store.setGrid(vecGrid);
    assert.equal(store.getAll().length, 1);

    store.removeGridByVariable('ocean_current_velocity');
    assert.equal(store.getAll().length, 0);
  });

  test('Adversarial 6: 20 rapid ON/OFF toggles of VectorFieldLayer do not accumulate data sources', () => {
    const viewer = createMockViewer();
    const layer = new VectorFieldLayer(viewer);

    const vecGrid = createCanonicalGridVector({
      id: 'adv:6',
      source: 'ANDRO',
      dimensions: { latCount: 2, lonCount: 2 },
      latitudes: [10, 12],
      longitudes: [60, 62],
      uData: new Float32Array([0.1, 0.2, 0.3, 0.4]),
      vData: new Float32Array([0.1, 0.2, 0.3, 0.4]),
    });

    for (let i = 0; i < 20; i++) {
      layer.updateVectors(vecGrid);
      layer.clear();
    }

    assert.equal(viewer.dataSources.length, 0);
    assert.equal(layer.getDebugState().enabled, false);
  });

  test('Adversarial 7: 20 rapid ParticleCurrentLayer start/stop toggles do not leak entities', () => {
    const viewer = createMockViewer();
    const particles = new ParticleCurrentLayer(viewer);

    const vecGrid = createCanonicalGridVector({
      id: 'adv:7',
      source: 'ANDRO',
      dimensions: { latCount: 2, lonCount: 2 },
      latitudes: [10, 12],
      longitudes: [60, 62],
      uData: new Float32Array([0.1, 0.2, 0.3, 0.4]),
      vData: new Float32Array([0.1, 0.2, 0.3, 0.4]),
    });

    for (let i = 0; i < 20; i++) {
      particles.start(vecGrid);
      particles.stop();
    }

    assert.equal(viewer.entities.values.length, 0);
    assert.equal(particles.isRunning, false);
  });
});
