/**
 * OceanView — 3D Spatial & Vertical Depth Coordinate System
 * Treats depth (Z) as a first-class dimensional coordinate from sea surface (0m) to abyss (6000m).
 */

export const STANDARD_OCEAN_DEPTHS_METERS = Object.freeze([
  0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500, 600,
  700, 800, 900, 1000, 1200, 1500, 2000, 2500, 3000, 4000, 5000, 6000,
]);

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
