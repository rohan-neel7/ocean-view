/**
 * OceanView — Canonical Globe View State & Region Presets
 * Data-driven definitions for oceanographic domains and scientific view modes.
 */

export const OCEAN_REGIONS = Object.freeze({
  INDIAN_OCEAN_BASIN: {
    id: 'INDIAN_OCEAN_BASIN',
    name: 'Indian Ocean Basin',
    shortName: 'Indian Ocean',
    lon: 75.0,
    lat: 5.0,
    alt: 8500000,
    heading: 0,
    pitch: -88,
    roll: 0,
    description: 'Whole basin tropical and subtropical circulation overview',
  },
  ARABIAN_SEA: {
    id: 'ARABIAN_SEA',
    name: 'Arabian Sea Basin',
    shortName: 'Arabian Sea',
    lon: 66.0,
    lat: 15.0,
    alt: 2800000,
    heading: 0,
    pitch: -70,
    roll: 0,
    description: 'High-salinity evaporative basin and Somali current system',
  },
  BAY_OF_BENGAL: {
    id: 'BAY_OF_BENGAL',
    name: 'Bay of Bengal Basin',
    shortName: 'Bay of Bengal',
    lon: 88.0,
    lat: 14.0,
    alt: 2800000,
    heading: 0,
    pitch: -70,
    roll: 0,
    description: 'Low-salinity river-fed stratification and cyclonic gyres',
  },
  EQUATORIAL_INDIAN_OCEAN: {
    id: 'EQUATORIAL_INDIAN_OCEAN',
    name: 'Equatorial Jet Zone',
    shortName: 'Equatorial',
    lon: 80.0,
    lat: 0.0,
    alt: 3500000,
    heading: 0,
    pitch: -75,
    roll: 0,
    description: 'Wyrtki jets and inter-basin equatorial zonal flows',
  },
  LAKSHADWEEP_MALDIVES: {
    id: 'LAKSHADWEEP_MALDIVES',
    name: 'Lakshadweep-Maldives Ridge',
    shortName: 'Lakshadweep',
    lon: 73.0,
    lat: 7.0,
    alt: 1200000,
    heading: 15,
    pitch: -55,
    roll: 0,
    description: 'Complex reef topography and Lakshadweep high/low eddy field',
  },
  SOUTHERN_OCEAN_SECTOR: {
    id: 'SOUTHERN_OCEAN_SECTOR',
    name: 'Southern Ocean Sector',
    shortName: 'Southern Ocean',
    lon: 70.0,
    lat: -45.0,
    alt: 4500000,
    heading: 0,
    pitch: -70,
    roll: 0,
    description: 'Antarctic Circumpolar Current and sub-Antarctic mode water boundary',
  },
});

export const SCIENTIFIC_VIEW_MODES = Object.freeze({
  ORBITAL: {
    id: 'ORBITAL',
    name: 'Orbital (90°)',
    pitchDeg: -88,
    headingDeg: 0,
    altFactor: 1.0,
    description: 'Planar top-down oceanographic mapping perspective',
  },
  OBLIQUE_3D: {
    id: 'OBLIQUE_3D',
    name: '3D Oblique (45°)',
    pitchDeg: -42,
    headingDeg: 30,
    altFactor: 0.6,
    description: 'Optimal 3D perspective to reveal vertical curtains and isosurfaces',
  },
  SURFACE_GLANCE: {
    id: 'SURFACE_GLANCE',
    name: 'Surface (15°)',
    pitchDeg: -18,
    headingDeg: 45,
    altFactor: 0.25,
    description: 'Low grazing angle for thermocline streamlines and particle advection',
  },
  SURFACE_QA: {
    id: 'SURFACE_QA',
    name: 'Horizon QA',
    pitchDeg: -5,
    headingDeg: 45,
    altFactor: 0.1,
    description: 'Near-horizon coastal view for visual QA of the 5m surface fallback offset',
  },
  RESET: {
    id: 'RESET',
    name: 'Canonical Reset',
    pitchDeg: -70,
    headingDeg: 0,
    altFactor: 1.0,
    description: 'Reset camera orientation to standard regional focal view',
  },
});

/**
 * Validates whether an ocean region key exists in canonical registry.
 */
export function isValidOceanRegion(regionKey) {
  return typeof regionKey === 'string' && Boolean(OCEAN_REGIONS[regionKey]);
}
