import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getOceanModelSlice, getArgoProfiles, oceanDataCache } from '../../server/oceanDataService.js';

describe('OceanView Server — Ocean Data Service', () => {
  test('getOceanModelSlice returns bounded spatial subset of temperature grid', async () => {
    const slice = await getOceanModelSlice({
      datasetId: 'SDC_GLO_CLIM_TS_V2_2',
      variable: 'Temperature',
      time: '2010-01-16T00:00:00Z',
      depth: 5.0,
      minLat: 5.0,
      maxLat: 20.0,
      minLon: 60.0,
      maxLon: 80.0,
      stride: 4,
    });

    assert.ok(slice);
    assert.equal(slice.dataState, 'MODELED');
    assert.ok(slice.dimensions.latCount > 0);
    assert.ok(slice.dimensions.lonCount > 0);
    assert.equal(slice.data.length, slice.dimensions.latCount * slice.dimensions.lonCount);
  });

  test('getArgoProfiles returns in-situ Argo profiling float casts', async () => {
    const argo = await getArgoProfiles({
      minLat: 5.0,
      maxLat: 20.0,
      minLon: 60.0,
      maxLon: 80.0,
      maxProfiles: 5,
    });

    assert.ok(argo);
    assert.equal(argo.dataState, 'OBSERVED');
    assert.ok(Array.isArray(argo.profiles));
    assert.ok(argo.profiles.length > 0);

    const first = argo.profiles[0];
    assert.ok(first.platformNumber);
    assert.ok(Array.isArray(first.levels));
    assert.ok(first.levels.length > 0);
    assert.ok(typeof first.levels[0].temp === 'number');
  });

  test('Caches responses in memory-bounded store', async () => {
    oceanDataCache.clear();
    assert.equal(oceanDataCache.cache.size, 0);

    await getOceanModelSlice({ depth: 10.0, minLat: 10, maxLat: 12, minLon: 65, maxLon: 67 });
    assert.ok(oceanDataCache.cache.size >= 1);
  });
});
