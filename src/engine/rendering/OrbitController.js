/**
 * OceanView — Cinematic 3D Orbit Controller
 * Adapted from God's Eye View orbit system.
 * Rotates the camera smoothly around a focal ocean point with frame-independent rate and render governor holds.
 */

import * as Cesium from 'cesium';
import { holdContinuousRender, releaseContinuousRender } from './renderGovernor.js';

export class OrbitController {
  constructor(viewer) {
    this.viewer = viewer;
    this.active = false;
    this.target = null;
    this.radius = 4000000; // 4000 km default orbital distance
    this.pitch = -45; // 45° perspective tilt
    this.speed = Cesium.Math.toRadians(4.5); // ~4.5 deg/sec -> full rotation in 80s
    this.angle = 0;
    this._removeListener = null;
  }

  /**
   * Starts smooth orbit around a Cartesian3 target point.
   */
  start(targetCartesian, options = {}) {
    if (!this.viewer || this.viewer.isDestroyed?.()) return;

    if (this.active) {
      this.stop();
    }

    // Default target: Arabian Sea center if none provided
    this.target = targetCartesian || Cesium.Cartesian3.fromDegrees(66.0, 14.0, 0.0);
    this.radius = options.radius || this.radius;
    this.pitch = options.pitch || this.pitch;
    this.speed = Cesium.Math.toRadians(options.speed || 4.5);
    this.active = true;

    holdContinuousRender('camera-orbit');

    this.angle = this.viewer.camera.heading;

    let lastTime = performance.now();
    this._removeListener = this.viewer.scene.preRender.addEventListener(() => {
      if (!this.active || !this.viewer || this.viewer.isDestroyed?.()) return;

      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      this.angle += this.speed * dt;

      const hpr = new Cesium.HeadingPitchRange(
        this.angle,
        Cesium.Math.toRadians(this.pitch),
        this.radius
      );
      this.viewer.camera.lookAt(this.target, hpr);
    });
  }

  /**
   * Stops orbiting and restores free camera control.
   */
  stop() {
    if (!this.active && !this._removeListener) return;

    this.active = false;
    releaseContinuousRender('camera-orbit');
    if (this._removeListener) {
      try {
        this._removeListener();
      } catch (_e) {
        // Ignored
      }
      this._removeListener = null;
    }
    if (this.viewer && !this.viewer.isDestroyed?.()) {
      try {
        this.viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
      } catch (_e) {
        // Ignored
      }
    }
  }

  toggle(targetCartesian, options) {
    if (this.active) {
      this.stop();
    } else {
      this.start(targetCartesian, options);
    }
    return this.active;
  }

  destroy() {
    this.stop();
    this.viewer = null;
    this.target = null;
  }
}
