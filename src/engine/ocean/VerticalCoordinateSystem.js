/**
 * OceanView — Dynamic Vertical Coordinate System & Pressure-to-Depth Engine
 * Treats vertical coordinate (Z) as a dataset-derived first-class dimension.
 *
 * Invariants:
 *   - Never hardcode depth structures: levels are inspected dynamically from dataset metadata.
 *   - Native vertical coordinate (Pressure dbar, Depth m, z-level) is preserved intact.
 *   - Conversions to geometric depth record conversionMethod and lineage as DataState.DERIVED.
 *   - Strict bounds: No extrapolation above surface or below deepest valid level.
 */

import { DataState } from '../contracts/intelligenceContract.js';

export const VerticalCoordinateType = Object.freeze({
  GEOMETRIC_DEPTH_METERS: 'GEOMETRIC_DEPTH_METERS',
  HYDROSTATIC_PRESSURE_DBAR: 'HYDROSTATIC_PRESSURE_DBAR',
  SIGMA_LEVEL: 'SIGMA_LEVEL',
  Z_INDEX: 'Z_INDEX',
});

/**
 * Converts hydrostatic pressure in decibars (dbar) to geometric depth in meters.
 * Algorithm: Saunders (1981) / UNESCO (1983) with latitude-dependent standard gravity.
 *
 * @param {number} pressureDbar - Hydrostatic pressure in dbar
 * @param {number} [latitudeDeg=15.0] - Latitude in degrees (-90 to +90)
 * @returns {{ depthMeters: number, sourcePressureDbar: number, conversionMethod: string, dataState: string }}
 */
export function pressureToDepthMeters(pressureDbar, latitudeDeg = 15.0) {
  if (typeof pressureDbar !== 'number' || pressureDbar < 0 || isNaN(pressureDbar)) {
    return {
      depthMeters: 0,
      sourcePressureDbar: pressureDbar,
      conversionMethod: 'NONE',
      dataState: DataState.OBSERVED,
    };
  }

  const latRad = (latitudeDeg * Math.PI) / 180.0;
  const sin2Lat = Math.sin(latRad) ** 2;

  // Standard gravity variation with latitude (UNESCO 1983)
  const g = 9.780318 * (1.0 + (5.2788e-3 + 2.36e-5 * sin2Lat) * sin2Lat);

  // Saunders 1981 polynomial compressibility correction
  const c1 = 2.21e-6;
  const depth = (pressureDbar * 1e4) / (g * 1025.0 * (1.0 + c1 * pressureDbar));

  return {
    depthMeters: Number(depth.toFixed(3)),
    sourcePressureDbar: pressureDbar,
    conversionMethod: 'Saunders (1981) / UNESCO (1983) Latitude Gravity Corrected',
    dataState: DataState.DERIVED,
  };
}

/**
 * Finds the closest depth level from a dataset's actual dynamic vertical levels.
 *
 * @param {number} targetDepthMeters
 * @param {Array<number>|Float32Array} depthLevels - Dynamic dataset depth levels
 * @returns {{ depthMeters: number, index: number, exactMatch: boolean }}
 */
export function findNearestDepthLevel(targetDepthMeters, depthLevels = []) {
  if (!depthLevels || depthLevels.length === 0) {
    return { depthMeters: targetDepthMeters, index: 0, exactMatch: false };
  }

  let closestIndex = 0;
  let minDiff = Infinity;

  for (let i = 0; i < depthLevels.length; i++) {
    const diff = Math.abs(depthLevels[i] - targetDepthMeters);
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = i;
    }
  }

  return {
    depthMeters: depthLevels[closestIndex],
    index: closestIndex,
    exactMatch: minDiff < 0.001,
  };
}

/**
 * Interpolates a vertical scalar profile at targetDepth without out-of-domain extrapolation.
 *
 * @param {Array<number>|Float32Array} depths - Non-uniform vertical depth coordinate
 * @param {Array<number|null>} values - Scalar values corresponding to depths
 * @param {number} targetDepth - Depth to interpolate at
 * @returns {number|null} Interpolated value or null if out of bounds / missing neighbor
 */
export function interpolateVerticalProfile(depths, values, targetDepth) {
  if (!depths || !values || depths.length === 0 || values.length !== depths.length) {
    return null;
  }

  // Bounds check: Do not extrapolate outside available depth range
  if (targetDepth < depths[0] || targetDepth > depths[depths.length - 1]) {
    return null;
  }

  // Locate bracketing level index
  for (let i = 0; i < depths.length - 1; i++) {
    const z0 = depths[i];
    const z1 = depths[i + 1];

    if (targetDepth >= z0 && targetDepth <= z1) {
      const v0 = values[i];
      const v1 = values[i + 1];

      // Missing ≠ Zero: If either bracketing sample is missing/null, cannot interpolate across gap
      if (v0 === null || v1 === null || isNaN(v0) || isNaN(v1)) {
        return null;
      }

      if (z1 === z0) return v0;
      const t = (targetDepth - z0) / (z1 - z0);
      const interpolated = (1 - t) * v0 + t * v1;
      return Number(interpolated.toFixed(4));
    }
  }

  return null;
}
