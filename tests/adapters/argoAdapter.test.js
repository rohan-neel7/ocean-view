import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeArgoProfile, parseTabledapArgoResponse } from '../../src/adapters/ArgoAdapter.js';
import { DataState, SourceMode } from '../../src/engine/contracts/intelligenceContract.js';

describe('OceanView — Real Argo Ingestion Adapter', () => {
  test('Normalizes raw Argo profile into CanonicalProfile with DataState.OBSERVED', () => {
    const raw = {
      platformNumber: '2900771',
      cycleNumber: 103,
      time: '2010-01-05T05:09:00Z',
      latitude: 14.971,
      longitude: 68.747,
      levels: [
        { pres: 4.8, temp: 27.393, psal: 36.262, tempQc: 1, psalQc: 1 },
        { pres: 9.5, temp: 27.391, psal: 36.263, tempQc: 1, psalQc: 1 },
        { pres: 50.0, temp: 27.572, psal: 36.619, tempQc: 1, psalQc: 1 },
      ],
    };

    const profile = normalizeArgoProfile(raw, { sourceMode: SourceMode.LIVE });

    assert.equal(profile.kind, 'CANONICAL_PROFILE');
    assert.equal(profile.platformId, 'WMO_2900771');
    assert.equal(profile.quality.cycleNumber, 103);
    assert.equal(profile.dataState, DataState.OBSERVED);
    assert.equal(profile.location.lat, 14.971);
    assert.equal(profile.location.lon, 68.747);
    assert.equal(profile.depths.length, 3);
    assert.equal(profile.variables.temperature[0], 27.393);
    assert.equal(profile.variables.salinity[0], 36.262);
    assert.equal(profile.quality.qcFlags.temperature[0], 1);
  });

  test('Preserves missing values as null (Missing ≠ Zero)', () => {
    const raw = {
      platformNumber: '2900771',
      time: '2010-01-05T05:09:00Z',
      latitude: 14.971,
      longitude: 68.747,
      levels: [
        { pres: 10.0, temp: 27.5, psal: 99999.0 }, // Fill value in salinity
        { pres: 20.0, temp: -999.0, psal: 36.2 }, // Fill value in temperature
      ],
    };

    const profile = normalizeArgoProfile(raw);

    assert.equal(profile.variables.salinity[0], null, 'Salinity fill value 99999 must become null');
    assert.notEqual(profile.variables.salinity[0], 0.0, 'Must never zero-fill');
    assert.equal(profile.variables.temperature[1], null, 'Temperature fill value -999 must become null');
  });

  test('Rejects unphysical coordinates and invalid timestamps', () => {
    assert.throws(
      () =>
        normalizeArgoProfile({
          platformNumber: '2900771',
          time: '2010-01-05T05:09:00Z',
          latitude: 999.0, // Invalid latitude
          longitude: 68.0,
        }),
      /Invalid latitude/
    );

    assert.throws(
      () =>
        normalizeArgoProfile({
          platformNumber: '2900771',
          time: 'NOT_A_TIME',
          latitude: 15.0,
          longitude: 68.0,
        }),
      /Invalid ISO timestamp/
    );
  });

  test('Parses raw ERDDAP tabledap multi-row response correctly', () => {
    const tabledapJson = {
      table: {
        columnNames: ['platform_number', 'cycle_number', 'time', 'latitude', 'longitude', 'pres', 'temp', 'psal'],
        rows: [
          ['2900771', 103, '2010-01-05T05:09:00Z', 14.971, 68.747, 5.0, 27.4, 36.2],
          ['2900771', 103, '2010-01-05T05:09:00Z', 14.971, 68.747, 10.0, 27.4, 36.2],
          ['2900772', 50, '2010-01-08T00:00:00Z', 12.0, 66.0, 5.0, 28.1, 36.1],
        ],
      },
    };

    const profiles = parseTabledapArgoResponse(tabledapJson);
    assert.equal(profiles.length, 2, 'Should group rows into 2 distinct platform casts');
    assert.equal(profiles[0].platformId, 'WMO_2900771');
    assert.equal(profiles[0].depths.length, 2);
    assert.equal(profiles[1].platformId, 'WMO_2900772');
    assert.equal(profiles[1].depths.length, 1);
  });
});
