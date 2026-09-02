/**
 * OceanView — Scientific Render Policy Engine
 * Centralizes camera-adaptive display heuristics, level-of-detail (LOD),
 * and multi-layer compositing policies.
 *
 * Core Principle:
 *   DATA DENSITY is invariant.
 *   DISPLAY DENSITY & VISUAL EMPHASIS adapt to camera altitude and active layers.
 *   Never modifies underlying physical scientific data.
 */

export const CameraAltitudeTier = Object.freeze({
  GLOBAL: 'GLOBAL',     // > 6,000 km altitude (nadir full basin view)
  REGIONAL: 'REGIONAL', // 1,500 km – 6,000 km (sub-basin, e.g. Arabian Sea / Bay of Bengal)
  LOCAL: 'LOCAL',       // < 1,500 km (high-resolution local coast / transect / eddy probe)
});

export const QualityMode = Object.freeze({
  SCIENCE: 'SCIENCE',           // Restrained, exact colormaps, maximum spatial clarity (Default)
  PRESENTATION: 'PRESENTATION', // Slightly enhanced contrast, smoother transitions
});

/**
 * Classifies Cesium camera altitude into discrete operational tiers.
 * @param {number} cameraHeightMeters
 * @returns {string} CameraAltitudeTier
 */
export function getCameraAltitudeTier(cameraHeightMeters = 3000000) {
  if (cameraHeightMeters > 6000000) return CameraAltitudeTier.GLOBAL;
  if (cameraHeightMeters >= 1500000) return CameraAltitudeTier.REGIONAL;
  return CameraAltitudeTier.LOCAL;
}

/**
 * Computes vector glyph rendering policy based on altitude, grid dimensions, and layer composition.
 *
 * @param {object} params
 * @param {number} [params.cameraHeight=3000000]
 * @param {{ latCount: number, lonCount: number }} [params.gridDimensions]
 * @param {boolean} [params.scalarVisible=false]
 * @param {boolean} [params.particleVisible=false]
 * @param {string} [params.qualityMode=QualityMode.SCIENCE]
 * @returns {{ densityStride: number, vectorScale: number, shaftWidth: number, headWidth: number, maxVisualLengthDeg: number }}
 */
export function getVectorRenderPolicy({
  cameraHeight = 3000000,
  gridDimensions = { latCount: 8, lonCount: 11 },
  scalarVisible = false,
  particleVisible = false,
  _qualityMode = QualityMode.SCIENCE,
} = {}) {
  const tier = getCameraAltitudeTier(cameraHeight);
  const totalCells = (gridDimensions?.latCount || 8) * (gridDimensions?.lonCount || 11);

  let densityStride = 1;
  let vectorScale = 1.4;
  let shaftWidth = 3.2;
  let headWidth = 2.6;
  let maxVisualLengthDeg = 1.6;

  switch (tier) {
    case CameraAltitudeTier.GLOBAL:
      // In global view, decimate dense grids to prevent visual clutter
      densityStride = totalCells > 60 ? 2 : 1;
      vectorScale = 1.8;
      shaftWidth = 3.6;
      headWidth = 3.0;
      maxVisualLengthDeg = 2.0;
      break;

    case CameraAltitudeTier.REGIONAL:
      densityStride = 1;
      vectorScale = 1.4;
      shaftWidth = 3.2;
      headWidth = 2.6;
      maxVisualLengthDeg = 1.5;
      break;

    case CameraAltitudeTier.LOCAL:
      densityStride = 1;
      vectorScale = 1.0;
      shaftWidth = 2.8;
      headWidth = 2.2;
      maxVisualLengthDeg = 1.0;
      break;
  }

  // If scalar and particles are both visible, subtly accentuate vector lines for contrast
  if (scalarVisible && particleVisible) {
    shaftWidth += 0.4;
  }

  return {
    tier,
    densityStride,
    vectorScale,
    shaftWidth,
    headWidth,
    maxVisualLengthDeg,
    minVisualLengthDeg: 0.12,
  };
}

/**
 * Computes scalar field display policy and compositing factors.
 *
 * @param {object} params
 * @param {number} [params.cameraHeight=3000000]
 * @param {number} [params.userOpacity=0.85]
 * @param {boolean} [params.vectorVisible=false]
 * @param {boolean} [params.particleVisible=false]
 * @param {string} [params.qualityMode=QualityMode.SCIENCE]
 * @returns {{ displayOpacity: number, presentationFactor: number, imageSmoothing: boolean, displayResolution: number }}
 */
export function getScalarRenderPolicy({
  cameraHeight = 3000000,
  userOpacity = 0.85,
  vectorVisible = false,
  particleVisible = false,
  _qualityMode = QualityMode.SCIENCE,
} = {}) {
  const tier = getCameraAltitudeTier(cameraHeight);

  // If vectors are active, reduce scalar opacity so vector arrows stand out clearly
  let presentationFactor = 1.0;
  if (vectorVisible && particleVisible) {
    presentationFactor = 0.65;
  } else if (vectorVisible) {
    presentationFactor = 0.75;
  } else if (particleVisible) {
    presentationFactor = 0.85;
  }

  const displayOpacity = Math.max(0.1, Math.min(1.0, userOpacity * presentationFactor));

  // High-quality bilinear interpolation for clean spatial gradients
  const imageSmoothing = true;
  const displayResolution = tier === CameraAltitudeTier.LOCAL ? 1024 : 512;

  return {
    tier,
    displayOpacity: Number(displayOpacity.toFixed(3)),
    presentationFactor,
    imageSmoothing,
    displayResolution,
    gridLabel: 'NATIVE GRID 0.25° | BILINEAR INTERPOLATED',
  };
}

/**
 * Computes particle advection budget and trail parameters.
 *
 * @param {object} params
 * @param {number} [params.cameraHeight=3000000]
 * @param {string} [params.budgetTier='MEDIUM']
 * @param {number} [params.flowSpeed=1.0]
 * @param {string} [params.qualityMode=QualityMode.SCIENCE]
 * @returns {{ effectiveCount: number, flowSpeed: number, trailFadeRate: number, lineWidth: number }}
 */
export function getParticleRenderPolicy({
  cameraHeight = 3000000,
  budgetTier = 'MEDIUM',
  flowSpeed = 1.0,
  _qualityMode = QualityMode.SCIENCE,
} = {}) {
  const tier = getCameraAltitudeTier(cameraHeight);
  const baseBudgetMap = { LOW: 1500, MEDIUM: 4000, HIGH: 8000 };
  const baseCount = baseBudgetMap[budgetTier] || 4000;

  let effectiveCount = baseCount;
  let trailFadeRate = 0.08; // 8% alpha reduction per frame via destination-out
  let lineWidth = 1.8;

  switch (tier) {
    case CameraAltitudeTier.GLOBAL:
      // Reduce particle count slightly in global view to prevent saturated whiteout
      effectiveCount = Math.min(baseCount, Math.round(baseCount * 0.75));
      trailFadeRate = 0.10;
      lineWidth = 1.5;
      break;

    case CameraAltitudeTier.REGIONAL:
      effectiveCount = baseCount;
      trailFadeRate = 0.08;
      lineWidth = 1.8;
      break;

    case CameraAltitudeTier.LOCAL:
      effectiveCount = baseCount;
      trailFadeRate = 0.06;
      lineWidth = 2.2;
      break;
  }

  return {
    tier,
    effectiveCount,
    flowSpeed,
    trailFadeRate,
    lineWidth,
  };
}

/**
 * Computes observation profile rendering hierarchy.
 *
 * @param {object} params
 * @param {number} [params.cameraHeight=3000000]
 * @param {string|null} [params.selectedProfileId=null]
 * @returns {{ unselectedPixelSize: number, selectedPixelSize: number, clusterPixelRange: number }}
 */
export function getObservationRenderPolicy({
  cameraHeight = 3000000,
  selectedProfileId = null,
} = {}) {
  const tier = getCameraAltitudeTier(cameraHeight);

  let unselectedPixelSize = 8;
  let selectedPixelSize = 14;
  let clusterPixelRange = 40;

  if (tier === CameraAltitudeTier.LOCAL) {
    unselectedPixelSize = 10;
    selectedPixelSize = 16;
    clusterPixelRange = 25; // Smaller clustering for local detail
  } else if (tier === CameraAltitudeTier.GLOBAL) {
    unselectedPixelSize = 6;
    selectedPixelSize = 12;
    clusterPixelRange = 50;
  }

  return {
    tier,
    unselectedPixelSize,
    selectedPixelSize,
    clusterPixelRange,
    hasSelection: !!selectedProfileId,
  };
}
