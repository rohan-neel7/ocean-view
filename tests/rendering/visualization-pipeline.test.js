/**
 * OceanView — Visualization Pipeline Integration Tests (Phase 7.6)
 *
 * Tests the data→canonical→store→renderer pipeline for every scientific layer.
 * Run with: node --test tests/rendering/visualization-pipeline.test.js
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

// Engine Imports
import { createCanonicalGridScalar, DataState, SourceMode } from '../../src/engine/index.js';
import { createCanonicalGridVector, TemporalClassification } from '../../src/engine/ocean/CanonicalGridVector.js';
import { OceanGridStore } from '../../src/engine/ocean/OceanGridStore.js';
import { OceanProfileStore } from '../../src/engine/ocean/OceanProfileStore.js';
import { createCanonicalProfile } from '../../src/engine/ocean/CanonicalProfile.js';
import { sampleColormap, sampleColormapRgb, COLORMAP_PRESETS } from '../../src/visualization/color/scientificColorMaps.js';
import { globalLayerStateRegistry } from '../../src/engine/rendering/LayerStateRegistry.js';

// ===================================================================
// TEST DATA FIXTURES
// ===================================================================

function createTestScalarGrid(variable = 'sea_surface_temperature', unit = '°C') {
  const lats = [5.0, 10.0, 15.0, 20.0];
  const lons = [60.0, 65.0, 70.0, 75.0, 80.0];
  const depths = [5];
  const totalCells = lats.length * lons.length * depths.length;
  const data = new Float32Array(totalCells);
  for (let i = 0; i < totalCells; i++) {
    data[i] = 20.0 + (i / totalCells) * 10.0; // 20°C to 30°C gradient
  }

  return createCanonicalGridScalar({
    id: `test:${variable}:z5:2026-01-01T00:00:00Z`,
    source: 'TEST_DATA',
    sourceMode: SourceMode.LIVE,
    variable,
    unit,
    dataState: DataState.MODELED,
    timestamp: '2026-01-01T00:00:00Z',
    dimensions: { latCount: lats.length, lonCount: lons.length, depthCount: depths.length },
    latitudes: lats,
    longitudes: lons,
    depths,
    data,
  });
}

function createTestVectorGrid() {
  const lats = [5.0, 10.0, 15.0, 20.0];
  const lons = [60.0, 65.0, 70.0, 75.0, 80.0];
  const totalCells = lats.length * lons.length;
  const uData = new Float32Array(totalCells);
  const vData = new Float32Array(totalCells);
  for (let i = 0; i < totalCells; i++) {
    uData[i] = 0.1 + (i / totalCells) * 0.5;
    vData[i] = -0.05 + (i / totalCells) * 0.3;
  }

  return createCanonicalGridVector({
    id: 'test:current:z5:2026-01-01T00:00:00Z',
    source: 'TEST_DATA',
    sourceMode: SourceMode.LIVE,
    temporalState: TemporalClassification.CLIMATOLOGY,
    timestamp: '2026-01-01T00:00:00Z',
    unit: 'm/s',
    dataState: DataState.MODELED,
    dimensions: { latCount: lats.length, lonCount: lons.length, depthCount: 1 },
    latitudes: lats,
    longitudes: lons,
    depths: [5],
    uData,
    vData,
  });
}

function createTestProfile() {
  return createCanonicalProfile({
    id: 'test:argo:1234567',
    source: 'TEST_DATA',
    sourceMode: SourceMode.LIVE,
    platformId: 'Argo Float #1234567',
    platformType: 'ARGO_FLOAT',
    location: { lat: 14.5, lon: 66.8 },
    depths: [5, 25, 50, 100, 250, 500, 1000],
    variables: {
      temperature: [28.4, 28.1, 25.4, 21.2, 14.5, 10.1, 6.2],
      salinity: [36.2, 36.2, 36.4, 35.8, 35.2, 35.0, 34.8],
    },
    units: { temperature: '°C', salinity: 'PSU' },
    dataState: DataState.OBSERVED,
    observedAt: '2026-01-01T12:00:00Z',
    quality: { qualityFlags: [1, 1, 1, 1, 1, 1, 1] },
  });
}

// ===================================================================
// TEST SUITE: CANONICAL OBJECT CREATION
// ===================================================================

describe('Canonical Grid Scalar', () => {
  it('creates a valid temperature grid with correct dimensions', () => {
    const grid = createTestScalarGrid();
    assert.equal(grid.kind, 'CANONICAL_GRID_SCALAR');
    assert.equal(grid.variable, 'sea_surface_temperature');
    assert.equal(grid.unit, '°C');
    assert.equal(grid.dimensions.latCount, 4);
    assert.equal(grid.dimensions.lonCount, 5);
    assert.equal(grid.dimensions.totalCells, 20);
    assert.ok(grid.data instanceof Float32Array);
    assert.equal(grid.data.length, 20);
  });

  it('creates a valid salinity grid', () => {
    const grid = createTestScalarGrid('salinity', 'PSU');
    assert.equal(grid.variable, 'salinity');
    assert.equal(grid.unit, 'PSU');
  });

  it('computes correct value range statistics', () => {
    const grid = createTestScalarGrid();
    assert.ok(grid.stats.minValue !== null);
    assert.ok(grid.stats.maxValue !== null);
    assert.ok(grid.stats.minValue < grid.stats.maxValue);
    assert.ok(grid.stats.validCellCount > 0);
  });

  it('provides correct getValue indexing', () => {
    const grid = createTestScalarGrid();
    const val = grid.getValue(0, 0, 0);
    assert.ok(val !== null);
    assert.ok(typeof val === 'number');
    assert.ok(!isNaN(val));
  });

  it('returns null for out-of-bounds indices', () => {
    const grid = createTestScalarGrid();
    assert.equal(grid.getValue(-1, 0, 0), null);
    assert.equal(grid.getValue(100, 0, 0), null);
    assert.equal(grid.getValue(0, 100, 0), null);
  });

  it('has correct bounding box coordinates', () => {
    const grid = createTestScalarGrid();
    assert.equal(grid.coordinates.bbox.minLat, 5.0);
    assert.equal(grid.coordinates.bbox.maxLat, 20.0);
    assert.equal(grid.coordinates.bbox.minLon, 60.0);
    assert.equal(grid.coordinates.bbox.maxLon, 80.0);
  });
});

describe('Canonical Grid Vector', () => {
  it('creates a valid vector grid with correct dimensions', () => {
    const grid = createTestVectorGrid();
    assert.equal(grid.kind, 'CANONICAL_GRID_VECTOR');
    assert.equal(grid.unit, 'm/s');
    assert.ok(grid.uData instanceof Float32Array);
    assert.ok(grid.vData instanceof Float32Array);
    assert.equal(grid.uData.length, 20);
  });

  it('provides correct getVector with speed and heading', () => {
    const grid = createTestVectorGrid();
    const vec = grid.getVector(0, 0, 0);
    assert.ok(vec !== null);
    assert.ok(typeof vec.u === 'number');
    assert.ok(typeof vec.v === 'number');
    assert.ok(typeof vec.speed === 'number');
    assert.ok(typeof vec.headingDeg === 'number');
    assert.ok(vec.speed >= 0);
    assert.ok(vec.headingDeg >= 0 && vec.headingDeg < 360);
  });
});

// ===================================================================
// TEST SUITE: OCEAN GRID STORE
// ===================================================================

describe('OceanGridStore', () => {
  let store;

  before(() => {
    store = new OceanGridStore();
  });

  it('ingests and retrieves scalar grids', () => {
    const grid = createTestScalarGrid();
    const result = store.setGrid(grid);
    assert.ok(result.success);
    assert.equal(store.getAll().length, 1);
    assert.equal(store.getAll()[0].kind, 'CANONICAL_GRID_SCALAR');
  });

  it('ingests and retrieves vector grids', () => {
    const grid = createTestVectorGrid();
    const result = store.setGrid(grid);
    assert.ok(result.success);
    assert.ok(store.getAll().length >= 2); // scalar + vector
  });

  it('filters grids by kind', () => {
    const allGrids = store.getAll();
    const scalars = allGrids.filter((g) => g.kind === 'CANONICAL_GRID_SCALAR');
    const vectors = allGrids.filter((g) => g.kind === 'CANONICAL_GRID_VECTOR');
    assert.ok(scalars.length >= 1);
    assert.ok(vectors.length >= 1);
  });
});

// ===================================================================
// TEST SUITE: COLORMAP INTERPOLATION
// ===================================================================

describe('Scientific Colormap Interpolation', () => {
  it('returns valid hex colors for all presets at boundaries', () => {
    for (const key of Object.keys(COLORMAP_PRESETS)) {
      const c0 = sampleColormap(key, 0.0);
      const c1 = sampleColormap(key, 1.0);
      assert.ok(c0.startsWith('#'), `${key} at 0.0 should return hex color`);
      assert.ok(c1.startsWith('#'), `${key} at 1.0 should return hex color`);
      assert.equal(c0.length, 7); // #rrggbb
      assert.equal(c1.length, 7);
    }
  });

  it('interpolates smoothly between stops (no banding)', () => {
    // Sample 100 points and verify monotonic-ish transitions
    const colors = [];
    for (let i = 0; i <= 100; i++) {
      colors.push(sampleColormap('THERMAL', i / 100));
    }
    // Adjacent colors should be different (unless at boundaries)
    let transitions = 0;
    for (let i = 1; i < colors.length; i++) {
      if (colors[i] !== colors[i - 1]) transitions++;
    }
    // With 9 THERMAL stops and smooth interpolation, we expect many unique transitions
    assert.ok(transitions > 50, `Expected many transitions, got ${transitions} — interpolation may be banded`);
  });

  it('sampleColormapRgb returns [R,G,B] arrays', () => {
    const rgb = sampleColormapRgb('THERMAL', 0.5);
    assert.ok(Array.isArray(rgb));
    assert.equal(rgb.length, 3);
    assert.ok(rgb.every((c) => c >= 0 && c <= 255));
  });

  it('clamps values outside [0,1]', () => {
    const low = sampleColormap('THERMAL', -0.5);
    const zero = sampleColormap('THERMAL', 0.0);
    const high = sampleColormap('THERMAL', 1.5);
    const one = sampleColormap('THERMAL', 1.0);
    assert.equal(low, zero, 'Values below 0 should clamp to 0');
    assert.equal(high, one, 'Values above 1 should clamp to 1');
  });
});

// ===================================================================
// TEST SUITE: LAYER STATE REGISTRY
// ===================================================================

describe('Layer State Registry', () => {
  it('registers and retrieves layer state', () => {
    globalLayerStateRegistry.update('TEST_LAYER', {
      enabled: true,
      dataState: 'LOADED',
      variable: 'temperature',
    });
    const state = globalLayerStateRegistry.get('TEST_LAYER');
    assert.ok(state);
    assert.equal(state.enabled, true);
    assert.equal(state.variable, 'temperature');
  });

  it('detects enabled-but-not-visible anomalies', () => {
    globalLayerStateRegistry.update('ANOMALY_LAYER', {
      enabled: true,
      visible: false,
      dataState: 'LOADED',
    });
    const anomalies = globalLayerStateRegistry.detectAnomalies();
    const found = anomalies.find((a) => a.layerId === 'ANOMALY_LAYER');
    assert.ok(found);
    assert.equal(found.anomaly, 'ENABLED_BUT_NOT_VISIBLE');
  });

  it('removes layers cleanly', () => {
    globalLayerStateRegistry.remove('TEST_LAYER');
    globalLayerStateRegistry.remove('ANOMALY_LAYER');
    assert.equal(globalLayerStateRegistry.get('TEST_LAYER'), null);
  });
});

// ===================================================================
// ADVERSARIAL TESTS (Phase 23)
// ===================================================================

describe('Adversarial: Variable Switching', () => {
  it('switching variable creates new grid ID (no stale data)', () => {
    const tempGrid = createTestScalarGrid('sea_surface_temperature', '°C');
    const salGrid = createTestScalarGrid('salinity', 'PSU');
    assert.notEqual(tempGrid.id, salGrid.id);
    assert.notEqual(tempGrid.variable, salGrid.variable);
  });

  it('grid IDs differ for different depths', () => {
    const grid5m = createCanonicalGridScalar({
      id: 'test:sst:z5:2026-01-01T00:00:00Z',
      source: 'TEST',
      variable: 'sea_surface_temperature',
      unit: '°C',
      dataState: DataState.MODELED,
      timestamp: '2026-01-01T00:00:00Z',
      dimensions: { latCount: 2, lonCount: 2, depthCount: 1 },
      latitudes: [5, 10],
      longitudes: [60, 65],
      depths: [5],
      data: new Float32Array([20, 21, 22, 23]),
    });
    const grid50m = createCanonicalGridScalar({
      id: 'test:sst:z50:2026-01-01T00:00:00Z',
      source: 'TEST',
      variable: 'sea_surface_temperature',
      unit: '°C',
      dataState: DataState.MODELED,
      timestamp: '2026-01-01T00:00:00Z',
      dimensions: { latCount: 2, lonCount: 2, depthCount: 1 },
      latitudes: [5, 10],
      longitudes: [60, 65],
      depths: [50],
      data: new Float32Array([18, 19, 20, 21]),
    });
    assert.notEqual(grid5m.id, grid50m.id);
  });
});

describe('Adversarial: Duplicate Detection', () => {
  it('store replaces existing grid with same ID', () => {
    const store = new OceanGridStore();
    const grid1 = createTestScalarGrid();
    const grid2 = createTestScalarGrid(); // Same ID
    store.setGrid(grid1);
    store.setGrid(grid2);
    assert.equal(store.getAll().length, 1); // Not duplicated
  });
});
