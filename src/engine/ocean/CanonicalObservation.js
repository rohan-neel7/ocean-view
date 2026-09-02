import { DataState, VALID_DATA_STATES, VALID_UNITS } from '../contracts/intelligenceContract.js';
import { createProvenance, SourceMode } from '../contracts/provenance.js';
import { computeFreshness } from '../contracts/freshness.js';

/**
 * Creates a Canonical Observation representing a discrete in-situ ocean measurement.
 *
 * @param {object} params
 * @param {string} params.id - Unique observation identifier (e.g. 'buoy:incois_ad01:20260827_06z')
 * @param {string} params.source - Authoritative source (e.g. 'INCOIS_BUOY_NETWORK')
 * @param {string} [params.sourceMode=SourceMode.LIVE] - Operating source mode
 * @param {string} params.platformType - 'MOORED_BUOY' | 'DRIFTER' | 'SHIP' | 'SHORE_STATION'
 * @param {string} params.variable - Physical variable name ('sea_surface_temperature', 'salinity', etc.)
 * @param {number|null} params.value - Numeric measurement value (null if missing/unavailable)
 * @param {string} params.unit - Standard physical unit ('°C', 'PSU', 'm/s', 'dbar')
 * @param {string} [params.dataState=DataState.OBSERVED] - One of 10 DataStates
 * @param {string|number|Date} params.observedAt - Physical measurement timestamp
 * @param {{ lat: number, lon: number, depthMeters?: number }} params.location - WGS84 coordinates + depth
 * @param {number|null} [params.qualityFlag=1] - Standard QC flag (1: Good, 2: Probably Good, 3: Bad, 4: Interpolated)
 * @param {object} [params.provenance] - Lineage metadata
 * @returns {object} CanonicalObservation
 */
export function createCanonicalObservation({
  id,
  source,
  sourceMode = SourceMode.LIVE,
  platformType = 'MOORED_BUOY',
  variable,
  value,
  unit,
  dataState = DataState.OBSERVED,
  observedAt,
  receivedAt = new Date().toISOString(),
  location,
  qualityFlag = 1,
  provenance = {},
}) {
  if (!id || typeof id !== 'string') throw new Error('CanonicalObservation requires a valid string id');
  if (!source || typeof source !== 'string') throw new Error('CanonicalObservation requires a valid source');
  if (!variable || typeof variable !== 'string') throw new Error('CanonicalObservation requires a variable name');
  if (!VALID_DATA_STATES.includes(dataState)) throw new Error(`Invalid dataState: "${dataState}"`);
  if (!unit || !VALID_UNITS.has(unit)) throw new Error(`Invalid oceanographic unit: "${unit}"`);
  if (!location || typeof location.lat !== 'number' || typeof location.lon !== 'number') {
    throw new Error('CanonicalObservation requires numeric lat and lon coordinates');
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
    kind: 'CANONICAL_OBSERVATION',
    id,
    source,
    sourceMode,
    platformType,
    variable,
    value: typeof value === 'number' && !isNaN(value) ? value : null,
    unit,
    dataState,
    observedAt: normObservedAt,
    receivedAt: normReceivedAt,
    location: {
      lat: location.lat,
      lon: location.lon,
      depthMeters: typeof location.depthMeters === 'number' ? location.depthMeters : 0,
    },
    qualityFlag,
    freshness,
    provenance: cleanProvenance,
  };
}
