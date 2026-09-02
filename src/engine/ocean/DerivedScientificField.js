import { DataState, VALID_UNITS } from '../contracts/intelligenceContract.js';
import { createProvenance, SourceMode } from '../contracts/provenance.js';

/**
 * Creates a Derived Scientific Field descriptor for downstream physical quantities.
 *
 * @param {object} params
 * @param {string} params.id
 * @param {string} params.variable - e.g. 'potential_density_anomaly', 'mixed_layer_depth', 'sound_velocity'
 * @param {string} params.unit - 'kg/m3', 'm', 'm/s'
 * @param {string} params.method - e.g. 'TEOS-10 / UNESCO 1983 EOS-80', 'Mackenzie 1981 Sound Speed'
 * @param {Array<string>} params.inputSources - Array of parent dataset/field IDs
 * @param {any} params.payload - Numerical payload (CanonicalGridScalar or profile array)
 * @param {object} [params.provenance]
 * @returns {object} DerivedScientificField
 */
export function createDerivedScientificField({
  id,
  variable,
  unit,
  method,
  inputSources = [],
  payload,
  provenance = {},
}) {
  if (!id || typeof id !== 'string') throw new Error('DerivedScientificField requires a string id');
  if (!variable || typeof variable !== 'string') throw new Error('DerivedScientificField requires a variable name');
  if (!unit || !VALID_UNITS.has(unit)) throw new Error(`Invalid unit: "${unit}"`);
  if (!method || typeof method !== 'string') throw new Error('DerivedScientificField requires a method description');

  const lineageNodes = inputSources.map((src, idx) => ({
    step: `Input ${idx + 1}`,
    source: src,
    method: 'Raw Observation / Model Input',
    dataState: DataState.OBSERVED,
    timestamp: new Date().toISOString(),
  }));

  lineageNodes.push({
    step: 'Derived Physical Property Calculation',
    source: 'OCEANVIEW_SCIENTIFIC_CORE',
    method,
    dataState: DataState.DERIVED,
    timestamp: new Date().toISOString(),
  });

  const cleanProvenance = createProvenance({
    source: 'OCEANVIEW_DERIVED',
    sourceMode: SourceMode.DERIVED,
    method,
    lineage: lineageNodes,
    ...provenance,
  });

  return {
    kind: 'DERIVED_SCIENTIFIC_FIELD',
    id,
    variable,
    unit,
    dataState: DataState.DERIVED,
    method,
    inputSources: [...inputSources],
    payload,
    provenance: cleanProvenance,
  };
}

/**
 * Calculates empirical Seawater Sound Speed (Mackenzie 1981 formula).
 * c = 1448.96 + 4.591*T - 5.304e-2*T^2 + 2.374e-4*T^3 + 1.340*(S - 35) + 1.630e-2*D + 1.675e-7*D^2 - 1.025e-2*T*(S - 35) - 7.139e-13*T*D^3
 *
 * @param {number} tempC - Temperature in Celsius
 * @param {number} salinityPsu - Practical Salinity in PSU
 * @param {number} depthMeters - Depth in meters
 * @returns {number|null} Sound speed in m/s
 */
export function calculateSoundSpeed(tempC, salinityPsu, depthMeters) {
  if (typeof tempC !== 'number' || typeof salinityPsu !== 'number' || typeof depthMeters !== 'number') {
    return null;
  }
  const T = tempC;
  const S = salinityPsu;
  const D = depthMeters;

  const c =
    1448.96 +
    4.591 * T -
    5.304e-2 * (T ** 2) +
    2.374e-4 * (T ** 3) +
    1.340 * (S - 35) +
    1.630e-2 * D +
    1.675e-7 * (D ** 2) -
    1.025e-2 * T * (S - 35) -
    7.139e-13 * T * (D ** 3);

  return Number(c.toFixed(2));
}

/**
 * Calculates approximate surface seawater density anomaly sigma-t (UNESCO 1981).
 *
 * @param {number} tempC
 * @param {number} salinityPsu
 * @returns {number|null} Density anomaly in kg/m3 (sigma_t = rho - 1000)
 */
export function calculateSigmaT(tempC, salinityPsu) {
  if (typeof tempC !== 'number' || typeof salinityPsu !== 'number') return null;
  const T = tempC;
  const S = salinityPsu;

  // Pure water density formula (UNESCO 1981)
  const rho0 =
    999.842594 +
    6.793952e-2 * T -
    9.095290e-3 * (T ** 2) +
    1.001685e-4 * (T ** 3) -
    1.120083e-6 * (T ** 4) +
    6.536332e-9 * (T ** 5);

  const A = 8.24493e-1 - 4.0899e-3 * T + 7.6438e-5 * (T ** 2) - 8.2467e-7 * (T ** 3) + 5.3875e-9 * (T ** 4);
  const B = -5.72466e-3 + 1.0227e-4 * T - 1.6546e-6 * (T ** 2);
  const C = 4.8314e-4;

  const rho = rho0 + A * S + B * (S ** 1.5) + C * (S ** 2);
  const sigmaT = rho - 1000.0;

  return Number(sigmaT.toFixed(3));
}
