/**
 * OceanView — Real Argo Profiling Float Ingestion Adapter
 * Normalizes Coriolis GDAC / ERDDAP tabledap in-situ observations into CanonicalProfile.
 *
 * Invariants:
 *   - DataState is strictly DataState.OBSERVED
 *   - Missing values / fill values become null (never 0.0)
 *   - Quality flags (TEMP_QC, PSAL_QC) are preserved
 *   - Pressure (dbar) is converted to Depth (meters) via Saunders (1981)
 */

import { createCanonicalProfile } from '../engine/ocean/CanonicalProfile.js';
import { DataState, SourceMode } from '../engine/contracts/intelligenceContract.js';
import { pressureToDepthMeters } from '../engine/spatial/depthCoordinates.js';

/**
 * Normalizes an Argo float profile payload into a CanonicalProfile.
 *
 * @param {object} raw
 * @param {string} raw.platformNumber - WMO platform number (e.g. '2900771')
 * @param {number} [raw.cycleNumber]
 * @param {string} raw.time - ISO timestamp
 * @param {number} raw.latitude
 * @param {number} raw.longitude
 * @param {Array<object>} raw.levels - Array of { pres, temp, psal, tempQc, psalQc }
 * @param {object} [options]
 * @param {string} [options.sourceMode=SourceMode.LIVE]
 * @param {string} [options.sourceId='ARGO_GDAC_CORIOLIS']
 * @returns {object} CanonicalProfile
 */
export function normalizeArgoProfile(raw, options = {}) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('ArgoAdapter: Raw profile must be a non-null object');
  }

  const { platformNumber, cycleNumber = 0, time, latitude, longitude, levels = [] } = raw;

  if (!platformNumber || typeof platformNumber !== 'string') {
    throw new Error('ArgoAdapter: Missing or invalid platformNumber');
  }

  if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
    throw new Error(`ArgoAdapter: Invalid latitude ${latitude}`);
  }

  if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
    throw new Error(`ArgoAdapter: Invalid longitude ${longitude}`);
  }

  const parsedTime = new Date(time);
  if (isNaN(parsedTime.getTime())) {
    throw new Error(`ArgoAdapter: Invalid ISO timestamp "${time}"`);
  }

  const sourceMode = options.sourceMode || SourceMode.LIVE;
  const sourceId = options.sourceId || 'INCOIS_ARGO_GDAC';

  const depths = [];
  const pressures = [];
  const temperatures = [];
  const salinities = [];
  const qcFlags = {
    temperature: [],
    salinity: [],
  };

  for (const lvl of levels) {
    const pres = typeof lvl.pres === 'number' ? lvl.pres : null;
    const depth = lvl.depthMeters !== undefined ? lvl.depthMeters : (pres !== null ? pressureToDepthMeters(pres, latitude) : null);

    // Sanitize fill values
    const temp = sanitizeOceanValue(lvl.temp);
    const psal = sanitizeOceanValue(lvl.psal);

    depths.push(depth);
    pressures.push(pres);
    temperatures.push(temp);
    salinities.push(psal);
    qcFlags.temperature.push(lvl.tempQc ?? 1);
    qcFlags.salinity.push(lvl.psalQc ?? 1);
  }

  const profileId = `argo:${platformNumber}:c${cycleNumber}`;

  return createCanonicalProfile({
    id: profileId,
    source: sourceId,
    sourceMode,
    platformId: `WMO_${platformNumber}`,
    platformType: 'ARGO_FLOAT',
    observedAt: parsedTime.toISOString(),
    location: {
      lat: Number(latitude.toFixed(4)),
      lon: Number(longitude.toFixed(4)),
      minDepthMeters: depths.length > 0 ? depths[0] : 0,
      maxDepthMeters: depths.length > 0 ? depths[depths.length - 1] : 0,
    },
    depths,
    variables: {
      temperature: temperatures,
      salinity: salinities,
      pressure: pressures,
    },
    units: {
      temperature: '°C',
      salinity: 'PSU',
      pressure: 'dbar',
    },
    quality: {
      cycleNumber,
      qcFlags,
    },
    dataState: DataState.OBSERVED,
  });
}

/**
 * Parses tabledap JSON response from ERDDAP into an array of normalized profiles.
 *
 * @param {object} tabledapJson
 * @param {object} [options]
 * @returns {Array<object>} Array of CanonicalProfile
 */
export function parseTabledapArgoResponse(tabledapJson, options = {}) {
  if (!tabledapJson || !tabledapJson.table || !Array.isArray(tabledapJson.table.rows)) {
    return [];
  }

  const cols = tabledapJson.table.columnNames || [];
  const rows = tabledapJson.table.rows || [];

  const colIdx = {
    platform: cols.indexOf('platform_number'),
    cycle: cols.indexOf('cycle_number'),
    time: cols.indexOf('time'),
    lat: cols.indexOf('latitude'),
    lon: cols.indexOf('longitude'),
    pres: cols.indexOf('pres'),
    temp: cols.indexOf('temp'),
    psal: cols.indexOf('psal'),
    tempQc: cols.indexOf('temp_qc'),
    psalQc: cols.indexOf('psal_qc'),
  };

  // Group rows by platform_number and cycle_number
  const groups = new Map();

  for (const r of rows) {
    const platform = String(r[colIdx.platform]);
    const cycle = r[colIdx.cycle] || 0;
    const groupKey = `${platform}_${cycle}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        platformNumber: platform,
        cycleNumber: cycle,
        time: r[colIdx.time],
        latitude: r[colIdx.lat],
        longitude: r[colIdx.lon],
        levels: [],
      });
    }

    groups.get(groupKey).levels.push({
      pres: r[colIdx.pres],
      temp: r[colIdx.temp],
      psal: r[colIdx.psal],
      tempQc: colIdx.tempQc !== -1 ? r[colIdx.tempQc] : 1,
      psalQc: colIdx.psalQc !== -1 ? r[colIdx.psalQc] : 1,
    });
  }

  const profiles = [];
  for (const group of groups.values()) {
    try {
      profiles.push(normalizeArgoProfile(group, options));
    } catch (err) {
      console.warn(`[ArgoAdapter] Skipped malformed profile: ${err.message}`);
    }
  }

  return profiles;
}

function sanitizeOceanValue(val) {
  if (val === null || val === undefined || isNaN(val)) return null;
  if (val < -100 || val > 9999) return null; // Standard fill values
  return Number(val.toFixed(3));
}
