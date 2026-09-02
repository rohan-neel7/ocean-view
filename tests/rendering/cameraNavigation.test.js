/**
 * OceanView — Phase 4.5 Camera Navigation & Interaction Unit & Adversarial Tests
 * Validates GEV-grade camera verbs, bounds enforcement, flight cancellation, generation stamping, and state preservation.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  OCEAN_REGIONS,
  SCIENTIFIC_VIEW_MODES,
  isValidOceanRegion,
} from '../../src/engine/rendering/globeViewState.js';
import { CentralizedCameraController } from '../../src/engine/rendering/CentralizedCameraController.js';

describe('OceanView — Phase 4.5 Camera Navigation & Interaction', () => {
  test('Invariant 1: Canonical Ocean Regions are strictly defined with valid 3D coordinates', () => {
    const requiredKeys = ['INDIAN_OCEAN_BASIN', 'ARABIAN_SEA', 'BAY_OF_BENGAL', 'EQUATORIAL_INDIAN_OCEAN', 'SOUTHERN_OCEAN_SECTOR'];
    for (const key of requiredKeys) {
      assert.ok(isValidOceanRegion(key), `Expected ${key} to be a valid ocean region`);
      const reg = OCEAN_REGIONS[key];
      assert.ok(reg.lon >= -180 && reg.lon <= 180, 'Longitude must be in valid [-180, 180] range');
      assert.ok(reg.lat >= -90 && reg.lat <= 90, 'Latitude must be in valid [-90, 90] range');
      assert.ok(reg.alt > 0 && reg.alt <= 15000000, 'Altitude must be strictly positive');
      assert.ok(reg.pitch >= -90 && reg.pitch <= 0, 'Pitch must be looking downward (negative)');
    }

    assert.equal(isValidOceanRegion('PACIFIC_NON_CANONICAL'), false, 'Unregistered region should be rejected');
    assert.equal(isValidOceanRegion(null), false, 'Null region should be rejected');
  });

  test('Invariant 2: Scientific View Modes provide valid distinct viewing angles', () => {
    assert.ok(SCIENTIFIC_VIEW_MODES.ORBITAL, 'Orbital mode must exist');
    assert.ok(SCIENTIFIC_VIEW_MODES.OBLIQUE_3D, '3D Oblique mode must exist');
    assert.ok(SCIENTIFIC_VIEW_MODES.SURFACE_GLANCE, 'Surface mode must exist');
    assert.ok(SCIENTIFIC_VIEW_MODES.RESET, 'Reset mode must exist');

    assert.equal(SCIENTIFIC_VIEW_MODES.ORBITAL.pitchDeg, -88, 'Orbital pitch should be near-nadir (-88°)');
    assert.equal(SCIENTIFIC_VIEW_MODES.OBLIQUE_3D.pitchDeg, -42, '3D Oblique pitch should be 45° angle (-42°)');
    assert.equal(SCIENTIFIC_VIEW_MODES.SURFACE_GLANCE.pitchDeg, -18, 'Surface pitch should be grazing angle (-18°)');
  });

  test('Invariant 3: CentralizedCameraController generation stamping suppresses stale flights', () => {
    const controller = new CentralizedCameraController(null);
    assert.equal(controller.generation, 0, 'Initial generation must be 0');

    // Simulate 5 rapid flight requests
    const f1 = controller._startStampedFlight('fly-1');
    assert.equal(f1.currentGen, 1);
    assert.equal(controller.generation, 1);

    const f2 = controller._startStampedFlight('fly-2');
    assert.equal(f2.currentGen, 2);
    assert.equal(controller.generation, 2);

    const f3 = controller._startStampedFlight('fly-3');
    assert.equal(f3.currentGen, 3);
    assert.equal(controller.generation, 3);

    // Stale completion of flight 1 must be discarded
    controller._finishStampedFlight(1, f1.flightTag);
    assert.equal(controller.activeFlightTag, f3.flightTag, 'Active flight must remain latest flight f3');

    // Current flight completion cleans up properly
    controller._finishStampedFlight(3, f3.flightTag);
    assert.equal(controller.activeFlightTag, null, 'Active flight should be cleared upon current generation completion');
  });

  test('Invariant 4: Layer-Aware Framing computes valid mid-point targets', () => {
    let capturedFlight = null;
    const mockViewer = {
      isDestroyed: () => false,
      camera: {
        cancelFlight: () => {},
        flyTo: () => {},
      },
    };
    const mockController = new CentralizedCameraController(mockViewer);
    mockController.flyTo = (opts) => {
      capturedFlight = opts;
      return true;
    };

    const transect = {
      id: 'TEST_TRANSECT',
      start: { lat: 10.0, lon: 60.0 },
      end: { lat: 20.0, lon: 70.0 },
    };

    const res = mockController.frameTransect(transect, 2.0);
    assert.equal(res, true);
    assert.ok(capturedFlight, 'flyTo should have been called');
    assert.equal(capturedFlight.lat, 15.0, 'Mid-point latitude should be 15°');
    assert.equal(capturedFlight.lon, 65.0, 'Mid-point longitude should be 65°');
    assert.equal(capturedFlight.pitch, -45.0, 'Transect frame must use 3D oblique pitch');
  });
});

describe('OceanView — Phase 4.5 ADVERSARIAL DEFENSE TESTS', () => {
  test('Adversarial 1: Ten rapid consecutive camera commands queue safely without race conditions', () => {
    const controller = new CentralizedCameraController(null);

    for (let i = 0; i < 10; i++) {
      controller._startStampedFlight(`rapid-click-${i}`);
    }

    assert.equal(controller.generation, 10, 'Generation must reach exactly 10');
    assert.equal(controller.activeFlightTag, 'rapid-click-9-10');
  });

  test('Adversarial 2: Invalid profile or transect objects fail gracefully without crashing', () => {
    const controller = new CentralizedCameraController(null);

    assert.equal(controller.focusProfile(null), false);
    assert.equal(controller.focusProfile({}), false);
    assert.equal(controller.frameTransect(null), false);
    assert.equal(controller.frameTransect({ start: null }), false);
  });

  test('Adversarial 3: Camera state mutations strictly do not pollute global scientific stores', async () => {
    const { globalOceanGridStore, globalOceanProfileStore } = await import('../../src/engine/index.js');

    const initialGridCount = globalOceanGridStore.getAll().length;
    const initialProfileCount = globalOceanProfileStore.getAll().length;

    const controller = new CentralizedCameraController(null);
    controller.flyToRegion('BAY_OF_BENGAL');
    controller.setPerspective('OBLIQUE_3D');
    controller.zoom(0.5);

    // Verify grid and profile counts remain identical
    assert.equal(globalOceanGridStore.getAll().length, initialGridCount);
    assert.equal(globalOceanProfileStore.getAll().length, initialProfileCount);
  });
});
