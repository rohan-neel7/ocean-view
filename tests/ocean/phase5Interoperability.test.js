/**
 * OceanView — Phase 5 SIH26067 Interoperability, Observations & Standards Test Suite
 * Validates Gliders, CTD casts, BGC truthfulness, Variable Registry, ColorScaleManager,
 * CF Metadata Validator, OGC WMS/WCS clients, ASCII parsing, and Provider Plugins.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGliderMission } from '../../src/adapters/GliderAdapter.js';
import { normalizeCTDCast } from '../../src/adapters/CTDAdapter.js';
import { normalizeBGCProfile } from '../../src/adapters/BGCAdapter.js';
import { getAllVariables, getVariableMetadata } from '../../src/engine/ocean/VariableRegistry.js';
import { ColorScaleManager } from '../../src/visualization/color/ColorScaleManager.js';
import { validateCFMetadata } from '../../src/engine/ocean/CFMetadataValidator.js';
import { OGCWMSClient } from '../../src/engine/interoperability/OGCWMSClient.js';
import { OGCWCSClient } from '../../src/engine/interoperability/OGCWCSClient.js';
import { parseAsciiOceanTable } from '../../src/engine/ocean/AsciiTableParser.js';
import { ProviderPluginRegistry } from '../../src/engine/providers/ProviderPluginRegistry.js';
import { DataState } from '../../src/engine/contracts/intelligenceContract.js';

describe('OceanView — Phase 5 Multi-Platform Observations', () => {
  test('Glider: Normalizes autonomous dive mission into trajectory and profiles', () => {
    const rawGlider = {
      platformId: 'INCOIS_SG543',
      missionId: 'BoB_2026',
      dives: [
        {
          diveNumber: 1,
          lat: 13.5,
          lon: 84.2,
          timestamp: '2026-08-25T00:00:00Z',
          depths: [0, 50, 100, 200],
          temperature: [28.5, 24.2, 19.5, 14.1],
          salinity: [33.2, 34.5, 35.0, 35.1],
        },
        {
          diveNumber: 2,
          lat: 13.9,
          lon: 84.8,
          timestamp: '2026-08-25T06:00:00Z',
          depths: [0, 50, 100, 200],
          temperature: [28.6, 24.4, 19.8, 14.3],
          salinity: [33.1, 34.4, 34.9, 35.0],
        },
      ],
    };

    const { trajectory, profiles } = normalizeGliderMission(rawGlider);

    assert.equal(trajectory.kind, 'CANONICAL_TRAJECTORY');
    assert.equal(trajectory.pointCount, 2);
    assert.equal(profiles.length, 2);
    assert.equal(profiles[0].platformType, 'GLIDER');
    assert.equal(profiles[0].variables.temperature.length, 4);
  });

  test('CTD: Normalizes shipboard CTD rosette station with dissolved oxygen', () => {
    const rawCTD = {
      cruiseName: 'SK_392',
      stationId: 'STN_01',
      lat: 15.25,
      lon: 68.4,
      timestamp: '2026-08-24T06:00:00Z',
      depths: [0, 100, 500, 1000],
      temperature: [29.2, 20.1, 8.9, 5.8],
      salinity: [36.2, 35.8, 35.0, 34.8],
      dissolvedOxygen: [205.0, 42.0, 65.0, 110.0],
    };

    const profile = normalizeCTDCast(rawCTD);

    assert.equal(profile.kind, 'CANONICAL_PROFILE');
    assert.equal(profile.platformType, 'CTD_STATION');
    assert.equal(profile.variables.dissolved_oxygen[1], 42.0);
    assert.equal(profile.units.dissolved_oxygen, 'µmol/kg');
  });

  test('BGC: Truthfulness Invariant stamps unmeasured channels as UNAVAILABLE (Missing ≠ Zero)', () => {
    const rawBGC = {
      wmo: '2902089',
      cycleNumber: 12,
      lat: 14.1,
      lon: 69.2,
      timestamp: '2026-08-26T12:00:00Z',
      depths: [0, 25, 50],
      measurements: {
        temperature: [28.9, 28.1, 23.8],
        salinity: [36.3, 36.5, 36.3],
        chlorophyll_a: [0.42, 1.10, 1.82],
        // Oxygen and nitrate not equipped on this float
      },
    };

    const profile = normalizeBGCProfile(rawBGC);

    assert.equal(profile.platformType, 'BGC_ARGO_FLOAT');
    assert.equal(profile.quality.variableStates.chlorophyll_a, DataState.OBSERVED);
    assert.equal(profile.quality.variableStates.dissolved_oxygen, DataState.UNAVAILABLE);
    assert.equal(profile.variables.dissolved_oxygen, undefined); // Never zero-filled!
  });
});

describe('OceanView — Phase 5 Standards & Interoperability', () => {
  test('VariableRegistry: Catalog defines authoritative units and scientific modes', () => {
    const all = getAllVariables();
    assert.ok(all.length >= 6);

    const sst = getVariableMetadata('sea_surface_temperature');
    assert.equal(sst.unit, '°C');
    assert.equal(sst.scaleType, 'linear');

    const chla = getVariableMetadata('chlorophyll_a');
    assert.equal(chla.unit, 'mg/m³');
    assert.equal(chla.scaleType, 'log');
  });

  test('ColorScaleManager: Dynamic linear and logarithmic color scale normalization', () => {
    const mgr = new ColorScaleManager({
      variableId: 'chlorophyll_a',
      min: 0.1,
      max: 10.0,
      scaleType: 'log',
    });

    const norm1 = mgr.normalize(1.0); // log10(1) = 0, midway between -1 and 1
    assert.equal(Number(norm1.toFixed(2)), 0.5);

    const [r, g, b, a] = mgr.sampleColor(1.0);
    assert.ok(r >= 0 && g >= 0 && b >= 0 && a > 0);
  });

  test('CFMetadataValidator: Inspects NetCDF metadata against CF-1.8 conventions', () => {
    const validMeta = {
      Conventions: 'CF-1.8',
      latitude: { units: 'degrees_north' },
      longitude: { units: 'degrees_east' },
      time: { units: 'days since 2000-01-01 00:00:00' },
      depth: { units: 'meters' },
      Temperature: {
        standard_name: 'sea_water_temperature',
        units: '°C',
        _FillValue: -9999.0,
      },
    };

    const res = validateCFMetadata(validMeta);
    assert.equal(res.status, 'VALID');
    assert.ok(res.score >= 80);

    const invalidMeta = {
      custom_layer: { val: 123 },
    };
    const invRes = validateCFMetadata(invalidMeta);
    assert.equal(invRes.status, 'INVALID');
  });

  test('OGC Clients: WMS and WCS generate bounded standards-compliant query URLs', () => {
    const wms = new OGCWMSClient({ baseUrl: 'https://incois.gov.in/geoserver/wms' });
    const getMapUrl = wms.buildGetMapUrl({
      layer: 'INCOIS:SST_DAILY',
      bbox: [60, 5, 80, 20],
      width: 512,
      height: 512,
      time: '2026-08-27T00:00:00Z',
    });

    assert.ok(getMapUrl.includes('SERVICE=WMS'));
    assert.ok(getMapUrl.includes('REQUEST=GetMap'));
    assert.ok(getMapUrl.includes('BBOX=60%2C5%2C80%2C20'));

    const wcs = new OGCWCSClient({ baseUrl: 'https://incois.gov.in/geoserver/wcs' });
    const getCovUrl = wcs.buildGetCoverageUrl({
      coverageId: 'INCOIS__SST',
      subsetLon: [60, 80],
      subsetLat: [5, 20],
    });

    assert.ok(getCovUrl.includes('SERVICE=WCS'));
    assert.ok(getCovUrl.includes('COVERAGEID=INCOIS__SST'));
  });

  test('AsciiTableParser: Safely parses CSV ocean table with missing value sentinels', () => {
    const csvContent = `
latitude,longitude,depth,temperature,salinity
14.5,66.8,0,28.5,36.2
14.5,66.8,50,-999,36.4
14.5,66.8,100,20.1,NaN
    `.trim();

    const parsed = parseAsciiOceanTable(csvContent);
    assert.equal(parsed.validRows, 3);
    assert.equal(parsed.rows[0].temperature, 28.5);
    assert.equal(parsed.rows[1].temperature, null); // -999 mapped to null!
    assert.equal(parsed.rows[2].salinity, null); // NaN mapped to null!
  });

  test('ProviderPluginRegistry: Demonstrates extensible third-party sensor plugin registration', () => {
    const registry = new ProviderPluginRegistry();

    const mockPlugin = {
      id: 'incois_hf_radar_mumbai',
      name: 'Mumbai Coastal HF Radar Surface Currents',
      platformType: 'HF_RADAR',
      supportedVariables: ['ocean_current_velocity'],
      adapter: (raw) => ({
        kind: 'CANONICAL_GRID_VECTOR',
        id: `radar:${raw.station}`,
        dataState: DataState.OBSERVED,
      }),
    };

    assert.equal(registry.registerPlugin(mockPlugin), true);
    assert.equal(registry.getAllPlugins().length, 1);

    const result = registry.ingest('incois_hf_radar_mumbai', { station: 'MUMBAI_01' });
    assert.equal(result.kind, 'CANONICAL_GRID_VECTOR');
  });
});

describe('OceanView — Phase 5 ADVERSARIAL DEFENSE TESTS', () => {
  test('Adversarial 1: Log color scale strictly rejects non-positive values (<= 0)', () => {
    const mgr = new ColorScaleManager({
      variableId: 'chlorophyll_a',
      min: -5.0,
      max: -1.0,
      scaleType: 'log',
    });

    assert.ok(mgr.min > 0, 'Log scale min must be strictly positive');
    assert.ok(mgr.max > mgr.min, 'Log scale max must exceed min');
  });

  test('Adversarial 2: Delimited ASCII parser drops out-of-bounds coordinates safely', () => {
    const csvContent = `
lat,lon,depth,temp
15.0,65.0,0,28.0
999.0,65.0,0,28.0
15.0,500.0,0,28.0
    `.trim();

    const res = parseAsciiOceanTable(csvContent);
    assert.equal(res.validRows, 1, 'Only 1 row has physically valid coordinates');
    assert.equal(res.droppedRows, 2, '2 invalid coordinate rows must be safely dropped');
  });

  test('Adversarial 3: OGC WMS Client rejects invalid bounding box format', () => {
    const wms = new OGCWMSClient({ baseUrl: 'https://example.com/wms' });
    assert.throws(() => {
      wms.buildGetMapUrl({ layer: 'TEST', bbox: [1, 2] });
    });
  });

  test('Adversarial 4: ProviderPluginRegistry rejects non-function adapters', () => {
    const registry = new ProviderPluginRegistry();
    assert.throws(() => {
      registry.registerPlugin({ id: 'broken_plugin', adapter: 'NOT_A_FUNCTION' });
    });
  });
});
