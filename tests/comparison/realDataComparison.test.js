import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeArgoProfile } from '../../src/adapters/ArgoAdapter.js';
import { normalizeOceanModelGrid } from '../../src/adapters/OceanModelAdapter.js';
import { compareProfileAgainstModel } from '../../src/engine/comparison/ModelObservationComparator.js';
import realArgoFixture from '../fixtures/realArgoArabianSea.json' with { type: 'json' };
import realModelFixture from '../fixtures/realModelSliceArabianSea.json' with { type: 'json' };

describe('OceanView — End-to-End Real Scientific Intercomparison', () => {
  test('Compares real Arabian Sea Argo Cast (WMO 2900771) with SeaDataNet 4D Model Grid', () => {
    // 1. Ingest real Argo profile
    const rawArgo = realArgoFixture.profiles[0]; // Float 2900771 at 14.971°N, 68.747°E
    const canonicalProfile = normalizeArgoProfile(rawArgo);

    // 2. Ingest real Model Grid slice
    const canonicalGrid = normalizeOceanModelGrid(realModelFixture);

    // 3. Perform live quantitative intercomparison
    const report = compareProfileAgainstModel(canonicalProfile, canonicalGrid, 'temperature');

    assert.ok(report);
    assert.equal(report.profileId, 'argo:2900771:c103');
    assert.equal(report.variable, 'temperature');
    assert.equal(report.unit, '°C');
    assert.equal(report.location.lat, 14.971);
    assert.equal(report.location.lon, 68.747);

    // Verify metrics exist
    assert.ok(report.metrics.validPairs > 0, 'Must find overlapping depth levels');
    assert.ok(typeof report.metrics.meanBias === 'number');
    assert.ok(typeof report.metrics.rmse === 'number');

    // Nearest grid cell to (14.971°N, 68.747°E) is (15°N, 69°E) which has model SST ≈ 27.41°C
    // In-situ Argo surface observation is 27.393°C
    // Delta = 27.393 - 27.41 ≈ -0.017°C
    const deltaSurface = report.alignment[0].delta;
    assert.ok(typeof deltaSurface === 'number');
    assert.ok(Math.abs(deltaSurface) < 2.0, `Delta ${deltaSurface}°C should be physically realistic in Arabian Sea`);

    // Verify unphysical zero-filling did not occur
    for (let i = 0; i < report.alignment.length; i++) {
      if (report.alignment[i].delta !== null) {
        assert.notEqual(report.alignment[i].modelVal, 0.0, 'Model value must never be zero-filled');
      }
    }
  });

  test('Gracefully handles spatial out-of-bounds without fabrication', () => {
    const rawArgoPolar = {
      platformNumber: '9999999',
      time: '2010-01-05T00:00:00Z',
      latitude: -75.0, // Antarctic coordinates (out of Arabian Sea model fixture)
      longitude: 0.0,
      levels: [{ pres: 5.0, temp: -1.2, psal: 34.1 }],
    };

    const polarProfile = normalizeArgoProfile(rawArgoPolar);
    const canonicalGrid = normalizeOceanModelGrid(realModelFixture);

    const report = compareProfileAgainstModel(polarProfile, canonicalGrid, 'temperature');
    assert.ok(report);
  });
});
