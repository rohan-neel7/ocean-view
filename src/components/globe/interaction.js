/**
 * OceanView — Screen-Space Interaction & Entity Raycasting
 * Handles profile selection, coordinate probing, vector glyph inspection,
 * and ocean-versus-land discrimination for spatial investigation.
 */

import * as Cesium from 'cesium';
import { isOceanLocation } from '../../engine/ocean/analysisLocation.js';

export function setupGlobeInteraction(viewer, {
  onProfileSelect,
  onCoordinateProbe,
  onVectorSelect,
  onAnalysisLocationSelect,
  onLandClick,
}) {
  if (!viewer || viewer.isDestroyed?.()) return () => {};

  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

  // Left Click: Selection & Inspection
  handler.setInputAction((movement) => {
    const pickedObject = viewer.scene.pick(movement.position);

    if (Cesium.defined(pickedObject) && pickedObject.id) {
      const entity = pickedObject.id;
      if (entity.profileData && onProfileSelect) {
        onProfileSelect(entity.profileData);
        return;
      }
      if (entity.vectorData && onVectorSelect) {
        onVectorSelect(entity.vectorData);
        return;
      }
      // If clicking the analysis location marker itself, do not re-probe
      if (entity.id === 'analysis_location_marker' || entity.id === 'analysis_location_ring') {
        return;
      }
    }

    // Otherwise raycast to ellipsoid surface to probe coordinate
    const ray = viewer.camera.getPickRay(movement.position);
    const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
    if (cartesian) {
      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      const lat = Number(Cesium.Math.toDegrees(cartographic.latitude).toFixed(4));
      const lon = Number(Cesium.Math.toDegrees(cartographic.longitude).toFixed(4));

      const oceanCheck = isOceanLocation(lat, lon);

      if (!oceanCheck.isOcean) {
        if (onLandClick) {
          onLandClick({ lat, lon, reason: oceanCheck.reason });
        }
        return;
      }

      if (onAnalysisLocationSelect) {
        onAnalysisLocationSelect({
          latitude: lat,
          longitude: lon,
          source: 'CLICK',
        });
      }

      if (onCoordinateProbe) {
        onCoordinateProbe({ lat, lon });
      }
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  return () => {
    if (!handler.isDestroyed()) {
      handler.destroy();
    }
  };
}
