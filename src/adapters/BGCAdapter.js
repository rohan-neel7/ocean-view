/**
 * OceanView — Real Biogeochemical (BGC) Ocean Observation Adapter
 * Ingests BGC-Argo and satellite ocean color biogeochemical parameters.
 * Strict Truthfulness Invariant: Every BGC variable independently reports availability; unmeasured parameters are explicitly stamped UNAVAILABLE (Missing ≠ Zero).
 */

import { DataState, VALID_DATA_STATES } from '../engine/contracts/intelligenceContract.js';
import { createProvenance, SourceMode } from '../engine/contracts/provenance.js';
import { createCanonicalProfile } from '../engine/ocean/CanonicalProfile.js';

export const BGC_VARIABLES = Object.freeze({
  CHLOROPHYLL_A: {
    id: 'chlorophyll_a',
    name: 'Chlorophyll-a Concentration',
    unit: 'mg/m³',
    min: 0.01,
    max: 20.0,
    sensor: 'ECO Triplet Fluorometer',
  },
  DISSOLVED_OXYGEN: {
    id: 'dissolved_oxygen',
    name: 'Dissolved Oxygen Concentration',
    unit: 'µmol/kg',
    min: 0.0,
    max: 450.0,
    sensor: 'Aanderaa Optode 4330',
  },
  NITRATE: {
    id: 'nitrate',
    name: 'Dissolved Nitrate Concentration',
    unit: 'µmol/kg',
    min: 0.0,
    max: 50.0,
    sensor: 'SUNA V2 UV Spectrophotometer',
  },
  PH: {
    id: 'ph_in_situ',
    name: 'In-situ pH Total Scale',
    unit: 'pH units',
    min: 7.2,
    max: 8.4,
    sensor: 'SeapHOx ISFET Sensor',
  },
});

/**
 * Normalizes raw BGC profile observation.
 *
 * @param {object} rawBGC
 * @param {string} rawBGC.wmo - e.g. '2902088'
 * @param {number} rawBGC.cycleNumber
 * @param {number} rawBGC.lat
 * @param {number} rawBGC.lon
 * @param {string} rawBGC.timestamp
 * @param {Array<number>} rawBGC.depths
 * @param {object} rawBGC.measurements - Map of variable arrays (e.g. { chlorophyll_a: [...], temperature: [...] })
 * @param {string} [rawBGC.source='CORIOLIS_BGC_GDAC']
 * @param {string} [rawBGC.sourceMode=SourceMode.LIVE]
 * @returns {object} CanonicalProfile with explicit per-variable data states
 */
export function normalizeBGCProfile(rawBGC) {
  if (!rawBGC || typeof rawBGC !== 'object') {
    throw new Error('normalizeBGCProfile requires a valid rawBGC object');
  }

  const {
    wmo,
    cycleNumber = 1,
    lat,
    lon,
    timestamp,
    depths = [],
    measurements = {},
    source = 'CORIOLIS_BGC_GDAC',
    sourceMode = SourceMode.LIVE,
    qualityFlags = {},
  } = rawBGC;

  if (!wmo) throw new Error('BGC profile requires WMO identifier');
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    throw new Error('BGC profile requires numeric coordinates');
  }
  if (!Array.isArray(depths) || depths.length === 0) {
    throw new Error('BGC profile requires non-empty depths array');
  }

  const profileId = `bgc_argo:${wmo}:cycle_${cycleNumber}`;
  const cleanDepths = depths.map((d) => (d !== undefined && Number.isFinite(d) ? d : null));

  const variables = {};
  const units = {};
  const variableStates = {};

  // Check physical and BGC variable channels
  const channels = ['temperature', 'salinity', 'chlorophyll_a', 'dissolved_oxygen', 'nitrate', 'ph_in_situ'];

  for (const channel of channels) {
    const rawArray = measurements[channel];
    if (Array.isArray(rawArray) && rawArray.length === depths.length) {
      variables[channel] = rawArray.map((val) => {
        if (val === null || val === undefined || !Number.isFinite(val)) return null;
        // Verify physical non-negativity for bio concentrations
        if ((channel === 'chlorophyll_a' || channel === 'dissolved_oxygen' || channel === 'nitrate') && val < 0) {
          return null; // Negative concentration is unphysical sensor drift
        }
        return val;
      });

      if (channel === 'temperature') units[channel] = '°C';
      else if (channel === 'salinity') units[channel] = 'PSU';
      else if (BGC_VARIABLES[channel.toUpperCase()]) {
        units[channel] = BGC_VARIABLES[channel.toUpperCase()].unit;
      }

      variableStates[channel] = DataState.OBSERVED;
    } else {
      variableStates[channel] = DataState.UNAVAILABLE;
    }
  }

  return createCanonicalProfile({
    id: profileId,
    source,
    sourceMode,
    platformId: `BGC-Argo WMO ${wmo} (Cycle ${cycleNumber})`,
    platformType: 'BGC_ARGO_FLOAT',
    location: { lat, lon },
    depths: cleanDepths,
    variables,
    units,
    dataState: DataState.OBSERVED,
    observedAt: timestamp || new Date().toISOString(),
    quality: {
      cycleNumber,
      wmo,
      variableStates,
      qualityFlags,
      bgcSensorsActive: Object.keys(variables).filter((v) => v !== 'temperature' && v !== 'salinity'),
    },
    provenance: {
      network: 'Global BGC-Argo Array',
      dataAssemblyCenter: 'Coriolis / INCOIS BGC GDAC',
    },
  });
}
