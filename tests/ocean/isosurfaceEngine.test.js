import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { extractIsosurface, MAX_ISOSURFACE_CELLS } from '../../src/engine/ocean/IsosurfaceEngine.js';
import { createCanonicalGridScalar } from '../../src/engine/ocean/CanonicalGridScalar.js';

describe('OceanView — Bounded 3D Isosurface Extraction Engine', () => {
  test('Extracts 3D triangular mesh for 20°C Isotherm in bounded subvolume', () => {
    const lats = [10.0, 12.0];
    const lons = [65.0, 67.0];
    const depths = [5.0, 50.0];

    // 2x2x2 cube with gradient: surface is 24°C, 50m depth is 16°C -> 20°C isotherm passes through middle
    const data = new Float32Array([
      24.0, 24.0, 24.0, 24.0, // surface 5m
      16.0, 16.0, 16.0, 16.0, // depth 50m
    ]);

    const grid = createCanonicalGridScalar({
      id: 'test:voxel_cube',
      source: 'TEST',
      variable: 'temperature',
      unit: '°C',
      dimensions: { latCount: 2, lonCount: 2, depthCount: 2 },
      latitudes: lats,
      longitudes: lons,
      depths,
      data,
    });

    const mesh = extractIsosurface(grid, 20.0, { verticalExaggeration: 20.0 });

    assert.equal(mesh.kind, 'ISOSURFACE_MESH');
    assert.equal(mesh.label, '20°C ISOTHERM');
    assert.equal(mesh.isovalue, 20.0);
    assert.ok(mesh.triangleCount > 0, 'Must generate triangles for cross-cutting isotherm');
    assert.equal(mesh.positions.length, mesh.triangleCount * 3 * 3);
  });

  test('Rejects oversized subvolume exceeding memory ceiling', () => {
    const gridFakeLarge = {
      data: new Float32Array(10),
      dimensions: { latCount: 100, lonCount: 100, depthCount: 10 }, // 100,000 cells > 60,000 ceiling
    };

    assert.throws(
      () => extractIsosurface(gridFakeLarge, 20.0),
      /exceeds safe memory ceiling/
    );
  });
});
