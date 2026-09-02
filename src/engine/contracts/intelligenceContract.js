/**
 * OceanView — Canonical Scientific Data Contract & Intelligence Values
 * INCOIS 3D Ocean Data Visualization System (SIH26067)
 *
 * Invariants:
 *   - Exactly 10 canonical DataStates
 *   - Dimensional honesty: units are mandatory for numerical values
 *   - Nullable confidence & uncertainty (zero fabricated numbers)
 *   - Multi-hop lineage graph for reproducible scientific provenance
 *   - Missing ≠ Zero (null values preserved honestly)
 */

export { SourceMode } from './provenance.js';

export const DataState = Object.freeze({
  OBSERVED: 'OBSERVED',         // In-situ physical sensor measurement (Argo, CTD, Glider, Buoy)
  CORROBORATED: 'CORROBORATED', // Multiple independent platforms agree within tolerance
  DERIVED: 'DERIVED',           // Deterministically calculated from measurements (e.g. Density from T/S/P)
  MODELED: 'MODELED',           // Numerical ocean model state (e.g. MOM6, HYCOM, NEMO hindcast)
  ESTIMATED: 'ESTIMATED',       // Approximation with uncertainty or incomplete spatial coverage
  PREDICTED: 'PREDICTED',       // Forward-looking numerical ocean forecast (24h - 120h)
  STATIC: 'STATIC',             // Baseline climatology or bathymetry (WOA23, GEBCO)
  PENDING: 'PENDING',           // Calculation awaiting required inputs
  PARTIAL: 'PARTIAL',           // Incomplete vertical cast or spatial slice
  UNAVAILABLE: 'UNAVAILABLE',   // Sensor offline or data missing
});

export const ClaimType = Object.freeze({
  MEASUREMENT: 'MEASUREMENT',   // Direct physical measurement by calibrated sensor
  CALCULATION: 'CALCULATION',   // Deterministic mathematical calculation
  ASSESSMENT: 'ASSESSMENT',     // Evaluated multi-parameter condition (e.g. Marine Heatwave)
  FORECAST: 'FORECAST',         // Predictive numerical model output
  OBSERVATION: 'OBSERVATION',   // Raw telemetry packet
});

export const VALID_DATA_STATES = Object.freeze(Object.values(DataState));
export const VALID_CLAIM_TYPES = Object.freeze(Object.values(ClaimType));

// Recognized Physical & Oceanographic Units
export const VALID_UNITS = new Set([
  // Temperature
  '°C', 'celsius', 'kelvin', 'K',
  // Salinity
  'PSU', 'psu', 'g/kg', 'dimensionless', 'unitless', '1',
  // Velocity & Current
  'm/s', 'cm/s', 'kts', 'knots', 'km/h',
  // Distance, Depth & Elevation
  'm', 'meters', 'km', 'dbar', 'decibars', 'bar', 'hPa', 'mbar',
  // Density & Mass
  'kg/m3', 'kg/m³', 'sigma-t', 'sigma-theta', 'g/cm3',
  // Biogeochemical & Chemical Concentrations
  'mg/m3', 'mg/m³', 'ug/L', 'µg/L', 'umol/kg', 'µmol/kg', 'mmol/m3', 'mmol/m³', 'ml/L',
  // Optical & Radiation
  'W/m2', 'W/m²', '1/m', 'NTU', 'FTU', 'mg/L',
  // Volumetric Transport & Volume
  'Sv', 'sverdrup', 'm3/s', 'm³/s',
  // Ratios, Percentages & Coordinates
  'percent', '%', 'fraction', 'ratio', 'deg', 'degrees', 'rad',
  // Time
  'seconds', 'minutes', 'hours', 'days', 'ms',
]);

/**
 * Creates a canonical IntelligenceValue object.
 *
 * @param {object} params
 * @param {number|string|boolean|null} params.value - The raw value (null if PENDING/UNAVAILABLE)
 * @param {string} params.unit - Standard unit of measurement ('°C', 'PSU', 'm/s', 'm', etc.)
 * @param {string} params.dataState - One of the 10 canonical DataStates
 * @param {string} [params.claimType=ClaimType.MEASUREMENT] - Nature of the claim
 * @param {string} [params.source='UNKNOWN'] - Authoritative source identifier (e.g. 'INCOIS_ARGO', 'HYCOM')
 * @param {string|null} [params.method=null] - Algorithm, equation, or sensor model
 * @param {number|null} [params.confidence=null] - Validated confidence (0.0 to 1.0) or null
 * @param {number|string|null} [params.uncertainty=null] - Measurement error margin / standard deviation
 * @param {string|null} [params.observedAt=null] - ISO timestamp of physical observation
 * @param {string|null} [params.calculatedAt=null] - ISO timestamp when processing finished
 * @param {Array<object>|object|null} [params.provenance=null] - Lineage graph or parent node refs
 * @param {object|null} [params.dataQuality=null] - Quality metrics (freshness, completeness, latencyMs)
 * @param {string|null} [params.limitations=null] - Sensor limitations or model caveats
 * @returns {object} Canonical IntelligenceValue
 */
export function createIntelligenceValue({
  value,
  unit,
  dataState,
  claimType = ClaimType.MEASUREMENT,
  source = 'UNKNOWN',
  method = null,
  confidence = null,
  uncertainty = null,
  observedAt = null,
  calculatedAt = new Date().toISOString(),
  provenance = null,
  dataQuality = null,
  limitations = null,
}) {
  // Validate dataState
  if (!dataState || !VALID_DATA_STATES.includes(dataState)) {
    throw new Error(
      `Invalid dataState "${dataState}". Must be exactly one of: ${VALID_DATA_STATES.join(', ')}`
    );
  }

  // Validate unit
  if (!unit || typeof unit !== 'string' || !VALID_UNITS.has(unit)) {
    throw new Error(
      `Invalid oceanographic unit "${unit}". Must be a recognized physical unit (e.g. °C, PSU, m/s, dbar, mg/m3)`
    );
  }

  // Validate claimType
  const resolvedClaimType = VALID_CLAIM_TYPES.includes(claimType) ? claimType : ClaimType.MEASUREMENT;

  // Confidence must be number between 0 and 1, or null (never NaN or out of bounds)
  let resolvedConfidence = null;
  if (typeof confidence === 'number' && !isNaN(confidence)) {
    resolvedConfidence = Math.max(0.0, Math.min(1.0, Number(confidence.toFixed(4))));
  }

  // Uncertainty must be string/number or null
  let resolvedUncertainty = null;
  if (uncertainty !== undefined && uncertainty !== null && uncertainty !== '') {
    resolvedUncertainty = uncertainty;
  }

  // Format Provenance Lineage Graph
  let resolvedProvenance = [];
  if (Array.isArray(provenance)) {
    resolvedProvenance = [...provenance];
  } else if (provenance && typeof provenance === 'object') {
    resolvedProvenance = [provenance];
  }

  // Quality envelope
  let resolvedQuality = null;
  if (dataQuality && typeof dataQuality === 'object') {
    resolvedQuality = {
      freshness: dataQuality.freshness || 'UNKNOWN',
      completeness: dataQuality.completeness || 'UNKNOWN',
      latencyMs: typeof dataQuality.latencyMs === 'number' ? dataQuality.latencyMs : null,
    };
  }

  return {
    value,
    unit,
    dataState,
    claimType: resolvedClaimType,
    source,
    method,
    confidence: resolvedConfidence,
    uncertainty: resolvedUncertainty,
    observedAt,
    calculatedAt,
    provenance: resolvedProvenance,
    dataQuality: resolvedQuality,
    limitations,
  };
}

/**
 * Validates whether an object adheres to the IntelligenceValue contract.
 *
 * @param {object} val
 * @returns {{ valid: boolean, errors: Array<string> }}
 */
export function validateIntelligenceValue(val) {
  const errors = [];
  if (!val || typeof val !== 'object') {
    return { valid: false, errors: ['Value is not an object'] };
  }

  if (!VALID_DATA_STATES.includes(val.dataState)) {
    errors.push(`Invalid dataState: "${val.dataState}"`);
  }

  if (!val.unit || typeof val.unit !== 'string' || !VALID_UNITS.has(val.unit)) {
    errors.push(`Missing or invalid oceanographic unit: "${val.unit}"`);
  }

  if (
    val.confidence !== null &&
    (typeof val.confidence !== 'number' || isNaN(val.confidence) || val.confidence < 0 || val.confidence > 1)
  ) {
    errors.push(`Confidence must be null or a number between 0.0 and 1.0; received: ${val.confidence}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Builds a multi-hop lineage trace between derived objects.
 * E.g. [INCOIS Argo NetCDF] -> [Raw CTD Profile] -> [TEOS-10 Equation of State] -> [Potential Density Profile]
 *
 * @param {Array<{ step: string, source: string, method?: string, dataState?: string, timestamp?: string }>} steps
 * @returns {{ nodes: Array<object>, edges: Array<object>, rootSource: string|null, finalDataState: string|null }}
 */
export function buildLineageGraph(steps = []) {
  if (!Array.isArray(steps) || steps.length === 0) {
    return { nodes: [], edges: [], rootSource: null, finalDataState: null };
  }
  const nodes = steps.map((s, idx) => ({
    hopIndex: idx,
    step: s.step || `Step ${idx + 1}`,
    source: s.source || 'OCEANVIEW_CORE',
    method: s.method || null,
    dataState: s.dataState || DataState.DERIVED,
    timestamp: s.timestamp || new Date().toISOString(),
  }));
  const edges = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({ from: nodes[i].step, to: nodes[i + 1].step });
  }
  return {
    nodes,
    edges,
    rootSource: nodes[0]?.source || null,
    finalDataState: nodes[nodes.length - 1]?.dataState || null,
  };
}
