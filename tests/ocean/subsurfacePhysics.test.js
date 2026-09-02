import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSigmaT,
  calculateMixedLayerDepth,
  calculateSoundSpeed,
} from '../../src/engine/ocean/subsurfacePhysics.js';
import { DataState } from '../../src/engine/contracts/intelligenceContract.js';

describe('OceanView — Derived Subsurface Ocean Physics', () => {
  test('calculateSigmaT computes realistic seawater potential density (UNESCO 1983)', () => {
    // S = 35.0 PSU, T = 20.0°C -> Sigma-t ~ 24.76 kg/m³
    const res = calculateSigmaT(35.0, 20.0);

    assert.ok(res.sigmaT > 24.5 && res.sigmaT < 25.0);
    assert.equal(res.dataState, DataState.DERIVED);
    assert.equal(res.unit, 'kg/m³');
    assert.ok(res.formula.includes('UNESCO (1983)'));
  });

  test('calculateMixedLayerDepth applies de Boyer Montégut 2004 criterion', () => {
    const depths = [5.0, 10.0, 20.0, 30.0, 40.0, 50.0, 75.0, 100.0];
    const temps = [28.5, 28.5, 28.5, 28.4, 28.2, 27.5, 25.0, 22.0]; // Drops by 0.2°C at 35m-40m

    const res = calculateMixedLayerDepth(depths, temps, { refDepthMeters: 10.0, tempThresholdDegC: 0.2 });

    assert.ok(res.mldMeters >= 30.0 && res.mldMeters <= 50.0);
    assert.equal(res.dataState, DataState.DERIVED);
    assert.ok(res.criterion.includes('de Boyer Montégut et al. (2004)'));
  });

  test('calculateSoundSpeed calculates acoustic velocity in seawater (Mackenzie 1981)', () => {
    // S = 35 PSU, T = 15°C, Depth = 100m -> c ~ 1507 m/s
    const c = calculateSoundSpeed(15.0, 35.0, 100.0);
    assert.ok(c > 1500 && c < 1515);
  });
});
