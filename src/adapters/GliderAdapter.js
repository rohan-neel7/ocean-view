/**
 * OceanView — Real Autonomous Ocean Glider Ingestion Adapter
 * Normalizes underwater autonomous glider trajectories, dive yo-yos, and vertical profiles.
 * Ingests real EGO / OceanGliders / INCOIS Bay of Bengal and Arabian Sea glider missions.
 */

import { DataState, VALID_DATA_STATES } from '../engine/contracts/intelligenceContract.js';
import { createProvenance, SourceMode } from '../engine/contracts/provenance.js';
import { createCanonicalProfile } from '../engine/ocean/CanonicalProfile.js';
import { createCanonicalTrajectory } from '../engine/ocean/CanonicalTrajectory.js';

/**
 * Normalizes a raw glider dataset into a CanonicalTrajectory and an array of CanonicalProfiles (dive casts).
 *
 * @param {object} rawGliderData
 * @param {string} rawGliderData.platformId - e.g. 'INCOIS_SG543'
 * @param {string} rawGliderData.missionId - e.g. 'BoB_Monsoon_2026'
 * @param {string} [rawGliderData.source='INCOIS_GLIDERS_GDAC']
 * @param {string} [rawGliderData.sourceMode=SourceMode.LIVE]
 * @param {Array<object>} rawGliderData.dives - Array of dive profile objects
 * @returns {{ trajectory: object, profiles: Array<object> }}
 */
export function normalizeGliderMission(rawGliderData) {
  if (!rawGliderData || typeof rawGliderData !== 'object') {
    throw new Error('normalizeGliderMission requires a valid rawGliderData object');
  }

  const {
    platformId,
    missionId = 'MISSION_01',
    source = 'INCOIS_OCEAN_GLIDERS',
    sourceMode = SourceMode.LIVE,
    dives = [],
    dataState = DataState.OBSERVED,
  } = rawGliderData;

  if (!platformId) throw new Error('Glider mission requires platformId');
  if (!Array.isArray(dives) || dives.length === 0) {
    throw new Error('Glider mission requires at least one dive');
  }

  const trajectoryPoints = [];
  const canonicalProfiles = [];

  for (let i = 0; i < dives.length; i++) {
    const dive = dives[i];
    const {
      diveNumber = i + 1,
      lat,
      lon,
      timestamp,
      depths = [],
      temperature = [],
      salinity = [],
      density = [],
      qualityFlags = [],
    } = dive;

    if (typeof lat !== 'number' || typeof lon !== 'number') {
      throw new Error(`Glider dive ${diveNumber} has invalid coordinates`);
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new Error(`Glider dive ${diveNumber} coordinates out of physical bounds`);
    }

    // Trajectory waypoint (surface GPS fix or mean dive coordinate)
    trajectoryPoints.push({
      diveNumber,
      lat,
      lon,
      depthMeters: depths.length > 0 ? Math.max(...depths.filter((d) => d !== null)) : 0,
      timestamp: timestamp || new Date().toISOString(),
    });

    // Canonical dive profile
    const profileId = `glider:${platformId}:${missionId}:dive_${diveNumber}`;
    const cleanDepths = depths.map((d) => (d !== undefined ? d : null));
    const cleanTemp = temperature.map((t) => (t !== undefined ? t : null));
    const cleanSal = salinity.map((s) => (s !== undefined ? s : null));

    const variables = {
      temperature: cleanTemp,
      salinity: cleanSal,
    };

    if (Array.isArray(density) && density.length > 0) {
      variables.density = density.map((rho) => (rho !== undefined ? rho : null));
    }

    const units = {
      temperature: '°C',
      salinity: 'PSU',
      density: 'kg/m³',
    };

    const profile = createCanonicalProfile({
      id: profileId,
      source,
      sourceMode,
      platformId: `${platformId} (Dive #${diveNumber})`,
      platformType: 'GLIDER',
      location: { lat, lon },
      depths: cleanDepths,
      variables,
      units,
      dataState,
      observedAt: timestamp || new Date().toISOString(),
      quality: {
        qualityFlags,
        missionId,
        diveNumber,
      },
      provenance: {
        processingPipeline: 'OceanView_GliderAdapter_v1.0',
        instrumentType: 'Seaglider_CTD_Payload',
      },
    });

    canonicalProfiles.push(profile);
  }

  // Build Canonical Trajectory
  const trajectoryId = `glider_track:${platformId}:${missionId}`;
  const trajectory = createCanonicalTrajectory({
    id: trajectoryId,
    source,
    sourceMode,
    platformId,
    points: trajectoryPoints,
    dataState,
    provenance: {
      missionId,
      totalDives: dives.length,
      platformType: 'AUTONOMOUS_UNDERWATER_GLIDER',
    },
  });

  return { trajectory, profiles: canonicalProfiles };
}
