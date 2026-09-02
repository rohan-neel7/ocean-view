/**
 * OceanView — Temporal Interpolation & Time-Step Engine
 * Handles discrete model time-stepping and continuous temporal interpolation.
 */

import { createCanonicalGridScalar } from '../ocean/CanonicalGridScalar.js';

/**
 * Finds the two bracketing time-steps around a target time from an ordered timestamp array.
 *
 * @param {Array<string>} timestamps - Sorted ISO timestamp strings
 * @param {string|number|Date} targetTime
 * @returns {{ t0: string|null, t1: string|null, alpha: number, exact: boolean }}
 */
export function findBracketingTimeSteps(timestamps = [], targetTime) {
  if (!Array.isArray(timestamps) || timestamps.length === 0) {
    return { t0: null, t1: null, alpha: 0, exact: false };
  }

  const targetEpoch = new Date(targetTime).getTime();
  if (isNaN(targetEpoch)) {
    return { t0: timestamps[0], t1: timestamps[0], alpha: 0, exact: true };
  }

  const epochs = timestamps.map((t) => new Date(t).getTime());

  // If before first timestamp
  if (targetEpoch <= epochs[0]) {
    return { t0: timestamps[0], t1: timestamps[0], alpha: 0, exact: true };
  }

  // If after last timestamp
  if (targetEpoch >= epochs[epochs.length - 1]) {
    const last = timestamps[timestamps.length - 1];
    return { t0: last, t1: last, alpha: 0, exact: true };
  }

  // Find bracketing pair
  for (let i = 0; i < epochs.length - 1; i++) {
    if (targetEpoch >= epochs[i] && targetEpoch <= epochs[i + 1]) {
      const span = epochs[i + 1] - epochs[i];
      const alpha = span > 0 ? (targetEpoch - epochs[i]) / span : 0;
      return {
        t0: timestamps[i],
        t1: timestamps[i + 1],
        alpha: Number(alpha.toFixed(4)),
        exact: alpha === 0 || alpha === 1,
      };
    }
  }

  return { t0: timestamps[0], t1: timestamps[0], alpha: 0, exact: true };
}

/**
 * Interpolates two CanonicalGridScalar fields linearly in time.
 *
 * @param {object} grid0 - CanonicalGridScalar at T0
 * @param {object} grid1 - CanonicalGridScalar at T1
 * @param {string|number|Date} targetTime
 * @returns {object} Interpolated CanonicalGridScalar
 */
export function interpolateGridInTime(grid0, grid1, targetTime) {
  if (!grid0 || !grid1) return grid0 || grid1 || null;
  if (grid0.variable !== grid1.variable) {
    throw new Error('Cannot temporally interpolate grids with different physical variables');
  }

  const t0Epoch = new Date(grid0.timestamp).getTime();
  const t1Epoch = new Date(grid1.timestamp).getTime();
  const targetEpoch = new Date(targetTime).getTime();

  let alpha = 0;
  if (t1Epoch > t0Epoch) {
    alpha = Math.max(0.0, Math.min(1.0, (targetEpoch - t0Epoch) / (t1Epoch - t0Epoch)));
  }

  const len = grid0.data.length;
  const outBuffer = new Float32Array(len);
  const fill = grid0.fillValue;

  for (let i = 0; i < len; i++) {
    const v0 = grid0.data[i];
    const v1 = grid1.data[i];
    if (v0 === fill || v1 === fill || isNaN(v0) || isNaN(v1)) {
      outBuffer[i] = fill;
    } else {
      outBuffer[i] = (1.0 - alpha) * v0 + alpha * v1;
    }
  }

  return createCanonicalGridScalar({
    id: `${grid0.variable}:interp:${new Date(targetEpoch).toISOString()}`,
    source: grid0.source,
    variable: grid0.variable,
    unit: grid0.unit,
    timestamp: new Date(targetEpoch).toISOString(),
    dimensions: { ...grid0.dimensions },
    latitudes: grid0.coordinates.latitudes,
    longitudes: grid0.coordinates.longitudes,
    depths: grid0.coordinates.depths,
    data: outBuffer,
    fillValue: fill,
  });
}
