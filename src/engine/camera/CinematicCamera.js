import * as Cesium from 'cesium';
import { governorRequestRender } from '../rendering/renderGovernor.js';

/**
 * Absolute full-earth camera preset for a global overview.
 */
export const GLOBE_VIEW = Object.freeze({
  heightM: 18000000,
  pitchDeg: -90,
  durationS: 2.8,
});

/**
 * Fly straight out to the full-earth globe view, keeping the current sub-camera
 * point centered so the user's ocean basin stays in front of them.
 */
export function flyToGlobeView(viewer, options = {}) {
  if (!viewer || !viewer.camera || viewer.isDestroyed?.()) return null;
  const carto = viewer.camera.positionCartographic;
  const longitude = Cesium.Math.toDegrees(carto.longitude);
  const latitude = Cesium.Math.toDegrees(carto.latitude);
  
  viewer.camera.cancelFlight();
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, GLOBE_VIEW.heightM),
    orientation: {
      heading: 0,
      pitch: Cesium.Math.toRadians(GLOBE_VIEW.pitchDeg),
      roll: 0,
    },
    duration: options.duration || GLOBE_VIEW.durationS,
    endTransform: Cesium.Matrix4.IDENTITY,
    complete: () => {
      governorRequestRender();
      if (options.onComplete) options.onComplete();
    },
    cancel: options.onCancel,
  });
  
  return { latitude, longitude, heightM: GLOBE_VIEW.heightM };
}

/**
 * Fly the camera to a coordinate using lookAt-based targeting for guaranteed viewport centering.
 * Ideal for zooming into specific ocean features (seamounts, float profiles, specific vessels).
 *
 * @param {Cesium.Viewer} viewer
 * @param {number} lat - Latitude in degrees
 * @param {number} lon - Longitude in degrees
 * @param {object} options
 */
export function flyToLandmark(viewer, lat, lon, options = {}) {
  if (!viewer || !viewer.camera || viewer.isDestroyed?.()) return null;

  const {
    range = 500000,
    pitch = -45,
    heading = 0,
    duration = 3.0,
    onStart = null,
    onComplete = null,
    onCancel = null,
  } = options;

  // Use sea level (0) for oceanographic features by default
  const targetHeight = 0; 
  const targetPosition = Cesium.Cartesian3.fromDegrees(lon, lat, targetHeight);
  
  // A small bounding radius to ensure lookAt calculates distance properly
  const boundingRadius = 1000;
  const framingRange = range;

  const hpr = new Cesium.HeadingPitchRange(
    Cesium.Math.toRadians(heading),
    Cesium.Math.toRadians(pitch),
    framingRange
  );

  if (typeof onStart === 'function') {
    try { onStart(); } catch (e) { console.warn(e); }
  }

  // Fly to target, then lock with lookAt for guaranteed centering
  viewer.camera.flyToBoundingSphere(
    new Cesium.BoundingSphere(targetPosition, boundingRadius),
    {
      offset: hpr,
      duration,
      complete: () => {
        viewer.camera.lookAt(targetPosition, hpr);
        viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
        governorRequestRender();
        if (typeof onComplete === 'function') {
          try { onComplete(); } catch (e) { console.warn(e); }
        }
      },
      cancel: () => {
        if (typeof onCancel === 'function') {
          try { onCancel(); } catch (e) { console.warn(e); }
        }
      },
    }
  );

  return {
    targetPosition,
    range: framingRange,
  };
}
