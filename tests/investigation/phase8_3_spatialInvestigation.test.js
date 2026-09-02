/**
 * OceanView — Phase 8.3 Spatial Scientific Investigation Test Suite
 * Validates coordinate parsing, ocean-land discrimination, bounded spatial windows,
 * geodesic observation discovery, bilinear model sampling, and adversarial edge cases.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createAnalysisLocation,
  parseCoordinateQuery,
  isOceanLocation,
  getAnalysisBounds,
  calculateGeodesicDistanceKm,
  findNearbyObservations,
  sampleScalarGridBilinear,
  sampleAnalysisLocation,
  AnalysisLocationSource,
  AnalysisStatus,
} from '../../src/engine/ocean/analysisLocation.js';

import { createCanonicalGridScalar } from '../../src/engine/ocean/CanonicalGridScalar.js';
import { createCanonicalGridVector } from '../../src/engine/ocean/CanonicalGridVector.js';
import { OceanGridStore } from '../../src/engine/ocean/OceanGridStore.js';

test('Phase 8.3 — Coordinate Parsing Engine', async (t) => {
  await t.test('Parses standard decimal coordinates', () => {
    const res1 = parseCoordinateQuery('15.2, 68.4');
    assert.equal(res1.valid, true);
    assert.equal(res1.latitude, 15.2);
    assert.equal(res1.longitude, 68.4);
    assert.equal(res1.formatted, '15.20°N, 68.40°E');

    const res2 = parseCoordinateQuery('-12.45, -45.67');
    assert.equal(res2.valid, true);
    assert.equal(res2.latitude, -12.45);
    assert.equal(res2.longitude, -45.67);
    assert.equal(res2.formatted, '12.45°S, 45.67°W');

    const res3 = parseCoordinateQuery('10.5 72.8');
    assert.equal(res3.valid, true);
    assert.equal(res3.latitude, 10.5);
    assert.equal(res3.longitude, 72.8);
  });

  await t.test('Parses cardinal notation (N/S/E/W)', () => {
    const res1 = parseCoordinateQuery('15.2N 68.4E');
    assert.equal(res1.valid, true);
    assert.equal(res1.latitude, 15.2);
    assert.equal(res1.longitude, 68.4);

    const res2 = parseCoordinateQuery('12.5S, 45.0W');
    assert.equal(res2.valid, true);
    assert.equal(res2.latitude, -12.5);
    assert.equal(res2.longitude, -45.0);

    const res3 = parseCoordinateQuery('68.4E, 15.2N');
    assert.equal(res3.valid, true);
    assert.equal(res3.latitude, 15.2);
    assert.equal(res3.longitude, 68.4);
  });

  await t.test('Parses DMS (Degrees Minutes Seconds) notation', () => {
    const res = parseCoordinateQuery("15°12'N 68°24'E");
    assert.equal(res.valid, true);
    assert.equal(res.latitude, 15.2);
    assert.equal(res.longitude, 68.4);
  });

  await t.test('Rejects invalid coordinate ranges and malformed strings', () => {
    const oobLat = parseCoordinateQuery('95.2, 68.4');
    assert.equal(oobLat.valid, false);
    assert.match(oobLat.error, /Latitude .* out of range/);

    const oobLon = parseCoordinateQuery('15.2, 185.0');
    assert.equal(oobLon.valid, false);
    assert.match(oobLon.error, /Longitude .* out of range/);

    const malformed = parseCoordinateQuery('not-a-coordinate');
    assert.equal(malformed.valid, false);

    const empty = parseCoordinateQuery('');
    assert.equal(empty.valid, false);
  });
});

test('Phase 8.3 — Ocean vs Land Discrimination', async (t) => {
  await t.test('Identifies open ocean locations in Arabian Sea and Bay of Bengal', () => {
    const arabianSea = isOceanLocation(15.0, 65.0);
    assert.equal(arabianSea.isOcean, true);

    const bayOfBengal = isOceanLocation(14.0, 88.0);
    assert.equal(bayOfBengal.isOcean, true);

    const equatorialIO = isOceanLocation(0.0, 80.0);
    assert.equal(equatorialIO.isOcean, true);
  });

  await t.test('Rejects continental land interior coordinates', () => {
    // Central Peninsular India
    const centralIndia = isOceanLocation(22.0, 78.0);
    assert.equal(centralIndia.isOcean, false);
    assert.match(centralIndia.reason, /India landmass/i);

    // Arabian Peninsula Interior
    const riyadh = isOceanLocation(24.5, 46.7);
    assert.equal(riyadh.isOcean, false);
    assert.match(riyadh.reason, /Arabian Peninsula/i);

    // East Africa Interior
    const eastAfrica = isOceanLocation(0.0, 35.0);
    assert.equal(eastAfrica.isOcean, false);
    assert.match(eastAfrica.reason, /African continental/i);

    // Australia Interior
    const australia = isOceanLocation(-25.0, 133.0);
    assert.equal(australia.isOcean, false);
    assert.match(australia.reason, /Australian continental/i);
  });
});

test('Phase 8.3 — Bounded Query Extent Derivation', async (t) => {
  await t.test('Derives symmetrical ±3 degree query window around analysis point', () => {
    const bounds = getAnalysisBounds({ latitude: 15.0, longitude: 65.0, radiusDeg: 3.0 });
    assert.deepEqual(bounds, {
      minLat: 12.0,
      maxLat: 18.0,
      minLon: 62.0,
      maxLon: 68.0,
    });
  });

  await t.test('Clamps query window strictly at geographic poles and dateline', () => {
    const northPole = getAnalysisBounds({ latitude: 89.0, longitude: 179.0, radiusDeg: 3.0 });
    assert.equal(northPole.maxLat, 90.0);
    assert.equal(northPole.maxLon, 180.0);

    const southPole = getAnalysisBounds({ latitude: -89.0, longitude: -179.0, radiusDeg: 3.0 });
    assert.equal(southPole.minLat, -90.0);
    assert.equal(southPole.minLon, -180.0);
  });
});

test('Phase 8.3 — Nearby Observation Discovery & Geodesic Radius Filtering', async (t) => {
  await t.test('Calculates accurate spherical geodesic distance', () => {
    const d = calculateGeodesicDistanceKm(15.0, 65.0, 15.0, 66.0);
    assert.ok(d > 100 && d < 115);
  });
  const analysisLoc = createAnalysisLocation({
    latitude: 15.0,
    longitude: 65.0,
    source: AnalysisLocationSource.CLICK,
  });

  const mockProfiles = [
    {
      id: 'argo_1',
      platformId: 'WMO-2901234',
      platformType: 'ARGO_FLOAT',
      location: { lat: 15.2, lon: 65.3 }, // ~39 km away
      depths: [5, 50, 100, 500],
    },
    {
      id: 'glider_1',
      platformId: 'GLIDER-IND-01',
      platformType: 'GLIDER',
      location: { lat: 14.5, lon: 64.6 }, // ~71 km away
      depths: [5, 20, 50, 200],
    },
    {
      id: 'ctd_1',
      platformId: 'CTD-STN-09',
      platformType: 'CTD_STATION',
      location: { lat: 17.0, lon: 67.0 }, // ~300 km away
      depths: [0, 10, 50, 1000],
    },
    {
      id: 'argo_far',
      platformId: 'WMO-2909999',
      platformType: 'ARGO_FLOAT',
      location: { lat: 5.0, lon: 85.0 }, // ~2400 km away (far out)
      depths: [5, 50],
    },
  ];

  await t.test('Filters profiles within 500 km radius and sorts by distance', () => {
    const res = findNearbyObservations(analysisLoc, mockProfiles, 500);

    assert.equal(res.nearbyProfiles.length, 3);
    assert.equal(res.counts.total, 3);
    assert.equal(res.counts.argo, 1);
    assert.equal(res.counts.glider, 1);
    assert.equal(res.counts.ctd, 1);

    // Nearest profile must be argo_1
    assert.equal(res.nearest.profile.platformId, 'WMO-2901234');
    assert.ok(res.nearest.distanceKm < 50);

    // Ascending order check
    assert.ok(res.nearbyProfiles[0].distanceKm <= res.nearbyProfiles[1].distanceKm);
    assert.ok(res.nearbyProfiles[1].distanceKm <= res.nearbyProfiles[2].distanceKm);
  });
});

test('Phase 8.3 — Bilinear Model Sampling Engine', async (t) => {
  const lats = [10.0, 15.0, 20.0];
  const lons = [60.0, 65.0, 70.0];
  const depths = [5.0];

  // Grid with uniform 28°C at 15N 65E
  const data = new Float32Array([
    26.0, 27.0, 26.5,
    27.5, 28.5, 27.8,
    25.0, 26.0, 25.5,
  ]);

  const scalarGrid = createCanonicalGridScalar({
    id: 'test_grid_scalar',
    source: 'SeaDataNet',
    variable: 'temperature',
    unit: '°C',
    dimensions: { latCount: 3, lonCount: 3, depthCount: 1 },
    latitudes: lats,
    longitudes: lons,
    depths,
    data,
  });

  const uData = new Float32Array([
    0.1, 0.2, 0.1,
    0.15, 0.25, 0.18,
    0.05, 0.1, 0.08,
  ]);
  const vData = new Float32Array([
    -0.1, -0.2, -0.1,
    -0.15, -0.25, -0.18,
    -0.05, -0.1, -0.08,
  ]);

  const vectorGrid = createCanonicalGridVector({
    id: 'test_grid_vector',
    source: 'ANDRO',
    variable: 'ocean_current_velocity',
    unit: 'm/s',
    dimensions: { latCount: 3, lonCount: 3, depthCount: 1 },
    latitudes: lats,
    longitudes: lons,
    depths,
    uData,
    vData,
  });

  const gridStore = new OceanGridStore();
  gridStore.setGrid(scalarGrid);
  gridStore.setGrid(vectorGrid);

  await t.test('Bilinearly interpolates exact value at node coordinate', () => {
    const val = sampleScalarGridBilinear(scalarGrid, 15.0, 65.0, 5.0);
    assert.equal(val, 28.5);
  });

  await t.test('Bilinearly interpolates between grid cell nodes', () => {
    // Halfway between (10N, 60E = 26.0) and (10N, 65E = 27.0)
    const val = sampleScalarGridBilinear(scalarGrid, 10.0, 62.5, 5.0);
    assert.equal(val, 26.5);
  });

  await t.test('Out-of-bounds coordinate returns null without throwing', () => {
    const val = sampleScalarGridBilinear(scalarGrid, 30.0, 65.0, 5.0);
    assert.equal(val, null);
  });

  await t.test('Samples all available fields into structured analysis packet', () => {
    const loc = createAnalysisLocation({ latitude: 15.0, longitude: 65.0 });
    const sampled = sampleAnalysisLocation(loc, gridStore, 5.0);

    assert.ok(sampled);
    assert.equal(sampled.temperature.value, 28.5);
    assert.equal(sampled.temperature.unit, '°C');
    assert.ok(sampled.current);
    assert.equal(sampled.current.u, 0.25);
    assert.equal(sampled.current.v, -0.25);
    assert.ok(sampled.current.speed > 0);
  });
});

test('Phase 8.3 — ADVERSARIAL & STRESS EDGE CASES', async (t) => {
  await t.test('Adversarial 1: Land click rejection prevents corrupting analysis state', () => {
    const landLat = 24.0;
    const landLon = 78.0;
    const check = isOceanLocation(landLat, landLon);
    assert.equal(check.isOcean, false);
    assert.ok(check.reason);
  });

  await t.test('Adversarial 2: Extremely large query string or malicious input does not crash coordinate parser', () => {
    const giantString = 'A'.repeat(5000);
    const res = parseCoordinateQuery(giantString);
    assert.equal(res.valid, false);
    assert.ok(res.error);

    const injection = '<script>alert("hack")</script>';
    const res2 = parseCoordinateQuery(injection);
    assert.equal(res2.valid, false);
  });

  await t.test('Adversarial 3: Observation search with empty profiles list returns safe zero counts', () => {
    const loc = createAnalysisLocation({ latitude: 15.0, longitude: 65.0 });
    const res = findNearbyObservations(loc, [], 500);
    assert.equal(res.nearbyProfiles.length, 0);
    assert.equal(res.nearest, null);
    assert.equal(res.counts.total, 0);
  });

  await t.test('Adversarial 4: Empty Grid Store returns clean null without throwing or fabricating science', () => {
    const emptyStore = new OceanGridStore();
    const loc = createAnalysisLocation({ latitude: 15.0, longitude: 65.0 });
    const sampled = sampleAnalysisLocation(loc, emptyStore, 50.0);
    assert.ok(sampled);
    assert.equal(sampled.temperature, null);
    assert.equal(sampled.salinity, null);
    assert.equal(sampled.current, null);
  });
});
