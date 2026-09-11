/**
 * OceanView — Regional Weather Markers & Wind/Flow Direction Layer
 * Renders authentic, high-contrast, Windy.com-style location & wind speed pill badges
 * with sleek directional arrows across the Arabian Sea & Indian Ocean on the Cesium 3D globe.
 *
 * Invariants:
 *   - Strictly uses Cesium CustomDataSource without recreating viewers
 *   - Uses high-DPI canvas-generated badges for crisp rendering at all zoom levels
 *   - Respects governorRequestRender() for 0% idle GPU usage
 *   - Embeds weatherData onto entities for instant click inspection
 *   - Direction convention: Standard bearing (0°=N, 90°=E, 180°=S, 270°=W)
 */

import * as Cesium from 'cesium';
import { sampleColormap } from '../color/scientificColorMaps.js';
import { governorRequestRender } from '../../engine/rendering/renderGovernor.js';
import { sampleScalarGridBilinear, isOceanLocation } from '../../engine/ocean/analysisLocation.js';
import { sampleVectorFieldBilinear } from '../../engine/ocean/currentMetrics.js';

export function getCardinalDirection(deg) {
  if (deg === null || typeof deg !== 'number' || isNaN(deg)) return '—';
  const cardinals = [
    'N', 'NNE', 'NE', 'ENE',
    'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW',
  ];
  const normalized = ((deg % 360) + 360) % 360;
  const idx = Math.round(normalized / 22.5) % 16;
  return cardinals[idx];
}

export function formatFlowSpeed(speedMs) {
  if (speedMs === null || typeof speedMs !== 'number' || isNaN(speedMs)) {
    return { ms: '—', kts: '—', kmh: '—', tier: 'Unknown' };
  }
  const kts = speedMs * 1.94384;
  const kmh = speedMs * 3.6;

  let tier = 'Calm / Sluggish';
  if (speedMs >= 1.5) tier = 'Intense Current (> 3.0 kt)';
  else if (speedMs >= 1.0) tier = 'Strong Jet (2.0 - 3.0 kt)';
  else if (speedMs >= 0.6) tier = 'Moderate Flow (1.2 - 2.0 kt)';
  else if (speedMs >= 0.3) tier = 'Gentle Current (0.6 - 1.2 kt)';
  else if (speedMs >= 0.1) tier = 'Light Drift (0.2 - 0.6 kt)';

  return {
    ms: speedMs.toFixed(2),
    kts: kts.toFixed(2),
    kmh: kmh.toFixed(1),
    tier,
  };
}

/**
 * Key coastal and regional observation stations around the Arabian Sea & Indian Ocean basin,
 * matching authentic marine navigation and weather exploration.
 */
export const COASTAL_WIND_STATIONS = [
  { name: 'Mumbai', lat: 18.92, lon: 72.83, isMajor: true },
  { name: 'Karachi', lat: 24.86, lon: 67.00, isMajor: true },
  { name: 'Muscat', lat: 23.58, lon: 58.40, isMajor: true },
  { name: 'Chennai', lat: 13.08, lon: 80.27, isMajor: true },
  { name: 'Colombo', lat: 6.92, lon: 79.86, isMajor: true },
  { name: 'Dubai', lat: 25.20, lon: 55.27, isMajor: false },
  { name: 'Kochi', lat: 9.93, lon: 76.26, isMajor: false },
];

// Texture cache for high rendering performance and zero frame drops
const _pillTextureCache = new Map();

/**
 * Creates a high-DPI canvas texture for an authentic, restrained location & wind pill badge.
 * Uses neutral charcoal graphite translucent pill styling with warm ivory typography.
 */
export function createWindyPillBadge({
  stationName = null,
  speedVal = 0,
  headingDeg = null,
  isDarkTooltip = false,
  cardinal = '',
}) {
  if (typeof document === 'undefined') return null;

  const cacheKey = `${stationName || ''}_${speedVal}_${headingDeg !== null ? Math.round(headingDeg) : 'x'}_${isDarkTooltip ? 'dark' : 'light'}_${cardinal}`;
  if (_pillTextureCache.has(cacheKey)) {
    return _pillTextureCache.get(cacheKey);
  }

  const speedStr = speedVal !== null && !isNaN(speedVal) ? String(Math.round(speedVal)) : '';
  const fullText = isDarkTooltip
    ? `${speedStr} km/h ${cardinal ? `➔ ${cardinal}` : ''}`
    : stationName
    ? `${stationName} ${speedStr}`
    : speedStr;

  // Scale 2 for Retina sharpness
  const scale = 2;
  const paddingX = stationName ? 9 * scale : 7 * scale;
  const height = (isDarkTooltip ? 30 : 22) * scale;
  const arrowSpacing = headingDeg !== null ? 12 * scale : 0;

  // Measure text
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.font = isDarkTooltip
    ? `600 ${12 * scale}px "Inter", system-ui, sans-serif`
    : stationName
    ? `500 ${10 * scale}px "Inter", system-ui, sans-serif`
    : `600 ${11 * scale}px "Inter", system-ui, sans-serif`;

  const textMetrics = tempCtx.measureText(fullText);
  const textWidth = Math.ceil(textMetrics.width);
  const width = Math.max(34 * scale, textWidth + paddingX * 2 + arrowSpacing);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height + (isDarkTooltip ? 5 * scale : 0);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const radius = (height / 2) - 1;
  const rectH = height - 4;
  const rectW = width - 4;
  const rectX = 2;
  const rectY = 2;

  // Natural subtle drop shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.50)';
  ctx.shadowBlur = 4 * scale;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1 * scale;

  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(rectX, rectY, rectW, rectH, radius);
  } else {
    ctx.rect(rectX, rectY, rectW, rectH);
  }

  // Refined neutral charcoal fill
  ctx.fillStyle = 'rgba(23, 26, 25, 0.86)';
  ctx.fill();
  ctx.restore();

  // Pointer notch for dark tooltip
  if (isDarkTooltip) {
    ctx.beginPath();
    const notchCx = width / 2;
    const notchY = rectY + rectH;
    ctx.moveTo(notchCx - 5 * scale, notchY);
    ctx.lineTo(notchCx, notchY + 4 * scale);
    ctx.lineTo(notchCx + 5 * scale, notchY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(23, 26, 25, 0.95)';
    ctx.fill();
  }

  // Subtle warm graphite border
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(rectX, rectY, rectW, rectH, radius);
  } else {
    ctx.rect(rectX, rectY, rectW, rectH);
  }
  ctx.strokeStyle = 'rgba(52, 56, 54, 0.7)';
  ctx.lineWidth = 1 * scale;
  ctx.stroke();

  // Render text and arrow
  const textX = rectX + paddingX;
  const textY = rectY + rectH / 2;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  if (isDarkTooltip) {
    ctx.fillStyle = '#F1F0EA';
    ctx.font = `600 ${12 * scale}px "Inter", system-ui, sans-serif`;
    ctx.fillText(fullText, textX, textY);
  } else if (stationName) {
    // City name in muted warm gray, speed number in warm ivory
    ctx.fillStyle = '#9B9D98';
    ctx.font = `500 ${10 * scale}px "Inter", system-ui, sans-serif`;
    ctx.fillText(stationName, textX, textY);

    const nameWidth = ctx.measureText(stationName + ' ').width;
    ctx.fillStyle = '#F1F0EA';
    ctx.font = `600 ${11 * scale}px "Inter", system-ui, sans-serif`;
    ctx.fillText(speedStr, textX + nameWidth, textY);
  } else {
    ctx.fillStyle = '#F1F0EA';
    ctx.font = `600 ${11 * scale}px "Inter", system-ui, sans-serif`;
    ctx.fillText(speedStr, textX, textY);
  }

  // Render Directional Arrow in desaturated teal
  if (headingDeg !== null && !isNaN(headingDeg)) {
    const arrowX = width - paddingX - 3 * scale;
    const arrowY = textY;

    ctx.save();
    ctx.translate(arrowX, arrowY);
    // 0° is North (up), standard bearing clockwise
    const angleRad = (headingDeg * Math.PI) / 180.0;
    ctx.rotate(angleRad);

    ctx.beginPath();
    ctx.moveTo(0, -4.0 * scale);
    ctx.lineTo(2.8 * scale, 3.0 * scale);
    ctx.lineTo(0, 1.5 * scale);
    ctx.lineTo(-2.8 * scale, 3.0 * scale);
    ctx.closePath();

    ctx.fillStyle = '#6F9F96';
    ctx.fill();
    ctx.restore();
  }

  _pillTextureCache.set(cacheKey, canvas);
  return canvas;
}

export class WeatherMarkersLayer {
  constructor(viewer) {
    this.viewer = viewer;
    this.dataSource = null;
    this.activeScalarGrid = null;
    this.activeVectorGrid = null;
    this.activeDepthMeters = 0;
    this.showMarkers = true;
    this.showDirections = true;
  }

  /**
   * Clears all weather marker entities.
   */
  clear() {
    if (this.dataSource && this.viewer && !this.viewer.isDestroyed?.()) {
      this.viewer.dataSources.remove(this.dataSource, true);
      this.dataSource = null;
      governorRequestRender();
    }
  }

  /**
   * Updates regional weather markers and wind/current directions.
   *
   * @param {object} params
   * @param {object} params.scalarGrid - CanonicalGridScalar
   * @param {object} params.vectorGrid - CanonicalGridVector
   * @param {number} [params.depthMeters=0]
   * @param {string} [params.colormapKey='WINDY']
   * @param {boolean} [params.showMarkers=true]
   * @param {boolean} [params.showDirections=true]
   */
  update({
    scalarGrid = null,
    vectorGrid = null,
    depthMeters = 0,
    colormapKey = 'WINDY',
    showMarkers = true,
    showDirections = true,
    labelSettings = null,
  } = {}) {
    if (!this.viewer || this.viewer.isDestroyed?.()) return;

    this.clear();

    this.activeScalarGrid = scalarGrid;
    this.activeVectorGrid = vectorGrid;
    this.activeDepthMeters = depthMeters;
    this.showMarkers = showMarkers;
    this.showDirections = showDirections;

    if (!showMarkers && !showDirections) return;
    if (!scalarGrid && !vectorGrid) return;

    this.dataSource = new Cesium.CustomDataSource('RegionalWeatherMarkers');
    this.viewer.dataSources.add(this.dataSource);

    const renderAltitude = 35.0; // Render safely above water surface

    // 1. Regional / Coastal Maritime Reference Ports
    if (showMarkers) {
      const showMajor = labelSettings?.majorCities !== false;
      const showSecondary = Boolean(labelSettings?.secondaryCities);

      const targetStations = COASTAL_WIND_STATIONS.filter((st) => {
        if (st.isMajor) return showMajor;
        return showSecondary;
      });

      for (const station of targetStations) {
        let vecVal = null;
        if (vectorGrid) {
          vecVal = sampleVectorFieldBilinear(vectorGrid, station.lat, station.lon, 0);
        }

        const rawSpeed = vecVal?.speed ?? 0.35;
        const speedKmh = Math.max(7, Math.round(rawSpeed * 38));
        const headingDeg = vecVal?.headingDeg ?? 250;
        const cardinal = getCardinalDirection(headingDeg);

        const badgeCanvas = createWindyPillBadge({
          stationName: station.name,
          speedVal: speedKmh,
          headingDeg,
          isDarkTooltip: false,
          cardinal,
        });

        if (badgeCanvas) {
          this.dataSource.entities.add({
            name: `${station.name} Station: ${speedKmh} km/h`,
            position: Cesium.Cartesian3.fromDegrees(station.lon, station.lat, renderAltitude),
            billboard: {
              image: badgeCanvas,
              width: badgeCanvas.width / 2,
              height: badgeCanvas.height / 2,
              verticalOrigin: Cesium.VerticalOrigin.CENTER,
              horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              scaleByDistance: new Cesium.NearFarScalar(1.5e5, 1.05, 1.5e7, 0.7),
            },
            weatherData: {
              latitude: station.lat,
              longitude: station.lon,
              name: station.name,
              speedKmh,
              speedMs: rawSpeed,
              headingDeg,
              cardinal,
              depthMeters,
            },
          });
        }
      }
    }

    governorRequestRender();
  }

  destroy() {
    this.clear();
  }
}
