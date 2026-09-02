/**
 * OceanView — High-Performance Particle Current Flow Visualization Layer
 * Simulates and renders particle advection following 2D/3D (u, v) ocean velocity fields.
 *
 * CRITICAL FIX (Phase 7.6):
 *   Previous implementation used SingleTileImageryProvider (tied to globe.show).
 *   Canvas texture never updated after initial frame because toDataURL() is a snapshot.
 *   This rewrite uses Entity + RectangleGraphics with a CallbackProperty that
 *   returns the canvas on every frame, producing live animated particles.
 *
 * Invariants:
 *   - Particles advect according to oceanographic velocity vectors
 *   - Continuous render loop held strictly while animating; released on pause
 *   - Bounded particle budgets: HIGH (8k), MEDIUM (4k), LOW (1.5k)
 *   - Land-masked and out-of-bounds particles cleanly respawn
 *   - Trails color-coded by cmocean 'speed' palette
 */

import * as Cesium from 'cesium';
import { sampleColormapRgb } from '../color/scientificColorMaps.js';
import { sampleVectorFieldBilinear } from '../../engine/ocean/currentMetrics.js';
import {
  holdContinuousRender,
  releaseContinuousRender,
  governorRequestRender,
} from '../../engine/rendering/renderGovernor.js';

export const ParticleBudgetTiers = Object.freeze({
  HIGH: 8000,
  MEDIUM: 4000,
  LOW: 1500,
});

export class ParticleCurrentLayer {
  constructor(viewer) {
    this.viewer = viewer;
    this.entity = null;
    this.activeGrid = null;
    this.activeDepthIdx = 0;

    // Simulation State
    this.particles = null; // Float32Array: [lon, lat, age, maxAge, speed]
    this.particleCount = ParticleBudgetTiers.MEDIUM;
    this.flowSpeed = 1.0;
    this.trailLength = 0.94; // Trail fade factor (0.80 - 0.98)
    this.isRunning = false;
    this.animationFrameId = null;

    // Offscreen rendering canvas & texture
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024;
    this.canvas.height = 512;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

    // Tracking
    this._rectangle = null;
  }

  /**
   * Initializes particle advection with a CanonicalGridVector.
   *
   * @param {object} gridVector - CanonicalGridVector
   * @param {object} [options]
   * @param {number} [options.particleCount=4000]
   * @param {number} [options.flowSpeed=1.0]
   * @param {number} [options.depthMeters=0]
   */
  start(gridVector, options = {}) {
    if (!this.viewer || this.viewer.isDestroyed?.()) return;

    this.stop();
    if (!gridVector || !gridVector.uData || !gridVector.vData) return;

    this.activeGrid = gridVector;
    this.particleCount = options.particleCount || this.particleCount || ParticleBudgetTiers.MEDIUM;
    this.flowSpeed = options.flowSpeed || 1.0;

    // Set depth level
    const depthMeters = options.depthMeters || 0;
    const depths = gridVector.coordinates.depths;
    let depthIdx = 0;
    if (depths && depths.length > 1) {
      let minDiff = Infinity;
      for (let d = 0; d < depths.length; d++) {
        const diff = Math.abs(depths[d] - depthMeters);
        if (diff < minDiff) {
          minDiff = diff;
          depthIdx = d;
        }
      }
    }
    this.activeDepthIdx = depthIdx;

    // Initialize particles array: 5 floats per particle (lon, lat, age, maxAge, speed)
    this.particles = new Float32Array(this.particleCount * 5);
    const bbox = gridVector.coordinates.bbox;

    for (let i = 0; i < this.particleCount; i++) {
      this.respawnParticle(i, bbox);
    }

    // Clear Canvas to transparent black
    this.ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Setup Cesium Entity with RectangleGraphics using the live canvas as material
    this._rectangle = Cesium.Rectangle.fromDegrees(bbox.minLon, bbox.minLat, bbox.maxLon, bbox.maxLat);

    // Store reference to self for the CallbackProperty closure
    const self = this;

    this.entity = this.viewer.entities.add({
      rectangle: {
        coordinates: this._rectangle,
        material: new Cesium.ImageMaterialProperty({
          image: new Cesium.CallbackProperty(() => {
            // Return the live canvas on every frame — Cesium will re-read it
            return self.canvas;
          }, false),
          transparent: true,
        }),
        height: 100.0, // Slightly above surface to clear terrain/tiles
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });

    this.isRunning = true;
    holdContinuousRender('particleAnimation');

    this.tick();
  }

  /**
   * Respawns particle index i randomly within valid grid coordinates.
   */
  respawnParticle(idx, bbox) {
    const offset = idx * 5;
    const lon = bbox.minLon + Math.random() * (bbox.maxLon - bbox.minLon);
    const lat = bbox.minLat + Math.random() * (bbox.maxLat - bbox.minLat);
    const maxAge = 40 + Math.floor(Math.random() * 60);

    this.particles[offset] = lon;
    this.particles[offset + 1] = lat;
    this.particles[offset + 2] = Math.floor(Math.random() * maxAge); // Stagger initial ages
    this.particles[offset + 3] = maxAge;
    this.particles[offset + 4] = 0.0; // Initial speed
  }

  /**
   * Simulation step: Advects particles, renders trails, and triggers Cesium re-render.
   */
  tick() {
    if (!this.isRunning || !this.activeGrid) return;

    const bbox = this.activeGrid.coordinates.bbox;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const dLonSpan = Math.max(0.1, bbox.maxLon - bbox.minLon);
    const dLatSpan = Math.max(0.1, bbox.maxLat - bbox.minLat);

    // 1. Trail Fading: Semi-transparent black overlay
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.fillStyle = `rgba(0, 0, 0, ${1.0 - this.trailLength})`;
    this.ctx.fillRect(0, 0, width, height);

    // 2. Advect and draw particles
    const dt = 0.08 * this.flowSpeed;

    for (let i = 0; i < this.particleCount; i++) {
      const offset = i * 5;
      let lon = this.particles[offset];
      let lat = this.particles[offset + 1];
      let age = this.particles[offset + 2];
      const maxAge = this.particles[offset + 3];

      // Sample vector field
      const vec = sampleVectorFieldBilinear(this.activeGrid, lat, lon, this.activeDepthIdx);

      if (!vec || isNaN(vec.u) || isNaN(vec.v) || age >= maxAge) {
        this.respawnParticle(i, bbox);
        continue;
      }

      // Convert coordinate to canvas pixel
      const px0 = ((lon - bbox.minLon) / dLonSpan) * width;
      const py0 = ((bbox.maxLat - lat) / dLatSpan) * height;

      // Advect coordinates
      const cosLat = Math.max(0.2, Math.cos((lat * Math.PI) / 180.0));
      const nextLon = lon + ((vec.u * dt) / cosLat);
      const nextLat = lat + (vec.v * dt);

      const px1 = ((nextLon - bbox.minLon) / dLonSpan) * width;
      const py1 = ((bbox.maxLat - nextLat) / dLatSpan) * height;

      // Draw particle line segment with interpolated color
      const normSpeed = Math.min(1.0, vec.speed / 1.0);
      const [cr, cg, cb] = sampleColormapRgb('SPEED', normSpeed);

      this.ctx.beginPath();
      this.ctx.moveTo(px0, py0);
      this.ctx.lineTo(px1, py1);
      this.ctx.strokeStyle = `rgb(${cr},${cg},${cb})`;
      this.ctx.lineWidth = 1.6;
      this.ctx.stroke();

      // Update particle state
      this.particles[offset] = nextLon;
      this.particles[offset + 1] = nextLat;
      this.particles[offset + 2] = age + 1;
      this.particles[offset + 4] = vec.speed;
    }

    // Request Cesium to re-render the scene (the CallbackProperty will return the updated canvas)
    governorRequestRender();

    this.animationFrameId = requestAnimationFrame(() => this.tick());
  }

  setParticleBudget(tierKey = 'MEDIUM') {
    const budget = ParticleBudgetTiers[tierKey] || ParticleBudgetTiers.MEDIUM;
    this.particleCount = budget;
    if (this.activeGrid) {
      this.start(this.activeGrid, { particleCount: budget, flowSpeed: this.flowSpeed });
    }
  }

  setFlowSpeed(val) {
    this.flowSpeed = Math.max(0.1, Math.min(5.0, val));
  }

  /**
   * Returns diagnostic state for the debug overlay.
   */
  getDebugState() {
    return {
      layerId: 'PARTICLE_FLOW',
      enabled: this.isRunning,
      hasData: !!this.activeGrid,
      particleCount: this.particleCount,
      flowSpeed: this.flowSpeed,
      depthIdx: this.activeDepthIdx,
      entityCreated: !!this.entity,
    };
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.entity && this.viewer && !this.viewer.isDestroyed?.()) {
      this.viewer.entities.remove(this.entity);
      this.entity = null;
    }

    releaseContinuousRender('particleAnimation');
    governorRequestRender();
  }
}
