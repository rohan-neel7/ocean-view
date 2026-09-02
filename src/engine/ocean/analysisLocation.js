/**
 * OceanView — Analysis Location & Spatial Investigation Engine
 * Defines canonical analysis location representations, coordinate parsing,
 * ocean-versus-land discrimination, bounded query extents, model sampling,
 * and nearby observation discovery.
 */

import { sampleVectorFieldBilinear } from './currentMetrics.js';

export const AnalysisLocationSource = Object.freeze({
  CLICK: 'CLICK',
  SEARCH: 'SEARCH',
  REGION_PRESET: 'REGION_PRESET',
  OBSERVATION: 'OBSERVATION',
});

export const AnalysisStatus = Object.freeze({
  IDLE: 'IDLE',
  ANALYZING: 'ANALYZING',
  READY: 'READY',
  PARTIAL: 'PARTIAL',
  UNAVAILABLE: 'UNAVAILABLE',
  ERROR: 'ERROR',
});

/**
 * Creates a formal canonical Analysis Location object.
 *
 * @param {object} params
 * @param {number} params.latitude - Degrees [-90, 90]
 * @param {number} params.longitude - Degrees [-180, 180]
 * @param {string} [params.source=AnalysisLocationSource.CLICK]
 * @param {object} [params.bounds=null] - { minLat, maxLat, minLon, maxLon }
 * @param {string} [params.status=AnalysisStatus.READY]
 * @param {object} [params.datasetCoverage={}]
 * @returns {object} Canonical Analysis Location
 */
export function createAnalysisLocation({
  latitude,
  longitude,
  source = AnalysisLocationSource.CLICK,
  bounds = null,
  status = AnalysisStatus.READY,
  datasetCoverage = {},
} = {}) {
  const lat = Number(Number(latitude).toFixed(4));
  const lon = Number(Number(longitude).toFixed(4));

  const latHem = lat >= 0 ? 'N' : 'S';
  const lonHem = lon >= 0 ? 'E' : 'W';
  const formatted = `${Math.abs(lat).toFixed(2)}°${latHem}, ${Math.abs(lon).toFixed(2)}°${lonHem}`;

  const computedBounds = bounds || getAnalysisBounds({ latitude: lat, longitude: lon });

  return {
    latitude: lat,
    longitude: lon,
    formatted,
    source,
    bounds: computedBounds,
    status,
    datasetCoverage,
    selectedAt: new Date().toISOString(),
  };
}

/**
 * Parses diverse coordinate query formats:
 * - Decimal: "15.2, 68.4" or "15.2 68.4"
 * - Cardinal: "15.2N 68.4E" or "15.2 N, 68.4 E" or "12S 45W"
 * - DMS: "15°12'N 68°24'E"
 *
 * @param {string} query
 * @returns {{ valid: boolean, latitude?: number, longitude?: number, formatted?: string, error?: string }}
 */
export function parseCoordinateQuery(query) {
  if (!query || typeof query !== 'string') {
    return { valid: false, error: 'Empty query' };
  }

  const clean = query.trim();
  if (clean.length === 0) {
    return { valid: false, error: 'Empty query' };
  }

  // 1. DMS notation: e.g. 15°12'N 68°24'E or 15°12'30"N 68°24'15"E
  const dmsRegex = /(\d+(?:\.\d+)?)\s*°\s*(?:(\d+(?:\.\d+)?)\s*['′]\s*)?(?:(\d+(?:\.\d+)?)\s*["″]\s*)?([NSEWnsew])\s*[, ]\s*(\d+(?:\.\d+)?)\s*°\s*(?:(\d+(?:\.\d+)?)\s*['′]\s*)?(?:(\d+(?:\.\d+)?)\s*["″]\s*)?([NSEWnsew])/i;
  const dmsMatch = clean.match(dmsRegex);
  if (dmsMatch) {
    let latDeg = parseFloat(dmsMatch[1]) + (parseFloat(dmsMatch[2] || 0) / 60) + (parseFloat(dmsMatch[3] || 0) / 3600);
    const latHem = dmsMatch[4].toUpperCase();
    if (latHem === 'S') latDeg = -latDeg;

    let lonDeg = parseFloat(dmsMatch[5]) + (parseFloat(dmsMatch[6] || 0) / 60) + (parseFloat(dmsMatch[7] || 0) / 3600);
    const lonHem = dmsMatch[8].toUpperCase();
    if (lonHem === 'W') lonDeg = -lonDeg;

    return validateAndFormatCoordinates(latDeg, lonDeg);
  }

  // 2. Cardinal notation: e.g. "15.2N 68.4E" or "15.2 N, 68.4 E" or "12S 45W"
  const cardinalRegex = /([+-]?\d+(?:\.\d+)?)\s*([NSEWnsew])\s*[, ]\s*([+-]?\d+(?:\.\d+)?)\s*([NSEWnsew])/i;
  const cardinalMatch = clean.match(cardinalRegex);
  if (cardinalMatch) {
    let val1 = parseFloat(cardinalMatch[1]);
    const hem1 = cardinalMatch[2].toUpperCase();
    let val2 = parseFloat(cardinalMatch[3]);
    const hem2 = cardinalMatch[4].toUpperCase();

    let lat = 0;
    let lon = 0;

    if (hem1 === 'N' || hem1 === 'S') {
      lat = hem1 === 'S' ? -Math.abs(val1) : Math.abs(val1);
      lon = hem2 === 'W' ? -Math.abs(val2) : Math.abs(val2);
    } else {
      lon = hem1 === 'W' ? -Math.abs(val1) : Math.abs(val1);
      lat = hem2 === 'S' ? -Math.abs(val2) : Math.abs(val2);
    }

    return validateAndFormatCoordinates(lat, lon);
  }

  // 3. Decimal notation: e.g. "15.2, 68.4" or "15.2 68.4"
  const decimalRegex = /^([+-]?\d+(?:\.\d+)?)\s*[, \t]+\s*([+-]?\d+(?:\.\d+)?)$/;
  const decimalMatch = clean.match(decimalRegex);
  if (decimalMatch) {
    const lat = parseFloat(decimalMatch[1]);
    const lon = parseFloat(decimalMatch[2]);
    return validateAndFormatCoordinates(lat, lon);
  }

  return {
    valid: false,
    error: 'Unrecognized format. Use "15.2, 68.4", "15.2N 68.4E", or "15°12\'N 68°24\'E"',
  };
}

function validateAndFormatCoordinates(lat, lon) {
  if (isNaN(lat) || isNaN(lon)) {
    return { valid: false, error: 'Invalid numeric coordinate values' };
  }
  if (lat < -90 || lat > 90) {
    return { valid: false, error: `Latitude ${lat.toFixed(2)}° is out of range [-90, 90]` };
  }
  if (lon < -180 || lon > 180) {
    return { valid: false, error: `Longitude ${lon.toFixed(2)}° is out of range [-180, 180]` };
  }

  const latFixed = Number(lat.toFixed(4));
  const lonFixed = Number(lon.toFixed(4));
  const latHem = latFixed >= 0 ? 'N' : 'S';
  const lonHem = lonFixed >= 0 ? 'E' : 'W';
  const formatted = `${Math.abs(latFixed).toFixed(2)}°${latHem}, ${Math.abs(lonFixed).toFixed(2)}°${lonHem}`;

  return {
    valid: true,
    latitude: latFixed,
    longitude: lonFixed,
    formatted,
  };
}

/**
 * Checks whether a given geographic coordinate falls in an ocean domain
 * or inside major continental landmasses.
 *
 * @param {number} lat - Latitude in degrees
 * @param {number} lon - Longitude in degrees
 * @returns {{ isOcean: boolean, reason?: string }}
 */
export function isOceanLocation(lat, lon) {
  if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
    return { isOcean: false, reason: 'Invalid coordinates' };
  }

  // Major continental bounding boxes (fast spatial rejection for land clicks)
  // 1. Indian Subcontinent land interior
  if (lat >= 8.5 && lat <= 35.0 && lon >= 69.5 && lon <= 89.0) {
    if ((lat >= 12.0 && lat <= 30.0 && lon >= 74.0 && lon <= 84.0) ||
        (lat >= 20.0 && lat <= 32.0 && lon >= 70.0 && lon <= 88.0)) {
      return { isOcean: false, reason: 'Selected point is within continental India landmass.' };
    }
  }

  // 2. Arabian Peninsula interior
  if (lat >= 14.0 && lat <= 32.0 && lon >= 38.0 && lon <= 55.0) {
    return { isOcean: false, reason: 'Selected point is within Arabian Peninsula landmass.' };
  }

  // 3. African Continent interior (Horn of Africa & East Africa)
  if (lat >= -35.0 && lat <= 12.0 && lon >= 10.0 && lon <= 43.0) {
    return { isOcean: false, reason: 'Selected point is within African continental landmass.' };
  }

  // 4. Australian Continent interior
  if (lat >= -39.0 && lat <= -11.0 && lon >= 113.0 && lon <= 153.0) {
    return { isOcean: false, reason: 'Selected point is within Australian continental landmass.' };
  }

  // 5. Antarctic ice sheet
  if (lat < -72.0) {
    return { isOcean: false, reason: 'Selected point is on Antarctic ice sheet.' };
  }

  return { isOcean: true };
}

/**
 * Derives a bounded scientific query window around an analysis location.
 * Clamps strictly to valid geographic limits and dataset-supported bounds.
 *
 * @param {object} params
 * @param {number} params.latitude
 * @param {number} params.longitude
 * @param {number} [params.radiusDeg=3.0] - Half-width of query window in degrees
 * @returns {{ minLat: number, maxLat: number, minLon: number, maxLon: number }}
 */
export function getAnalysisBounds({ latitude, longitude, radiusDeg = 3.0 } = {}) {
  const r = Math.max(1.0, Math.min(10.0, Number(radiusDeg) || 3.0));

  const minLat = Number(Math.max(-90, latitude - r).toFixed(2));
  const maxLat = Number(Math.min(90, latitude + r).toFixed(2));
  const minLon = Number(Math.max(-180, longitude - r).toFixed(2));
  const maxLon = Number(Math.min(180, longitude + r).toFixed(2));

  return { minLat, maxLat, minLon, maxLon };
}

/**
 * Calculates great-circle spherical distance between two points on Earth in kilometers.
 *
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} Distance in kilometers
 */
export function calculateGeodesicDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371.0; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180.0;
  const dLon = ((lon2 - lon1) * Math.PI) / 180.0;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180.0) *
      Math.cos((lat2 * Math.PI) / 180.0) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

/**
 * Finds nearby in-situ observations within a specified radius from the analysis location.
 *
 * @param {{ latitude: number, longitude: number }} location
 * @param {Array<object>} profiles - CanonicalProfile array from OceanProfileStore
 * @param {number} [maxRadiusKm=500] - Search radius in km
 * @returns {{ nearbyProfiles: Array<object>, nearest: object|null, counts: object }}
 */
export function findNearbyObservations(location, profiles = [], maxRadiusKm = 500) {
  if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
    return { nearbyProfiles: [], nearest: null, counts: { argo: 0, glider: 0, ctd: 0, bgc: 0, total: 0 } };
  }

  const { latitude, longitude } = location;

  const withDistances = [];
  const counts = { argo: 0, glider: 0, ctd: 0, bgc: 0, total: 0 };

  for (const p of profiles) {
    if (!p.location || typeof p.location.lat !== 'number' || typeof p.location.lon !== 'number') {
      continue;
    }

    const dist = calculateGeodesicDistanceKm(latitude, longitude, p.location.lat, p.location.lon);
    if (dist <= maxRadiusKm) {
      withDistances.push({
        profile: p,
        distanceKm: dist,
      });

      switch (p.platformType) {
        case 'ARGO_FLOAT':
          counts.argo++;
          break;
        case 'GLIDER':
          counts.glider++;
          break;
        case 'CTD_CAST':
        case 'CTD_STATION':
          counts.ctd++;
          break;
        case 'BGC_ARGO':
        case 'BGC_ARGO_FLOAT':
          counts.bgc++;
          break;
      }
      counts.total++;
    }
  }

  // Sort by distance ascending
  withDistances.sort((a, b) => a.distanceKm - b.distanceKm);

  return {
    nearbyProfiles: withDistances,
    nearest: withDistances.length > 0 ? withDistances[0] : null,
    counts,
  };
}

/**
 * Bilinearly samples a CanonicalGridScalar at a target location and depth.
 *
 * @param {object} gridScalar
 * @param {number} targetLat
 * @param {number} targetLon
 * @param {number} [depthMeters=0]
 * @returns {number|null}
 */
export function sampleScalarGridBilinear(gridScalar, targetLat, targetLon, depthMeters = 0) {
  if (!gridScalar || !gridScalar.coordinates || !gridScalar.data) return null;
  const { latitudes: lats, longitudes: lons, depths } = gridScalar.coordinates;

  if (targetLat < lats[0] || targetLat > lats[lats.length - 1] || targetLon < lons[0] || targetLon > lons[lons.length - 1]) {
    return null; // Out of bounds
  }

  // Find closest depth index
  let depthIdx = 0;
  if (depths && depths.length > 1) {
    let minDiff = Infinity;
    for (let d = 0; d < depths.length; d++) {
      const diff = Math.abs(depths[d] - depthMeters);
      if (diff < minDiff) {
        minDiff = diff;
        depthIdx = d;
      }
    }
  }

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

  const v00 = gridScalar.getValue(r0, c0, depthIdx);
  const v10 = gridScalar.getValue(r1, c0, depthIdx);
  const v01 = gridScalar.getValue(r0, c1, depthIdx);
  const v11 = gridScalar.getValue(r1, c1, depthIdx);

  if (v00 === null && v10 === null && v01 === null && v11 === null) return null;

  const validVals = [v00, v10, v01, v11].filter((x) => x !== null);
  if (validVals.length < 4) {
    return Number(validVals[0].toFixed(2));
  }

  const u = (targetLon - lons[c0]) / (lons[c1] - lons[c0] || 1);
  const v = (targetLat - lats[r0]) / (lats[r1] - lats[r0] || 1);

  const interp = (1 - u) * (1 - v) * v00 + u * (1 - v) * v01 + (1 - u) * v * v10 + u * v * v11;
  return Number(interp.toFixed(2));
}

/**
 * Samples all available oceanographic model fields at an analysis location and depth.
 *
 * @param {object} location - AnalysisLocation
 * @param {object} gridStore - OceanGridStore instance
 * @param {number} [depthMeters=0]
 * @returns {object|null}
 */
export function sampleAnalysisLocation(location, gridStore, depthMeters = 0) {
  if (!location || !gridStore) return null;
  const allGrids = gridStore.getAll();

  const tempGrid = allGrids.find(
    (g) => g.kind === 'CANONICAL_GRID_SCALAR' && (g.variable === 'temperature' || g.variable === 'sea_surface_temperature')
  );
  const salGrid = allGrids.find(
    (g) => g.kind === 'CANONICAL_GRID_SCALAR' && g.variable === 'salinity'
  );
  const vecGrid = allGrids.find((g) => g.kind === 'CANONICAL_GRID_VECTOR');

  const tempVal = tempGrid ? sampleScalarGridBilinear(tempGrid, location.latitude, location.longitude, depthMeters) : null;
  const salVal = salGrid ? sampleScalarGridBilinear(salGrid, location.latitude, location.longitude, depthMeters) : null;

  let vecVal = null;
  if (vecGrid) {
    let depthIdx = 0;
    const depths = vecGrid.coordinates?.depths;
    if (depths && depths.length > 1) {
      let minDiff = Infinity;
      for (let d = 0; d < depths.length; d++) {
        const diff = Math.abs(depths[d] - depthMeters);
        if (diff < minDiff) {
          minDiff = diff;
          depthIdx = d;
        }
      }
    }
    vecVal = sampleVectorFieldBilinear(vecGrid, location.latitude, location.longitude, depthIdx);
  }

  return {
    location,
    depthMeters,
    temperature: tempVal !== null ? {
      value: tempVal,
      unit: tempGrid?.unit || '°C',
      source: tempGrid?.source || 'SeaDataNet',
      dataState: tempGrid?.dataState || 'MODELED',
    } : null,
    salinity: salVal !== null ? {
      value: salVal,
      unit: salGrid?.unit || 'PSU',
      source: salGrid?.source || 'SeaDataNet',
      dataState: salGrid?.dataState || 'MODELED',
    } : null,
    current: vecVal ? {
      u: vecVal.u,
      v: vecVal.v,
      speed: vecVal.speed,
      headingDeg: vecVal.headingDeg,
      unit: vecGrid?.unit || 'm/s',
      source: vecGrid?.source || 'ANDRO',
      dataState: vecGrid?.temporalState || 'CLIMATOLOGY',
    } : null,
  };
}
