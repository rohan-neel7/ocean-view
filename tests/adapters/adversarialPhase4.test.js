import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { extractIsosurface, MAX_ISOSURFACE_CELLS } from '../../src/engine/ocean/IsosurfaceEngine.js';
import { alignAndCompareProfile, AlignmentStatus } from '../../src/engine/comparison/ProfileAlignmentEngine.js';
import { interpolateVerticalProfile } from '../../src/engine/ocean/VerticalCoordinateSystem.js';
import { createCanonicalProfile } from '../../src/engine/ocean/CanonicalProfile.js';
import { createCanonicalGridScalar } from '../../src/engine/ocean/CanonicalGridScalar.js';

describe('OceanView — Phase 4 ADVERSARIAL DEFENSE TESTS', () => {
  test('Adversarial 1: Huge global subvolume request is strictly rejected by memory ceiling', () => {
    const hugeGrid = {
      data: new Float32Array(10),
      dimensions: { latCount: 300, lonCount: 300, depthCount: 10 }, // 900,000 cells
    };

    assert.throws(
      () => extractIsosurface(hugeGrid, 20.0),
      new RegExp(`exceeds safe memory ceiling of ${MAX_ISOSURFACE_CELLS}`)
    );
  });

  test('Adversarial 2: Depths beyond available dataset bounds return null (No extrapolation)', () => {
    const depths = [5.0, 50.0, 100.0];
    const temps = [28.0, 24.0, 18.0];

    assert.equal(interpolateVerticalProfile(depths, temps, -10.0), null); // Negative depth
    assert.equal(interpolateVerticalProfile(depths, temps, 5000.0), null); // Beyond 100m
  });

  test('Adversarial 3: Temporal mismatch cannot silently become a valid comparison', () => {
    const profile = createCanonicalProfile({
      id: 'argo:divergent',
      source: 'ARGO',
      platformId: '2900771',
      observedAt: '2020-01-01T00:00:00Z',
      location: { lat: 10.0, lon: 65.0 },
      depths: [5.0],
      variables: { temperature: [28.0] },
    });

    const modelGrid = createCanonicalGridScalar({
      id: 'model:mismatch',
      source: 'SDC',
      timestamp: '2026-01-01T00:00:00Z',
      variable: 'temperature',
      unit: '°C',
      dimensions: { latCount: 1, lonCount: 1, depthCount: 1 },
      latitudes: [10.0],
      longitudes: [65.0],
      depths: [5.0],
      data: new Float32Array([28.0]),
    });

    const report = alignAndCompareProfile(profile, modelGrid, 'temperature', {
      maxTemporalMismatchDays: 30,
    });

    assert.equal(report.status, AlignmentStatus.TEMPORAL_MISMATCH_UNRESOLVED);
    assert.equal(report.metrics, null, 'Must not report validation statistics for mismatched timestamps');
  });

  test('Adversarial 4: Landmasked voxels do not create fake isosurface geometry', () => {
    // 2x2x2 cube where all values are landmasked (-9999)
    const data = new Float32Array(8).fill(-9999.0);

    const grid = createCanonicalGridScalar({
      id: 'test:land_cube',
      source: 'TEST',
      variable: 'temperature',
      unit: '°C',
      dimensions: { latCount: 2, lonCount: 2, depthCount: 2 },
      latitudes: [10, 11],
      longitudes: [60, 61],
      depths: [5, 10],
      data,
      fillValue: -9999.0,
    });

    const mesh = extractIsosurface(grid, 20.0);
    assert.equal(mesh.triangleCount, 0, 'Landmasked cube must generate zero triangles');
  });
});
