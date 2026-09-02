import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { compareProfileAgainstModel } from '../../src/engine/comparison/ModelObservationComparator.js';
import { createCanonicalProfile } from '../../src/engine/ocean/CanonicalProfile.js';
import { createCanonicalGridScalar } from '../../src/engine/ocean/CanonicalGridScalar.js';

describe('OceanView — Model vs Observation Comparator', () => {
  test('Calculates delta, mean bias, and RMSE between in-situ profile and 3D model grid', () => {
    // 3D model grid: 2x2 horizontal, 3 depth levels (0m, 100m, 500m)
    // Depths: [0, 100, 500]
    // Model temperature values: 0m = 28.0°C, 100m = 22.0°C, 500m = 10.0°C
    const lats = [15.0, 16.0];
    const lons = [68.0, 69.0];
    const depths = [0, 100, 500];

    const modelBuffer = new Float32Array([
      // Depth 0m:
      28.0, 28.0, 28.0, 28.0,
      // Depth 100m:
      22.0, 22.0, 22.0, 22.0,
      // Depth 500m:
      10.0, 10.0, 10.0, 10.0,
    ]);

    const grid = createCanonicalGridScalar({
      id: 'mom6:temp:test',
      source: 'INCOIS_MOM6',
      variable: 'temperature',
      unit: '°C',
      dimensions: { latCount: 2, lonCount: 2, depthCount: 3 },
      latitudes: lats,
      longitudes: lons,
      depths,
      data: modelBuffer,
    });

    // In-situ Argo profile with small positive warm bias:
    // Obs: 0m = 28.5°C (+0.5), 100m = 22.3°C (+0.3), 500m = 10.1°C (+0.1)
    const profile = createCanonicalProfile({
      id: 'argo:test:01',
      source: 'INCOIS_ARGO',
      platformId: 'WMO_TEST',
      location: { lat: 15.2, lon: 68.1 },
      depths: [0, 100, 500],
      variables: { temperature: [28.5, 22.3, 10.1] },
      units: { temperature: '°C' },
    });

    const report = compareProfileAgainstModel(profile, grid, 'temperature');

    assert.equal(report.metrics.validPairs, 3);
    assert.equal(report.alignment[0].delta, 0.5);
    assert.equal(report.alignment[1].delta, 0.3);
    assert.equal(report.alignment[2].delta, 0.1);

    // Mean bias = (0.5 + 0.3 + 0.1) / 3 = 0.3°C
    assert.equal(report.metrics.meanBias, 0.3);

    // RMSE = sqrt((0.25 + 0.09 + 0.01) / 3) = sqrt(0.35 / 3) = sqrt(0.11666) ≈ 0.3416°C
    assert.ok(report.metrics.rmse > 0.34 && report.metrics.rmse < 0.35);
  });
});
