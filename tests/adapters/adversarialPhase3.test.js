import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createCanonicalGridVector, TemporalClassification } from '../../src/engine/ocean/CanonicalGridVector.js';
import { normalizeOceanCurrentGrid } from '../../src/adapters/OceanCurrentAdapter.js';

describe('OceanView — Phase 3 ADVERSARIAL DEFENSE TESTS', () => {
  test('Adversarial 1: Missing V component never becomes V = 0', () => {
    const vecGrid = createCanonicalGridVector({
      id: 'test:missing_v',
      source: 'TEST',
      dimensions: { latCount: 1, lonCount: 1 },
      latitudes: [10],
      longitudes: [60],
      uData: new Float32Array([1.0]),
      vData: new Float32Array([-9999.0]), // Missing V
      fillValue: -9999.0,
    });

    const vec = vecGrid.getVector(0, 0);
    assert.equal(vec, null, 'Vector with missing V must be null, never defaulted to v = 0');
  });

  test('Adversarial 2: Missing U component never becomes U = 0', () => {
    const vecGrid = createCanonicalGridVector({
      id: 'test:missing_u',
      source: 'TEST',
      dimensions: { latCount: 1, lonCount: 1 },
      latitudes: [10],
      longitudes: [60],
      uData: new Float32Array([-9999.0]), // Missing U
      vData: new Float32Array([1.0]),
      fillValue: -9999.0,
    });

    const vec = vecGrid.getVector(0, 0);
    assert.equal(vec, null, 'Vector with missing U must be null, never defaulted to u = 0');
  });

  test('Adversarial 3: Fill values never produce unphysical velocity spikes', () => {
    const raw = {
      datasetId: 'ANDRO',
      temporalState: TemporalClassification.CLIMATOLOGY,
      latitudes: [10],
      longitudes: [60],
      uData: [-9999.0],
      vData: [-9999.0],
      fillValue: -9999.0,
    };

    const canonicalVector = normalizeOceanCurrentGrid(raw);
    const v = canonicalVector.getVector(0, 0);
    assert.equal(v, null);
    assert.notEqual(canonicalVector.stats.maxSpeed, 9999.0, 'Stats must exclude fill values');
  });

  test('Adversarial 4: Invalid velocity units are rejected', () => {
    assert.throws(
      () =>
        createCanonicalGridVector({
          id: 'test:bad_unit',
          source: 'TEST',
          unit: 'unrecognized_speed_unit',
          dimensions: { latCount: 1, lonCount: 1 },
          latitudes: [10],
          longitudes: [60],
          uData: new Float32Array([0]),
          vData: new Float32Array([0]),
        }),
      /Invalid velocity unit/
    );
  });

  test('Adversarial 5: Climatology dataset strictly preserves CLIMATOLOGY classification', () => {
    const vec = normalizeOceanCurrentGrid({
      datasetId: 'ANDRO',
      temporalState: TemporalClassification.CLIMATOLOGY,
      latitudes: [10],
      longitudes: [60],
      uData: [0.1],
      vData: [0.1],
    });

    assert.equal(vec.temporalState, 'CLIMATOLOGY');
    assert.notEqual(vec.temporalState, 'FORECAST', 'Climatology must never be stamped FORECAST');
  });
});
