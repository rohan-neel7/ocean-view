/**
 * OceanView — 3D Spatial & Vertical Depth Coordinate System
 * Treats depth (Z) as a first-class dimensional coordinate from sea surface (0m) to abyss (6000m).
 *
 * COORDINATE INTEGRITY CONVENTION (Phase 8.2A):
 *
 * 1. Physical Depth vs Display Offset:
 *    - physicalDepthMeters: Scientific ground-truth ocean depth (z >= 0, where 0m = sea surface).
 *    - displayOffsetMeters: Rendering-only vertical translation applied to prevent WebGL z-fighting
 *      with terrain/imagery or to manage multi-layer visual depth sorting.
 *    - INVARIANT: Display offsets NEVER alter or overwrite physical scientific depth metadata.
 *
 * 2. Coordinate Transformation Convention:
 *    - Convention: APPROXIMATE SUBSURFACE POSITIONING.
 *    - Sea surface (z = 0m) corresponds to the WGS84 Reference Ellipsoid surface (height = 0m).
 *    - Subsurface physical depth z is mapped to negative ellipsoidal altitude:
 *        Cesium Altitude h = -z * verticalExaggeration
 *      (Neglecting regional geoid undulation N < 100m and dynamic topography eta < 2m).
 *    - Surface layers (z <= 5m) apply a tiny bounded display offset (+5m to +12m) strictly for
 *      visibility over terrain/3D tiles.
 */

export const STANDARD_OCEAN_DEPTHS_METERS = Object.freeze([
  0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500, 600,
  700, 800, 900, 1000, 1200, 1500, 2000, 2500, 3000, 4000, 5000, 6000,
]);

/**
 * Display-only micro-offsets used strictly to prevent WebGL z-fighting against the globe surface.
 * THESE NEVER CHANGE SCIENTIFIC PHYSICAL DEPTH VALUES.
 */
export const RENDERING_ONLY_SURFACE_OFFSET_METERS = 5.0;
export const RENDERING_ONLY_VECTOR_OFFSET_METERS = 8.0;
export const RENDERING_ONLY_PROFILE_OFFSET_METERS = 5.0;
export const RENDERING_ONLY_SELECTED_PROFILE_OFFSET_METERS = 12.0;

/**
 * Converts physical scientific ocean depth (meters) to Cesium ellipsoidal render altitude (meters).
 *
 * @param {number} physicalDepthMeters - Positive downward depth in meters (0 = surface)
 * @param {object} [options={}]
 * @param {boolean} [options.isVector=false] - If true and at surface, uses vector render offset (+8m)
 * @param {boolean} [options.isProfile=false] - If true and at surface, uses profile render offset (+5m)
 * @param {boolean} [options.isSelected=false] - If true and profile, uses selected profile offset (+12m)
 * @param {number} [options.verticalExaggeration=1.0] - Visual vertical exaggeration factor for subsurface
 * @returns {number} Cesium WGS84 ellipsoidal height in meters
 */
export function toCesiumRenderAltitude(physicalDepthMeters = 0, options = {}) {
  const depth = typeof physicalDepthMeters === 'number' && !isNaN(physicalDepthMeters)
    ? Math.max(0, physicalDepthMeters)
    : 0;

  const {
    isVector = false,
    isProfile = false,
    isSelected = false,
    verticalExaggeration = 1.0,
  } = options;

  // Surface rendering: apply bounded display offset to clear terrain/3D tiles
  if (depth <= 5.0) {
    if (isSelected && isProfile) return RENDERING_ONLY_SELECTED_PROFILE_OFFSET_METERS;
    if (isVector) return RENDERING_ONLY_VECTOR_OFFSET_METERS;
    if (isProfile) return RENDERING_ONLY_PROFILE_OFFSET_METERS;
    return RENDERING_ONLY_SURFACE_OFFSET_METERS;
  }

  // Subsurface rendering: approximate ellipsoidal depth (-z * E)
  const E = Math.max(1.0, Number(verticalExaggeration) || 1.0);
  return -depth * E;
}

/**
 * Converts hydrostatic pressure in decibars (dbar) to geometric depth in meters (Saunders 1981).
 *
 * @param {number} pressureDbar - Pressure in decibars
 * @param {number} [latitudeDeg=15] - Latitude in degrees
 * @returns {number} Depth in meters
 */
export function pressureToDepthMeters(pressureDbar, latitudeDeg = 15) {
  if (typeof pressureDbar !== 'number' || pressureDbar <= 0) return 0;

  const latRad = latitudeDeg * (Math.PI / 180.0);
  const sin2Lat = Math.sin(latRad) ** 2;

  // Standard gravity variation with latitude (UNESCO 1983)
  const g = 9.780318 * (1.0 + (5.2788e-3 + 2.36e-5 * sin2Lat) * sin2Lat);

  // Saunders correction polynomial
  const c1 = 2.21e-6;
  const depth = (pressureDbar * 1e4) / (g * 1025.0 * (1.0 + c1 * pressureDbar));

  return Number(depth.toFixed(2));
}

/**
 * Finds closest standard depth level index.
 *
 * @param {number} targetDepthMeters
 * @param {number[]} [depthLevels=STANDARD_OCEAN_DEPTHS_METERS]
 * @returns {{ depthMeters: number, index: number }}
 */
export function findNearestDepthLevel(targetDepthMeters, depthLevels = STANDARD_OCEAN_DEPTHS_METERS) {
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
  };
}
