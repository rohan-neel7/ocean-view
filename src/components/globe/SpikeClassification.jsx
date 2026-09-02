import React, { useEffect } from 'react';
import * as Cesium from 'cesium';

export default function SpikeClassification({ viewer }) {
  useEffect(() => {
    if (!viewer) return;

    // Create a GroundPrimitive (GeometryInstance) directly for the spike.
    // We place it over Mumbai to see if it drapes over buildings and terrain.
    const rectangle = Cesium.Rectangle.fromDegrees(72.7, 18.9, 73.0, 19.2);

    const instance = new Cesium.GeometryInstance({
      geometry: new Cesium.RectangleGeometry({
        rectangle: rectangle,
      }),
      id: 'spike-classification',
      attributes: {
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.RED.withAlpha(0.5)),
      },
    });

    const primitive = new Cesium.GroundPrimitive({
      geometryInstances: instance,
      classificationType: Cesium.ClassificationType.BOTH,
      appearance: new Cesium.PerInstanceColorAppearance({
        flat: true,
        translucent: true,
      }),
    });

    viewer.scene.primitives.add(primitive);

    // Also move the camera to see the spike
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(72.85, 19.05, 5000.0),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0,
      }
    });

    return () => {
      if (!viewer.isDestroyed()) {
        viewer.scene.primitives.remove(primitive);
      }
    };
  }, [viewer]);

  return null;
}
