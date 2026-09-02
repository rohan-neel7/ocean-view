import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createCanonicalObservation } from '../../src/engine/ocean/CanonicalObservation.js';
import { createCanonicalProfile } from '../../src/engine/ocean/CanonicalProfile.js';
import { createCanonicalGridScalar } from '../../src/engine/ocean/CanonicalGridScalar.js';
import { createCanonicalGridVector } from '../../src/engine/ocean/CanonicalGridVector.js';
import { calculateSoundSpeed, calculateSigmaT } from '../../src/engine/ocean/DerivedScientificField.js';
import { DataState } from '../../src/engine/contracts/intelligenceContract.js';

describe('OceanView — Domain Models & Physics Contracts', () => {
  test('CanonicalObservation correctly creates point sensor readings', () => {
    const obs = createCanonicalObservation({
      id: 'buoy:ad01:sst',
      source: 'INCOIS_BUOY_NETWORK',
      platformType: 'MOORED_BUOY',
      variable: 'sea_surface_temperature',
      value: 29.4,
      unit: '°C',
      dataState: DataState.OBSERVED,
      observedAt: '2026-08-27T06:00:00Z',
      location: { lat: 15.0, lon: 69.0, depthMeters: 1.0 },
    });

    assert.equal(obs.kind, 'CANONICAL_OBSERVATION');
    assert.equal(obs.value, 29.4);
    assert.equal(obs.unit, '°C');
    assert.equal(obs.location.depthMeters, 1.0);
  });

  test('CanonicalProfile enforces matching variable column lengths without zero-filling', () => {
    const depths = [0, 10, 50, 100, 200];
    const temps = [28.5, 28.4, 25.1, 20.2, 16.0];
    const sals = [36.2, 36.2, 36.1, 35.8, 35.5];

    const profile = createCanonicalProfile({
      id: 'argo:2902745:cast_01',
      source: 'INCOIS_ARGO',
      platformId: 'WMO_2902745',
      platformType: 'ARGO_FLOAT',
      observedAt: '2026-08-27T04:00:00Z',
      location: { lat: 12.0, lon: 68.0 },
      depths,
      variables: {
        temperature: temps,
        salinity: sals,
      },
      units: {
        temperature: '°C',
        salinity: 'PSU',
      },
    });

    assert.equal(profile.kind, 'CANONICAL_PROFILE');
    assert.equal(profile.depths.length, 5);
    assert.equal(profile.variables.temperature[2], 25.1);
    assert.equal(profile.location.maxDepthMeters, 200);
  });

  test('CanonicalGridScalar validates typed Float32Array dimensions', () => {
    const lats = new Float32Array([10, 11]);
    const lons = new Float32Array([70, 71, 72]);
    const data = new Float32Array([28.1, 28.2, 28.3, 28.4, 28.5, 28.6]);

    const grid = createCanonicalGridScalar({
      id: 'mom6:sst:test',
      source: 'INCOIS_MOM6',
      variable: 'sea_surface_temperature',
      unit: '°C',
      dimensions: { latCount: 2, lonCount: 3 },
      latitudes: lats,
      longitudes: lons,
      data,
    });

    assert.equal(grid.kind, 'CANONICAL_GRID_SCALAR');
    assert.equal(grid.stats.validCellCount, 6);
    assert.equal(grid.stats.minValue, 28.1);
    assert.equal(grid.stats.maxValue, 28.6);
    assert.equal(grid.getValue(0, 0), 28.1);
    assert.equal(grid.getValue(1, 2), 28.6);
  });

  test('CanonicalGridVector computes speed and heading correctly', () => {
    const lats = [10];
    const lons = [70];
    const uData = new Float32Array([1.0]); // Eastward 1 m/s
    const vData = new Float32Array([1.0]); // Northward 1 m/s

    const vec = createCanonicalGridVector({
      id: 'hycom:uv:test',
      source: 'INCOIS_HYCOM',
      dimensions: { latCount: 1, lonCount: 1 },
      latitudes: lats,
      longitudes: lons,
      uData,
      vData,
    });

    const vector = vec.getVector(0, 0);
    assert.ok(vector);
    assert.equal(vector.speed, 1.4142);
    assert.equal(vector.headingDeg, 45.0); // North-East
  });

  test('Ocean physics equations (UNESCO / Mackenzie) calculate valid physical properties', () => {
    // Sound speed in seawater at 25°C, 35 PSU, 100m depth is approx 1534.5 m/s
    const c = calculateSoundSpeed(25.0, 35.0, 100.0);
    assert.ok(c > 1530 && c < 1540, `Calculated sound speed out of expected range: ${c}`);

    // Density anomaly sigma-t at 25°C, 35 PSU is approx 23.1 kg/m3
    const sigmaT = calculateSigmaT(25.0, 35.0);
    assert.ok(sigmaT > 22.5 && sigmaT < 24.0, `Calculated sigma-t out of expected range: ${sigmaT}`);
  });
});
