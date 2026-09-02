/**
 * OceanView — Camera Verbs, Transitions & Presets
 * Inspired by God's Eye View cinematic camera motion engine.
 * Provides smooth transitions, orbital zooms, angle nudging, and oceanographic framing.
 */

import * as Cesium from 'cesium';
import { governorRequestRender } from './renderGovernor.js';

export const OCEAN_REGIONS = Object.freeze({
  INDIAN_OCEAN_BASIN: {
    name: 'Indian Ocean Basin',
    lon: 75.0,
    lat: 5.0,
    alt: 8500000,
    heading: 0,
    pitch: -88,
  },
  ARABIAN_SEA: {
    name: 'Arabian Sea Basin',
    lon: 66.0,
    lat: 15.0,
    alt: 2800000,
    heading: 0,
    pitch: -70,
  },
  BAY_OF_BENGAL: {
    name: 'Bay of Bengal',
    lon: 88.0,
    lat: 14.0,
    alt: 2800000,
    heading: 0,
    pitch: -70,
  },
  EQUATORIAL_INDIAN_OCEAN: {
    name: 'Equatorial Jet',
    lon: 80.0,
    lat: 0.0,
    alt: 3500000,
    heading: 0,
    pitch: -75,
  },
  LAKSHADWEEP_MALDIVES: {
    name: 'Lakshadweep-Maldives Ridge',
    lon: 73.0,
    lat: 7.0,
    alt: 1200000,
    heading: 15,
    pitch: -55,
  },
  SOUTHERN_OCEAN_SECTOR: {
    name: 'Southern Ocean Sector',
    lon: 70.0,
    lat: -45.0,
    alt: 4500000,
    heading: 0,
    pitch: -70,
  },
});

/**
 * Flies camera smoothly to an ocean region preset with cubic ease.
 */
export function flyToOceanRegion(viewer, regionKey = 'INDIAN_OCEAN_BASIN', durationSec = 1.8) {
  if (!viewer || !viewer.camera || viewer.isDestroyed?.()) return;

  const target = OCEAN_REGIONS[regionKey] || OCEAN_REGIONS.INDIAN_OCEAN_BASIN;

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(target.lon, target.lat, target.alt),
    orientation: {
      heading: Cesium.Math.toRadians(target.heading),
      pitch: Cesium.Math.toRadians(target.pitch),
      roll: 0.0,
    },
    duration: durationSec,
    easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    complete: () => governorRequestRender(),
  });
}

/**
 * Smoothly nudges heading by delta degrees.
 */
export function nudgeHeading(viewer, deltaDeg = 30, durationSec = 0.5) {
  if (!viewer || !viewer.camera || viewer.isDestroyed?.()) return;

  const camera = viewer.camera;
  const currentHeading = camera.heading;
  const newHeading = currentHeading + Cesium.Math.toRadians(deltaDeg);

  camera.flyTo({
    destination: camera.position,
    orientation: {
      heading: newHeading,
      pitch: camera.pitch,
      roll: camera.roll,
    },
    duration: durationSec,
    easingFunction: Cesium.EasingFunction.QUADRATIC_OUT,
    complete: () => governorRequestRender(),
  });
}

/**
 * Smoothly nudges pitch tilt angle by delta degrees.
 */
export function nudgePitch(viewer, deltaDeg = 15, durationSec = 0.5) {
  if (!viewer || !viewer.camera || viewer.isDestroyed?.()) return;

  const camera = viewer.camera;
  const currentPitch = camera.pitch;
  const targetPitch = Math.max(
    Cesium.Math.toRadians(-89),
    Math.min(Cesium.Math.toRadians(-10), currentPitch + Cesium.Math.toRadians(deltaDeg))
  );

  camera.flyTo({
    destination: camera.position,
    orientation: {
      heading: camera.heading,
      pitch: targetPitch,
      roll: camera.roll,
    },
    duration: durationSec,
    easingFunction: Cesium.EasingFunction.QUADRATIC_OUT,
    complete: () => governorRequestRender(),
  });
}

/**
 * Smoothly snaps camera heading back to True North (0°).
 */
export function resetNorth(viewer, durationSec = 0.8) {
  if (!viewer || !viewer.camera || viewer.isDestroyed?.()) return;

  const camera = viewer.camera;
  camera.flyTo({
    destination: camera.position,
    orientation: {
      heading: 0.0,
      pitch: camera.pitch,
      roll: 0.0,
    },
    duration: durationSec,
    easingFunction: Cesium.EasingFunction.CUBIC_OUT,
    complete: () => governorRequestRender(),
  });
}

/**
 * Zooms camera in/out by altitude scaling factor.
 */
export function zoomCamera(viewer, factor = 0.6, durationSec = 0.6) {
  if (!viewer || !viewer.camera || viewer.isDestroyed?.()) return;

  const camera = viewer.camera;
  const carto = camera.positionCartographic;
  if (!carto) return;

  const newHeight = Math.max(10000.0, Math.min(15000000.0, carto.height * factor));

  camera.flyTo({
    destination: Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, newHeight),
    orientation: {
      heading: camera.heading,
      pitch: camera.pitch,
      roll: camera.roll,
    },
    duration: durationSec,
    easingFunction: Cesium.EasingFunction.QUADRATIC_OUT,
    complete: () => governorRequestRender(),
  });
}

/**
 * Executes a cinematic spiral flight down into an in-situ float coordinate.
 */
export function spiralIn(viewer, lat, lon, targetAlt = 350000.0, durationSec = 2.4) {
  if (!viewer || !viewer.camera || viewer.isDestroyed?.()) return;

  const camera = viewer.camera;
  const destination = Cesium.Cartesian3.fromDegrees(lon, lat, targetAlt);

  camera.flyTo({
    destination,
    orientation: {
      heading: camera.heading + Cesium.Math.toRadians(120),
      pitch: Cesium.Math.toRadians(-35),
      roll: 0.0,
    },
    duration: durationSec,
    easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    complete: () => governorRequestRender(),
  });
}
