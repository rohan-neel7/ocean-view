import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { extractVerticalSection, calculateGeodesicDistanceKm } from '../../src/engine/ocean/VerticalSectionEngine.js';
import { createCanonicalGridScalar } from '../../src/engine/ocean/CanonicalGridScalar.js';

describe('OceanView — Vertical Section Extraction Engine', () => {
  test('calculateGeodesicDistanceKm returns accurate spherical Earth distance', () => {
    // Distance from (10°N, 60°E) to (10°N, 70°E) ~ 1095 km
    const d = calculateGeodesicDistanceKm(10.0, 60.0, 10.0, 70.0);
    assert.ok(d > 1080 && d < 1110);
  });

  test('extractVerticalSection samples 2D distance-depth matrix along transect', () => {
    const lats = [10.0, 15.0];
    const lons = [60.0, 70.0];
    const depths = [5.0, 50.0, 100.0];

    // 2 lats * 2 lons * 3 depths = 12 cells
    const data = new Float32Array([
      28.0, 28.2, 28.4, 28.6, // depth 5m
      24.0, 24.2, 24.4, 24.6, // depth 50m
      18.0, 18.2, 18.4, 18.6, // depth 100m
    ]);

    const grid = createCanonicalGridScalar({
      id: 'test:3d_grid',
      source: 'TEST_MODEL',
      variable: 'temperature',
      unit: '°C',
      dimensions: { latCount: 2, lonCount: 2, depthCount: 3 },
      latitudes: lats,
      longitudes: lons,
      depths,
      data,
    });

    const transect = {
      start: { lat: 10.0, lon: 60.0 },
      end: { lat: 15.0, lon: 70.0 },
    };

    const section = extractVerticalSection(grid, transect, { stationCount: 20 });

    assert.equal(section.kind, 'VERTICAL_SECTION');
    assert.equal(section.stationCount, 20);
    assert.equal(section.depthCount, 3);
    assert.equal(section.depths.length, 3);
    assert.equal(section.matrix.length, 3); // 3 depth rows
    assert.equal(section.matrix[0].length, 20); // 20 station columns

    // Surface temperature at start station ~ 28.0°C
    assert.equal(section.matrix[0][0], 28.0);
    // Deep temperature at end station (100m) ~ 18.6°C
    assert.equal(section.matrix[2][19], 18.6);
  });

  test('Landmasked cells in section matrix remain null without zero-filling', () => {
    const lats = [10.0];
    const lons = [60.0, 70.0];
    const depths = [5.0];
    const data = new Float32Array([28.0, -9999.0]); // 70°E is landmasked

    const grid = createCanonicalGridScalar({
      id: 'test:landmask',
      source: 'TEST_MODEL',
      variable: 'temperature',
      unit: '°C',
      dimensions: { latCount: 1, lonCount: 2, depthCount: 1 },
      latitudes: lats,
      longitudes: lons,
      depths,
      data,
      fillValue: -9999.0,
    });

    const section = extractVerticalSection(grid, {
      start: { lat: 10.0, lon: 60.0 },
      end: { lat: 10.0, lon: 70.0 },
    }, { stationCount: 2 });

    assert.equal(section.matrix[0][0], 28.0);
    assert.equal(section.matrix[0][1], null, 'Landmasked station must return null');
  });
});
