/**
 * OceanView — Phase 8.2A Scientific Coordinate & Render-Offset Integrity Tests
 * Validates strict separation of physicalDepthMeters vs displayOffsetMeters,
 * surface offset bounding, deterministic ellipsoidal depth transforms,
 * and vector/scalar geographic bounding integrity.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  toCesiumRenderAltitude,
  RENDERING_ONLY_SURFACE_OFFSET_METERS,
  RENDERING_ONLY_VECTOR_OFFSET_METERS,
  RENDERING_ONLY_PROFILE_OFFSET_METERS,
  RENDERING_ONLY_SELECTED_PROFILE_OFFSET_METERS,
} from '../../src/engine/spatial/depthCoordinates.js';
import { createCanonicalGridScalar } from '../../src/engine/ocean/CanonicalGridScalar.js';
import { createCanonicalGridVector } from '../../src/engine/ocean/CanonicalGridVector.js';
import { ScalarFieldLayer } from '../../src/visualization/scalar/ScalarFieldLayer.js';
import { VectorFieldLayer } from '../../src/visualization/vector/VectorFieldLayer.js';
import { DataState } from '../../src/engine/contracts/intelligenceContract.js';

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
    camera: {
      positionCartographic: {
        height: 3000000,
      },
    },
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

describe('OceanView — Phase 8.2A Coordinate & Altitude Transformation Invariants', () => {
  test('Coordinate Invariant 1: Surface display offsets remain strictly bounded (<= 12m)', () => {
    assert.equal(toCesiumRenderAltitude(0, { isVector: false }), RENDERING_ONLY_SURFACE_OFFSET_METERS);
    assert.equal(toCesiumRenderAltitude(5, { isVector: false }), RENDERING_ONLY_SURFACE_OFFSET_METERS);
    assert.equal(toCesiumRenderAltitude(0, { isVector: true }), RENDERING_ONLY_VECTOR_OFFSET_METERS);
    assert.equal(toCesiumRenderAltitude(5, { isVector: true }), RENDERING_ONLY_VECTOR_OFFSET_METERS);
    assert.equal(toCesiumRenderAltitude(0, { isProfile: true, isSelected: false }), RENDERING_ONLY_PROFILE_OFFSET_METERS);
    assert.equal(toCesiumRenderAltitude(0, { isProfile: true, isSelected: true }), RENDERING_ONLY_SELECTED_PROFILE_OFFSET_METERS);

    // Verify all surface offsets are <= 12m
    assert.ok(toCesiumRenderAltitude(0, { isVector: true }) <= 12.0);
    assert.ok(toCesiumRenderAltitude(5, { isVector: true }) <= 12.0);
  });

  test('Coordinate Invariant 2: Subsurface depths (50m, 250m, 700m) map deterministically to negative ellipsoidal altitude', () => {
    // Standard 1x exaggeration
    assert.equal(toCesiumRenderAltitude(50), -50);
    assert.equal(toCesiumRenderAltitude(250), -250);
    assert.equal(toCesiumRenderAltitude(700), -700);

    // 20x vertical exaggeration
    assert.equal(toCesiumRenderAltitude(50, { verticalExaggeration: 20 }), -1000);
    assert.equal(toCesiumRenderAltitude(250, { verticalExaggeration: 20 }), -5000);
    assert.equal(toCesiumRenderAltitude(700, { verticalExaggeration: 20 }), -14000);
  });

  test('Coordinate Invariant 3: Scalar layer preserves exact scientific depth metadata across depths (5m, 50m, 250m, 700m)', () => {
    const viewer = createMockViewer();
    const layer = new ScalarFieldLayer(viewer);

    const testDepths = [5, 50, 250, 700];

    for (const d of testDepths) {
      const grid = createCanonicalGridScalar({
        id: `grid:t:${d}`,
        source: 'SDC_CLIM',
        variable: 'sea_water_temperature',
        unit: '°C',
        dataState: DataState.MODELED,
        dimensions: { latCount: 2, lonCount: 2, depthCount: 1 },
        latitudes: [10, 15],
        longitudes: [60, 70],
        depths: [d],
        data: new Float32Array([28.0, 27.5, 28.2, 27.8]),
      });

      layer.updateGrid(grid, 'THERMAL', d, 0.85);

      const debug = layer.getDebugState();
      assert.equal(debug.physicalDepthMeters, d);
      assert.equal(debug.depth, d);

      if (d <= 5) {
        assert.equal(debug.displayOffsetMeters, RENDERING_ONLY_SURFACE_OFFSET_METERS);
      } else {
        assert.equal(debug.displayOffsetMeters, -d);
      }
    }
  });

  test('Coordinate Invariant 4: Scalar layer rendered extent matches source scientific bounding box exactly', () => {
    const viewer = createMockViewer();
    const layer = new ScalarFieldLayer(viewer);

    const bbox = { minLon: 60.0, minLat: 10.0, maxLon: 75.0, maxLat: 20.0 };
    const grid = createCanonicalGridScalar({
      id: 'grid:bbox:test',
      source: 'SDC_CLIM',
      variable: 'sea_water_salinity',
      unit: 'PSU',
      dataState: DataState.MODELED,
      dimensions: { latCount: 2, lonCount: 2 },
      latitudes: [10.0, 20.0],
      longitudes: [60.0, 75.0],
      data: new Float32Array([35.5, 36.0, 35.8, 36.2]),
    });

    layer.updateGrid(grid, 'HALINE', 0, 0.85);

    const debug = layer.getDebugState();
    assert.equal(debug.bounds.minLon, bbox.minLon);
    assert.equal(debug.bounds.minLat, bbox.minLat);
    assert.equal(debug.bounds.maxLon, bbox.maxLon);
    assert.equal(debug.bounds.maxLat, bbox.maxLat);
  });

  test('Coordinate Invariant 5: Vector glyph source geographic coordinates and depth are strictly preserved', () => {
    const viewer = createMockViewer();
    const layer = new VectorFieldLayer(viewer);

    const lat = 12.5;
    const lon = 65.5;
    const depth = 500;
    const u = 0.25;
    const v = -0.15;

    const vecGrid = createCanonicalGridVector({
      id: 'andro:exact:cell',
      source: 'ANDRO',
      dimensions: { latCount: 1, lonCount: 1, depthCount: 1 },
      latitudes: [lat],
      longitudes: [lon],
      depths: [depth],
      uData: new Float32Array([u]),
      vData: new Float32Array([v]),
    });

    layer.updateVectors(vecGrid, depth, 1);

    const entities = layer.dataSource.entities.values;
    assert.ok(entities.length >= 1);
    const shaft = entities[0];

    assert.ok(shaft.vectorData);
    assert.equal(shaft.vectorData.lat, lat);
    assert.equal(shaft.vectorData.lon, lon);
    assert.equal(shaft.vectorData.depthMeters, depth);
    assert.equal(shaft.vectorData.u, u);
    assert.equal(shaft.vectorData.v, v);
  });
});
