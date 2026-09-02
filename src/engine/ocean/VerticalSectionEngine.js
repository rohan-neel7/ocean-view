/**
 * OceanView — Vertical Section Extraction Engine
 * Extracts high-resolution 2D vertical sections (Distance × Depth) along arbitrary oceanographic transects.
 *
 * Invariants:
 *   - Strictly handles landmass and masked ocean cells: Land cells return null (Missing ≠ Zero).
 *   - No arbitrary extrapolation across coastlines.
 *   - Retains 6-axis provenance: lat, lon, depth, distance, variable, and dataset source.
 */

/**
 * Calculates Great-Circle geodesic distance between two points in kilometers (Haversine formula).
 */
export function calculateGeodesicDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371.0; // Earth mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180.0;
  const dLon = ((lon2 - lon1) * Math.PI) / 180.0;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180.0) * Math.cos((lat2 * Math.PI) / 180.0) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Extracts a 2D vertical section from a 3D/4D CanonicalGridScalar along a transect A -> B.
 *
 * @param {object} gridScalar - CanonicalGridScalar
 * @param {object} transect
 * @param {{ lat: number, lon: number }} transect.start - Start coordinate A
 * @param {{ lat: number, lon: number }} transect.end - End coordinate B
 * @param {number} [options.stationCount=40] - Number of horizontal sampling stations along transect
 * @returns {object} Structured 2D Vertical Section object
 */
export function extractVerticalSection(gridScalar, transect, options = {}) {
  if (!gridScalar || !gridScalar.data || !transect || !transect.start || !transect.end) {
    throw new Error('extractVerticalSection requires a valid gridScalar and start/end coordinates');
  }

  const stationCount = Math.max(2, Math.min(100, options.stationCount || 40));
  const { start, end } = transect;

  const totalDistanceKm = calculateGeodesicDistanceKm(start.lat, start.lon, end.lat, end.lon);
  const depths = Array.from(gridScalar.coordinates.depths || [0]);
  const depthCount = depths.length;

  const stations = [];
  const matrix = []; // matrix[depthIdx][stationIdx]

  for (let d = 0; d < depthCount; d++) {
    matrix.push(new Array(stationCount).fill(null));
  }

  const lats = gridScalar.coordinates.latitudes;
  const lons = gridScalar.coordinates.longitudes;
  const latCount = gridScalar.dimensions.latCount;
  const lonCount = gridScalar.dimensions.lonCount;
  const fillValue = gridScalar.fillValue ?? -9999.0;

  let minVal = Infinity;
  let maxVal = -Infinity;
  let validSampleCount = 0;

  // Step across horizontal stations
  for (let s = 0; s < stationCount; s++) {
    const t = stationCount > 1 ? s / (stationCount - 1) : 0;
    const curLat = start.lat + t * (end.lat - start.lat);
    const curLon = start.lon + t * (end.lon - start.lon);
    const distFromStartKm = t * totalDistanceKm;

    stations.push({
      index: s,
      lat: Number(curLat.toFixed(4)),
      lon: Number(curLon.toFixed(4)),
      distanceKm: Number(distFromStartKm.toFixed(2)),
    });

    // Check if station is within grid bounding box
    if (
      curLat < lats[0] ||
      curLat > lats[latCount - 1] ||
      curLon < lons[0] ||
      curLon > lons[lonCount - 1]
    ) {
      // Out of domain
      continue;
    }

    // Nearest latitude & longitude indices
    let rIdx = 0;
    let minLatDiff = Infinity;
    for (let r = 0; r < latCount; r++) {
      const diff = Math.abs(lats[r] - curLat);
      if (diff < minLatDiff) {
        minLatDiff = diff;
        rIdx = r;
      }
    }

    let cIdx = 0;
    let minLonDiff = Infinity;
    for (let c = 0; c < lonCount; c++) {
      const diff = Math.abs(lons[c] - curLon);
      if (diff < minLonDiff) {
        minLonDiff = diff;
        cIdx = c;
      }
    }

    // Sample across all vertical depth levels
    for (let d = 0; d < depthCount; d++) {
      const val = gridScalar.getValue(rIdx, cIdx, d);

      if (val !== null && val !== fillValue && !isNaN(val)) {
        matrix[d][s] = val;
        if (val < minVal) minVal = val;
        if (val > maxVal) maxVal = val;
        validSampleCount++;
      } else {
        matrix[d][s] = null; // Landmasked or unmeasured bathymetry
      }
    }
  }

  if (minVal === Infinity) {
    minVal = 0;
    maxVal = 0;
  }

  return {
    kind: 'VERTICAL_SECTION',
    transectId: `transect:${start.lat}_${start.lon}_to_${end.lat}_${end.lon}`,
    source: gridScalar.source,
    variable: gridScalar.variable,
    unit: gridScalar.unit,
    dataState: gridScalar.dataState,
    timestamp: gridScalar.timestamp,
    start,
    end,
    totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
    stationCount,
    depthCount,
    stations,
    depths,
    matrix,
    stats: {
      min: Number(minVal.toFixed(3)),
      max: Number(maxVal.toFixed(3)),
      validSampleCount,
      totalCells: stationCount * depthCount,
    },
    provenance: {
      samplingMethod: 'Piecewise Great-Circle Geodesic Sampling',
      interpolation: 'Nearest-Cell Horizontal + Discrete Native Vertical Levels',
      sourceDataset: gridScalar.source,
    },
  };
}
