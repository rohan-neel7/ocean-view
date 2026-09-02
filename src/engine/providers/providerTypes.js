/**
 * OceanView — Provider Type System
 * Frozen enum objects for provider classification, health tracking, and capabilities.
 *
 * Invariants:
 *   - ProviderTier ≠ confidence (Tier is institutional authority classification)
 *   - ProviderStatus ≠ FreshnessStatus (Provider connectivity vs data age)
 *   - RuntimeState reflects genuine connectivity: UNVERIFIED / PLANNED when unverified
 */

export const ProviderTier = Object.freeze({
  TIER_A: 'TIER_A', // Official National Oceanographic Authority (INCOIS, NOAA, IMD)
  TIER_B: 'TIER_B', // International Earth Observation & Float Arrays (Argo GDAC, Copernicus, NASA)
  TIER_C: 'TIER_C', // Research Cruises & Commercial Sensors (Ship CTD, Commercial Gliders)
  TIER_D: 'TIER_D', // Synthetic / Simulation / Historical Replay
});

export const ProviderRole = Object.freeze({
  OCEAN_MODEL: 'OCEAN_MODEL',           // Numerical forecast / hindcast models (MOM6, HYCOM, NEMO)
  IN_SITU_OBSERVATION: 'IN_SITU_OBSERVATION', // Profiling floats, moorings, CTD casts
  SATELLITE_REMOTE_SENSING: 'SATELLITE_REMOTE_SENSING', // Satellite SST, Altimetry, Ocean Color
  BATHYMETRY: 'BATHYMETRY',             // Seafloor elevation grids
  VALIDATION: 'VALIDATION',             // Intercomparison & benchmark references
  SIMULATION: 'SIMULATION',             // Synthetic demonstration feeds
});

export const ProviderStatus = Object.freeze({
  UNKNOWN: 'UNKNOWN',
  STARTING: 'STARTING',
  HEALTHY: 'HEALTHY',
  DEGRADED: 'DEGRADED',
  STALE: 'STALE',
  FAILED: 'FAILED',
  DISABLED: 'DISABLED',
});

export const RuntimeState = Object.freeze({
  LIVE: 'LIVE',                 // Verified live endpoint with runtime evidence
  STATIC: 'STATIC',             // Static reference dataset (e.g. GEBCO bathymetry)
  SIMULATION: 'SIMULATION',     // Demonstration / synthetic data generator
  UNCONFIGURED: 'UNCONFIGURED', // Requires API token not provided in environment
  UNVERIFIED: 'UNVERIFIED',     // Adapter written but endpoint not yet verified live
  PLANNED: 'PLANNED',           // Catalogued for future phases
});

export const CoverageType = Object.freeze({
  GLOBAL: 'GLOBAL',
  INDIAN_OCEAN: 'INDIAN_OCEAN',
  ARABIAN_SEA: 'ARABIAN_SEA',
  BAY_OF_BENGAL: 'BAY_OF_BENGAL',
  BBOX: 'BBOX',
  POINT: 'POINT',
});

export const AuthType = Object.freeze({
  NONE: 'NONE',
  API_KEY: 'API_KEY',
  BEARER: 'BEARER',
  OPENDAP_AUTH: 'OPENDAP_AUTH',
});
