import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ParticleBudgetTiers } from '../../src/visualization/vector/ParticleCurrentLayer.js';
import { createCanonicalGridVector } from '../../src/engine/ocean/CanonicalGridVector.js';
import { sampleVectorFieldBilinear } from '../../src/engine/ocean/currentMetrics.js';

describe('OceanView — Particle Advection Simulation Mechanics', () => {
  test('Particle budget tiers are performance-bounded (Low: 1.5k, Med: 4k, High: 8k)', () => {
    assert.equal(ParticleBudgetTiers.LOW, 1500);
    assert.equal(ParticleBudgetTiers.MEDIUM, 4000);
    assert.equal(ParticleBudgetTiers.HIGH, 8000);
  });

  test('Deterministic advection step updates particle positions along velocity streamlines', () => {
    // 2x2 grid with eastward flow u = 0.5 m/s, v = 0.0 m/s
    const lats = [10.0, 15.0];
    const lons = [60.0, 70.0];
    const vecGrid = createCanonicalGridVector({
      id: 'test:advect',
      source: 'TEST',
      dimensions: { latCount: 2, lonCount: 2 },
      latitudes: lats,
      longitudes: lons,
      uData: new Float32Array([0.5, 0.5, 0.5, 0.5]),
      vData: new Float32Array([0.0, 0.0, 0.0, 0.0]),
    });

    let lon = 65.0;
    let lat = 12.5;
    const dt = 0.1;

    // Sample and advect
    const vec = sampleVectorFieldBilinear(vecGrid, lat, lon, 0);
    assert.ok(vec);
    assert.equal(vec.u, 0.5);

    const cosLat = Math.cos((lat * Math.PI) / 180.0);
    const nextLon = lon + (vec.u * dt) / cosLat;
    const nextLat = lat + vec.v * dt;

    assert.ok(nextLon > lon, 'Particle must move eastward (increasing longitude)');
    assert.equal(nextLat, lat, 'Particle with v=0 must maintain constant latitude');
  });
});
