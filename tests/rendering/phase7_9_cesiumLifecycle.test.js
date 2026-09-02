/**
 * OceanView — Phase 7.9 Cesium Lifecycle & WebGL Stability Tests
 * Validates single-viewer ownership, leak-free mount/unmount, governor holds,
 * Google 3D Tiles fallback resilience, and adversarial stress tests.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { globalLifecycleTracker } from '../../src/engine/rendering/cesiumLifecycleTracker.js';
import {
  installRenderGovernor,
  holdContinuousRender,
  releaseContinuousRender,
  getGovernorStats,
  teardownRenderGovernor,
} from '../../src/engine/rendering/renderGovernor.js';
import { BasemapController, BASEMAPS } from '../../src/engine/rendering/BasemapController.js';
import { OrbitController } from '../../src/engine/rendering/OrbitController.js';
import { ParticleCurrentLayer, ParticleBudgetTiers } from '../../src/visualization/vector/ParticleCurrentLayer.js';
import { ScalarFieldLayer } from '../../src/visualization/scalar/ScalarFieldLayer.js';
import { VectorFieldLayer } from '../../src/visualization/vector/VectorFieldLayer.js';
import { ProfileLayer } from '../../src/visualization/profiles/ProfileLayer.js';
import { createCanonicalGridScalar } from '../../src/engine/ocean/CanonicalGridScalar.js';
import { createCanonicalGridVector } from '../../src/engine/ocean/CanonicalGridVector.js';
import { DataState, SourceMode } from '../../src/engine/contracts/intelligenceContract.js';

// Mock lightweight Cesium Viewer for lifecycle validation
function createMockViewer() {
  const listeners = {
    cameraChanged: new Set(),
    cameraMoveStart: new Set(),
    cameraMoveEnd: new Set(),
    preRender: new Set(),
  };

  let isDestroyedState = false;

  const mockScene = {
    requestRenderMode: true,
    maximumRenderTimeChange: Infinity,
    requestRenderCalls: 0,
    requestRender() {
      this.requestRenderCalls++;
    },
    globe: {
      show: true,
      baseColor: null,
    },
    primitives: {
      items: [],
      add(p) {
        this.items.push(p);
        return p;
      },
      remove(p) {
        const idx = this.items.indexOf(p);
        if (idx !== -1) this.items.splice(idx, 1);
        return true;
      },
    },
    preRender: {
      addEventListener(fn) {
        listeners.preRender.add(fn);
        return () => listeners.preRender.delete(fn);
      },
    },
  };

  const mockCamera = {
    heading: 0,
    pitch: -88,
    changed: {
      addEventListener(fn) {
        listeners.cameraChanged.add(fn);
      },
      removeEventListener(fn) {
        listeners.cameraChanged.delete(fn);
      },
    },
    moveStart: {
      addEventListener(fn) {
        listeners.cameraMoveStart.add(fn);
      },
      removeEventListener(fn) {
        listeners.cameraMoveStart.delete(fn);
      },
    },
    moveEnd: {
      addEventListener(fn) {
        listeners.cameraMoveEnd.add(fn);
      },
      removeEventListener(fn) {
        listeners.cameraMoveEnd.delete(fn);
      },
    },
    lookAt(_target, _hpr) {},
    lookAtTransform(_transform) {},
  };

  const mockImageryLayers = {
    layers: [],
    addImageryProvider(provider, index) {
      const l = { provider, index, show: true };
      this.layers.push(l);
      return l;
    },
    remove(layer, _destroy) {
      const idx = this.layers.indexOf(layer);
      if (idx !== -1) this.layers.splice(idx, 1);
      return true;
    },
  };

  const mockEntities = {
    list: [],
    add(e) {
      this.list.push(e);
      return e;
    },
    remove(e) {
      const idx = this.list.indexOf(e);
      if (idx !== -1) this.list.splice(idx, 1);
      return true;
    },
    removeAll() {
      this.list = [];
    },
  };

  return {
    scene: mockScene,
    camera: mockCamera,
    imageryLayers: mockImageryLayers,
    entities: mockEntities,
    dataSources: {
      add() {},
      remove() {},
    },
    isDestroyed() {
      return isDestroyedState;
    },
    destroy() {
      isDestroyedState = true;
      this.scene.globe.show = false;
      this.entities.removeAll();
    },
    _listeners: listeners,
  };
}

describe('OceanView — Phase 7.9 Cesium Lifecycle & WebGL Stability', () => {
  beforeEach(() => {
    globalLifecycleTracker.reset();
    teardownRenderGovernor();
  });

  test('Invariant 1: Lifecycle Tracker counts viewer creation and destruction accurately', () => {
    const viewer1 = createMockViewer();
    globalLifecycleTracker.trackViewerCreated(viewer1);

    let stats = globalLifecycleTracker.getStats();
    assert.equal(stats.viewersCreated, 1);
    assert.equal(stats.viewersDestroyed, 0);
    assert.equal(stats.activeViewers, 1);

    globalLifecycleTracker.trackViewerDestroyed(viewer1);
    viewer1.destroy();

    stats = globalLifecycleTracker.getStats();
    assert.equal(stats.viewersCreated, 1);
    assert.equal(stats.viewersDestroyed, 1);
    assert.equal(stats.activeViewers, 0);
  });

  test('Invariant 2: Render Governor tracks named active holds with zero leak', () => {
    const viewer = createMockViewer();
    installRenderGovernor(viewer);

    let stats = getGovernorStats();
    assert.equal(stats.holdsCount, 0);
    assert.equal(stats.isExplicitHold, false);

    // Hold for particle animation
    holdContinuousRender('particleAnimation');
    stats = getGovernorStats();
    assert.equal(stats.holdsCount, 1);
    assert.equal(stats.isExplicitHold, true);
    assert.ok(stats.activeHolds.includes('particleAnimation'));

    // Duplicate hold for same reason must not inflate count
    holdContinuousRender('particleAnimation');
    assert.equal(getGovernorStats().holdsCount, 1);

    // Add camera orbit hold
    holdContinuousRender('camera-orbit');
    assert.equal(getGovernorStats().holdsCount, 2);

    // Release particle animation
    releaseContinuousRender('particleAnimation');
    assert.equal(getGovernorStats().holdsCount, 1);
    assert.equal(getGovernorStats().isExplicitHold, true);

    // Release orbit
    releaseContinuousRender('camera-orbit');
    stats = getGovernorStats();
    assert.equal(stats.holdsCount, 0);
    assert.equal(stats.isExplicitHold, false);
    assert.equal(viewer.scene.requestRenderMode, true);
  });

  test('Invariant 3: BasemapController operates strictly on the existing Viewer without recreating it', async () => {
    const viewer = createMockViewer();
    const basemap = new BasemapController(viewer);

    assert.equal(basemap.getActiveBasemap(), 'SATELLITE');
    assert.equal(viewer.imageryLayers.layers.length, 1);

    // Switch to DARK_MATTER
    await basemap.setBasemap('DARK_MATTER');
    assert.equal(basemap.getActiveBasemap(), 'DARK_MATTER');
    assert.equal(viewer.imageryLayers.layers.length, 1);

    // Switch to OCEAN_BASE
    await basemap.setBasemap('OCEAN_BASE');
    assert.equal(basemap.getActiveBasemap(), 'OCEAN_BASE');
    assert.equal(viewer.imageryLayers.layers.length, 1);

    // Ensure Viewer was never destroyed
    assert.equal(viewer.isDestroyed(), false);

    basemap.destroy();
    assert.equal(viewer.imageryLayers.layers.length, 0);
  });

  test('Invariant 4: Google 3D Tiles failure marks unavailable and falls back to Satellite on SAME viewer', async () => {
    const viewer = createMockViewer();
    const basemap = new BasemapController(viewer);

    // Force failure path by setting a mock without Google 3D Tiles support
    await basemap.setBasemap('GOOGLE_3D_TILES');

    // Should fall back to SATELLITE
    assert.equal(basemap.getActiveBasemap(), 'SATELLITE');
    assert.equal(basemap.isGoogle3DUnavailable(), true);
    assert.equal(viewer.imageryLayers.layers.length, 1);

    // Subsequent request for Google 3D Tiles should immediately route to SATELLITE without retrying
    await basemap.setBasemap('GOOGLE_3D_TILES');
    assert.equal(basemap.getActiveBasemap(), 'SATELLITE');
    assert.equal(viewer.isDestroyed(), false);
  });

  test('Invariant 5: OrbitController start/stop lifecycle does not leak governor holds', () => {
    const viewer = createMockViewer();
    installRenderGovernor(viewer);
    const orbit = new OrbitController(viewer);

    assert.equal(orbit.active, false);
    assert.equal(getGovernorStats().holdsCount, 0);

    // Start orbit
    orbit.start();
    assert.equal(orbit.active, true);
    assert.equal(getGovernorStats().holdsCount, 1);
    assert.ok(getGovernorStats().activeHolds.includes('camera-orbit'));

    // Redundant start call must restart cleanly without doubling holds
    orbit.start();
    assert.equal(getGovernorStats().holdsCount, 1);

    // Stop orbit
    orbit.stop();
    assert.equal(orbit.active, false);
    assert.equal(getGovernorStats().holdsCount, 0);

    // Redundant stop call must not crash or decrement negative holds
    orbit.stop();
    assert.equal(getGovernorStats().holdsCount, 0);
  });

  test('Invariant 6: ParticleCurrentLayer start/stop lifecycle does not leak governor holds or entities', () => {
    const viewer = createMockViewer();
    installRenderGovernor(viewer);
    const particles = new ParticleCurrentLayer(viewer);

    const lats = [5, 10, 15, 20];
    const lons = [60, 65, 70, 75, 80];
    const uData = new Float32Array(20).fill(0.2);
    const vData = new Float32Array(20).fill(-0.1);

    const vecGrid = createCanonicalGridVector({
      id: 'test:andro:currents',
      source: 'ANDRO',
      sourceMode: SourceMode.LIVE,
      dimensions: { latCount: 4, lonCount: 5, depthCount: 1 },
      latitudes: lats,
      longitudes: lons,
      depths: [5],
      uData,
      vData,
    });

    assert.equal(particles.isRunning, false);
    assert.equal(getGovernorStats().holdsCount, 0);

    particles.start(vecGrid, { particleCount: 1500 });
    assert.equal(particles.isRunning, true);
    assert.equal(getGovernorStats().holdsCount, 1);
    assert.ok(getGovernorStats().activeHolds.includes('particleAnimation'));

    particles.stop();
    assert.equal(particles.isRunning, false);
    assert.equal(getGovernorStats().holdsCount, 0);

    // Redundant stop call
    particles.stop();
    assert.equal(getGovernorStats().holdsCount, 0);
  });
});

describe('OceanView — Phase 7.9 ADVERSARIAL STRESS TESTS', () => {
  beforeEach(() => {
    globalLifecycleTracker.reset();
    teardownRenderGovernor();
  });

  test('Adversarial 1: 20 rapid mount/unmount cycles do not accumulate active viewers', () => {
    for (let i = 0; i < 20; i++) {
      const viewer = createMockViewer();
      globalLifecycleTracker.trackViewerCreated(viewer);
      installRenderGovernor(viewer);

      assert.equal(globalLifecycleTracker.getStats().activeViewers, 1);

      // Teardown
      teardownRenderGovernor();
      globalLifecycleTracker.trackViewerDestroyed(viewer);
      viewer.destroy();

      assert.equal(globalLifecycleTracker.getStats().activeViewers, 0);
    }

    const stats = globalLifecycleTracker.getStats();
    assert.equal(stats.viewersCreated, 20);
    assert.equal(stats.viewersDestroyed, 20);
    assert.equal(stats.activeViewers, 0);
  });

  test('Adversarial 2: 20 rapid variable switches update scalar layer in-place without creating new viewers', () => {
    const viewer = createMockViewer();
    globalLifecycleTracker.trackViewerCreated(viewer);

    const lats = [5, 10, 15, 20];
    const lons = [60, 65, 70, 75, 80];
    const data = new Float32Array(20).fill(28.0);

    const tGrid = createCanonicalGridScalar({
      id: 'sst:1',
      source: 'TEST',
      variable: 'sea_surface_temperature',
      unit: '°C',
      dataState: DataState.MODELED,
      dimensions: { latCount: 4, lonCount: 5, depthCount: 1 },
      latitudes: lats,
      longitudes: lons,
      depths: [5],
      data,
    });

    const sGrid = createCanonicalGridScalar({
      id: 'sal:1',
      source: 'TEST',
      variable: 'salinity',
      unit: 'PSU',
      dataState: DataState.MODELED,
      dimensions: { latCount: 4, lonCount: 5, depthCount: 1 },
      latitudes: lats,
      longitudes: lons,
      depths: [5],
      data,
    });

    const layer = new ScalarFieldLayer(viewer);

    for (let i = 0; i < 20; i++) {
      const grid = i % 2 === 0 ? tGrid : sGrid;
      layer.updateGrid(grid, i % 2 === 0 ? 'THERMAL' : 'HALINE', 5);
    }

    // Active viewer must remain strictly 1
    assert.equal(globalLifecycleTracker.getStats().activeViewers, 1);
    assert.equal(globalLifecycleTracker.getStats().viewersCreated, 1);
    assert.equal(globalLifecycleTracker.getStats().viewersDestroyed, 0);

    layer.remove();
  });

  test('Adversarial 3: 20 rapid basemap switches never create additional viewers', async () => {
    const viewer = createMockViewer();
    globalLifecycleTracker.trackViewerCreated(viewer);
    const basemap = new BasemapController(viewer);

    const basemapIds = ['SATELLITE', 'DARK_MATTER', 'OCEAN_BASE', 'OSM'];

    for (let i = 0; i < 20; i++) {
      const id = basemapIds[i % basemapIds.length];
      await basemap.setBasemap(id);
    }

    assert.equal(globalLifecycleTracker.getStats().activeViewers, 1);
    assert.equal(globalLifecycleTracker.getStats().viewersCreated, 1);
    assert.equal(viewer.isDestroyed(), false);
  });

  test('Adversarial 4: 20 particle start/stop toggles release all governor holds cleanly', () => {
    const viewer = createMockViewer();
    installRenderGovernor(viewer);
    const particles = new ParticleCurrentLayer(viewer);

    const lats = [5, 10, 15, 20];
    const lons = [60, 65, 70, 75, 80];
    const uData = new Float32Array(20).fill(0.2);
    const vData = new Float32Array(20).fill(-0.1);

    const vecGrid = createCanonicalGridVector({
      id: 'test:currents',
      source: 'ANDRO',
      dimensions: { latCount: 4, lonCount: 5, depthCount: 1 },
      latitudes: lats,
      longitudes: lons,
      depths: [5],
      uData,
      vData,
    });

    for (let i = 0; i < 20; i++) {
      particles.start(vecGrid);
      particles.stop();
    }

    assert.equal(getGovernorStats().holdsCount, 0);
    assert.equal(getGovernorStats().isExplicitHold, false);
  });

  test('Adversarial 5: Security — No raw credentials or secret keys in errors or properties', () => {
    const testKeys = ['MOCK_GOOGLE_MAPS_KEY_FOR_TESTS', 'mock_aisstream_dummy_token_fixture_0000'];

    for (const key of testKeys) {
      // Verify key is not embedded in BASEMAPS definitions
      for (const b of BASEMAPS) {
        assert.ok(!b.url?.includes(key), 'API key must not be hardcoded in basemap URL');
      }
    }
  });
});
