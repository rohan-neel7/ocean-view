/**
 * OceanView — In-Situ Profile & Platform Visualization Layer
 * Renders 3D pins and vertical columns for Argo floats, CTD stations, and Gliders.
 * Uses CustomDataSource clustering for performance.
 */

import * as Cesium from 'cesium';
import { governorRequestRender } from '../../engine/rendering/renderGovernor.js';

export class ProfileLayer {
  constructor(viewer) {
    this.viewer = viewer;
    this.dataSource = new Cesium.CustomDataSource('OceanProfiles');
    
    // Enable Cesium native clustering to prevent entity overload (Phase 7)
    this.dataSource.clustering.enabled = true;
    this.dataSource.clustering.pixelRange = 40;
    this.dataSource.clustering.minimumClusterSize = 3;
    
    this.viewer.dataSources.add(this.dataSource);
  }

  /**
   * Updates the displayed Argo/CTD/Glider profile markers.
   *
   * @param {Array<object>} profiles - Array of CanonicalProfile objects
   * @param {boolean} [isXRayMode=false]
   */
  updateProfiles(profiles = [], isXRayMode = false) {
    if (!this.viewer || this.viewer.isDestroyed?.()) return;

    this.dataSource.entities.removeAll();

    // Bounded rendering: limit to 1000 to guarantee 60fps even without clustering
    const boundedProfiles = profiles.slice(0, 1000);

    for (const p of boundedProfiles) {
      const { lat, lon } = p.location;
      let color = Cesium.Color.CYAN;
      if (p.platformType === 'BGC_ARGO') color = Cesium.Color.EMERALD;
      if (p.platformType === 'GLIDER') color = Cesium.Color.MEDIUMPURPLE;
      if (p.platformType === 'CTD_CAST') color = Cesium.Color.ORANGE;

      this.dataSource.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat, 5.0),
        point: {
          pixelSize: 8,
          color,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 1.5,
          disableDepthTestDistance: isXRayMode ? Number.POSITIVE_INFINITY : undefined,
        },
        profileData: p, // Store metadata for clicking/picking
      });
    }

    governorRequestRender();
  }

  /**
   * Returns diagnostic state for the debug overlay.
   */
  getDebugState() {
    return {
      layerId: 'OBSERVATION_PROFILES',
      enabled: this.dataSource.entities.values.length > 0,
      hasData: this.dataSource.entities.values.length > 0,
      entityCount: this.dataSource.entities.values.length,
      platformTypes: [...new Set(
        this.dataSource.entities.values
          .filter((e) => e.profileData)
          .map((e) => e.profileData.platformType)
      )],
    };
  }

  clear() {
    if (!this.viewer || this.viewer.isDestroyed?.()) return;
    this.dataSource.entities.removeAll();
    governorRequestRender();
  }
  
  destroy() {
    if (this.viewer && !this.viewer.isDestroyed?.()) {
      this.viewer.dataSources.remove(this.dataSource, true);
    }
  }
}
