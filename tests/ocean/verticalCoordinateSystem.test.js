import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  pressureToDepthMeters,
  findNearestDepthLevel,
  interpolateVerticalProfile,
} from '../../src/engine/ocean/VerticalCoordinateSystem.js';
import { DataState } from '../../src/engine/contracts/intelligenceContract.js';

describe('OceanView — Dynamic Vertical Coordinate System', () => {
  test('Saunders 1981 pressure-to-depth conversion records DERIVED dataState and method lineage', () => {
    // 1000 dbar pressure at 15°N latitude -> ~992 meters depth
    const res = pressureToDepthMeters(1000.0, 15.0);

    assert.ok(res.depthMeters > 980 && res.depthMeters < 1005);
    assert.equal(res.sourcePressureDbar, 1000.0);
    assert.equal(res.dataState, DataState.DERIVED);
    assert.ok(res.conversionMethod.includes('Saunders (1981)'));
  });

  test('findNearestDepthLevel works dynamically against arbitrary non-uniform vertical grids', () => {
    const datasetDepths = [0, 5, 10, 25, 50, 100, 250, 500, 1000, 2000];

    const match45 = findNearestDepthLevel(45.0, datasetDepths);
    assert.equal(match45.depthMeters, 50);
    assert.equal(match45.index, 4);
    assert.equal(match45.exactMatch, false);

    const match100 = findNearestDepthLevel(100.0, datasetDepths);
    assert.equal(match100.depthMeters, 100);
    assert.equal(match100.index, 5);
    assert.equal(match100.exactMatch, true);
  });

  test('interpolateVerticalProfile interpolates monotonically without extrapolation', () => {
    const depths = [5.0, 25.0, 50.0, 100.0];
    const temps = [28.0, 27.0, 24.0, 18.0];

    // Midpoint between 5m (28°C) and 25m (27°C) at 15m -> 27.5°C
    const t15 = interpolateVerticalProfile(depths, temps, 15.0);
    assert.equal(t15, 27.5);

    // Out of domain depths return null
    assert.equal(interpolateVerticalProfile(depths, temps, 0.0), null, 'Above surface shallowest level must return null');
    assert.equal(interpolateVerticalProfile(depths, temps, 200.0), null, 'Below deepest level must return null');
  });

  test('Missing values inside profile prevent false interpolation across gaps', () => {
    const depths = [5.0, 25.0, 50.0];
    const temps = [28.0, null, 24.0]; // Missing sample at 25m

    assert.equal(interpolateVerticalProfile(depths, temps, 15.0), null);
    assert.equal(interpolateVerticalProfile(depths, temps, 35.0), null);
  });
});
