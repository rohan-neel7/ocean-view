/**
 * OceanView — 3D Vertical Transect Curtain Visualization Layer
 * Renders vertical curtain section meshes in Cesium with configurable vertical exaggeration.
 *
 * CRITICAL FIX (Phase 7.6):
 *   Added depthFailAppearance so subsurface geometry remains visible even when behind
 *   Google 3D Tiles / terrain. Enable underground camera mode when active.
 *
 * Invariants:
 *   - Geographically accurate transect placement along sampled stations.
 *   - Vertical exaggeration is a visual transformation only; underlying physical depths are preserved.
 *   - Scalar values mapped to perceptually uniform scientific colormaps (cmocean).
 *   - Clean lifecycle management: previous primitives are cleanly disposed upon update.
 */

import * as Cesium from 'cesium';
import { sampleColormap } from '../color/scientificColorMaps.js';
import { governorRequestRender } from '../../engine/rendering/renderGovernor.js';
import { toCesiumRenderAltitude } from '../../engine/spatial/depthCoordinates.js';

export class VerticalTransectLayer {
  constructor(viewer) {
    this.viewer = viewer;
    this.primitive = null;
    this.activeSection = null;
    this.exaggerationFactor = 20.0; // Default vertical exaggeration
  }

  /**
   * Updates and renders the 3D vertical curtain along the extracted section.
   *
   * @param {object} verticalSection - Output of VerticalSectionEngine
   * @param {string} [colormapKey='THERMAL']
   * @param {number} [exaggeration=20.0]
   */
  updateTransect(verticalSection, colormapKey = 'THERMAL', exaggeration = 20.0) {
    if (!this.viewer || this.viewer.isDestroyed?.()) return;

    this.clear();
    if (!verticalSection || !verticalSection.matrix || !verticalSection.stations) return;

    this.activeSection = verticalSection;
    this.exaggerationFactor = Math.max(1.0, Math.min(100.0, Number(exaggeration) || 20.0));

    const { stations, depths, matrix, stats } = verticalSection;
    const stationCount = stations.length;
    const depthCount = depths.length;

    if (stationCount < 2 || depthCount < 2) return;

    const valMin = stats.min;
    const valSpan = Math.max(0.001, stats.max - stats.min);

    // Build geometry instances
    const positions = [];
    const colors = [];
    const indices = [];
    let vertexIndex = 0;

    for (let s = 0; s < stationCount - 1; s++) {
      const st0 = stations[s];
      const st1 = stations[s + 1];

      for (let d = 0; d < depthCount - 1; d++) {
        const z0 = depths[d];
        const z1 = depths[d + 1];

        const val00 = matrix[d][s];
        const val10 = matrix[d][s + 1];
        const val11 = matrix[d + 1][s + 1];
        const val01 = matrix[d + 1][s];

        // Skip quad if all vertices are landmasked / null
        if (val00 === null && val10 === null && val11 === null && val01 === null) {
          continue;
        }

        const avgVal =
          ([val00, val10, val11, val01].filter((v) => v !== null).reduce((a, b) => a + b, 0) /
            Math.max(1, [val00, val10, val11, val01].filter((v) => v !== null).length)) ||
          valMin;

        const normVal = Math.max(0.0, Math.min(1.0, (avgVal - valMin) / valSpan));
        const colorHex = sampleColormap(colormapKey, normVal);
        const cColor = Cesium.Color.fromCssColorString(colorHex).withAlpha(0.90);

        // 4 Quad vertices (depth exaggerated negatively below sea surface via coordinate transform)
        const alt0 = toCesiumRenderAltitude(z0, { verticalExaggeration: this.exaggerationFactor });
        const alt1 = toCesiumRenderAltitude(z1, { verticalExaggeration: this.exaggerationFactor });

        const p0 = Cesium.Cartesian3.fromDegrees(st0.lon, st0.lat, alt0);
        const p1 = Cesium.Cartesian3.fromDegrees(st1.lon, st1.lat, alt0);
        const p2 = Cesium.Cartesian3.fromDegrees(st1.lon, st1.lat, alt1);
        const p3 = Cesium.Cartesian3.fromDegrees(st0.lon, st0.lat, alt1);

        positions.push(p0.x, p0.y, p0.z);
        positions.push(p1.x, p1.y, p1.z);
        positions.push(p2.x, p2.y, p2.z);
        positions.push(p3.x, p3.y, p3.z);

        for (let k = 0; k < 4; k++) {
          colors.push(cColor.red, cColor.green, cColor.blue, cColor.alpha);
        }

        // 2 Triangles for the quad (0-1-2 and 0-2-3)
        indices.push(vertexIndex, vertexIndex + 1, vertexIndex + 2);
        indices.push(vertexIndex, vertexIndex + 2, vertexIndex + 3);
        vertexIndex += 4;
      }
    }

    if (positions.length === 0) return;

    const geometry = new Cesium.Geometry({
      attributes: {
        position: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.DOUBLE,
          componentsPerAttribute: 3,
          values: new Float64Array(positions),
        }),
        color: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.FLOAT,
          componentsPerAttribute: 4,
          values: new Float32Array(colors),
        }),
      },
      indices: new Uint32Array(indices),
      primitiveType: Cesium.PrimitiveType.TRIANGLES,
      boundingSphere: Cesium.BoundingSphere.fromVertices(positions),
    });

    const instance = new Cesium.GeometryInstance({
      geometry,
    });

    // Enable underground camera to see subsurface geometry
    this._enableUndergroundView();

    const appearance = new Cesium.PerInstanceColorAppearance({
      flat: true,
      translucent: true,
    });

    this.primitive = this.viewer.scene.primitives.add(
      new Cesium.Primitive({
        geometryInstances: instance,
        appearance,
        // depthFailAppearance renders geometry even when behind terrain/3D tiles
        depthFailAppearance: appearance,
        asynchronous: false,
      })
    );

    governorRequestRender();
  }

  /**
   * Enables underground camera mode so subsurface geometry is visible.
   * @private
   */
  _enableUndergroundView() {
    if (!this.viewer || this.viewer.isDestroyed?.()) return;
    const scene = this.viewer.scene;
    // Allow camera to go below terrain
    if (scene.screenSpaceCameraController) {
      scene.screenSpaceCameraController.enableCollisionDetection = false;
    }
    // Allow underground rendering
    scene.globe.depthTestAgainstTerrain = false;
  }

  /**
   * Returns diagnostic state for the debug overlay.
   */
  getDebugState() {
    return {
      layerId: 'VERTICAL_TRANSECT',
      enabled: !!this.primitive,
      hasData: !!this.activeSection,
      stationCount: this.activeSection?.stations?.length || 0,
      depthCount: this.activeSection?.depths?.length || 0,
      exaggeration: this.exaggerationFactor,
    };
  }

  clear() {
    if (this.primitive && this.viewer && !this.viewer.isDestroyed?.()) {
      this.viewer.scene.primitives.remove(this.primitive);
      this.primitive = null;
      this.activeSection = null;
      governorRequestRender();
    }
  }
}
