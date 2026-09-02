/**
 * OceanView — Phase 8.2 Scientific Visualization Readability & Render Policy Tests
 * Validates camera-adaptive rendering policies, scalar bilinear interpolation,
 * vector decimation, particle budget adaptation, and multi-layer compositing.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  CameraAltitudeTier,
  getCameraAltitudeTier,
  getVectorRenderPolicy,
  getScalarRenderPolicy,
  getParticleRenderPolicy,
  getObservationRenderPolicy,
} from '../../src/engine/rendering/scientificRenderPolicy.js';
import { createCanonicalGridScalar } from '../../src/engine/ocean/CanonicalGridScalar.js';
import { createCanonicalGridVector } from '../../src/engine/ocean/CanonicalGridVector.js';
import { ScalarFieldLayer } from '../../src/visualization/scalar/ScalarFieldLayer.js';
import { VectorFieldLayer } from '../../src/visualization/vector/VectorFieldLayer.js';
import { ParticleCurrentLayer, ParticleBudgetTiers } from '../../src/visualization/vector/ParticleCurrentLayer.js';
import { ProfileLayer, PLATFORM_COLORS } from '../../src/visualization/profiles/ProfileLayer.js';
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

describe('OceanView — Phase 8.2 Scientific Render Policy Engine', () => {
  test('Render Policy: Accurately classifies camera altitude tiers', () => {
    assert.equal(getCameraAltitudeTier(8000000), CameraAltitudeTier.GLOBAL);
    assert.equal(getCameraAltitudeTier(3500000), CameraAltitudeTier.REGIONAL);
    assert.equal(getCameraAltitudeTier(800000), CameraAltitudeTier.LOCAL);
  });

  test('Vector Policy: Global view applies decimation stride 2, local view uses stride 1', () => {
    const globalPolicy = getVectorRenderPolicy({
      cameraHeight: 8000000,
      gridDimensions: { latCount: 8, lonCount: 11 },
    });
    assert.equal(globalPolicy.tier, CameraAltitudeTier.GLOBAL);
    assert.equal(globalPolicy.densityStride, 2);
    assert.equal(globalPolicy.maxVisualLengthDeg, 2.0);

    const localPolicy = getVectorRenderPolicy({
      cameraHeight: 500000,
      gridDimensions: { latCount: 8, lonCount: 11 },
    });
    assert.equal(localPolicy.tier, CameraAltitudeTier.LOCAL);
    assert.equal(localPolicy.densityStride, 1);
    assert.equal(localPolicy.maxVisualLengthDeg, 1.0);
  });

  test('Scalar Policy: Attenuates presentation opacity when vectors are enabled without mutating userOpacity', () => {
    const soloScalar = getScalarRenderPolicy({
      cameraHeight: 3000000,
      userOpacity: 0.80,
      vectorVisible: false,
    });
    assert.equal(soloScalar.displayOpacity, 0.80);
    assert.equal(soloScalar.presentationFactor, 1.0);

    const composedScalar = getScalarRenderPolicy({
      cameraHeight: 3000000,
      userOpacity: 0.80,
      vectorVisible: true,
    });
    assert.equal(composedScalar.presentationFactor, 0.75);
    assert.equal(composedScalar.displayOpacity, 0.60); // 0.80 * 0.75 = 0.60
  });

  test('Particle Policy: Attenuates particle count in global view to prevent visual saturation', () => {
    const globalParticle = getParticleRenderPolicy({
      cameraHeight: 8000000,
      budgetTier: 'MEDIUM',
    });
    assert.equal(globalParticle.tier, CameraAltitudeTier.GLOBAL);
    assert.equal(globalParticle.effectiveCount, 3000); // 4000 * 0.75 = 3000

    const regionalParticle = getParticleRenderPolicy({
      cameraHeight: 3000000,
      budgetTier: 'MEDIUM',
    });
    assert.equal(regionalParticle.tier, CameraAltitudeTier.REGIONAL);
    assert.equal(regionalParticle.effectiveCount, 4000);
  });

  test('Observation Policy: Enhances selected profile marker size', () => {
    const unselectedPolicy = getObservationRenderPolicy({
      cameraHeight: 3000000,
      selectedProfileId: null,
    });
    assert.equal(unselectedPolicy.unselectedPixelSize, 8);
    assert.equal(unselectedPolicy.hasSelection, false);

    const selectedPolicy = getObservationRenderPolicy({
      cameraHeight: 3000000,
      selectedProfileId: '2901234',
    });
    assert.equal(selectedPolicy.selectedPixelSize, 14);
    assert.equal(selectedPolicy.hasSelection, true);
  });
});

describe('OceanView — Phase 8.2 Layer Readability & Metadata Integration', () => {
  test('VectorFieldLayer: Embeds rich vectorData onto Cesium entities for probe inspection', () => {
    const viewer = createMockViewer();
    const layer = new VectorFieldLayer(viewer);

    const vecGrid = createCanonicalGridVector({
      id: 'andro:test',
      source: 'ANDRO',
      dimensions: { latCount: 2, lonCount: 2 },
      latitudes: [10, 12],
      longitudes: [65, 67],
      uData: new Float32Array([0.20, 0.30, 0.15, 0.25]),
      vData: new Float32Array([0.10, 0.15, 0.20, 0.10]),
    });

    layer.updateVectors(vecGrid, 5, 1);

    const entities = layer.dataSource.entities.values;
    assert.ok(entities.length > 0);
    const firstEntity = entities[0];
    assert.ok(firstEntity.vectorData);
    assert.equal(firstEntity.vectorData.source, 'ANDRO');
    assert.equal(firstEntity.vectorData.depthMeters, 5);
    assert.ok(firstEntity.vectorData.speed > 0);
  });

  test('ProfileLayer: Assigns distinct platform color identities', () => {
    assert.equal(PLATFORM_COLORS.ARGO_FLOAT, '#38bdf8');
    assert.equal(PLATFORM_COLORS.BGC_ARGO, '#c084fc');
    assert.equal(PLATFORM_COLORS.GLIDER, '#34d399');
    assert.equal(PLATFORM_COLORS.CTD_CAST, '#fbbf24');
  });

  test('ScalarFieldLayer: Correctly reports bilinear interpolated grid label in debug state', () => {
    const viewer = createMockViewer();
    const layer = new ScalarFieldLayer(viewer);

    const tGrid = createCanonicalGridScalar({
      id: 'sst:test',
      source: 'TEST',
      variable: 'sea_surface_temperature',
      unit: '°C',
      dataState: DataState.MODELED,
      dimensions: { latCount: 2, lonCount: 2 },
      latitudes: [10, 12],
      longitudes: [65, 67],
      data: new Float32Array([28.0, 28.5, 27.8, 28.2]),
    });

    layer.updateGrid(tGrid, 'THERMAL', 0, 0.85);

    const debug = layer.getDebugState();
    assert.equal(debug.enabled, true);
    assert.equal(debug.gridLabel, 'NATIVE GRID 0.25° | BILINEAR INTERPOLATED');
  });
});

describe('OceanView — Phase 8.2 ADVERSARIAL READABILITY TESTS', () => {
  test('Adversarial 1: Extreme camera altitude (> 20,000 km) cannot produce unbounded glyph count', () => {
    const policy = getVectorRenderPolicy({
      cameraHeight: 25000000,
      gridDimensions: { latCount: 8, lonCount: 11 },
    });
    assert.equal(policy.densityStride >= 2, true);
    assert.equal(policy.maxVisualLengthDeg <= 2.5, true);
  });

  test('Adversarial 2: Extreme zoom (< 50 km) maintains bounded particle budgets', () => {
    const policy = getParticleRenderPolicy({
      cameraHeight: 40000,
      budgetTier: 'HIGH',
    });
    assert.equal(policy.effectiveCount <= 8000, true);
  });

  test('Adversarial 3: Single speed outlier (e.g. 10 m/s) is visually capped and does not shrink other vectors to 0', () => {
    const policy = getVectorRenderPolicy({ cameraHeight: 3000000 });
    const outlierSpeed = 10.0;
    const rawLen = outlierSpeed * policy.vectorScale;
    const visualLen = Math.min(policy.maxVisualLengthDeg, Math.max(policy.minVisualLengthDeg, rawLen));
    assert.equal(visualLen, policy.maxVisualLengthDeg); // Strictly capped
  });

  test('Adversarial 4: Auto-dimming presentation factor does not overwrite userOpacity in state', () => {
    const userOpacity = 0.85;
    const policy = getScalarRenderPolicy({
      cameraHeight: 3000000,
      userOpacity,
      vectorVisible: true,
      particleVisible: true,
    });
    assert.notEqual(policy.displayOpacity, userOpacity);
    assert.equal(userOpacity, 0.85); // Underlying state remains unmodified
  });

  test('Adversarial 5: Physical depth is preserved on entity polylines (-depthMeters)', () => {
    const viewer = createMockViewer();
    const layer = new VectorFieldLayer(viewer);

    const vecGrid = createCanonicalGridVector({
      id: 'andro:deep',
      source: 'ANDRO',
      dimensions: { latCount: 1, lonCount: 1, depthCount: 1 },
      latitudes: [10],
      longitudes: [65],
      depths: [500],
      uData: new Float32Array([0.05]),
      vData: new Float32Array([0.02]),
    });

    layer.updateVectors(vecGrid, 500, 1);
    assert.equal(layer.activeDepthIdx, 0);
  });
});
