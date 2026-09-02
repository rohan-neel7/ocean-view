/**
 * OceanView — Real Shipboard CTD Cast Ingestion Adapter
 * Normalizes high-vertical-resolution Conductivity-Temperature-Depth (CTD) rosette casts from research vessels.
 * Ingests SeaDataNet / WOD / Sagar Kanya Arabian Sea and Bay of Bengal research cruise stations.
 */

import { DataState, VALID_DATA_STATES } from '../engine/contracts/intelligenceContract.js';
import { createProvenance, SourceMode } from '../engine/contracts/provenance.js';
import { createCanonicalProfile } from '../engine/ocean/CanonicalProfile.js';

/**
 * Normalizes raw CTD cast data into a CanonicalProfile with platformType: 'CTD_STATION'.
 *
 * @param {object} rawCTD
 * @param {string} rawCTD.cruiseName - e.g. 'SK_392_ARABIAN_SEA'
 * @param {string|number} rawCTD.stationId - e.g. 'STN_04'
 * @param {string} [rawCTD.vesselName='ORV Sagar Kanya']
 * @param {number} rawCTD.lat
 * @param {number} rawCTD.lon
 * @param {string} rawCTD.timestamp
 * @param {Array<number>} rawCTD.depths - Depth levels in meters
 * @param {Array<number|null>} rawCTD.temperature - In situ temperature (°C)
 * @param {Array<number|null>} rawCTD.salinity - Practical Salinity (PSU)
 * @param {Array<number|null>} [rawCTD.dissolvedOxygen] - Dissolved oxygen in umol/kg
 * @param {Array<number|null>} [rawCTD.chlorophyllA] - Chlorophyll-a in mg/m3
 * @param {string} [rawCTD.source='SEADATANET_CTD_SERVICE']
 * @param {string} [rawCTD.sourceMode=SourceMode.LIVE]
 * @returns {object} CanonicalProfile
 */
export function normalizeCTDCast(rawCTD) {
  if (!rawCTD || typeof rawCTD !== 'object') {
    throw new Error('normalizeCTDCast requires a valid rawCTD object');
  }

  const {
    cruiseName,
    stationId,
    vesselName = 'Research Vessel',
    lat,
    lon,
    timestamp,
    depths = [],
    temperature = [],
    salinity = [],
    dissolvedOxygen = null,
    chlorophyllA = null,
    source = 'SEADATANET_CTD_SERVICE',
    sourceMode = SourceMode.LIVE,
    dataState = DataState.OBSERVED,
    qualityFlags = [],
  } = rawCTD;

  if (!cruiseName) throw new Error('CTD cast requires cruiseName');
  if (!stationId) throw new Error('CTD cast requires stationId');
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    throw new Error('CTD cast requires numeric lat and lon coordinates');
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw new Error('CTD cast coordinates out of physical bounds');
  }
  if (!Array.isArray(depths) || depths.length === 0) {
    throw new Error('CTD cast requires non-empty depths array');
  }

  const profileId = `ctd:${cruiseName}:${stationId}`;
  const cleanDepths = depths.map((d) => (d !== undefined && Number.isFinite(d) ? d : null));
  const cleanTemp = temperature.map((t) => (t !== undefined && Number.isFinite(t) ? t : null));
  const cleanSal = salinity.map((s) => (s !== undefined && Number.isFinite(s) ? s : null));

  const variables = {
    temperature: cleanTemp,
    salinity: cleanSal,
  };

  const units = {
    temperature: '°C',
    salinity: 'PSU',
  };

  if (Array.isArray(dissolvedOxygen) && dissolvedOxygen.length === depths.length) {
    variables.dissolved_oxygen = dissolvedOxygen.map((o) => (o !== undefined && Number.isFinite(o) ? o : null));
    units.dissolved_oxygen = 'µmol/kg';
  }

  if (Array.isArray(chlorophyllA) && chlorophyllA.length === depths.length) {
    variables.chlorophyll_a = chlorophyllA.map((ch) => (ch !== undefined && Number.isFinite(ch) ? ch : null));
    units.chlorophyll_a = 'mg/m³';
  }

  return createCanonicalProfile({
    id: profileId,
    source,
    sourceMode,
    platformId: `${cruiseName} (${stationId})`,
    platformType: 'CTD_STATION',
    location: { lat, lon },
    depths: cleanDepths,
    variables,
    units,
    dataState,
    observedAt: timestamp || new Date().toISOString(),
    quality: {
      cruiseName,
      stationId,
      vesselName,
      qualityFlags,
      sensorCount: Object.keys(variables).length,
    },
    provenance: {
      instrument: 'Sea-Bird SBE 911plus CTD Rosette',
      institution: 'INCOIS / NIO Research Fleet',
    },
  });
}
