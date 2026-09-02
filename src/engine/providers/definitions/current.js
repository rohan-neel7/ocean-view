/**
 * OceanView — Official Provider Definitions
 * Catalogs authoritative ocean data sources with strict truthfulness.
 */

import { createProviderDefinition } from '../ProviderContract.js';
import { ProviderTier, ProviderRole, RuntimeState, CoverageType, AuthType } from '../providerTypes.js';

export const CURRENT_PROVIDERS = Object.freeze([
  // ── 1. Synthetic Demonstration Engine (Phase 1 verified provider) ──────────
  createProviderDefinition({
    id: 'SYNTHETIC_DEMO_OCEAN',
    name: 'Synthetic Ocean Demonstration Engine',
    organization: 'INCOIS / SIH26067 Foundation',
    tier: ProviderTier.TIER_D,
    roles: [ProviderRole.SIMULATION, ProviderRole.OCEAN_MODEL, ProviderRole.IN_SITU_OBSERVATION],
    dataTypes: ['sea_surface_temperature', 'salinity', 'ocean_current_velocity', 'chlorophyll_a'],
    coverage: CoverageType.INDIAN_OCEAN,
    runtimeState: RuntimeState.SIMULATION,
    connected: true,
    auth: { type: AuthType.NONE, secretRef: null },
    runtimeConfig: { pollingIntervalMs: 60000, enabled: true },
    verification: {
      verifiedAt: '2026-08-27T00:00:00Z',
      verifiedBy: 'Phase 1 Core Test Suite',
      notes: 'Generates deterministic physical demo fields for the Indian Ocean basin with explicit SYNTHETIC label',
    },
  }),

  // ── 2. INCOIS Ocean Models (Planned live integration) ─────────────────────
  createProviderDefinition({
    id: 'INCOIS_OCEAN_MODELS',
    name: 'INCOIS Operational Ocean Forecast System (HOOFS)',
    organization: 'Indian National Centre for Ocean Information Services (INCOIS)',
    tier: ProviderTier.TIER_A,
    roles: [ProviderRole.OCEAN_MODEL],
    dataTypes: ['sea_surface_temperature', 'salinity', 'ocean_current_velocity', 'mixed_layer_depth'],
    coverage: CoverageType.INDIAN_OCEAN,
    runtimeState: RuntimeState.PLANNED,
    connected: false,
    endpoint: 'https://incois.gov.in/portal/datainfo/hoofs.jsp',
    auth: { type: AuthType.NONE, secretRef: null },
  }),

  // ── 3. INCOIS Argo Float Array (Planned) ──────────────────────────────────
  createProviderDefinition({
    id: 'INCOIS_ARGO_GDAC',
    name: 'INCOIS Indian Ocean Argo Regional Centre',
    organization: 'INCOIS / International Argo Programme',
    tier: ProviderTier.TIER_A,
    roles: [ProviderRole.IN_SITU_OBSERVATION],
    dataTypes: ['temperature_profile', 'salinity_profile', 'pressure_profile'],
    coverage: CoverageType.INDIAN_OCEAN,
    runtimeState: RuntimeState.PLANNED,
    connected: false,
    endpoint: 'https://incois.gov.in/argo/index.jsp',
  }),

  // ── 4. INCOIS Glider National Facility (Planned) ──────────────────────────
  createProviderDefinition({
    id: 'INCOIS_GLIDER_FACILITY',
    name: 'INCOIS Ocean Glider Observation System',
    organization: 'INCOIS Ministry of Earth Sciences',
    tier: ProviderTier.TIER_A,
    roles: [ProviderRole.IN_SITU_OBSERVATION],
    dataTypes: ['glider_temperature', 'glider_salinity', 'glider_chlorophyll'],
    coverage: CoverageType.BAY_OF_BENGAL,
    runtimeState: RuntimeState.PLANNED,
    connected: false,
  }),

  // ── 5. Copernicus Marine Service (Planned) ────────────────────────────────
  createProviderDefinition({
    id: 'COPERNICUS_MARINE',
    name: 'Copernicus Marine Environment Monitoring Service (CMEMS)',
    organization: 'European Union / Mercator Ocean International',
    tier: ProviderTier.TIER_B,
    roles: [ProviderRole.OCEAN_MODEL, ProviderRole.SATELLITE_REMOTE_SENSING],
    dataTypes: ['global_ocean_physics_analysis', 'ocean_colour_chlorophyll'],
    coverage: CoverageType.GLOBAL,
    runtimeState: RuntimeState.PLANNED,
    connected: false,
  }),

  // ── 6. GEBCO Bathymetry Baseline (Planned static dataset) ────────────────
  createProviderDefinition({
    id: 'GEBCO_BATHYMETRY',
    name: 'General Bathymetric Chart of the Oceans (GEBCO)',
    organization: 'IHO / IOC UNESCO',
    tier: ProviderTier.TIER_B,
    roles: [ProviderRole.BATHYMETRY],
    dataTypes: ['bathymetric_depth'],
    coverage: CoverageType.GLOBAL,
    runtimeState: RuntimeState.STATIC,
    connected: false,
  }),
]);
