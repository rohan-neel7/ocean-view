/**
 * OceanView — Scientific Provenance & Lineage Types
 */

export const SourceMode = Object.freeze({
  LIVE: 'LIVE',                     // Live operational feed
  MODELED: 'MODELED',               // Numerical model simulation output
  SYNTHETIC_DEMO: 'SYNTHETIC_DEMO', // Explicitly generated demo data
  FIXTURE: 'FIXTURE',               // Static test fixture
  DERIVED: 'DERIVED',               // Calculated downstream product
});

/**
 * Builds a standardized scientific provenance object.
 *
 * @param {object} params
 * @param {string} params.source - Authoritative source (e.g. 'INCOIS_MOM6', 'ARGO_GDAC')
 * @param {string} [params.sourceMode=SourceMode.LIVE] - Operating source mode
 * @param {string} [params.datasetId] - Dataset identifier / DOI / accession number
 * @param {string} [params.version='1.0'] - Dataset / model version
 * @param {string} [params.method] - Numerical scheme / assimilation technique / instrument model
 * @param {string} [params.observedAt] - ISO observation timestamp
 * @param {string} [params.receivedAt] - ISO ingestion timestamp
 * @param {string} [params.processedAt] - ISO processing timestamp
 * @param {Array<object>} [params.lineage=[]] - Upstream lineage nodes
 * @returns {object} Provenance object
 */
export function createProvenance({
  source,
  sourceMode = SourceMode.LIVE,
  datasetId = null,
  version = '1.0',
  method = null,
  observedAt = null,
  receivedAt = new Date().toISOString(),
  processedAt = new Date().toISOString(),
  lineage = [],
  ...extra
}) {
  if (!source || typeof source !== 'string') {
    throw new Error('Provenance requires a non-empty source identifier');
  }

  return {
    source,
    sourceMode,
    datasetId,
    version,
    method,
    observedAt,
    receivedAt,
    processedAt,
    lineage: Array.isArray(lineage) ? lineage : [lineage],
    ...extra,
  };
}
