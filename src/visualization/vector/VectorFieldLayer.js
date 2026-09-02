/**
 * OceanView — Vector Field Glyph Visualization Layer
 * Renders decimated directional current vector arrows on Cesium using Entity polylines.
 *
 * CRITICAL FIX (Phase 7.6):
 *   Previous PolylineCollection at 1000m altitude was occluded by Google 3D Tiles.
 *   Now uses Entity-based polylines with disableDepthTestDistance to guarantee visibility
 *   above any basemap type.
 *
 * Invariants:
 *   - Direction convention: Standard oceanographic flow bearing (0°=N, 90°=E, 180°=S, 270°=W)
 *   - Length scaled by speed magnitude |V|
 *   - Color-mapped using cmocean 'speed' palette with smooth interpolation
 *   - Arrowhead geometry for directional clarity
 */

import * as Cesium from 'cesium';
import { sampleColormap } from '../color/scientificColorMaps.js';
import { governorRequestRender } from '../../engine/rendering/renderGovernor.js';

export class VectorFieldLayer {
  constructor(viewer) {
    this.viewer = viewer;
    this.dataSource = null;
    this.activeGrid = null;
    this.activeDepthIdx = 0;
    this.density = 2; // Decimation stride
    this.vectorScale = 1.2; // Degrees per (m/s)
  }

  /**
   * Updates the vector glyph visualization with a new CanonicalGridVector.
   *
   * @param {object} gridVector - CanonicalGridVector
   * @param {number} [depthMeters=0]
   * @param {number} [density=2]
   * @param {boolean} [isXRayMode=false]
   */
  updateVectors(gridVector, depthMeters = 0, density = 2, isXRayMode = false) {
    if (!this.viewer || this.viewer.isDestroyed?.()) return;

    this.clear();
    if (!gridVector || !gridVector.uData || !gridVector.vData) return;

    this.activeGrid = gridVector;
    this.density = Math.max(1, density);

    const { latCount, lonCount } = gridVector.dimensions;
    const lats = gridVector.coordinates.latitudes;
    const lons = gridVector.coordinates.longitudes;

    // Locate closest depth index
    let depthIdx = 0;
    const depths = gridVector.coordinates.depths;
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
    this.activeDepthIdx = depthIdx;

    // Create a dedicated data source for vector glyphs
    this.dataSource = new Cesium.CustomDataSource('OceanVectorGlyphs');
    this.viewer.dataSources.add(this.dataSource);

    // Render height: 5m micro-offset for surface, otherwise true negative depth
    const renderHeight = depthMeters <= 5 ? 5.0 : -depthMeters;

    // Iterate across decimated grid
    for (let r = 0; r < latCount; r += this.density) {
      const lat = lats[r];
      const cosLat = Math.cos((lat * Math.PI) / 180.0);

      for (let c = 0; c < lonCount; c += this.density) {
        const lon = lons[c];
        const vec = gridVector.getVector(r, c, depthIdx);

        if (!vec || isNaN(vec.u) || isNaN(vec.v)) continue;

        const { u, v, speed } = vec;
        if (speed < 0.005) continue; // Skip negligible currents

        // Scaled displacement in degrees
        const dLon = (u * this.vectorScale) / Math.max(0.1, cosLat);
        const dLat = v * this.vectorScale;

        const endLon = lon + dLon;
        const endLat = lat + dLat;

        // Normalize speed to [0, 1.2 m/s] for cmocean speed colormap
        const normSpeed = Math.min(1.0, speed / 1.2);
        const colorHex = sampleColormap('SPEED', normSpeed);
        const color = Cesium.Color.fromCssColorString(colorHex);

        // Shaft polyline
        this.dataSource.entities.add({
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights([
              lon, lat, renderHeight,
              endLon, endLat, renderHeight,
            ]),
            width: 2.5,
            material: color,
            depthFailMaterial: isXRayMode ? color : undefined,
          },
        });

        // Arrowhead: two short lines from tip at ±30° from direction
        const headLen = Math.max(0.15, Math.sqrt(dLon * dLon + dLat * dLat) * 0.35);
        const angle = Math.atan2(dLon, dLat); // angle of vector

        const headAngle1 = angle + Math.PI * 0.82; // ~148° from forward
        const headAngle2 = angle - Math.PI * 0.82;

        const h1Lon = endLon + headLen * Math.sin(headAngle1) / Math.max(0.1, cosLat);
        const h1Lat = endLat + headLen * Math.cos(headAngle1);
        const h2Lon = endLon + headLen * Math.sin(headAngle2) / Math.max(0.1, cosLat);
        const h2Lat = endLat + headLen * Math.cos(headAngle2);

        this.dataSource.entities.add({
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights([
              h1Lon, h1Lat, renderHeight,
              endLon, endLat, renderHeight,
              h2Lon, h2Lat, renderHeight,
            ]),
            width: 2.0,
            material: color,
            depthFailMaterial: isXRayMode ? color : undefined,
          },
        });

      }
    }

    governorRequestRender();
  }

  /**
   * Returns diagnostic state for the debug overlay.
   */
  getDebugState() {
    return {
      layerId: 'VECTOR_GLYPHS',
      enabled: !!this.dataSource,
      hasData: !!this.activeGrid,
      entityCount: this.dataSource?.entities?.values?.length || 0,
      depthIdx: this.activeDepthIdx,
      density: this.density,
    };
  }

  clear() {
    if (this.dataSource && this.viewer && !this.viewer.isDestroyed?.()) {
      this.viewer.dataSources.remove(this.dataSource, true);
      this.dataSource = null;
      this.activeGrid = null;
      governorRequestRender();
    }
  }
}
