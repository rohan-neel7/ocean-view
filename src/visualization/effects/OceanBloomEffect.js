/**
 * OceanView — HDR Bloom & Glow Post-Processing Effect
 * Inspired by God's Eye View bloom pipeline.
 * Bloom is OFF by default to preserve maximum scientific clarity, sharpness, and neutral exposure.
 */

import { governorRequestRender } from '../../engine/rendering/renderGovernor.js';

export class OceanBloomEffect {
  constructor(viewer) {
    this.viewer = viewer;
    this.enabled = false; // SCIENTIFIC BASELINE: Bloom OFF by default to prevent washed-out overexposure
    this.intensity = 80;

    this.applyBloom();
  }

  applyBloom() {
    if (!this.viewer || this.viewer.isDestroyed?.()) return;

    try {
      const bloom = this.viewer.scene.postProcessStages?.bloom;
      if (bloom) {
        bloom.enabled = this.enabled;
        bloom.uniforms.glowOnly = false;
        bloom.uniforms.contrast = 105.0;
        bloom.uniforms.brightness = -0.05;
        bloom.uniforms.delta = 1.0;
        bloom.uniforms.sigma = 2.0;
        bloom.uniforms.stepSize = 1.0;
      }
      governorRequestRender();
    } catch (err) {
      console.warn('[OceanBloomEffect] Bloom not supported on this WebGL context:', err);
    }
  }

  setIntensity(val) {
    this.intensity = Math.max(0, Math.min(200, Number(val) || 0));
    if (this.viewer && !this.viewer.isDestroyed?.()) {
      const bloom = this.viewer.scene.postProcessStages?.bloom;
      if (bloom) {
        bloom.enabled = this.intensity > 0 && this.enabled;
        bloom.uniforms.contrast = 100.0 + (this.intensity / 200) * 30.0;
      }
      governorRequestRender();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    this.applyBloom();
    return this.enabled;
  }
}
