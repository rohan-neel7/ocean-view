/**
 * OceanView — Real Ocean Current Ingestion Adapter
 * Normalizes 2D/3D ocean current velocity fields into CanonicalGridVector.
 *
 * Invariants:
 *   - Contiguous typed Float32Array buffers (Non-explosion invariant)
 *   - Direction convention: Standard oceanographic flow bearing (0°=N, 90°=E, 180°=S, 270°=W)
 *   - Missing ≠ Zero: Missing u or v components remain fillValue/null
 *   - Explicit Temporal Classification: CLIMATOLOGY | REANALYSIS | FORECAST | OBSERVED
 */

import { createCanonicalGridVector, TemporalClassification } from '../engine/ocean/CanonicalGridVector.js';
import { DataState, SourceMode } from '../engine/contracts/intelligenceContract.js';

/**
 * Normalizes a raw ocean current velocity grid payload into CanonicalGridVector.
 *
 * @param {object} payload
 * @param {string} payload.datasetId - e.g. 'ANDRO' or 'INCOIS_HOOFS'
 * @param {string} [payload.temporalState=TemporalClassification.CLIMATOLOGY]
 * @param {string} [payload.sourceMode=SourceMode.LIVE]
 * @param {string} [payload.unit='m/s']
 * @param {string} payload.timestamp - ISO 8601 UTC
 * @param {number} [payload.depthMeters=0]
 * @param {Array<number>} payload.latitudes
 * @param {Array<number>} payload.longitudes
 * @param {Array<number>|Float32Array} payload.uData - Eastward velocity component
 * @param {Array<number>|Float32Array} payload.vData - Northward velocity component
 * @param {number} [payload.fillValue=-9999.0]
 * @param {object} [options]
 * @returns {object} CanonicalGridVector
 */
export function normalizeOceanCurrentGrid(payload, options = {}) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('OceanCurrentAdapter: Payload must be a non-null object');
  }

  const {
    datasetId = 'ANDRO',
    temporalState = TemporalClassification.CLIMATOLOGY,
    timestamp,
    depthMeters = 0,
    unit = 'm/s',
    latitudes = [],
    longitudes = [],
    depths = [depthMeters],
    uData,
    vData,
    fillValue = -9999.0,
  } = payload;

  if (!Array.isArray(latitudes) || latitudes.length === 0) {
    throw new Error('OceanCurrentAdapter: Valid latitudes array is required');
  }
  if (!Array.isArray(longitudes) || longitudes.length === 0) {
    throw new Error('OceanCurrentAdapter: Valid longitudes array is required');
  }

  const latCount = latitudes.length;
  const lonCount = longitudes.length;
  const depthCount = Array.isArray(depths) && depths.length > 0 ? depths.length : 1;
  const totalCells = latCount * lonCount * depthCount;

  if (!uData || uData.length !== totalCells) {
    throw new Error(`OceanCurrentAdapter: uData length (${uData?.length || 0}) does not match grid cells (${totalCells})`);
  }
  if (!vData || vData.length !== totalCells) {
    throw new Error(`OceanCurrentAdapter: vData length (${vData?.length || 0}) does not match grid cells (${totalCells})`);
  }

  // Check if unit conversion is needed (e.g. cm/s -> m/s)
  const isCmPerSec = unit === 'cm/s' || payload.sourceUnit === 'cm/s';
  const scale = isCmPerSec ? 0.01 : 1.0;

  const uBuffer = new Float32Array(totalCells);
  const vBuffer = new Float32Array(totalCells);

  for (let i = 0; i < totalCells; i++) {
    const u = uData[i];
    const v = vData[i];

    if (u === fillValue || v === fillValue || isNaN(u) || isNaN(v) || u === null || v === null) {
      uBuffer[i] = fillValue;
      vBuffer[i] = fillValue;
    } else {
      uBuffer[i] = u * scale;
      vBuffer[i] = v * scale;
    }
  }

  const parsedTime = new Date(timestamp || Date.now());
  const sourceMode = options.sourceMode || payload.sourceMode || SourceMode.LIVE;
  const dataState = temporalState === TemporalClassification.OBSERVED ? DataState.OBSERVED : DataState.MODELED;

  const gridId = `${datasetId}:current:z${depthMeters}:${parsedTime.toISOString()}`;

  return createCanonicalGridVector({
    id: gridId,
    source: datasetId,
    sourceMode,
    temporalState,
    timestamp: parsedTime.toISOString(),
    unit: 'm/s', // Standardized SI unit
    dataState,
    dimensions: {
      latCount,
      lonCount,
      depthCount,
    },
    latitudes: Float32Array.from(latitudes),
    longitudes: Float32Array.from(longitudes),
    depths: Float32Array.from(depths),
    uData: uBuffer,
    vData: vBuffer,
    fillValue,
    provenance: {
      unitConversion: isCmPerSec ? 'Converted from cm/s to SI standard m/s (factor 0.01)' : 'Direct m/s',
      originalUnit: isCmPerSec ? 'cm/s' : 'm/s',
    },
  });
}
