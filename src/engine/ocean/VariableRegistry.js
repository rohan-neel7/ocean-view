/**
 * OceanView — Canonical Ocean Variable Registry
 * Centralized data-driven metadata catalog for physical and biogeochemical ocean parameters.
 */

export const OCEAN_VARIABLES = Object.freeze({
  sea_surface_temperature: {
    id: 'sea_surface_temperature',
    name: 'Sea Temperature (T)',
    standardName: 'sea_water_temperature',
    unit: '°C',
    category: 'PHYSICAL_THERMODYNAMICS',
    defaultRange: [15.0, 32.0],
    preferredColormap: 'THERMAL',
    scaleType: 'linear',
    supportedModes: ['HORIZONTAL_SLICE', 'VERTICAL_TRANSECT', 'ISOSURFACE_3D'],
    availability: 'AVAILABLE',
    description: 'In-situ seawater potential temperature',
  },
  salinity: {
    id: 'salinity',
    name: 'Practical Salinity (S)',
    standardName: 'sea_water_practical_salinity',
    unit: 'PSU',
    category: 'PHYSICAL_THERMODYNAMICS',
    defaultRange: [32.0, 37.0],
    preferredColormap: 'HALINE',
    scaleType: 'linear',
    supportedModes: ['HORIZONTAL_SLICE', 'VERTICAL_TRANSECT', 'ISOSURFACE_3D'],
    availability: 'AVAILABLE',
    description: 'Seawater practical salinity on PSS-78 scale',
  },
  ocean_current_velocity: {
    id: 'ocean_current_velocity',
    name: 'Current Velocity (UV)',
    standardName: 'sea_water_velocity',
    unit: 'm/s',
    category: 'PHYSICAL_HYDRODYNAMICS',
    defaultRange: [0.0, 1.8],
    preferredColormap: 'SPEED',
    scaleType: 'linear',
    supportedModes: ['HORIZONTAL_SLICE', 'VECTOR_GLYPHS', 'PARTICLE_FLOW'],
    availability: 'AVAILABLE',
    description: 'Horizontal ocean circulation vector velocity magnitude',
  },
  chlorophyll_a: {
    id: 'chlorophyll_a',
    name: 'Chlorophyll-a (Chl-a)',
    standardName: 'mass_concentration_of_chlorophyll_a_in_sea_water',
    unit: 'mg/m³',
    category: 'BIOGEOCHEMICAL',
    defaultRange: [0.02, 5.0],
    preferredColormap: 'ALGAE',
    scaleType: 'log',
    supportedModes: ['HORIZONTAL_SLICE', 'VERTICAL_TRANSECT'],
    availability: 'AVAILABLE',
    description: 'Phytoplankton biomass indicator via optical fluorescence / ocean color',
  },
  dissolved_oxygen: {
    id: 'dissolved_oxygen',
    name: 'Dissolved Oxygen (DO)',
    standardName: 'mole_concentration_of_dissolved_molecular_oxygen_in_sea_water',
    unit: 'µmol/kg',
    category: 'BIOGEOCHEMICAL',
    defaultRange: [10.0, 280.0],
    preferredColormap: 'OXYGEN',
    scaleType: 'linear',
    supportedModes: ['HORIZONTAL_SLICE', 'VERTICAL_TRANSECT'],
    availability: 'PARTIAL',
    description: 'Subsurface oxygen minimum zones (OMZ) and ventilating masses',
  },
  potential_density: {
    id: 'potential_density',
    name: 'Potential Density (σ_t)',
    standardName: 'sea_water_sigma_t',
    unit: 'kg/m³',
    category: 'DERIVED_PHYSICS',
    defaultRange: [21.0, 28.0],
    preferredColormap: 'DENSE',
    scaleType: 'linear',
    supportedModes: ['VERTICAL_TRANSECT', 'ISOSURFACE_3D'],
    availability: 'AVAILABLE',
    description: 'Seawater anomaly density evaluated at atmospheric pressure (UNESCO 1983)',
  },
  sound_speed: {
    id: 'sound_speed',
    name: 'Acoustic Velocity (C)',
    standardName: 'speed_of_sound_in_sea_water',
    unit: 'm/s',
    category: 'DERIVED_PHYSICS',
    defaultRange: [1480.0, 1545.0],
    preferredColormap: 'BALANCE',
    scaleType: 'linear',
    supportedModes: ['VERTICAL_TRANSECT'],
    availability: 'AVAILABLE',
    description: 'Underwater sound speed profile determining SOFAR acoustic ducting (Mackenzie 1981)',
  },
});

export function getVariableMetadata(varId) {
  return OCEAN_VARIABLES[varId] || OCEAN_VARIABLES.sea_surface_temperature;
}

export function getAllVariables() {
  return Object.values(OCEAN_VARIABLES);
}
