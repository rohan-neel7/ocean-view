import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createCanonicalGridVector, TemporalClassification } from '../../src/engine/ocean/CanonicalGridVector.js';
import { DataState, SourceMode } from '../../src/engine/contracts/intelligenceContract.js';

describe('OceanView — CanonicalGridVector & Directional Convention', () => {
  test('Direction Convention: Verifies 4 cardinal and 4 intercardinal oceanographic bearings', () => {
    // Grid with 8 test vectors
    const lats = [10, 11, 12, 13, 14, 15, 16, 17];
    const lons = [60];

    const uData = new Float32Array([
      0.0,  // 0: North (u=0, v=1)
      1.0,  // 1: East (u=1, v=0)
      0.0,  // 2: South (u=0, v=-1)
      -1.0, // 3: West (u=-1, v=0)
      1.0,  // 4: North-East (u=1, v=1)
      1.0,  // 5: South-East (u=1, v=-1)
      -1.0, // 6: South-West (u=-1, v=-1)
      -1.0, // 7: North-West (u=-1, v=1)
    ]);

    const vData = new Float32Array([
      1.0,  // 0: North
      0.0,  // 1: East
      -1.0, // 2: South
      0.0,  // 3: West
      1.0,  // 4: North-East
      -1.0, // 5: South-East
      -1.0, // 6: South-West
      1.0,  // 7: North-West
    ]);

    const vecGrid = createCanonicalGridVector({
      id: 'test:bearings',
      source: 'TEST_VELOCITY',
      temporalState: TemporalClassification.MODEL_ANALYSIS,
      dimensions: { latCount: 8, lonCount: 1 },
      latitudes: lats,
      longitudes: lons,
      uData,
      vData,
    });

    // 0: Northward flow -> 0°
    const vN = vecGrid.getVector(0, 0);
    assert.equal(vN.headingDeg, 0.0);
    assert.equal(vN.speed, 1.0);

    // 1: Eastward flow -> 90°
    const vE = vecGrid.getVector(1, 0);
    assert.equal(vE.headingDeg, 90.0);
    assert.equal(vE.speed, 1.0);

    // 2: Southward flow -> 180°
    const vS = vecGrid.getVector(2, 0);
    assert.equal(vS.headingDeg, 180.0);
    assert.equal(vS.speed, 1.0);

    // 3: Westward flow -> 270°
    const vW = vecGrid.getVector(3, 0);
    assert.equal(vW.headingDeg, 270.0);
    assert.equal(vW.speed, 1.0);

    // 4: North-East flow -> 45°
    const vNE = vecGrid.getVector(4, 0);
    assert.equal(vNE.headingDeg, 45.0);
    assert.ok(Math.abs(vNE.speed - 1.4142) < 0.001);

    // 5: South-East flow -> 135°
    const vSE = vecGrid.getVector(5, 0);
    assert.equal(vSE.headingDeg, 135.0);

    // 6: South-West flow -> 225°
    const vSW = vecGrid.getVector(6, 0);
    assert.equal(vSW.headingDeg, 225.0);

    // 7: North-West flow -> 315°
    const vNW = vecGrid.getVector(7, 0);
    assert.equal(vNW.headingDeg, 315.0);
  });

  test('Missing component invariant: If either u or v is fill value, vector is null (never zero-filled)', () => {
    const lats = [10, 11];
    const lons = [60];
    const uData = new Float32Array([0.5, -9999.0]); // Row 1 missing U
    const vData = new Float32Array([-9999.0, 0.5]); // Row 0 missing V

    const vecGrid = createCanonicalGridVector({
      id: 'test:missing_comp',
      source: 'TEST_VELOCITY',
      dimensions: { latCount: 2, lonCount: 1 },
      latitudes: lats,
      longitudes: lons,
      uData,
      vData,
      fillValue: -9999.0,
    });

    assert.equal(vecGrid.getVector(0, 0), null, 'Vector with missing V must be null');
    assert.equal(vecGrid.getVector(1, 0), null, 'Vector with missing U must be null');
  });

  test('Preserves temporal classification and lineage metadata', () => {
    const vecGrid = createCanonicalGridVector({
      id: 'andro:august:z5',
      source: 'ANDRO_ATLAS',
      sourceMode: SourceMode.LIVE,
      temporalState: TemporalClassification.CLIMATOLOGY,
      timestamp: '2025-08-01T00:00:00Z',
      dimensions: { latCount: 1, lonCount: 1 },
      latitudes: [10],
      longitudes: [60],
      uData: new Float32Array([-0.12]),
      vData: new Float32Array([0.05]),
    });

    assert.equal(vecGrid.temporalState, 'CLIMATOLOGY');
    assert.equal(vecGrid.dataState, DataState.MODELED);
    assert.equal(vecGrid.unit, 'm/s');
  });
});
