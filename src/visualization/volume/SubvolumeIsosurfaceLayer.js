/**
 * OceanView — 3D Isosurface Visualization Layer
 * Renders bounded 3D isotherm meshes in Cesium with clean memory lifecycle.
 *
 * CRITICAL FIX (Phase 7.6):
 *   Added depthFailAppearance so isosurfaces render even when behind terrain/3D tiles.
 *   Enable underground camera mode when active.
 */

import * as Cesium from 'cesium';
import { sampleColormap } from '../color/scientificColorMaps.js';
import { governorRequestRender } from '../../engine/rendering/renderGovernor.js';

export class SubvolumeIsosurfaceLayer {
  constructor(viewer) {
    this.viewer = viewer;
    this.primitive = null;
    this.activeMesh = null;
  }

  /**
   * Updates and renders the 3D isosurface mesh.
   *
   * @param {object} mesh - Output of IsosurfaceEngine
   * @param {string} [colormapKey='THERMAL']
   */
  updateIsosurface(mesh, colormapKey = 'THERMAL') {
    if (!this.viewer || this.viewer.isDestroyed?.()) return;

    this.clear();
    if (!mesh || !mesh.positions || mesh.positions.length === 0 || !mesh.indices || mesh.indices.length === 0) {
      return;
    }

    this.activeMesh = mesh;

    // Convert (lon, lat, alt) positions to ECF Cartesian3 positions
    const posLen = mesh.positions.length;
    const cartesianPositions = new Float64Array(posLen);

    for (let i = 0; i < posLen; i += 3) {
      const lon = mesh.positions[i];
      const lat = mesh.positions[i + 1];
      const alt = mesh.positions[i + 2]; // Exaggerated depth (negative)

      const cart = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
      cartesianPositions[i] = cart.x;
      cartesianPositions[i + 1] = cart.y;
      cartesianPositions[i + 2] = cart.z;
    }

    const geometry = new Cesium.Geometry({
      attributes: {
        position: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.DOUBLE,
          componentsPerAttribute: 3,
          values: cartesianPositions,
        }),
      },
      indices: mesh.indices,
      primitiveType: Cesium.PrimitiveType.TRIANGLES,
      boundingSphere: Cesium.BoundingSphere.fromVertices(cartesianPositions),
    });

    const normVal = 0.5; // Neutral baseline for single isovalue
    const colorHex = sampleColormap(colormapKey, normVal);
    const color = Cesium.Color.fromCssColorString(colorHex).withAlpha(0.75);

    const instance = new Cesium.GeometryInstance({
      geometry,
      attributes: {
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(color),
      },
    });

    // Enable underground camera to see subsurface geometry
    this._enableUndergroundView();

    const appearance = new Cesium.PerInstanceColorAppearance({
      flat: false,
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
    if (scene.screenSpaceCameraController) {
      scene.screenSpaceCameraController.enableCollisionDetection = false;
    }
    scene.globe.depthTestAgainstTerrain = false;
  }

  /**
   * Returns diagnostic state for the debug overlay.
   */
  getDebugState() {
    return {
      layerId: 'ISOSURFACE_3D',
      enabled: !!this.primitive,
      hasData: !!this.activeMesh,
      vertexCount: this.activeMesh?.positions?.length / 3 || 0,
      faceCount: this.activeMesh?.indices?.length / 3 || 0,
    };
  }

  clear() {
    if (this.primitive && this.viewer && !this.viewer.isDestroyed?.()) {
      this.viewer.scene.primitives.remove(this.primitive);
      this.primitive = null;
      this.activeMesh = null;
      governorRequestRender();
    }
  }
}
