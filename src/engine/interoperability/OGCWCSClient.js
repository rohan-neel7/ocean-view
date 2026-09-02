/**
 * OceanView — OGC Web Coverage Service (WCS) Client
 * Standards-compliant OGC WCS 2.0.1 client for retrieving raw multi-dimensional gridded ocean data coverages.
 */

export class OGCWCSClient {
  constructor({ baseUrl, version = '2.0.1' } = {}) {
    if (!baseUrl) throw new Error('OGCWCSClient requires a baseUrl');
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.version = version;
    this.status = 'INTEROPERABILITY_READY';
  }

  /**
   * Generates standard OGC WCS GetCapabilities request URL.
   */
  getCapabilitiesUrl() {
    const params = new URLSearchParams({
      SERVICE: 'WCS',
      VERSION: this.version,
      REQUEST: 'GetCapabilities',
    });
    return `${this.baseUrl}?${params.toString()}`;
  }

  /**
   * Constructs a bounded DescribeCoverage request URL for metadata discovery.
   */
  describeCoverageUrl(coverageId) {
    if (!coverageId) throw new Error('DescribeCoverage requires coverageId');
    const params = new URLSearchParams({
      SERVICE: 'WCS',
      VERSION: this.version,
      REQUEST: 'DescribeCoverage',
      COVERAGEID: coverageId,
    });
    return `${this.baseUrl}?${params.toString()}`;
  }

  /**
   * Constructs a bounded GetCoverage request URL for downloading physical subset arrays.
   *
   * @param {object} params
   * @param {string} params.coverageId
   * @param {Array<number>} params.subsetLon - [minLon, maxLon]
   * @param {Array<number>} params.subsetLat - [minLat, maxLat]
   * @param {number} [params.subsetDepth] - Depth slice in meters
   * @param {string} [params.subsetTime] - ISO-8601 timestamp
   * @param {string} [params.format='application/netcdf']
   * @returns {string} GetCoverage URL
   */
  buildGetCoverageUrl({
    coverageId,
    subsetLon,
    subsetLat,
    subsetDepth = null,
    subsetTime = null,
    format = 'application/netcdf',
  }) {
    if (!coverageId) throw new Error('GetCoverage requires a coverageId');
    if (!Array.isArray(subsetLon) || !Array.isArray(subsetLat)) {
      throw new Error('GetCoverage requires subsetLon and subsetLat ranges');
    }

    const params = new URLSearchParams({
      SERVICE: 'WCS',
      VERSION: this.version,
      REQUEST: 'GetCoverage',
      COVERAGEID: coverageId,
      FORMAT: format,
    });

    // Add spatial trimming subset params
    params.append('SUBSET', `Long(${subsetLon[0]},${subsetLon[1]})`);
    params.append('SUBSET', `Lat(${subsetLat[0]},${subsetLat[1]})`);

    if (subsetDepth !== null && subsetDepth !== undefined) {
      params.append('SUBSET', `elevation(${subsetDepth})`);
    }

    if (subsetTime) {
      params.append('SUBSET', `time("${subsetTime}")`);
    }

    return `${this.baseUrl}?${params.toString()}`;
  }
}
