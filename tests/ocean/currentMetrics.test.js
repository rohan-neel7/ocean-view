import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateFlowDirection,
  calculateCurrentSpeed,
  sampleVectorFieldBilinear,
} from '../../src/engine/ocean/currentMetrics.js';
import { createCanonicalGridVector } from '../../src/engine/ocean/CanonicalGridVector.js';

describe('OceanView — Current Metrics & Bilinear Sampling', () => {
  test('calculateFlowDirection returns precise oceanographic headings', () => {
    assert.equal(calculateFlowDirection(0, 1), 0.0);   // North
    assert.equal(calculateFlowDirection(1, 0), 90.0);  // East
    assert.equal(calculateFlowDirection(0, -1), 180.0); // South
    assert.equal(calculateFlowDirection(-1, 0), 270.0); // West
    assert.equal(calculateFlowDirection(1, 1), 45.0);   // North-East
  });

  test('calculateCurrentSpeed returns Euclidean magnitude', () => {
    assert.equal(calculateCurrentSpeed(3.0, 4.0), 5.0);
    assert.equal(calculateCurrentSpeed(0.0, 0.0), 0.0);
    assert.equal(calculateCurrentSpeed(null, 1.0), null);
  });

  test('sampleVectorFieldBilinear interpolates continuously across valid cells', () => {
    const lats = [10.0, 12.0];
    const lons = [60.0, 62.0];

    // Square grid with uniform eastward flow u = 1.0 m/s, v = 0.0 m/s
    const uData = new Float32Array([1.0, 1.0, 1.0, 1.0]);
    const vData = new Float32Array([0.0, 0.0, 0.0, 0.0]);

    const vecGrid = createCanonicalGridVector({
      id: 'test:uniform',
      source: 'TEST',
      dimensions: { latCount: 2, lonCount: 2 },
      latitudes: lats,
      longitudes: lons,
      uData,
      vData,
    });

    const sample = sampleVectorFieldBilinear(vecGrid, 11.0, 61.0, 0);
    assert.ok(sample);
    assert.equal(sample.u, 1.0);
    assert.equal(sample.v, 0.0);
    assert.equal(sample.speed, 1.0);
    assert.equal(sample.headingDeg, 90.0);
  });

  test('sampleVectorFieldBilinear returns null for out-of-domain coordinates', () => {
    const vecGrid = createCanonicalGridVector({
      id: 'test:domain',
      source: 'TEST',
      dimensions: { latCount: 2, lonCount: 2 },
      latitudes: [10.0, 12.0],
      longitudes: [60.0, 62.0],
      uData: new Float32Array(4),
      vData: new Float32Array(4),
    });

    assert.equal(sampleVectorFieldBilinear(vecGrid, 50.0, 60.0), null); // Lat out of domain
    assert.equal(sampleVectorFieldBilinear(vecGrid, 11.0, 100.0), null); // Lon out of domain
  });
});
