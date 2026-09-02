/**
 * OceanView — Real Ocean Model Grid Ingestion Adapter
 * Normalizes 2D/3D/4D gridded numerical ocean model outputs into CanonicalGridScalar.
 *
 * Invariants:
 *   - Contiguous typed Float32Array buffers (Non-explosion invariant)
 *   - DataState is strictly DataState.MODELED (or DataState.PREDICTED if forecast)
 *   - Missing / Land / Masked cells are preserved as fillValue (never zero-filled)
 *   - Full spatial & temporal dimension mapping
 */

import { createCanonicalGridScalar } from '../engine/ocean/CanonicalGridScalar.js';
import { DataState, SourceMode } from '../engine/contracts/intelligenceContract.js';

/**
 * Normalizes a structured ocean model grid slice into a CanonicalGridScalar.
 *
 * @param {object} payload
 * @param {string} payload.datasetId - e.g. 'SDC_GLO_CLIM_TS_V2_2'
 * @param {string} [payload.variable='sea_surface_temperature']
 * @param {string} [payload.unit='°C']
 * @param {string} payload.timestamp - ISO 8601 UTC
 * @param {number} [payload.depthMeters=0]
 * @param {Array<number>} payload.latitudes
 * @param {Array<number>} payload.longitudes
 * @param {Array<number>} [payload.depths]
 * @param {Array<number>|Float32Array} payload.data
 * @param {number} [payload.fillValue=-9999.0]
 * @param {object} [options]
 * @param {string} [options.sourceMode=SourceMode.LIVE]
 * @param {string} [options.dataState=DataState.MODELED]
 * @returns {object} CanonicalGridScalar
 */
export function normalizeOceanModelGrid(payload, options = {}) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('OceanModelAdapter: Payload must be a non-null object');
  }

  const {
    datasetId = 'SDC_GLO_CLIM_TS_V2_2',
    variable = 'sea_surface_temperature',
    unit = '°C',
    timestamp,
    depthMeters = 0,
    latitudes = [],
    longitudes = [],
    depths = [depthMeters],
    data,
    fillValue = -9999.0,
  } = payload;

  if (!Array.isArray(latitudes) || latitudes.length === 0) {
    throw new Error('OceanModelAdapter: Valid latitudes coordinate array is required');
  }

  if (!Array.isArray(longitudes) || longitudes.length === 0) {
    throw new Error('OceanModelAdapter: Valid longitudes coordinate array is required');
  }

  const latCount = latitudes.length;
  const lonCount = longitudes.length;
  const depthCount = Array.isArray(depths) && depths.length > 0 ? depths.length : 1;
  const expectedCells = latCount * lonCount * depthCount;

  if (!data || data.length !== expectedCells) {
    throw new Error(
      `OceanModelAdapter: Data length (${data?.length || 0}) does not match grid dimensions (${latCount}×${lonCount}×${depthCount} = ${expectedCells})`
    );
  }

  const parsedTime = new Date(timestamp || Date.now());
  const sourceMode = options.sourceMode || payload.sourceMode || SourceMode.LIVE;
  const dataState = options.dataState || DataState.MODELED;

  // Allocate or wrap contiguous typed Float32Array
  const floatBuffer = data instanceof Float32Array ? data : new Float32Array(data);

  // Grid identifier format: dataset:variable:depth:timestamp
  const gridId = `${datasetId}:${variable}:z${depthMeters}:${parsedTime.toISOString()}`;

  return createCanonicalGridScalar({
    id: gridId,
    source: datasetId,
    sourceMode,
    variable,
    unit,
    dataState,
    timestamp: parsedTime.toISOString(),
    dimensions: {
      latCount,
      lonCount,
      depthCount,
    },
    latitudes: Float32Array.from(latitudes),
    longitudes: Float32Array.from(longitudes),
    depths: Float32Array.from(depths),
    data: floatBuffer,
    fillValue,
  });
}

/**
 * Parses ERDDAP griddap JSON tabular response into a CanonicalGridScalar.
 *
 * @param {object} griddapJson
 * @param {object} metadata - { datasetId, variable, unit, depthMeters }
 * @param {object} [options]
 * @returns {object} CanonicalGridScalar
 */
export function parseGriddapModelResponse(griddapJson, metadata, options = {}) {
  if (!griddapJson || !griddapJson.table || !Array.isArray(griddapJson.table.rows)) {
    throw new Error('OceanModelAdapter: Invalid griddap JSON structure');
  }

  const rows = griddapJson.table.rows;
  if (rows.length === 0) {
    throw new Error('OceanModelAdapter: Empty griddap dataset slice returned');
  }

  // Column order in griddap: [time, depth, latitude, longitude, variable]
  const latsSet = new Set();
  const lonsSet = new Set();
  const rawDataMap = new Map();
  let timeStr = null;

  for (const r of rows) {
    if (!timeStr && r[0]) timeStr = r[0];
    const lat = r[2];
    const lon = r[3];
    const val = r[4];

    latsSet.add(lat);
    lonsSet.add(lon);
    rawDataMap.set(`${lat}_${lon}`, val !== null && val !== undefined && !isNaN(val) ? Number(val.toFixed(3)) : -9999.0);
  }

  const latitudes = Array.from(latsSet).sort((a, b) => a - b);
  const longitudes = Array.from(lonsSet).sort((a, b) => a - b);
  const latCount = latitudes.length;
  const lonCount = longitudes.length;

  const buffer = new Float32Array(latCount * lonCount);
  let idx = 0;

  for (let r = 0; r < latCount; r++) {
    const lat = latitudes[r];
    for (let c = 0; c < lonCount; c++) {
      const lon = longitudes[c];
      const key = `${lat}_${lon}`;
      buffer[idx++] = rawDataMap.has(key) ? rawDataMap.get(key) : -9999.0;
    }
  }

  return normalizeOceanModelGrid(
    {
      datasetId: metadata.datasetId || 'SDC_GLO_CLIM_TS_V2_2',
      variable: metadata.variable || 'sea_surface_temperature',
      unit: metadata.unit || '°C',
      timestamp: timeStr || new Date().toISOString(),
      depthMeters: metadata.depthMeters || 0,
      latitudes,
      longitudes,
      depths: [metadata.depthMeters || 0],
      data: buffer,
      fillValue: -9999.0,
    },
    options
  );
}
