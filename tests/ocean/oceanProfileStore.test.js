import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { OceanProfileStore } from '../../src/engine/ocean/OceanProfileStore.js';
import { createCanonicalProfile } from '../../src/engine/ocean/CanonicalProfile.js';

describe('OceanView — OceanProfileStore Vertical Cast Engine', () => {
  test('OceanProfileStore indexes casts by platform and spatial bounding box', () => {
    const store = new OceanProfileStore();

    const p1 = createCanonicalProfile({
      id: 'argo:2902745:01',
      source: 'INCOIS_ARGO',
      platformId: 'WMO_2902745',
      platformType: 'ARGO_FLOAT',
      location: { lat: 15.0, lon: 68.0 },
      depths: [0, 100, 500],
      variables: { temperature: [28.0, 22.0, 10.0] },
      units: { temperature: '°C' },
    });

    const p2 = createCanonicalProfile({
      id: 'argo:2902745:02',
      source: 'INCOIS_ARGO',
      platformId: 'WMO_2902745',
      platformType: 'ARGO_FLOAT',
      location: { lat: 15.2, lon: 68.3 },
      depths: [0, 100, 500],
      variables: { temperature: [28.1, 22.1, 10.1] },
      units: { temperature: '°C' },
    });

    const p3 = createCanonicalProfile({
      id: 'argo:2903100:01',
      source: 'INCOIS_ARGO',
      platformId: 'WMO_2903100',
      platformType: 'ARGO_FLOAT',
      location: { lat: -5.0, lon: 85.0 },
      depths: [0, 100, 500],
      variables: { temperature: [29.0, 24.0, 11.0] },
      units: { temperature: '°C' },
    });

    store.addProfile(p1);
    store.addProfile(p2);
    store.addProfile(p3);

    assert.equal(store.profiles.size, 3);

    // Platform query
    const floatCasts = store.getProfilesByPlatform('WMO_2902745');
    assert.equal(floatCasts.length, 2);

    // Bounding box query (Arabian Sea)
    const arabianSeaCasts = store.getProfilesInBounds({ minLat: 10, maxLat: 20, minLon: 60, maxLon: 75 });
    assert.equal(arabianSeaCasts.length, 2);

    // Nearest profile query
    const nearest = store.getNearestProfile(15.1, 68.1, 100);
    assert.ok(nearest);
    assert.equal(nearest.profile.platformId, 'WMO_2902745');
  });
});
