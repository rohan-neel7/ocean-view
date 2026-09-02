/**
 * OceanView — Dataset Capabilities Registry
 * Enforces strict scientific capabilities per dataset. 
 * Prevents invalid dimension combinations (e.g. arbitrary depth for a surface-only dataset).
 */

// Native depths supported by the SDC_GLO_CLIM_TS_V2_2 Climatology model
export const SDC_DEPTH_LEVELS = Object.freeze([
  0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500, 600,
  700, 800, 900, 1000, 1200, 1500, 2000, 2500, 3000, 4000, 5000, 6000,
]);

// Native time dimensions supported by the SDC monthly climatology
export const SDC_TIME_STEPS = Object.freeze([
  { step: 0, label: 'NE Monsoon',          time: 'Jan – Mar climatological mean', value: '2010-01-16T00:00:00Z' },
  { step: 1, label: 'Spring Inter-monsoon', time: 'Apr – May climatological mean', value: '2010-04-16T00:00:00Z' },
  { step: 2, label: 'SW Monsoon',           time: 'Jun – Sep climatological mean', value: '2010-07-16T00:00:00Z' },
  { step: 3, label: 'Fall Inter-monsoon',   time: 'Oct – Dec climatological mean', value: '2010-10-16T00:00:00Z' },
]);

// Native time dimensions for ANDRO current climatology
export const ANDRO_TIME_STEPS = Object.freeze([
  { step: 0, label: 'Annual Mean', time: 'Annual Climatology', value: '2025-01-01T00:00:00Z' }
]);

export const DATASET_CAPABILITIES = {
  sea_surface_temperature: {
    id: 'sea_surface_temperature',
    displayName: 'Temperature (SST)',
    kind: 'SCALAR',
    provider: 'SeaDataNet',
    canonicalType: 'CanonicalGridScalar',
    supportedDepths: SDC_DEPTH_LEVELS,
    supportedTimes: SDC_TIME_STEPS,
    temporalSemantics: 'CLIMATOLOGY',
    available: true,
  },
  salinity: {
    id: 'salinity',
    displayName: 'Salinity (SSS)',
    kind: 'SCALAR',
    provider: 'SeaDataNet',
    canonicalType: 'CanonicalGridScalar',
    supportedDepths: SDC_DEPTH_LEVELS,
    supportedTimes: SDC_TIME_STEPS,
    temporalSemantics: 'CLIMATOLOGY',
    available: true,
  },
  ocean_current_velocity: {
    id: 'ocean_current_velocity',
    displayName: 'Current Velocity',
    kind: 'VECTOR',
    provider: 'ANDRO / Ifremer',
    canonicalType: 'CanonicalGridVector',
    supportedDepths: [0, 5, 10, 20, 50, 100, 500, 1000], // ANDRO depth bins
    supportedTimes: ANDRO_TIME_STEPS,
    temporalSemantics: 'STATIC_CLIMATOLOGY', // Does not animate through time in UI
    available: true,
  },
  chlorophyll_a: {
    id: 'chlorophyll_a',
    displayName: 'Chlorophyll-a',
    kind: 'SCALAR',
    provider: 'Unknown',
    canonicalType: 'CanonicalGridScalar',
    supportedDepths: [],
    supportedTimes: [],
    temporalSemantics: 'UNAVAILABLE',
    available: false,
  }
};
