/**
 * OceanView — High-Performance Particle Current Flow Visualization Layer
 * Simulates and renders particle advection following 2D/3D (u, v) ocean velocity fields.
 *
 * Invariants:
 *   - Particles advect according to oceanographic velocity vectors
 *   - Continuous render loop held strictly while animating; released on pause
 *   - Single 2D canvas created in constructor and reused; never created per frame
 *   - Bounded particle budgets: HIGH (8k), MEDIUM (4k), LOW (1.5k)
 *   - Land-masked and out-of-bounds particles cleanly respawn
 *   - Trails color-coded by cmocean 'speed' palette
 *   - Pristine transparent background (destination-out trail decay, no black background)
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
    this.trailLength = 0.94; // Trail fade factor
    this.isRunning = false;
    this.animationFrameId = null;

    // Offscreen rendering canvas & texture (allocated once and reused)
    if (typeof document !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 1024;
      this.canvas.height = 512;
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    } else {
      this.canvas = { width: 1024, height: 512 };
      this.ctx = {
        fillStyle: '',
        globalCompositeOperation: 'source-over',
        fillRect() {},
        clearRect() {},
        beginPath() {},
        moveTo() {},
        lineTo() {},
        stroke() {},
      };
    }

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

    // Clear Canvas to 100% transparent
    if (this.ctx.clearRect) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Setup Cesium Entity with RectangleGraphics using the live canvas as material
    this._rectangle = Cesium.Rectangle.fromDegrees(bbox.minLon, bbox.minLat, bbox.maxLon, bbox.maxLat);

    // Render height: 5m micro-offset for surface, otherwise true negative depth
    const renderHeight = depthMeters <= 5 ? 5.0 : -depthMeters;

    this.entity = this.viewer.entities.add({
      rectangle: {
        coordinates: this._rectangle,
        material: new Cesium.ImageMaterialProperty({
          image: new Cesium.CallbackProperty(() => {
            return this.canvas;
          }, false),
          transparent: true,
        }),
        height: renderHeight,
        disableDepthTestDistance: Number.POSITIVE_INFINITY, // Ensure particle visibility above basemap
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

    // Fade existing particle trails to transparent using destination-out
    if (this.ctx.globalCompositeOperation !== undefined) {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      this.ctx.fillRect(0, 0, width, height);
      this.ctx.globalCompositeOperation = 'source-over';
    }

    const dt = 0.08 * this.flowSpeed;

    for (let i = 0; i < this.particleCount; i++) {
      const offset = i * 5;
      const lon = this.particles[offset];
      const lat = this.particles[offset + 1];
      const age = this.particles[offset + 2];
      const maxAge = this.particles[offset + 3];

      // Sample velocity vector at current particle geographic location
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
      this.ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.92)`;
      this.ctx.lineWidth = 1.8;
      this.ctx.stroke();

      // Update particle state
      this.particles[offset] = nextLon;
      this.particles[offset + 1] = nextLat;
      this.particles[offset + 2] = age + 1;
      this.particles[offset + 4] = vec.speed;
    }

    // Request Cesium to re-render the scene (the CallbackProperty will return the updated canvas)
    governorRequestRender();

    if (typeof requestAnimationFrame !== 'undefined') {
      this.animationFrameId = requestAnimationFrame(() => this.tick());
    }
  }

  setParticleBudget(tierKey = 'MEDIUM') {
    const budget = ParticleBudgetTiers[tierKey] || ParticleBudgetTiers.MEDIUM;
    this.particleCount = budget;
    if (this.activeGrid) {
      this.start(this.activeGrid, { particleCount: budget, flowSpeed: this.flowSpeed, depthMeters: this.activeGrid.coordinates.depths?.[this.activeDepthIdx] });
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
      layerId: 'PARTICLE FLOW',
      enabled: this.isRunning,
      hasData: !!this.activeGrid,
      particleCount: this.particleCount,
      flowSpeed: this.flowSpeed,
      depth: this.activeGrid?.coordinates?.depths?.[this.activeDepthIdx] ?? 5,
      depthIdx: this.activeDepthIdx,
      entityCreated: !!this.entity,
      renderer: this.isRunning ? 'ANIMATING' : 'STOPPED',
    };
  }

  stop() {
    const wasRunning = this.isRunning;
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.entity && this.viewer && !this.viewer.isDestroyed?.()) {
      try {
        this.viewer.entities.remove(this.entity);
      } catch (_e) {
        // Ignored
      }
      this.entity = null;
    }

    if (wasRunning) {
      releaseContinuousRender('particleAnimation');
    }
    governorRequestRender();
  }

  destroy() {
    this.stop();
    this.particles = null;
    this.activeGrid = null;
    this.viewer = null;
  }
}
