/**
 * OceanView — Scientific Oceanographic Colormaps (cmocean specifications)
 * Invariant: Perceptually uniform color ramps designed specifically for ocean variables.
 */

export const COLORMAP_PRESETS = Object.freeze({
  THERMAL: {
    id: 'thermal',
    name: 'Thermal (SST / Temperature)',
    colors: ['#042333', '#0c4c68', '#2a7b8e', '#5fb291', '#9cd982', '#e5ea7a', '#f7ba3d', '#ea6628', '#b61c28'],
    defaultRange: [15.0, 32.0],
    unit: '°C',
  },
  HALINE: {
    id: 'haline',
    name: 'Haline (Salinity)',
    colors: ['#1a153b', '#2b3b70', '#2c6c8c', '#319e91', '#5dcd82', '#a8f37b'],
    defaultRange: [32.0, 37.0],
    unit: 'PSU',
  },
  SPEED: {
    id: 'speed',
    name: 'Speed (Current Velocity)',
    colors: ['#ffffd4', '#fed98e', '#fe9929', '#d95f0e', '#993404'],
    defaultRange: [0.0, 1.8],
    unit: 'm/s',
  },
  ALGAE: {
    id: 'algae',
    name: 'Algae (Chlorophyll-a)',
    colors: ['#0d1a0d', '#1a3d1a', '#2e662a', '#4e943c', '#7ec255', '#bcf07a'],
    defaultRange: [0.01, 5.0],
    unit: 'mg/m³',
  },
  OXYGEN: {
    id: 'oxygen',
    name: 'Oxygen (Dissolved O2)',
    colors: ['#280838', '#59166e', '#8c2981', '#de425b', '#f6805d', '#ffba77'],
    defaultRange: [10.0, 280.0],
    unit: 'µmol/kg',
  },
  DENSE: {
    id: 'dense',
    name: 'Dense (Potential Density)',
    colors: ['#0e1c36', '#1d3557', '#457b9d', '#a8dadc', '#f1faee'],
    defaultRange: [21.0, 28.0],
    unit: 'kg/m³',
  },
  BALANCE: {
    id: 'balance',
    name: 'Balance (Divergent / Anomaly)',
    colors: ['#3b4cc0', '#6f92f3', '#abc2f8', '#e2e6bd', '#f4b496', '#db6851', '#b40426'],
    defaultRange: [-2.5, 2.5],
    unit: 'Δ',
  },
  WINDY: {
    id: 'windy',
    name: 'Windy (Atmospheric & Ocean Currents)',
    colors: [
      '#2e1065', // deep violet
      '#3730a3', // indigo
      '#1d4ed8', // vibrant blue
      '#0284c7', // sky blue
      '#0d9488', // cyan-teal
      '#10b981', // mint emerald
      '#84cc16', // lime green (matches the 24 km/h zone)
      '#eab308', // warm yellow
      '#f97316', // amber-orange
      '#ef4444', // crimson red
      '#881337', // deep red
    ],
    defaultRange: [0.0, 1.8],
    unit: 'm/s',
  },
});

/**
 * Parses a hex color string to [R, G, B] array.
 * @param {string} hex - e.g. '#042333'
 * @returns {number[]} [R, G, B] each 0-255
 */
export function hexToRgb(hex) {
  const num = parseInt(hex.slice(1), 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Converts [R,G,B] (0-255) to hex string.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {string}
 */
function rgbToHex(r, g, b) {
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

// Pre-compute RGB palette arrays for performance
const _paletteCache = new Map();
function getPaletteRgb(presetKey) {
  if (_paletteCache.has(presetKey)) return _paletteCache.get(presetKey);
  const preset = COLORMAP_PRESETS[presetKey];
  if (!preset) return null;
  const rgb = preset.colors.map(hexToRgb);
  _paletteCache.set(presetKey, rgb);
  return rgb;
}

/**
 * Interpolates an RGB color hex string from a normalized value [0, 1].
 * Uses linear interpolation between adjacent color stops for smooth gradients.
 *
 * @param {string} presetKey - Colormap preset key (e.g. 'THERMAL', 'HALINE')
 * @param {number} normalizedVal - Value in [0, 1]
 * @returns {string} Hex color string (e.g. '#2a7b8e')
 */
export function sampleColormap(presetKey, normalizedVal) {
  const key = presetKey?.toUpperCase() || 'THERMAL';
  const paletteRgb = getPaletteRgb(key) || getPaletteRgb('THERMAL');
  const clamped = Math.max(0.0, Math.min(1.0, normalizedVal));

  const scaledIndex = clamped * (paletteRgb.length - 1);
  const idx = Math.floor(scaledIndex);
  const frac = scaledIndex - idx;

  // Clamp to last stop
  if (idx >= paletteRgb.length - 1) {
    const [r, g, b] = paletteRgb[paletteRgb.length - 1];
    return rgbToHex(r, g, b);
  }

  // Linear interpolation between adjacent stops
  const [r0, g0, b0] = paletteRgb[idx];
  const [r1, g1, b1] = paletteRgb[idx + 1];

  const r = Math.round(r0 + frac * (r1 - r0));
  const g = Math.round(g0 + frac * (g1 - g0));
  const b = Math.round(b0 + frac * (b1 - b0));

  return rgbToHex(r, g, b);
}

/**
 * Samples the colormap and returns [R, G, B] directly (avoids hex round-trip).
 * Used internally by renderers for performance.
 *
 * @param {string} presetKey
 * @param {number} normalizedVal - Value in [0, 1]
 * @returns {number[]} [R, G, B] each 0-255
 */
export function sampleColormapRgb(presetKey, normalizedVal) {
  const key = presetKey?.toUpperCase() || 'THERMAL';
  const paletteRgb = getPaletteRgb(key) || getPaletteRgb('THERMAL');
  const clamped = Math.max(0.0, Math.min(1.0, normalizedVal));

  const scaledIndex = clamped * (paletteRgb.length - 1);
  const idx = Math.floor(scaledIndex);
  const frac = scaledIndex - idx;

  if (idx >= paletteRgb.length - 1) {
    return paletteRgb[paletteRgb.length - 1];
  }

  const [r0, g0, b0] = paletteRgb[idx];
  const [r1, g1, b1] = paletteRgb[idx + 1];

  return [
    Math.round(r0 + frac * (r1 - r0)),
    Math.round(g0 + frac * (g1 - g0)),
    Math.round(b0 + frac * (b1 - b0)),
  ];
}
