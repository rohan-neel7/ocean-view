/**
 * OceanView — Vector Field Glyph Visualization Layer
 * Renders high-contrast, scientifically calibrated directional current vector arrows in Cesium.
 *
 * Invariants:
 *   - Direction convention: Standard oceanographic flow bearing (0°=N, 90°=E, 180°=S, 270°=W)
 *   - Adaptive density and scaling governed by scientificRenderPolicy
 *   - Color-mapped using cmocean 'speed' palette with smooth interpolation
 *   - Uses Entity polylines with depthFailMaterial to guarantee crisp visibility at any camera zoom
 *   - Bounded visual arrow length (P50/P90/capped) to prevent visual clutter
 *   - Embeds vectorData metadata onto entities for instant probe and click inspections
 */

import * as Cesium from 'cesium';
import { sampleColormap } from '../color/scientificColorMaps.js';
import { governorRequestRender } from '../../engine/rendering/renderGovernor.js';
import { getVectorRenderPolicy } from '../../engine/rendering/scientificRenderPolicy.js';
import { toCesiumRenderAltitude } from '../../engine/spatial/depthCoordinates.js';

export class VectorFieldLayer {
  constructor(viewer) {
    this.viewer = viewer;
    this.dataSource = null;
    this.activeGrid = null;
    this.activeDepthIdx = 0;
    this.density = 1; // Base decimation stride
    this.vectorScale = 1.4; // Base visual scale
    this.activeTier = 'REGIONAL';
  }

  /**
   * Updates the vector glyph visualization with a new CanonicalGridVector.
   *
   * @param {object} gridVector - CanonicalGridVector
   * @param {number} [depthMeters=0]
   * @param {number} [densityOverride=null]
   * @param {boolean} [_isXRayMode=false]
   * @param {object} [layerContext={}] - { cameraHeight, scalarVisible, particleVisible }
   */
  updateVectors(gridVector, depthMeters = 0, densityOverride = null, _isXRayMode = false, layerContext = {}) {
    if (!this.viewer || this.viewer.isDestroyed?.()) return;

    this.clear();
    if (!gridVector || !gridVector.uData || !gridVector.vData) return;

    this.activeGrid = gridVector;

    // Determine camera height
    let cameraHeight = 3000000;
    if (this.viewer.camera?.positionCartographic) {
      cameraHeight = this.viewer.camera.positionCartographic.height || 3000000;
    }

    const policy = getVectorRenderPolicy({
      cameraHeight: layerContext.cameraHeight || cameraHeight,
      gridDimensions: gridVector.dimensions,
      scalarVisible: layerContext.scalarVisible || false,
      particleVisible: layerContext.particleVisible || false,
    });

    this.activeTier = policy.tier;
    this.density = densityOverride !== null ? Math.max(1, densityOverride) : policy.densityStride;
    this.vectorScale = policy.vectorScale;

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

    // Create a dedicated CustomDataSource for vector glyph entities
    this.dataSource = new Cesium.CustomDataSource('OceanVectorGlyphs');
    this.viewer.dataSources.add(this.dataSource);

    // Render height: compute deterministic Cesium ellipsoidal altitude via coordinate system
    const renderHeight = toCesiumRenderAltitude(depthMeters, { isVector: true });

    // Iterate across grid with decimation stride
    for (let r = 0; r < latCount; r += this.density) {
      const lat = lats[r];
      const cosLat = Math.max(0.15, Math.cos((lat * Math.PI) / 180.0));

      for (let c = 0; c < lonCount; c += this.density) {
        const lon = lons[c];
        const vec = gridVector.getVector(r, c, depthIdx);

        if (!vec || isNaN(vec.u) || isNaN(vec.v)) continue;

        const { u, v, speed, headingDeg } = vec;
        if (speed < 0.003) continue; // Skip negligible zero-noise currents

        // Bounded visual arrow length: between min and max visual degrees
        const rawLen = speed * this.vectorScale;
        const visualLen = Math.min(policy.maxVisualLengthDeg, Math.max(policy.minVisualLengthDeg, rawLen));
        const scaleFactor = visualLen / Math.max(0.001, speed);

        // Scaled displacement in geographic degrees
        const dLon = (u * scaleFactor) / cosLat;
        const dLat = v * scaleFactor;

        const endLon = lon + dLon;
        const endLat = lat + dLat;

        // Color mapped by cmocean 'speed' palette (normalized to [0, 1.0 m/s])
        const normSpeed = Math.min(1.0, speed / 1.0);
        const colorHex = sampleColormap('SPEED', normSpeed);
        const color = Cesium.Color.fromCssColorString(colorHex);

        const vectorMetadata = {
          u,
          v,
          speed,
          headingDeg,
          lat,
          lon,
          depthMeters,
          source: gridVector.source || 'ANDRO',
          temporalState: gridVector.temporalState || 'CLIMATOLOGY',
        };

        // 1. Shaft polyline with depthFailMaterial to guarantee visibility at orbital altitude
        this.dataSource.entities.add({
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights([
              lon, lat, renderHeight,
              endLon, endLat, renderHeight,
            ]),
            width: policy.shaftWidth,
            material: color,
            depthFailMaterial: color, // Guarantees crisp visibility against globe ellipsoid
            arcType: Cesium.ArcType.NONE,
          },
          vectorData: vectorMetadata,
        });

        // 2. Directional Arrowhead geometry
        const angle = Math.atan2(dLon * cosLat, dLat);
        const headLen = Math.min(0.35, Math.max(0.08, visualLen * 0.36));

        // Backward wings at ±150 degrees (2.618 rad) from forward velocity vector
        const headAngle1 = angle + 2.618;
        const headAngle2 = angle - 2.618;

        const h1Lon = endLon + (headLen * Math.sin(headAngle1)) / cosLat;
        const h1Lat = endLat + headLen * Math.cos(headAngle1);
        const h2Lon = endLon + (headLen * Math.sin(headAngle2)) / cosLat;
        const h2Lat = endLat + headLen * Math.cos(headAngle2);

        this.dataSource.entities.add({
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights([
              h1Lon, h1Lat, renderHeight,
              endLon, endLat, renderHeight,
              h2Lon, h2Lat, renderHeight,
            ]),
            width: policy.headWidth,
            material: color,
            depthFailMaterial: color,
            arcType: Cesium.ArcType.NONE,
          },
          vectorData: vectorMetadata,
        });
      }
    }

    governorRequestRender();
  }

  setDensity(density) {
    this.density = Math.max(1, density);
    if (this.activeGrid) {
      const depths = this.activeGrid.coordinates.depths;
      const depthMeters = depths?.[this.activeDepthIdx] ?? 0;
      this.updateVectors(this.activeGrid, depthMeters, this.density);
    }
  }

  setScale(scale) {
    this.vectorScale = Math.max(0.2, Math.min(5.0, scale));
    if (this.activeGrid) {
      const depths = this.activeGrid.coordinates.depths;
      const depthMeters = depths?.[this.activeDepthIdx] ?? 0;
      this.updateVectors(this.activeGrid, depthMeters, this.density);
    }
  }

  /**
   * Returns rich diagnostic telemetry for the developer debug overlay.
   */
  getDebugState() {
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    let minSpd = Infinity, maxSpd = -Infinity;
    if (this.activeGrid) {
      const { latCount, lonCount } = this.activeGrid.dimensions;
      for (let r = 0; r < latCount; r++) {
        for (let c = 0; c < lonCount; c++) {
          const v = this.activeGrid.getVector(r, c, this.activeDepthIdx);
          if (v) {
            if (v.u < minU) minU = v.u;
            if (v.u > maxU) maxU = v.u;
            if (v.v < minV) minV = v.v;
            if (v.v > maxV) maxV = v.v;
            if (v.speed < minSpd) minSpd = v.speed;
            if (v.speed > maxSpd) maxSpd = v.speed;
          }
        }
      }
    }

    const entityCount = this.dataSource?.entities?.values?.length || 0;

    return {
      layerId: 'CURRENT VECTOR DEBUG',
      source: this.activeGrid?.source || 'ANDRO',
      state: this.activeGrid?.temporalState || 'CLIMATOLOGY',
      enabled: !!this.dataSource && entityCount > 0,
      hasData: !!this.activeGrid,
      gridDimensions: this.activeGrid ? `${this.activeGrid.dimensions.latCount} × ${this.activeGrid.dimensions.lonCount}` : 'None',
      depth: this.activeGrid?.coordinates?.depths?.[this.activeDepthIdx] ?? 5,
      physicalDepthMeters: this.activeGrid?.coordinates?.depths?.[this.activeDepthIdx] ?? 5,
      displayOffsetMeters: toCesiumRenderAltitude(this.activeGrid?.coordinates?.depths?.[this.activeDepthIdx] ?? 5, { isVector: true }),
      uRange: minU !== Infinity ? `${minU.toFixed(3)} / ${maxU.toFixed(3)} m/s` : 'N/A',
      vRange: minV !== Infinity ? `${minV.toFixed(3)} / ${maxV.toFixed(3)} m/s` : 'N/A',
      speedRange: minSpd !== Infinity ? `${minSpd.toFixed(3)} / ${maxSpd.toFixed(3)} m/s` : 'N/A',
      glyphs: Math.floor(entityCount / 2),
      entityCount,
      renderer: entityCount > 0 ? 'VISIBLE' : 'HIDDEN',
      primitiveCreated: !!this.dataSource,
      density: this.density,
      tier: this.activeTier,
    };
  }

  clear() {
    if (this.dataSource && this.viewer && !this.viewer.isDestroyed?.()) {
      try {
        this.viewer.dataSources.remove(this.dataSource, true);
      } catch (_e) {
        // Ignored
      }
      this.dataSource = null;
      this.activeGrid = null;
      governorRequestRender();
    }
  }

  destroy() {
    this.clear();
    this.viewer = null;
  }
}
