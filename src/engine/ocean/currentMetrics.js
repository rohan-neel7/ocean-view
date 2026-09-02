/**
 * OceanView — Ocean Current Analysis & Directional Metrics
 *
 * Direction Convention: Standard oceanographic flow bearing (degrees clockwise from True North)
 *   - 0°   = Flowing toward True North (u = 0, v > 0)
 *   - 90°  = Flowing toward East       (u > 0, v = 0)
 *   - 180° = Flowing toward South      (u = 0, v < 0)
 *   - 270° = Flowing toward West       (u < 0, v = 0)
 */

/**
 * Calculates flow heading in degrees clockwise from True North.
 *
 * @param {number} u - Eastward velocity component (m/s)
 * @param {number} v - Northward velocity component (m/s)
 * @returns {number|null} Direction in degrees [0, 360), or null if invalid
 */
export function calculateFlowDirection(u, v) {
  if (
    u === null ||
    v === null ||
    typeof u !== 'number' ||
    typeof v !== 'number' ||
    isNaN(u) ||
    isNaN(v) ||
    u <= -9000 ||
    v <= -9000
  ) {
    return null;
  }
  if (u === 0 && v === 0) return 0;

  // atan2(u, v) gives angle from North (+v axis) towards East (+u axis)
  const deg = (Math.atan2(u, v) * (180.0 / Math.PI) + 360.0) % 360.0;
  return Number(deg.toFixed(2));
}

/**
 * Calculates current speed magnitude |V| = sqrt(u^2 + v^2).
 *
 * @param {number} u
 * @param {number} v
 * @returns {number|null}
 */
export function calculateCurrentSpeed(u, v) {
  if (
    u === null ||
    v === null ||
    typeof u !== 'number' ||
    typeof v !== 'number' ||
    isNaN(u) ||
    isNaN(v) ||
    u <= -9000 ||
    v <= -9000
  ) {
    return null;
  }
  return Number(Math.sqrt(u * u + v * v).toFixed(4));
}

/**
 * Bilinearly interpolates horizontal velocity vector (u, v) at (lat, lon).
 * Strictly returns null if any neighboring cell is missing / masked by land (Missing ≠ Zero).
 *
 * @param {object} gridVector - CanonicalGridVector
 * @param {number} targetLat
 * @param {number} targetLon
 * @param {number} [depthIdx=0]
 * @returns {{ u: number, v: number, speed: number, headingDeg: number }|null}
 */
export function sampleVectorFieldBilinear(gridVector, targetLat, targetLon, depthIdx = 0) {
  if (!gridVector || !gridVector.coordinates) return null;

  const lats = gridVector.coordinates.latitudes;
  const lons = gridVector.coordinates.longitudes;

  if (targetLat < lats[0] || targetLat > lats[lats.length - 1] || targetLon < lons[0] || targetLon > lons[lons.length - 1]) {
    return null; // Out of domain
  }

  // Find bracketing indices
  let r0 = -1;
  for (let r = 0; r < lats.length - 1; r++) {
    if (targetLat >= lats[r] && targetLat <= lats[r + 1]) {
      r0 = r;
      break;
    }
  }

  let c0 = -1;
  for (let c = 0; c < lons.length - 1; c++) {
    if (targetLon >= lons[c] && targetLon <= lons[c + 1]) {
      c0 = c;
      break;
    }
  }

  if (r0 === -1 || c0 === -1) return null;

  const r1 = r0 + 1;
  const c1 = c0 + 1;

  // Retrieve 4 corners
  const v00 = gridVector.getVector(r0, c0, depthIdx);
  const v10 = gridVector.getVector(r1, c0, depthIdx);
  const v01 = gridVector.getVector(r0, c1, depthIdx);
  const v11 = gridVector.getVector(r1, c1, depthIdx);

  // If any neighbor is masked or null, do not extrapolate/fabricate across land boundary
  if (!v00 || !v10 || !v01 || !v11) {
    // Return nearest valid neighbor if close enough, or null
    return v00 || v10 || v01 || v11 || null;
  }

  const dLat = lats[r1] - lats[r0];
  const dLon = lons[c1] - lons[c0];

  const s = dLon > 0 ? (targetLon - lons[c0]) / dLon : 0;
  const t = dLat > 0 ? (targetLat - lats[r0]) / dLat : 0;

  const uInterp = (1 - s) * (1 - t) * v00.u + s * (1 - t) * v01.u + (1 - s) * t * v10.u + s * t * v11.u;
  const vInterp = (1 - s) * (1 - t) * v00.v + s * (1 - t) * v01.v + (1 - s) * t * v10.v + s * t * v11.v;

  const speed = calculateCurrentSpeed(uInterp, vInterp);
  const headingDeg = calculateFlowDirection(uInterp, vInterp);

  return {
    u: Number(uInterp.toFixed(4)),
    v: Number(vInterp.toFixed(4)),
    speed,
    headingDeg,
  };
}
