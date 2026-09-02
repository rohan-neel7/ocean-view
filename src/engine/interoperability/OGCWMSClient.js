/**
 * OceanView — OGC Web Map Service (WMS) Client
 * Standards-compliant OGC WMS 1.3.0 client for discovering layers and constructing bounded imagery requests.
 */

export class OGCWMSClient {
  constructor({ baseUrl, version = '1.3.0' } = {}) {
    if (!baseUrl) throw new Error('OGCWMSClient requires a baseUrl');
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.version = version;
    this.capabilities = null;
    this.status = 'INTEROPERABILITY_READY';
  }

  /**
   * Generates a standard OGC WMS GetCapabilities request URL.
   */
  getCapabilitiesUrl() {
    const params = new URLSearchParams({
      SERVICE: 'WMS',
      VERSION: this.version,
      REQUEST: 'GetCapabilities',
    });
    return `${this.baseUrl}?${params.toString()}`;
  }

  /**
   * Constructs a bounded GetMap request URL for an oceanographic layer.
   *
   * @param {object} params
   * @param {string} params.layer - e.g. 'INCOIS_SST_DAILY'
   * @param {Array<number>} params.bbox - [minLon, minLat, maxLon, maxLat] in EPSG:4326 or CRS:84
   * @param {number} [params.width=512]
   * @param {number} [params.height=512]
   * @param {string} [params.time] - ISO-8601 timestamp
   * @param {number} [params.elevation] - Depth/Elevation in meters
   * @param {string} [params.format='image/png']
   * @param {string} [params.crs='CRS:84']
   * @returns {string} GetMap URL
   */
  buildGetMapUrl({
    layer,
    bbox,
    width = 512,
    height = 512,
    time = null,
    elevation = null,
    format = 'image/png',
    crs = 'CRS:84',
    transparent = true,
  }) {
    if (!layer) throw new Error('GetMap requires a layer name');
    if (!Array.isArray(bbox) || bbox.length !== 4) {
      throw new Error('GetMap requires bbox as [minLon, minLat, maxLon, maxLat]');
    }

    const params = new URLSearchParams({
      SERVICE: 'WMS',
      VERSION: this.version,
      REQUEST: 'GetMap',
      LAYERS: layer,
      STYLES: '',
      CRS: crs,
      BBOX: bbox.join(','),
      WIDTH: String(Math.min(2048, Math.max(64, width))),
      HEIGHT: String(Math.min(2048, Math.max(64, height))),
      FORMAT: format,
      TRANSPARENT: transparent ? 'TRUE' : 'FALSE',
    });

    if (time) params.set('TIME', time);
    if (elevation !== null && elevation !== undefined) params.set('ELEVATION', String(elevation));

    return `${this.baseUrl}?${params.toString()}`;
  }
}
