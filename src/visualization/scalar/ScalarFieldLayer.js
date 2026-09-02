/**
 * OceanView — Scalar Field Grid Visualization Layer
 * Renders 2D/3D numerical scalar fields onto the Cesium globe using Entity-based
 * Rectangle primitives with smooth, high-resolution bilinear canvas textures.
 *
 * Invariants:
 *   - Native cell values and nodata masks are strictly preserved
 *   - Bilinear canvas filtering produces smooth spatial transitions without fake details
 *   - Landmasked / missing cells remain 100% transparent without leaking into the ocean
 *   - Presentation opacity automatically adapts when vector or particle layers are active
 */

import * as Cesium from 'cesium';
import { COLORMAP_PRESETS, sampleColormapRgb } from '../color/scientificColorMaps.js';
import { governorRequestRender } from '../../engine/rendering/renderGovernor.js';
import { getScalarRenderPolicy } from '../../engine/rendering/scientificRenderPolicy.js';
import { toCesiumRenderAltitude } from '../../engine/spatial/depthCoordinates.js';

export class ScalarFieldLayer {
  constructor(viewer) {
    this.viewer = viewer;
    this.entity = null;
    this.activeGrid = null;
    this.colormap = 'THERMAL';
    this.opacity = 0.85;
    this.activeDepthMeters = 0;
    this._updateGen = 0;
    this._canvas = null;
    this.rangeOverride = {};
    this.layerContext = { vectorVisible: false, particleVisible: false };
  }

  /**
   * Updates the scalar field visualization with a new CanonicalGridScalar and depth.
   * @param {object} gridScalar - CanonicalGridScalar
   * @param {string} colormapKey - Colormap preset key
   * @param {number} depthMeters - Target depth in meters
   * @param {number} opacity - Layer opacity (0-1)
   * @param {{ min: number|null, max: number|null }} rangeOverride - Custom color range
   * @param {object} [layerContext={}] - { vectorVisible, particleVisible, cameraHeight }
   */
  updateGrid(gridScalar, colormapKey = 'THERMAL', depthMeters = 0, opacity = 0.85, rangeOverride = {}, layerContext = {}) {
    if (!this.viewer || this.viewer.isDestroyed?.()) return;

    const currentGen = ++this._updateGen;
    this.activeGrid = gridScalar;
    this.colormap = colormapKey;
    this.activeDepthMeters = depthMeters;
    this.opacity = opacity;
    this.rangeOverride = rangeOverride;
    this.layerContext = layerContext;

    this.remove();

    if (!gridScalar || !gridScalar.data) return;

    // Get camera altitude for adaptive policy
    let cameraHeight = 3000000;
    if (this.viewer.camera?.positionCartographic) {
      cameraHeight = this.viewer.camera.positionCartographic.height || 3000000;
    }

    const policy = getScalarRenderPolicy({
      cameraHeight: layerContext.cameraHeight || cameraHeight,
      userOpacity: opacity,
      vectorVisible: layerContext.vectorVisible || false,
      particleVisible: layerContext.particleVisible || false,
    });

    // Generate canvas texture from the grid slice
    const canvas = this._createGridTextureCanvas(gridScalar, colormapKey, depthMeters, rangeOverride, policy);
    if (!canvas) return;

    if (currentGen !== this._updateGen) return; // Discard superseded update
    if (!this.viewer || this.viewer.isDestroyed?.()) return;

    this._canvas = canvas;

    const bbox = gridScalar.coordinates.bbox;
    const rectangle = Cesium.Rectangle.fromDegrees(
      bbox.minLon,
      bbox.minLat,
      bbox.maxLon,
      bbox.maxLat
    );

    // Render height: compute deterministic Cesium ellipsoidal altitude via coordinate system
    const renderHeight = toCesiumRenderAltitude(depthMeters, { isVector: false });

    try {
      this.entity = this.viewer.entities.add({
        rectangle: {
          coordinates: rectangle,
          material: new Cesium.ImageMaterialProperty({
            image: canvas,
            transparent: true,
          }),
          height: renderHeight,
          heightReference: Cesium.HeightReference.NONE,
          classificationType: Cesium.ClassificationType.BOTH,
          disableDepthTestDistance: Number.POSITIVE_INFINITY, // Ensure visibility above basemap
        },
      });

      governorRequestRender();
    } catch (err) {
      console.warn('[ScalarFieldLayer] Entity creation warning:', err);
    }
  }

  /**
   * Generates a smooth, high-resolution 2D canvas representing the color-mapped grid slice.
   * @private
   * @param {object} grid - CanonicalGridScalar
   * @param {string} colormapKey
   * @param {number} depthMeters
   * @param {object} rangeOverride - { min: number|null, max: number|null }
   * @param {object} policy - Policy output from scientificRenderPolicy
   * @returns {HTMLCanvasElement|object|null}
   */
  _createGridTextureCanvas(grid, colormapKey, depthMeters, rangeOverride = {}, policy = {}) {
    const { latCount, lonCount } = grid.dimensions;
    if (typeof document === 'undefined') {
      return { width: lonCount, height: latCount };
    }

    const displayRes = policy.displayResolution || 512;
    const canvas = document.createElement('canvas');
    canvas.width = displayRes;
    canvas.height = displayRes;
    const ctx = canvas.getContext('2d');

    // Work on a native 1:1 pixel imageData first
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = lonCount;
    srcCanvas.height = latCount;
    const srcCtx = srcCanvas.getContext('2d');
    const imgData = srcCtx.createImageData(lonCount, latCount);
    const pixels = imgData.data;

    const preset = COLORMAP_PRESETS[colormapKey.toUpperCase()] || COLORMAP_PRESETS.THERMAL;
    const minRange = (rangeOverride?.min != null) ? rangeOverride.min : preset.defaultRange[0];
    const maxRange = (rangeOverride?.max != null) ? rangeOverride.max : preset.defaultRange[1];
    const rangeSpan = Math.max(0.001, maxRange - minRange);

    // Locate closest depth index
    let depthIdx = 0;
    const depths = grid.coordinates.depths;
    if (depths && depths.length > 1) {
      let minDiff = Infinity;
      for (let d = 0; d < depths.length; d++) {
        const diff = Math.abs(depths[d] - depthMeters);
        if (diff < minDiff) {
          minDiff = diff;
          depthIdx = d;
        }
      }
    }

    const colormapUpper = colormapKey.toUpperCase();
    const alphaVal = Math.floor((policy.displayOpacity ?? this.opacity) * 255);

    for (let r = 0; r < latCount; r++) {
      // Invert row index so north is at top of texture
      const latIdx = latCount - 1 - r;
      for (let c = 0; c < lonCount; c++) {
        const val = grid.getValue(latIdx, c, depthIdx);
        const pixelIdx = (r * lonCount + c) * 4;

        if (val === null || isNaN(val)) {
          pixels[pixelIdx + 3] = 0; // Transparent mask (land / missing)
        } else {
          const norm = Math.max(0.0, Math.min(1.0, (val - minRange) / rangeSpan));
          const [R, G, B] = sampleColormapRgb(colormapUpper, norm);

          pixels[pixelIdx] = R;
          pixels[pixelIdx + 1] = G;
          pixels[pixelIdx + 2] = B;
          pixels[pixelIdx + 3] = alphaVal;
        }
      }
    }

    srcCtx.putImageData(imgData, 0, 0);

    // Smooth bilinear upsampling for professional scientific cartography
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(srcCanvas, 0, 0, canvas.width, canvas.height);

    return canvas;
  }

  setOpacity(val) {
    this.opacity = val;
    if (this.activeGrid) {
      this.updateGrid(
        this.activeGrid,
        this.colormap,
        this.activeDepthMeters,
        val,
        this.rangeOverride || {},
        this.layerContext || {}
      );
    }
  }

  /**
   * Returns diagnostic state for the debug overlay.
   */
  getDebugState() {
    return {
      layerId: 'SCALAR_FIELD',
      enabled: !!this.entity,
      hasData: !!this.activeGrid,
      variable: this.activeGrid?.variable || null,
      depth: this.activeDepthMeters,
      physicalDepthMeters: this.activeDepthMeters,
      displayOffsetMeters: toCesiumRenderAltitude(this.activeDepthMeters, { isVector: false }),
      gridDimensions: this.activeGrid
        ? `${this.activeGrid.dimensions.latCount}×${this.activeGrid.dimensions.lonCount}`
        : null,
      bounds: this.activeGrid?.coordinates?.bbox || null,
      colormap: this.colormap,
      opacity: this.opacity,
      primitiveCreated: !!this.entity,
      dataStats: this.activeGrid?.stats || null,
      gridLabel: 'NATIVE GRID 0.25° | BILINEAR INTERPOLATED',
    };
  }

  remove() {
    if (this.entity && this.viewer && !this.viewer.isDestroyed?.()) {
      try {
        this.viewer.entities.remove(this.entity);
      } catch (_e) {
        // Ignored
      }
      this.entity = null;
      this._canvas = null;
      governorRequestRender();
    }
  }

  destroy() {
    this.remove();
    this.viewer = null;
    this.activeGrid = null;
  }
}
