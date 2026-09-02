/**
 * OceanView — Scientific Color Scale Manager
 * Manages dynamic colormap ranges, linear/logarithmic normalization, opacity, and reversal.
 */

import { COLORMAP_PRESETS } from './scientificColorMaps.js';
import { getVariableMetadata } from '../../engine/ocean/VariableRegistry.js';

function hexToRgb(hex) {
  const cleanHex = hex.replace('#', '');
  const num = parseInt(cleanHex, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export class ColorScaleManager {
  constructor({
    variableId = 'sea_surface_temperature',
    colormapId = 'THERMAL',
    min = null,
    max = null,
    scaleType = 'linear',
    reversed = false,
    opacity = 0.85,
  } = {}) {
    this.variableId = variableId;
    this.colormapId = colormapId.toUpperCase();
    this.scaleType = scaleType; // 'linear' | 'log'
    this.reversed = reversed;
    this.opacity = Math.max(0.05, Math.min(1.0, opacity));

    const meta = getVariableMetadata(variableId);
    this.unit = meta.unit || '°C';
    this.defaultMin = meta.defaultRange ? meta.defaultRange[0] : 0.0;
    this.defaultMax = meta.defaultRange ? meta.defaultRange[1] : 100.0;

    this.min = min !== null && Number.isFinite(min) ? min : this.defaultMin;
    this.max = max !== null && Number.isFinite(max) ? max : this.defaultMax;

    if (this.scaleType === 'log') {
      // Validate physical non-negativity for logarithmic scaling
      if (this.min <= 0) this.min = 0.01;
      if (this.max <= this.min) this.max = this.min * 10;
    }
  }

  setRange(minVal, maxVal) {
    if (!Number.isFinite(minVal) || !Number.isFinite(maxVal)) return;
    if (minVal >= maxVal) return;

    if (this.scaleType === 'log') {
      if (minVal <= 0) minVal = 0.01;
      if (maxVal <= minVal) maxVal = minVal * 10;
    }

    this.min = minVal;
    this.max = maxVal;
  }

  setScaleType(type) {
    if (type === 'log') {
      this.scaleType = 'log';
      if (this.min <= 0) this.min = 0.01;
      if (this.max <= this.min) this.max = this.min * 10;
    } else {
      this.scaleType = 'linear';
    }
  }

  setOpacity(op) {
    this.opacity = Math.max(0.05, Math.min(1.0, Number(op) || 0.85));
  }

  toggleReversed() {
    this.reversed = !this.reversed;
  }

  isManuallyOverridden() {
    return Math.abs(this.min - this.defaultMin) > 0.01 || Math.abs(this.max - this.defaultMax) > 0.01;
  }

  /**
   * Normalizes a physical scalar value into a [0.0, 1.0] colormap index.
   * @param {number|null} val
   * @returns {number|null} Normalized value or null if fill/missing
   */
  normalize(val) {
    if (val === null || val === undefined || !Number.isFinite(val)) return null;

    let norm;
    if (this.scaleType === 'log') {
      if (val <= 0) return 0.0;
      const logMin = Math.log10(this.min);
      const logMax = Math.log10(this.max);
      const logVal = Math.log10(val);
      norm = (logVal - logMin) / (logMax - logMin);
    } else {
      norm = (val - this.min) / (this.max - this.min);
    }

    const clamped = Math.max(0.0, Math.min(1.0, norm));
    return this.reversed ? 1.0 - clamped : clamped;
  }

  /**
   * Samples RGBA color bytes [r, g, b, a] for a physical value.
   */
  sampleColor(val) {
    const norm = this.normalize(val);
    if (norm === null) return [0, 0, 0, 0]; // Missing values are 100% transparent

    const preset = COLORMAP_PRESETS[this.colormapId] || COLORMAP_PRESETS.THERMAL;
    const colors = preset.colors;
    const idx = norm * (colors.length - 1);
    const low = Math.floor(idx);
    const high = Math.min(colors.length - 1, low + 1);
    const frac = idx - low;

    const c1 = hexToRgb(colors[low]);
    const c2 = hexToRgb(colors[high]);

    const r = Math.round(c1[0] + (c2[0] - c1[0]) * frac);
    const g = Math.round(c1[1] + (c2[1] - c1[1]) * frac);
    const b = Math.round(c1[2] + (c2[2] - c1[2]) * frac);
    const a = Math.round(255 * this.opacity);

    return [r, g, b, a];
  }
}
