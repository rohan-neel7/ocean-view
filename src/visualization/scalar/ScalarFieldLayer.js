/**
 * OceanView — Scalar Field Grid Visualization Layer
 * Renders 2D/3D numerical scalar fields onto the Cesium globe using Entity-based
 * Rectangle primitives with canvas textures.
 *
 * CRITICAL FIX (Phase 7.6):
 *   Previous implementation used viewer.imageryLayers which are tied to globe.show.
 *   When Google 3D Tiles is active, globe.show=false hides all imagery layers.
 *   This rewrite uses Entity + RectangleGraphics which renders independently of globe state.
 */

import * as Cesium from 'cesium';
import { COLORMAP_PRESETS, sampleColormapRgb } from '../color/scientificColorMaps.js';
import { governorRequestRender } from '../../engine/rendering/renderGovernor.js';

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
  }

  /**
   * Updates the scalar field visualization with a new CanonicalGridScalar and depth.
   * @param {object} gridScalar - CanonicalGridScalar
   * @param {string} colormapKey - Colormap preset key
   * @param {number} depthMeters - Target depth in meters
   * @param {number} opacity - Layer opacity (0-1)
   * @param {{ min: number|null, max: number|null }} rangeOverride - Custom color range
   */
  updateGrid(gridScalar, colormapKey = 'THERMAL', depthMeters = 0, opacity = 0.85, rangeOverride = {}) {
    if (!this.viewer || this.viewer.isDestroyed?.()) return;

    const currentGen = ++this._updateGen;
    this.activeGrid = gridScalar;
    this.colormap = colormapKey;
    this.activeDepthMeters = depthMeters;
    this.opacity = opacity;
    this.rangeOverride = rangeOverride;

    this.remove();

    if (!gridScalar || !gridScalar.data) return;

    // Generate canvas texture from the grid slice
    const canvas = this._createGridTextureCanvas(gridScalar, colormapKey, depthMeters, rangeOverride);
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

    // Render height: surface fields at slight elevation to clear terrain/tiles,
    // subsurface fields at negative depth (for future subsurface camera support)
    const renderHeight = depthMeters <= 5 ? 50.0 : -depthMeters;

    try {
      this.entity = this.viewer.entities.add({
        rectangle: {
          coordinates: rectangle,
          material: new Cesium.ImageMaterialProperty({
            image: canvas,
            transparent: true,
          }),
          height: renderHeight,
          heightReference: depthMeters <= 5
            ? Cesium.HeightReference.NONE
            : Cesium.HeightReference.NONE,
          classificationType: Cesium.ClassificationType.BOTH,
          // Disable depth test so the field renders above 3D tiles
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });

      governorRequestRender();
    } catch (err) {
      console.warn('[ScalarFieldLayer] Entity creation warning:', err);
    }
  }

  /**
   * Generates a 2D canvas representing the color-mapped grid slice.
   * @private
   * @param {object} grid - CanonicalGridScalar
   * @param {string} colormapKey
   * @param {number} depthMeters
   * @param {object} rangeOverride - { min: number|null, max: number|null }
   * @returns {HTMLCanvasElement|null}
   */
  _createGridTextureCanvas(grid, colormapKey, depthMeters, rangeOverride = {}) {
    const { latCount, lonCount } = grid.dimensions;
    const canvas = document.createElement('canvas');
    // Use higher resolution for visual quality (upscale small grids)
    const scale = Math.max(1, Math.ceil(512 / Math.max(latCount, lonCount)));
    canvas.width = lonCount * scale;
    canvas.height = latCount * scale;
    const ctx = canvas.getContext('2d');

    // Work on a 1:1 pixel imageData then scale
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
    const alphaVal = Math.floor(this.opacity * 255);

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

    // Scale up using nearest-neighbor for crisp grid cells
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(srcCanvas, 0, 0, canvas.width, canvas.height);

    return canvas;
  }

  setOpacity(val) {
    this.opacity = val;
    if (this.entity && this.entity.rectangle) {
      // Regenerate canvas with new opacity baked in, then update material
      if (this.activeGrid) {
        this.updateGrid(
          this.activeGrid,
          this.colormap,
          this.activeDepthMeters,
          val,
          this.rangeOverride || {}
        );
      }
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
      gridDimensions: this.activeGrid
        ? `${this.activeGrid.dimensions.latCount}×${this.activeGrid.dimensions.lonCount}`
        : null,
      bounds: this.activeGrid?.coordinates?.bbox || null,
      colormap: this.colormap,
      opacity: this.opacity,
      primitiveCreated: !!this.entity,
      dataStats: this.activeGrid?.stats || null,
    };
  }

  remove() {
    if (this.entity && this.viewer && !this.viewer.isDestroyed?.()) {
      this.viewer.entities.remove(this.entity);
      this.entity = null;
      this._canvas = null;
      governorRequestRender();
    }
  }
}
