/**
 * OceanView — Scientific Profile Alignment & Vertical Intercomparison Engine
 * Matches in-situ Argo/CTD casts against 4D ocean model grids with rigorous temporal and depth guards.
 *
 * Invariants:
 *   - Temporal mismatch guard: If |t_obs - t_model| exceeds tolerance, return UNRESOLVED / UNAVAILABLE.
 *   - Missing ≠ Zero: Only valid non-null overlapping depth pairs contribute to metrics.
 *   - Depth is dynamic: Interpolates or matches against model's native vertical levels.
 */

import { interpolateVerticalProfile } from '../ocean/VerticalCoordinateSystem.js';

export const AlignmentStatus = Object.freeze({
  ALIGNED: 'ALIGNED',
  TEMPORAL_MISMATCH_UNRESOLVED: 'TEMPORAL_MISMATCH_UNRESOLVED',
  SPATIAL_OUT_OF_BOUNDS: 'SPATIAL_OUT_OF_BOUNDS',
  VARIABLE_UNAVAILABLE: 'VARIABLE_UNAVAILABLE',
});

/**
 * Aligns and intercompares an in-situ vertical profile with a 4D ocean model grid.
 *
 * @param {object} profile - CanonicalProfile (OBSERVED)
 * @param {object} modelGrid - CanonicalGridScalar (MODELED)
 * @param {string} [variableName='temperature']
 * @param {object} [options]
 * @param {number} [options.maxTemporalMismatchDays=45] - Maximum allowed temporal discrepancy in days
 * @returns {object} Structured alignment & intercomparison report
 */
export function alignAndCompareProfile(profile, modelGrid, variableName = 'temperature', options = {}) {
  if (!profile || !modelGrid) {
    throw new Error('alignAndCompareProfile requires valid profile and modelGrid objects');
  }

  const maxDays = options.maxTemporalMismatchDays ?? 45;

  // 1. Temporal Alignment Guard
  const tObs = new Date(profile.observedAt).getTime();
  const tMod = new Date(modelGrid.timestamp).getTime();
  const diffDays = Math.abs(tObs - tMod) / (1000 * 60 * 60 * 24);

  if (diffDays > maxDays) {
    return {
      status: AlignmentStatus.TEMPORAL_MISMATCH_UNRESOLVED,
      profileId: profile.id,
      modelSource: modelGrid.source,
      variable: variableName,
      observedAt: profile.observedAt,
      modelTimestamp: modelGrid.timestamp,
      temporalDiscrepancyDays: Number(diffDays.toFixed(1)),
      maxAllowedDays: maxDays,
      mismatchReason: `Observation timestamp (${profile.observedAt}) diverges by ${diffDays.toFixed(1)} days from model frame (${modelGrid.timestamp}), exceeding allowable tolerance of ${maxDays} days.`,
      metrics: null,
      levels: [],
    };
  }

  // 2. Spatial Alignment Guard
  const { lat, lon } = profile.location;
  const lats = modelGrid.coordinates.latitudes;
  const lons = modelGrid.coordinates.longitudes;
  const latCount = modelGrid.dimensions.latCount;
  const lonCount = modelGrid.dimensions.lonCount;

  if (lat < lats[0] || lat > lats[latCount - 1] || lon < lons[0] || lon > lons[lonCount - 1]) {
    return {
      status: AlignmentStatus.SPATIAL_OUT_OF_BOUNDS,
      profileId: profile.id,
      modelSource: modelGrid.source,
      variable: variableName,
      location: { lat, lon },
      mismatchReason: `Profile location (${lat}°N, ${lon}°E) is outside the model bounding domain.`,
      metrics: null,
      levels: [],
    };
  }

  // 3. Find Nearest Model Grid Cell (or Bilinear Column)
  let rIdx = 0;
  let minLatDiff = Infinity;
  for (let r = 0; r < latCount; r++) {
    const diff = Math.abs(lats[r] - lat);
    if (diff < minLatDiff) {
      minLatDiff = diff;
      rIdx = r;
    }
  }

  let cIdx = 0;
  let minLonDiff = Infinity;
  for (let c = 0; c < lonCount; c++) {
    const diff = Math.abs(lons[c] - lon);
    if (diff < minLonDiff) {
      minLonDiff = diff;
      cIdx = c;
    }
  }

  // Extract model column values across native depths
  const modelDepths = Array.from(modelGrid.coordinates.depths || [0]);
  const modelColValues = modelDepths.map((_, dIdx) => modelGrid.getValue(rIdx, cIdx, dIdx));

  // 4. Depth-by-Depth Vertical Alignment
  const obsDepths = profile.depths || [];
  const obsValues = profile.variables[variableName] || [];

  if (obsValues.length === 0) {
    return {
      status: AlignmentStatus.VARIABLE_UNAVAILABLE,
      profileId: profile.id,
      variable: variableName,
      mismatchReason: `Variable "${variableName}" is not available in the observed profile.`,
      metrics: null,
      levels: [],
    };
  }

  const comparisonLevels = [];
  const validDeltas = [];

  for (let i = 0; i < obsDepths.length; i++) {
    const zObs = obsDepths[i];
    const vObs = obsValues[i];

    // Interpolate model value at observed depth zObs
    const vMod = interpolateVerticalProfile(modelDepths, modelColValues, zObs);

    let delta = null;
    if (vObs !== null && vMod !== null && !isNaN(vObs) && !isNaN(vMod)) {
      delta = Number((vObs - vMod).toFixed(4));
      validDeltas.push(delta);
    }

    comparisonLevels.push({
      depthMeters: zObs,
      observedValue: vObs,
      modeledValue: vMod,
      delta,
    });
  }

  // 5. Statistical Error Metrics
  let meanBias = null;
  let rmse = null;

  if (validDeltas.length > 0) {
    const sum = validDeltas.reduce((a, b) => a + b, 0);
    meanBias = Number((sum / validDeltas.length).toFixed(4));

    const sumSq = validDeltas.reduce((a, b) => a + b * b, 0);
    rmse = Number(Math.sqrt(sumSq / validDeltas.length).toFixed(4));
  }

  return {
    status: AlignmentStatus.ALIGNED,
    profileId: profile.id,
    modelSource: modelGrid.source,
    variable: variableName,
    unit: profile.units[variableName] || modelGrid.unit || '°C',
    location: { lat, lon },
    observedAt: profile.observedAt,
    modelTimestamp: modelGrid.timestamp,
    temporalDiscrepancyDays: Number(diffDays.toFixed(1)),
    metrics: {
      validPairs: validDeltas.length,
      totalObsLevels: obsDepths.length,
      meanBias,
      rmse,
    },
    levels: comparisonLevels,
    provenance: {
      alignmentMethod: 'Dynamic Vertical Interpolation & Nearest-Column Alignment',
      interpolation: 'Piecewise Linear Vertical Spline',
    },
  };
}
