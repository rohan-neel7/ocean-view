/**
 * OceanView — Derived Subsurface Ocean Physics Engine
 * Evaluates equation-of-state quantities (Density, Sigma-t, Mixed Layer Depth, Sound Speed).
 *
 * Invariants:
 *   - All derived quantities are stamped DataState.DERIVED with explicit equation/criterion lineage.
 *   - Missing ≠ Zero: If required inputs (e.g. salinity or temperature) are missing, return null.
 */

import { DataState } from '../contracts/intelligenceContract.js';

/**
 * Calculates surface seawater potential density (Sigma-t) in kg/m³ (UNESCO 1983).
 *
 * @param {number} salinity - Practical salinity (PSU)
 * @param {number} temperature - In-situ temperature (°C)
 * @returns {{ sigmaT: number|null, unit: string, dataState: string, formula: string }}
 */
export function calculateSigmaT(salinity, temperature) {
  if (
    salinity === null ||
    temperature === null ||
    typeof salinity !== 'number' ||
    typeof temperature !== 'number' ||
    isNaN(salinity) ||
    isNaN(temperature)
  ) {
    return { sigmaT: null, unit: 'kg/m³', dataState: DataState.DERIVED, formula: 'UNESCO 1983 1-ATM EOS' };
  }

  const T = temperature;
  const S = salinity;

  // Pure water density at atmospheric pressure (SMOW)
  const rhow =
    999.842594 +
    6.793952e-2 * T -
    9.09529e-3 * T * T +
    1.001685e-4 * T * T * T -
    1.120083e-6 * T * T * T * T +
    6.536332e-9 * T * T * T * T * T;

  // Salinity terms (UNESCO 1983)
  const A = 8.24493e-1 - 4.0899e-3 * T + 7.6438e-5 * T * T - 8.2467e-7 * T * T * T + 5.3875e-9 * T * T * T * T;
  const B = -5.72466e-3 + 1.0227e-4 * T - 1.6546e-6 * T * T;
  const C = 4.8314e-4;

  const rho = rhow + A * S + B * Math.pow(S, 1.5) + C * S * S;
  const sigmaT = rho - 1000.0;

  return {
    sigmaT: Number(sigmaT.toFixed(3)),
    densityKgM3: Number(rho.toFixed(3)),
    unit: 'kg/m³',
    dataState: DataState.DERIVED,
    formula: 'UNESCO (1983) / Millero & Poisson Seawater 1-ATM Density',
  };
}

/**
 * Calculates Mixed Layer Depth (MLD) in meters from a vertical temperature profile.
 * Criterion: Temperature threshold criterion (de Boyer Montégut et al., 2004: |T(z) - T_ref| >= 0.2°C from 10m reference depth).
 *
 * @param {Array<number>} depths - Array of depth values in meters
 * @param {Array<number|null>} temperatures - Array of temperature values in °C
 * @param {object} [options]
 * @param {number} [options.refDepthMeters=10.0] - Reference depth
 * @param {number} [options.tempThresholdDegC=0.2] - Temperature threshold
 * @returns {{ mldMeters: number|null, criterion: string, refDepthMeters: number, dataState: string }}
 */
export function calculateMixedLayerDepth(depths, temperatures, options = {}) {
  if (!depths || !temperatures || depths.length === 0 || depths.length !== temperatures.length) {
    return { mldMeters: null, criterion: 'Unavailable', refDepthMeters: 10, dataState: DataState.DERIVED };
  }

  const refDepth = options.refDepthMeters ?? 10.0;
  const threshold = options.tempThresholdDegC ?? 0.2;

  // Find reference temperature at refDepth (closest level)
  let refIdx = 0;
  let minDiff = Infinity;
  for (let i = 0; i < depths.length; i++) {
    const diff = Math.abs(depths[i] - refDepth);
    if (diff < minDiff && temperatures[i] !== null && !isNaN(temperatures[i])) {
      minDiff = diff;
      refIdx = i;
    }
  }

  const tRef = temperatures[refIdx];
  if (tRef === null || isNaN(tRef)) {
    return { mldMeters: null, criterion: 'No valid near-surface reference', refDepthMeters: refDepth, dataState: DataState.DERIVED };
  }

  // Scan downward from reference level
  for (let i = refIdx + 1; i < depths.length; i++) {
    const t = temperatures[i];
    if (t === null || isNaN(t)) continue;

    if (Math.abs(t - tRef) >= threshold) {
      // Linear interpolation to precise threshold depth
      const z0 = depths[i - 1];
      const z1 = depths[i];
      const t0 = temperatures[i - 1];
      const t1 = t;

      const frac = Math.abs(t1 - t0) > 1e-4 ? (threshold - Math.abs(t0 - tRef)) / Math.abs(t1 - t0) : 0;
      const mld = z0 + frac * (z1 - z0);

      return {
        mldMeters: Number(mld.toFixed(1)),
        criterion: `de Boyer Montégut et al. (2004): ΔT = ${threshold}°C relative to ${depths[refIdx]}m depth`,
        refDepthMeters: depths[refIdx],
        tRefDegC: Number(tRef.toFixed(2)),
        dataState: DataState.DERIVED,
      };
    }
  }

  // Entire water column mixed to maximum depth
  return {
    mldMeters: depths[depths.length - 1],
    criterion: 'Well-mixed throughout observed water column',
    refDepthMeters: refDepth,
    tRefDegC: Number(tRef.toFixed(2)),
    dataState: DataState.DERIVED,
  };
}

/**
 * Calculates underwater sound speed profile c(T, S, z) in m/s (Mackenzie 1981).
 *
 * @param {number} temperature - Temperature in °C
 * @param {number} salinity - Salinity in PSU
 * @param {number} depthMeters - Depth in meters
 * @returns {number|null} Sound speed in m/s
 */
export function calculateSoundSpeed(temperature, salinity, depthMeters) {
  if (
    temperature === null ||
    salinity === null ||
    depthMeters === null ||
    isNaN(temperature) ||
    isNaN(salinity) ||
    isNaN(depthMeters)
  ) {
    return null;
  }

  const T = temperature;
  const S = salinity;
  const D = depthMeters;

  const c =
    1448.96 +
    4.591 * T -
    5.304e-2 * T * T +
    2.374e-4 * T * T * T +
    1.340 * (S - 35.0) +
    1.630e-2 * D +
    1.675e-7 * D * D -
    1.025e-2 * T * (S - 35.0) -
    7.139e-13 * T * D * D * D;

  return Number(c.toFixed(2));
}
