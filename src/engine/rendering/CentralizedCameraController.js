/**
 * OceanView — Centralized Camera Controller
 * Authoritative manager for Cesium camera motions, flight cancellation, generation stamping, and layer framing.
 * Adheres to GEV-grade interaction invariants: single authority, zero jitter, flight interruption, and scientific context preservation.
 */

import * as Cesium from 'cesium';
import { OCEAN_REGIONS, SCIENTIFIC_VIEW_MODES, isValidOceanRegion } from './globeViewState.js';
import {
  zoomCamera,
  nudgeHeading,
  nudgePitch,
  resetNorth,
  spiralIn,
} from './cameraVerbs.js';
import { flyToLandmark } from '../camera/CinematicCamera.js';
import { governorRequestRender, holdContinuousRender, releaseContinuousRender } from './renderGovernor.js';

export class CentralizedCameraController {
  constructor(viewer = null) {
    this.viewer = viewer;
    this.generation = 0;
    this.activeFlightTag = null;
    this.activeRegionKey = 'ARABIAN_SEA';
    this.activePerspective = 'RESET';
  }

  setViewer(viewer) {
    this.viewer = viewer;
  }

  /**
   * Immediately cancels any in-progress Cesium camera animation.
   */
  cancelFlight() {
    if (!this.viewer || this.viewer.isDestroyed?.()) return;
    try {
      this.viewer.camera?.cancelFlight?.();
      if (this.activeFlightTag) {
        releaseContinuousRender(this.activeFlightTag);
        this.activeFlightTag = null;
      }
    } catch (_err) {
      // ignore
    }
  }

  /**
   * Starts a stamped flight, cancelling any previous transition.
   * Returns a generation token to verify completion validity.
   */
  _startStampedFlight(flightName = 'camera-flight') {
    this.cancelFlight();
    this.generation += 1;
    const currentGen = this.generation;
    const flightTag = `${flightName}-${currentGen}`;
    this.activeFlightTag = flightTag;
    holdContinuousRender(flightTag);
    return { currentGen, flightTag };
  }

  /**
   * Finalizes stamped flight on completion or cancellation.
   */
  _finishStampedFlight(gen, flightTag) {
    if (this.generation === gen) {
      if (this.activeFlightTag === flightTag) {
        releaseContinuousRender(flightTag);
        this.activeFlightTag = null;
      }
      governorRequestRender();
    }
  }

  /**
   * Flies smoothly to a canonical ocean region preset with cubic ease.
   */
  flyToRegion(regionKey = 'ARABIAN_SEA', durationSec = 1.8) {
    const validKey = isValidOceanRegion(regionKey) ? regionKey : 'INDIAN_OCEAN_BASIN';
    const target = OCEAN_REGIONS[validKey];
    this.activeRegionKey = validKey;

    if (!this.viewer || this.viewer.isDestroyed?.()) return false;

    const { currentGen, flightTag } = this._startStampedFlight('fly-region');

    flyToLandmark(this.viewer, target.lat, target.lon, {
      range: target.alt,
      heading: target.heading,
      pitch: target.pitch,
      duration: durationSec,
      onComplete: () => this._finishStampedFlight(currentGen, flightTag),
      onCancel: () => this._finishStampedFlight(currentGen, flightTag),
    });

    return true;
  }

  /**
   * Generic flight to an arbitrary coordinate and camera pose.
   */
  flyTo({ lat, lon, alt = 2500000.0, heading = 0.0, pitch = -70.0, roll = 0.0, duration = 1.8 }) {
    if (!this.viewer || this.viewer.isDestroyed?.()) return false;

    const { currentGen, flightTag } = this._startStampedFlight('fly-to');

    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
      orientation: {
        heading: Cesium.Math.toRadians(heading),
        pitch: Cesium.Math.toRadians(pitch),
        roll: Cesium.Math.toRadians(roll),
      },
      duration,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
      complete: () => this._finishStampedFlight(currentGen, flightTag),
      cancel: () => this._finishStampedFlight(currentGen, flightTag),
    });

    return true;
  }

  /**
   * Sets scientific view mode (ORBITAL, OBLIQUE_3D, SURFACE_GLANCE, RESET).
   */
  setPerspective(presetKey = 'RESET', durationSec = 1.5) {
    const mode = SCIENTIFIC_VIEW_MODES[presetKey] || SCIENTIFIC_VIEW_MODES.RESET;
    this.activePerspective = mode.id;

    if (!this.viewer || this.viewer.isDestroyed?.()) return false;

    const camera = this.viewer.camera;
    const carto = camera.positionCartographic;
    if (!carto) return false;

    const targetHeight = Math.max(100000.0, carto.height * mode.altFactor);
    const destination = Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, targetHeight);

    const { currentGen, flightTag } = this._startStampedFlight('set-perspective');

    this.viewer.camera.flyTo({
      destination,
      orientation: {
        heading: Cesium.Math.toRadians(mode.headingDeg),
        pitch: Cesium.Math.toRadians(mode.pitchDeg),
        roll: 0.0,
      },
      duration: durationSec,
      easingFunction: Cesium.EasingFunction.QUADRATIC_OUT,
      complete: () => this._finishStampedFlight(currentGen, flightTag),
      cancel: () => this._finishStampedFlight(currentGen, flightTag),
    });

    return true;
  }

  /**
   * Focuses and frames an Argo float, glider, or CTD profile cast.
   */
  focusProfile(profile, durationSec = 2.0) {
    if (!profile?.location) return false;
    const { lat, lon } = profile.location;
    if (typeof lat !== 'number' || typeof lon !== 'number') return false;

    if (!this.viewer || this.viewer.isDestroyed?.()) return false;

    spiralIn(this.viewer, lat, lon, 450000.0, durationSec);
    return true;
  }

  /**
   * Frames a vertical section transect line.
   */
  frameTransect(transect, durationSec = 2.0) {
    if (!transect?.start || !transect?.end) return false;
    if (typeof transect.start.lat !== 'number' || typeof transect.end.lat !== 'number') return false;

    const midLat = (transect.start.lat + transect.end.lat) / 2;
    const midLon = (transect.start.lon + transect.end.lon) / 2;

    return this.flyTo({
      lat: midLat,
      lon: midLon,
      alt: 1200000.0,
      heading: 25.0,
      pitch: -45.0, // 3D oblique tilt to reveal the vertical curtain
      duration: durationSec,
    });
  }

  /**
   * Bounded zoom in/out action.
   */
  zoom(factor = 0.65, durationSec = 0.4) {
    if (!this.viewer) return;
    this.cancelFlight();
    zoomCamera(this.viewer, factor, durationSec);
  }

  /**
   * Bounded tilt pitch adjustment.
   */
  tilt(deltaDeg = 15, durationSec = 0.4) {
    if (!this.viewer) return;
    this.cancelFlight();
    nudgePitch(this.viewer, deltaDeg, durationSec);
  }

  /**
   * Bounded azimuth rotation adjustment.
   */
  rotate(deltaDeg = 30, durationSec = 0.4) {
    if (!this.viewer) return;
    this.cancelFlight();
    nudgeHeading(this.viewer, deltaDeg, durationSec);
  }

  /**
   * Snaps camera azimuth to True North (0°).
   */
  resetNorth(durationSec = 0.6) {
    if (!this.viewer) return;
    this.cancelFlight();
    resetNorth(this.viewer, durationSec);
  }
}

export const globalCameraController = new CentralizedCameraController();
