/**
 * OceanView — Canonical Grid Vector Entity
 * Represents 2D/3D ocean current velocity fields (u, v, w) using contiguous Float32Array buffers.
 *
 * Invariants:
 *   - Contiguous typed buffers (Non-explosion invariant: 1 grid slice = 1 typed buffer, 0 event objects)
 *   - Direction convention: Standard oceanographic flow bearing (degrees clockwise from True North)
 *     * u=0, v>0 -> 0° (North)
 *     * u>0, v=0 -> 90° (East)
 *     * u=0, v<0 -> 180° (South)
 *     * u<0, v=0 -> 270° (West)
 *   - Missing ≠ Zero: If either u or v is missing/masked, speed and direction remain null (never 0.0)
 *   - Temporal Classification: CLIMATOLOGY | REANALYSIS | MODEL_ANALYSIS | FORECAST | OBSERVED
 */

import { DataState, VALID_DATA_STATES, VALID_UNITS } from '../contracts/intelligenceContract.js';
import { createProvenance, SourceMode } from '../contracts/provenance.js';
import { computeFreshness } from '../contracts/freshness.js';

export const TemporalClassification = Object.freeze({
  CLIMATOLOGY: 'CLIMATOLOGY',
  REANALYSIS: 'REANALYSIS',
  MODEL_ANALYSIS: 'MODEL_ANALYSIS',
  FORECAST: 'FORECAST',
  OBSERVED: 'OBSERVED',
});

/**
 * Creates and validates an immutable CanonicalGridVector.
 */
export function createCanonicalGridVector({
  id,
  source,
  sourceMode = SourceMode.LIVE,
  temporalState = TemporalClassification.FORECAST,
  timestamp,
  unit = 'm/s',
  dimensions,
  latitudes,
  longitudes,
  depths = [0],
  uData,
  vData,
  wData = null,
  fillValue = -9999.0,
  dataState = DataState.MODELED,
  provenance = {},
}) {
  if (!id || typeof id !== 'string') throw new Error('CanonicalGridVector requires a string id');
  if (!source || typeof source !== 'string') throw new Error('CanonicalGridVector requires a source');
  if (!VALID_DATA_STATES.includes(dataState)) throw new Error(`Invalid dataState: "${dataState}"`);
  if (!VALID_UNITS.has(unit)) throw new Error(`Invalid velocity unit: "${unit}"`);

  if (!dimensions || typeof dimensions.latCount !== 'number' || typeof dimensions.lonCount !== 'number') {
    throw new Error('CanonicalGridVector requires valid latCount and lonCount dimensions');
  }

  const depthCount = dimensions.depthCount || 1;
  const expectedCells = dimensions.latCount * dimensions.lonCount * depthCount;

  if (!uData || uData.length !== expectedCells) {
    throw new Error(`uData length (${uData?.length || 0}) does not match expected grid cells (${expectedCells})`);
  }
  if (!vData || vData.length !== expectedCells) {
    throw new Error(`vData length (${vData?.length || 0}) does not match expected grid cells (${expectedCells})`);
  }

  const uBuffer = uData instanceof Float32Array ? uData : new Float32Array(uData);
  const vBuffer = vData instanceof Float32Array ? vData : new Float32Array(vData);
  const wBuffer = wData ? (wData instanceof Float32Array ? wData : new Float32Array(wData)) : null;

  const normTimestamp = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();
  const freshness = computeFreshness(normTimestamp, new Date().toISOString());

  const cleanProvenance = createProvenance({
    source,
    sourceMode,
    observedAt: normTimestamp,
    ...provenance,
  });

  // Precompute grid statistics
  let validCellCount = 0;
  let maxSpeed = 0;
  let minSpeed = Infinity;

  for (let i = 0; i < expectedCells; i++) {
    const u = uBuffer[i];
    const v = vBuffer[i];
    if (u !== fillValue && v !== fillValue && !isNaN(u) && !isNaN(v)) {
      const spd = Math.sqrt(u * u + v * v);
      if (spd > maxSpeed) maxSpeed = spd;
      if (spd < minSpeed) minSpeed = spd;
      validCellCount++;
    }
  }

  if (minSpeed === Infinity) minSpeed = 0;

  return {
    kind: 'CANONICAL_GRID_VECTOR',
    id,
    source,
    sourceMode,
    temporalState,
    timestamp: normTimestamp,
    unit,
    dataState,
    dimensions: {
      latCount: dimensions.latCount,
      lonCount: dimensions.lonCount,
      depthCount,
      totalCells: expectedCells,
    },
    coordinates: {
      latitudes: latitudes instanceof Float32Array ? latitudes : Float32Array.from(latitudes),
      longitudes: longitudes instanceof Float32Array ? longitudes : Float32Array.from(longitudes),
      depths: depths instanceof Float32Array ? depths : Float32Array.from(depths),
      bbox: {
        minLat: Math.min(...latitudes),
        maxLat: Math.max(...latitudes),
        minLon: Math.min(...longitudes),
        maxLon: Math.max(...longitudes),
      },
    },
    uData: uBuffer,
    vData: vBuffer,
    wData: wBuffer,
    fillValue,
    stats: {
      validCellCount,
      minSpeed: Number(minSpeed.toFixed(4)),
      maxSpeed: Number(maxSpeed.toFixed(4)),
      memorySizeBytes: expectedCells * 4 * (wBuffer ? 3 : 2),
    },
    freshness,
    provenance: cleanProvenance,

    /**
     * Retrieves u, v, speed, and heading at grid index (latIdx, lonIdx, depthIdx).
     * Direction follows oceanographic bearing: 0°=N, 90°=E, 180°=S, 270°=W.
     */
    getVector(latIdx, lonIdx, depthIdx = 0) {
      if (
        latIdx < 0 ||
        latIdx >= dimensions.latCount ||
        lonIdx < 0 ||
        lonIdx >= dimensions.lonCount ||
        depthIdx >= depthCount
      ) {
        return null;
      }

      const idx = depthIdx * dimensions.latCount * dimensions.lonCount + latIdx * dimensions.lonCount + lonIdx;
      const u = uBuffer[idx];
      const v = vBuffer[idx];

      if (u === fillValue || v === fillValue || isNaN(u) || isNaN(v)) {
        return null;
      }

      const speed = Math.sqrt(u * u + v * v);

      // Oceanographic flow bearing: angle towards which current moves, clockwise from True North
      let headingDeg = (Math.atan2(u, v) * (180.0 / Math.PI) + 360.0) % 360.0;
      headingDeg = Number(headingDeg.toFixed(2));

      return {
        u: Number(u.toFixed(4)),
        v: Number(v.toFixed(4)),
        w: wBuffer ? Number(wBuffer[idx].toFixed(4)) : 0,
        speed: Number(speed.toFixed(4)),
        headingDeg,
      };
    },
  };
}
