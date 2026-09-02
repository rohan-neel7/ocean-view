import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeArgoProfile } from '../../src/adapters/ArgoAdapter.js';
import { normalizeOceanModelGrid } from '../../src/adapters/OceanModelAdapter.js';
import { getOceanModelSlice } from '../../server/oceanDataService.js';
import { compareProfileAgainstModel } from '../../src/engine/comparison/ModelObservationComparator.js';

describe('OceanView — Phase 2 ADVERSARIAL DEFENSE TESTS', () => {
  test('Adversarial 1: NetCDF / Tabledap fill values never become zero', () => {
    const rawArgo = {
      platformNumber: '2900771',
      time: '2010-01-05T00:00:00Z',
      latitude: 15.0,
      longitude: 68.0,
      levels: [
        { pres: 5.0, temp: 99999.0, psal: -999.0 },
        { pres: 10.0, temp: null, psal: NaN },
      ],
    };

    const profile = normalizeArgoProfile(rawArgo);
    assert.equal(profile.variables.temperature[0], null);
    assert.equal(profile.variables.salinity[0], null);
    assert.equal(profile.variables.temperature[1], null);
    assert.equal(profile.variables.salinity[1], null);

    // Contamination check: None may be 0.0
    for (const t of profile.variables.temperature) {
      assert.notEqual(t, 0.0, 'Missing temperature must never be 0.0°C');
    }
  });

  test('Adversarial 2: Unphysical coordinates are strictly rejected', () => {
    assert.throws(
      () =>
        normalizeArgoProfile({
          platformNumber: '2900771',
          time: '2010-01-05T00:00:00Z',
          latitude: -120.0, // Invalid latitude (< -90)
          longitude: 68.0,
        }),
      /Invalid latitude/
    );

    assert.throws(
      () =>
        normalizeArgoProfile({
          platformNumber: '2900771',
          time: '2010-01-05T00:00:00Z',
          latitude: 15.0,
          longitude: 250.0, // Invalid longitude (> 180)
        }),
      /Invalid longitude/
    );
  });

  test('Adversarial 3: Excessive spatial bounds are safely clamped by server subsetting', async () => {
    // Requesting impossible coordinates (-999°S to 999°N)
    const slice = await getOceanModelSlice({
      minLat: -999,
      maxLat: 999,
      minLon: -999,
      maxLon: 999,
      stride: 4,
    });

    assert.ok(slice);
    assert.ok(slice.latitudes.length > 0);
    assert.ok(slice.latitudes[0] >= -80, 'Latitude must be clamped within physical bounds [-80, 80]');
    assert.ok(slice.latitudes[slice.latitudes.length - 1] <= 80);
  });

  test('Adversarial 4: Model observation mismatch remains quantitatively visible and non-zero-filled', () => {
    const profile = normalizeArgoProfile({
      platformNumber: '2900771',
      time: '2010-01-05T00:00:00Z',
      latitude: 15.0,
      longitude: 68.0,
      levels: [
        { pres: 5.0, temp: 27.5, psal: 36.2 },
        { pres: 100.0, temp: 15.0, psal: 35.5 }, // Large gradient
      ],
    });

    const grid = normalizeOceanModelGrid({
      datasetId: 'TEST_MODEL',
      timestamp: '2010-01-05T00:00:00Z',
      latitudes: [15.0],
      longitudes: [68.0],
      depths: [5.0, 100.0],
      data: new Float32Array([26.0, 18.0]), // Intentionally mismatched model values
      fillValue: -9999.0,
    });

    const report = compareProfileAgainstModel(profile, grid, 'temperature');
    assert.ok(report);
    assert.equal(report.alignment[0].delta, 1.5); // 27.5 - 26.0 = +1.5°C
    assert.equal(report.alignment[1].delta, -3.0); // 15.0 - 18.0 = -3.0°C
    assert.equal(report.metrics.meanBias, -0.75); // (1.5 - 3.0)/2 = -0.75°C
  });
});
