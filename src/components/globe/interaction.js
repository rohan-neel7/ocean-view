/**
 * OceanView — Screen-Space Interaction & Entity Raycasting
 */

import * as Cesium from 'cesium';

export function setupGlobeInteraction(viewer, { onProfileSelect, onCoordinateProbe }) {
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
    }

    // Otherwise raycast to ellipsoid surface to probe coordinate
    const ray = viewer.camera.getPickRay(movement.position);
    const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
    if (cartesian && onCoordinateProbe) {
      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      const lat = Cesium.Math.toDegrees(cartographic.latitude);
      const lon = Cesium.Math.toDegrees(cartographic.longitude);
      onCoordinateProbe({
        lat: Number(lat.toFixed(4)),
        lon: Number(lon.toFixed(4)),
      });
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  return () => {
    if (!handler.isDestroyed()) {
      handler.destroy();
    }
  };
}
