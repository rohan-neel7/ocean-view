import { DataState, VALID_DATA_STATES, VALID_UNITS } from '../contracts/intelligenceContract.js';
import { createProvenance, SourceMode } from '../contracts/provenance.js';

/**
 * Creates a Canonical Grid Scalar field holding 2D/3D numerical arrays.
 * Stored as a contiguous typed Float32Array buffer — NEVER as individual event objects.
 *
 * @param {object} params
 * @param {string} params.id - Grid field identifier (e.g. 'incois:hycom:sst:20260827_00z')
 * @param {string} params.source - Model / dataset source (e.g. 'INCOIS_MOM6', 'NOAA_OISST')
 * @param {string} [params.sourceMode=SourceMode.MODELED]
 * @param {string} params.variable - Variable name (e.g. 'sea_surface_temperature')
 * @param {string} params.unit - Standard physical unit ('°C', 'PSU', 'mg/m3', etc.)
 * @param {string} [params.dataState=DataState.MODELED]
 * @param {string} params.timestamp - ISO model valid time
 * @param {{ latCount: number, lonCount: number, depthCount?: number }} params.dimensions
 * @param {number[]|Float32Array} params.latitudes - 1D array of latitude coordinates
 * @param {number[]|Float32Array} params.longitudes - 1D array of longitude coordinates
 * @param {number[]|Float32Array} [params.depths] - 1D array of depth levels in meters
 * @param {Float32Array|ArrayBuffer} params.data - Contiguous numerical grid payload
 * @param {number} [params.fillValue=-9999.0] - Missing/land fill value
 * @param {object} [params.provenance]
 * @returns {object} CanonicalGridScalar
 */
export function createCanonicalGridScalar({
  id,
  source,
  sourceMode = SourceMode.MODELED,
  variable,
  unit,
  dataState = DataState.MODELED,
  timestamp,
  dimensions,
  latitudes,
  longitudes,
  depths = [0],
  data,
  fillValue = -9999.0,
  provenance = {},
}) {
  if (!id || typeof id !== 'string') throw new Error('CanonicalGridScalar requires a string id');
  if (!source || typeof source !== 'string') throw new Error('CanonicalGridScalar requires a source');
  if (!variable || typeof variable !== 'string') throw new Error('CanonicalGridScalar requires a variable name');
  if (!VALID_DATA_STATES.includes(dataState)) throw new Error(`Invalid dataState: "${dataState}"`);
  if (!unit || !VALID_UNITS.has(unit)) throw new Error(`Invalid oceanographic unit: "${unit}"`);
  if (!dimensions || !dimensions.latCount || !dimensions.lonCount) {
    throw new Error('CanonicalGridScalar requires dimensions with latCount and lonCount');
  }

  const depthCount = dimensions.depthCount || (depths?.length || 1);
  const expectedLength = dimensions.latCount * dimensions.lonCount * depthCount;

  // Convert or validate typed buffer
  let floatBuffer;
  if (data instanceof Float32Array) {
    floatBuffer = data;
  } else if (Array.isArray(data)) {
    floatBuffer = new Float32Array(data);
  } else if (data instanceof ArrayBuffer) {
    floatBuffer = new Float32Array(data);
  } else {
    throw new Error('CanonicalGridScalar data must be a Float32Array, Array, or ArrayBuffer');
  }

  if (floatBuffer.length !== expectedLength) {
    throw new Error(
      `Grid buffer length (${floatBuffer.length}) does not match expected dimension product (${expectedLength})`
    );
  }

  const normLatitudes = latitudes instanceof Float32Array ? latitudes : new Float32Array(latitudes);
  const normLongitudes = longitudes instanceof Float32Array ? longitudes : new Float32Array(longitudes);
  const normDepths = depths instanceof Float32Array ? depths : new Float32Array(depths);

  // Compute bounding statistics
  let minVal = Infinity;
  let maxVal = -Infinity;
  let validCellCount = 0;

  for (let i = 0; i < floatBuffer.length; i++) {
    const v = floatBuffer[i];
    if (v !== fillValue && !isNaN(v) && v > -1e30 && v < 1e30) {
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
      validCellCount++;
    }
  }

  const cleanProvenance = createProvenance({
    source,
    sourceMode,
    observedAt: timestamp,
    ...provenance,
  });

  return {
    kind: 'CANONICAL_GRID_SCALAR',
    id,
    source,
    sourceMode,
    variable,
    unit,
    dataState,
    timestamp: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
    dimensions: {
      latCount: dimensions.latCount,
      lonCount: dimensions.lonCount,
      depthCount,
      totalCells: expectedLength,
    },
    coordinates: {
      latitudes: normLatitudes,
      longitudes: normLongitudes,
      depths: normDepths,
      bbox: {
        minLat: normLatitudes[0],
        maxLat: normLatitudes[normLatitudes.length - 1],
        minLon: normLongitudes[0],
        maxLon: normLongitudes[normLongitudes.length - 1],
        minDepth: normDepths[0],
        maxDepth: normDepths[normDepths.length - 1],
      },
    },
    data: floatBuffer,
    fillValue,
    stats: {
      minValue: minVal === Infinity ? null : Number(minVal.toFixed(4)),
      maxValue: maxVal === -Infinity ? null : Number(maxVal.toFixed(4)),
      validCellCount,
      memorySizeBytes: floatBuffer.byteLength,
    },
    provenance: cleanProvenance,

    /**
     * Fast indexing lookup
     */
    getValue(latIdx, lonIdx, depthIdx = 0) {
      if (latIdx < 0 || latIdx >= dimensions.latCount || lonIdx < 0 || lonIdx >= dimensions.lonCount || depthIdx >= depthCount) {
        return null;
      }
      const idx = (depthIdx * dimensions.latCount * dimensions.lonCount) + (latIdx * dimensions.lonCount) + lonIdx;
      const val = floatBuffer[idx];
      return (val === fillValue || isNaN(val)) ? null : Number(val.toFixed(4));
    },
  };
}
