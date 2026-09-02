import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOceanCurrentGrid } from '../../src/adapters/OceanCurrentAdapter.js';
import { TemporalClassification } from '../../src/engine/ocean/CanonicalGridVector.js';

describe('OceanView — Real Ocean Current Ingestion Adapter', () => {
  test('Normalizes raw U/V grid and converts cm/s to m/s', () => {
    const raw = {
      datasetId: 'ANDRO',
      temporalState: TemporalClassification.CLIMATOLOGY,
      sourceUnit: 'cm/s', // Scripps ANDRO raw unit
      timestamp: '2025-01-01T00:00:00Z',
      depthMeters: 5.0,
      latitudes: [10, 11],
      longitudes: [65, 66],
      uData: [-10.0, -15.0, -8.0, -12.0], // in cm/s -> should become -0.10, -0.15, -0.08, -0.12 m/s
      vData: [5.0, 6.0, 4.0, 5.0],        // in cm/s -> should become 0.05, 0.06, 0.04, 0.05 m/s
    };

    const canonicalVector = normalizeOceanCurrentGrid(raw);

    assert.equal(canonicalVector.kind, 'CANONICAL_GRID_VECTOR');
    assert.equal(canonicalVector.unit, 'm/s');
    assert.equal(canonicalVector.temporalState, 'CLIMATOLOGY');

    const v00 = canonicalVector.getVector(0, 0);
    assert.equal(v00.u, -0.1);
    assert.equal(v00.v, 0.05);
    assert.ok(v00.speed > 0.11 && v00.speed < 0.12);
  });

  test('Rejects dimension and array length mismatches', () => {
    assert.throws(
      () =>
        normalizeOceanCurrentGrid({
          datasetId: 'ANDRO',
          latitudes: [10, 11],
          longitudes: [65, 66], // Expected 4 elements
          uData: [-0.1, -0.2],  // Provided 2
          vData: [0.1, 0.2],
        }),
      /uData length.*does not match grid cells/
    );
  });
});
