/**
 * OceanView — In-Situ Profile & Platform Visualization Layer
 * Renders 3D pins and vertical columns for Argo floats, CTD stations, and Gliders.
 * Uses CustomDataSource clustering and adaptive visual hierarchy.
 */

import * as Cesium from 'cesium';
import { governorRequestRender } from '../../engine/rendering/renderGovernor.js';
import { getObservationRenderPolicy } from '../../engine/rendering/scientificRenderPolicy.js';
import { toCesiumRenderAltitude } from '../../engine/spatial/depthCoordinates.js';

export const PLATFORM_COLORS = Object.freeze({
  ARGO_FLOAT: '#38bdf8', // Cyan
  BGC_ARGO: '#c084fc',   // Purple
  GLIDER: '#34d399',     // Emerald
  CTD_CAST: '#fbbf24',   // Amber
});

export class ProfileLayer {
  constructor(viewer) {
    this.viewer = viewer;
    this.dataSource = new Cesium.CustomDataSource('OceanProfiles');

    // Enable Cesium native clustering to prevent entity overload
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
   * @param {object} [options={}] - Visibility options { showArgo, showGliders, showCTD, selectedProfileId, cameraHeight }
   */
  updateProfiles(profiles = [], isXRayMode = false, options = {}) {
    if (!this.viewer || this.viewer.isDestroyed?.()) return;

    this.dataSource.entities.removeAll();

    const {
      showArgo = true,
      showGliders = true,
      showCTD = true,
      selectedProfileId = null,
      cameraHeight = 3000000,
    } = options;

    const policy = getObservationRenderPolicy({
      cameraHeight,
      selectedProfileId,
    });

    this.dataSource.clustering.pixelRange = policy.clusterPixelRange;

    // Filter profiles based on visibility options
    const filteredProfiles = profiles.filter((p) => {
      if (p.platformType === 'ARGO_FLOAT' || p.platformType === 'BGC_ARGO') return showArgo;
      if (p.platformType === 'GLIDER') return showGliders;
      if (p.platformType === 'CTD_CAST') return showCTD;
      return true;
    });

    // Bounded rendering: limit to 1000 to guarantee 60fps
    const boundedProfiles = filteredProfiles.slice(0, 1000);

    for (const p of boundedProfiles) {
      const { lat, lon } = p.location;
      const isSelected = selectedProfileId && (p.wmo === selectedProfileId || p.id === selectedProfileId);

      const hexColor = PLATFORM_COLORS[p.platformType] || '#38bdf8';
      const color = Cesium.Color.fromCssColorString(hexColor);

      const pixelSize = isSelected ? policy.selectedPixelSize : policy.unselectedPixelSize;
      const outlineColor = isSelected ? Cesium.Color.fromCssColorString('#facc15') : Cesium.Color.BLACK;
      const outlineWidth = isSelected ? 2.5 : 1.5;

      const renderAltitude = toCesiumRenderAltitude(0, { isProfile: true, isSelected });

      this.dataSource.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat, renderAltitude),
        point: {
          pixelSize,
          color,
          outlineColor,
          outlineWidth,
          disableDepthTestDistance: (isXRayMode || isSelected) ? Number.POSITIVE_INFINITY : undefined,
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
      try {
        this.viewer.dataSources.remove(this.dataSource, true);
      } catch (_e) {
        // Ignored
      }
    }
    this.viewer = null;
  }
}
