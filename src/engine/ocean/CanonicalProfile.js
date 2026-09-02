import { DataState, VALID_DATA_STATES, VALID_UNITS } from '../contracts/intelligenceContract.js';
import { createProvenance, SourceMode } from '../contracts/provenance.js';
import { computeFreshness } from '../contracts/freshness.js';

/**
 * Creates a Canonical Profile representing a vertical 1D water column measurement.
 * Used for Argo floats, Ship CTD casts, and Glider dive profiles.
 *
 * @param {object} params
 * @param {string} params.id - Unique profile identifier (e.g. 'argo:2902745:cast_042')
 * @param {string} params.source - Authoritative source (e.g. 'INCOIS_ARGO', 'BGC_ARGO')
 * @param {string} [params.sourceMode=SourceMode.LIVE] - Operating source mode
 * @param {string} params.platformId - Platform identifier (e.g. WMO 2902745)
 * @param {string} params.platformType - 'ARGO_FLOAT' | 'BGC_ARGO' | 'GLIDER' | 'CTD_CAST'
 * @param {number} [params.cycleNumber=1] - Float / cast cycle number
 * @param {string|number|Date} params.observedAt - Observation timestamp
 * @param {{ lat: number, lon: number }} params.location - WGS84 location
 * @param {number[]} params.depths - Array of depth values in meters
 * @param {Object<string, (number|null)[]>} params.variables - e.g. { temperature: [...], salinity: [...], chlorophyll: [...] }
 * @param {Object<string, string>} params.units - e.g. { temperature: '°C', salinity: 'PSU', chlorophyll: 'mg/m3' }
 * @param {string} [params.dataState=DataState.OBSERVED] - One of 10 DataStates
 * @param {object} [params.provenance] - Lineage metadata
 * @returns {object} CanonicalProfile
 */
export function createCanonicalProfile({
  id,
  source,
  sourceMode = SourceMode.LIVE,
  platformId,
  platformType = 'ARGO_FLOAT',
  cycleNumber = 1,
  quality = null,
  observedAt,
  receivedAt = new Date().toISOString(),
  location,
  depths = [],
  variables = {},
  units = {},
  dataState = DataState.OBSERVED,
  provenance = {},
}) {
  if (!id || typeof id !== 'string') throw new Error('CanonicalProfile requires a string id');
  if (!source || typeof source !== 'string') throw new Error('CanonicalProfile requires a source');
  if (!platformId) throw new Error('CanonicalProfile requires a platformId');
  if (!VALID_DATA_STATES.includes(dataState)) throw new Error(`Invalid dataState: "${dataState}"`);
  if (!location || typeof location.lat !== 'number' || typeof location.lon !== 'number') {
    throw new Error('CanonicalProfile requires numeric lat/lon coordinates');
  }
  if (!Array.isArray(depths) || depths.length === 0) {
    throw new Error('CanonicalProfile requires a non-empty depths array');
  }

  // Validate variable units and array lengths match depthLevels
  const depthCount = depths.length;
  for (const [varName, unit] of Object.entries(units)) {
    if (!VALID_UNITS.has(unit)) {
      throw new Error(`Invalid unit "${unit}" for profile variable "${varName}"`);
    }
  }

  const cleanVariables = {};
  for (const [varName, values] of Object.entries(variables)) {
    if (!Array.isArray(values) && !(values instanceof Float32Array) && !(values instanceof Float64Array)) {
      throw new Error(`Profile variable "${varName}" values must be an array or Float32Array`);
    }
    if (values.length !== depthCount) {
      throw new Error(
        `Profile variable "${varName}" length (${values.length}) does not match depth count (${depthCount})`
      );
    }
    // Clean array preserving nulls honestly without 0-filling
    cleanVariables[varName] = Array.from(values).map((v) =>
      typeof v === 'number' && !isNaN(v) ? Number(v.toFixed(4)) : null
    );
  }

  const normObservedAt = observedAt ? new Date(observedAt).toISOString() : new Date().toISOString();
  const normReceivedAt = new Date(receivedAt).toISOString();
  const freshness = computeFreshness(normObservedAt, normReceivedAt);

  const cleanProvenance = createProvenance({
    source,
    sourceMode,
    observedAt: normObservedAt,
    receivedAt: normReceivedAt,
    ...provenance,
  });

  return {
    kind: 'CANONICAL_PROFILE',
    id,
    source,
    sourceMode,
    platformId,
    platformType,
    cycleNumber: quality?.cycleNumber || cycleNumber,
    quality: quality ? { ...quality } : { cycleNumber, qcFlags: {} },
    observedAt: normObservedAt,
    receivedAt: normReceivedAt,
    location: {
      lat: location.lat,
      lon: location.lon,
      minDepthMeters: Math.min(...depths),
      maxDepthMeters: Math.max(...depths),
    },
    depths: [...depths],
    variables: cleanVariables,
    units: { ...units },
    dataState,
    freshness,
    provenance: cleanProvenance,
  };
}
