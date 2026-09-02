import { DataState, VALID_DATA_STATES } from '../contracts/intelligenceContract.js';
import { createProvenance, SourceMode } from '../contracts/provenance.js';

/**
 * Creates a Canonical Trajectory representing a 3D time-ordered drift or navigation track.
 * Used for surface drifters and underwater autonomous gliders.
 *
 * @param {object} params
 * @param {string} params.id - Unique trajectory identifier (e.g. 'glider:incois_g02:mission_2026')
 * @param {string} params.source - Authoritative source
 * @param {string} [params.sourceMode=SourceMode.LIVE]
 * @param {string} params.platformId
 * @param {Array<{ lat: number, lon: number, depthMeters: number, timestamp: string }>} params.points - Track waypoints
 * @param {string} [params.dataState=DataState.OBSERVED]
 * @param {object} [params.provenance]
 * @returns {object} CanonicalTrajectory
 */
export function createCanonicalTrajectory({
  id,
  source,
  sourceMode = SourceMode.LIVE,
  platformId,
  points = [],
  dataState = DataState.OBSERVED,
  provenance = {},
}) {
  if (!id || typeof id !== 'string') throw new Error('CanonicalTrajectory requires a string id');
  if (!source || typeof source !== 'string') throw new Error('CanonicalTrajectory requires a source');
  if (!platformId) throw new Error('CanonicalTrajectory requires a platformId');
  if (!VALID_DATA_STATES.includes(dataState)) throw new Error(`Invalid dataState: "${dataState}"`);
  if (!Array.isArray(points) || points.length === 0) {
    throw new Error('CanonicalTrajectory requires a non-empty points array');
  }

  // Validate waypoints
  for (const pt of points) {
    if (typeof pt.lat !== 'number' || typeof pt.lon !== 'number') {
      throw new Error('All trajectory points must have numeric lat and lon coordinates');
    }
  }

  const cleanProvenance = createProvenance({
    source,
    sourceMode,
    ...provenance,
  });

  return {
    kind: 'CANONICAL_TRAJECTORY',
    id,
    source,
    sourceMode,
    platformId,
    points: [...points],
    pointCount: points.length,
    startTime: points[0]?.timestamp || null,
    endTime: points[points.length - 1]?.timestamp || null,
    dataState,
    provenance: cleanProvenance,
  };
}
