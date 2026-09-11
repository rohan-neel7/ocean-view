/**
 * OceanView — Minimal Scientific Telemetry Readout
 * Non-intrusive, clean single-line status indicator replacing the bulky cockpit HUD.
 */

import React, { useEffect, useState } from 'react';
import * as Cesium from 'cesium';
import { globalCameraController } from '../../engine/rendering/CentralizedCameraController.js';
import { useOceanView } from '../../app/AppContext.jsx';
import { OCEAN_REGIONS } from '../../engine/rendering/cameraVerbs.js';

export default function ScientificTelemetryHUD() {
  const { activeRegion, layers } = useOceanView();

  const [metrics, setMetrics] = useState({
    latDMS: '15°00\'00"N',
    lonDMS: '066°00\'00"E',
    alt: '2800 km',
    heading: '0°',
  });

  // Camera change listener for live telemetry
  useEffect(() => {
    const viewer = globalCameraController.viewer;
    if (!viewer || !viewer.camera) return;

    const camera = viewer.camera;
    const originalPercentage = camera.percentageChanged;
    camera.percentageChanged = 0.05;

    const updateTelemetry = () => {
      const carto = camera.positionCartographic;
      if (!carto) return;

      const latDeg = Cesium.Math.toDegrees(carto.latitude);
      const lonDeg = Cesium.Math.toDegrees(carto.longitude);

      const toDMS = (decimal, isLat) => {
        const abs = Math.abs(decimal);
        const deg = Math.floor(abs);
        const minFloat = (abs - deg) * 60;
        const min = Math.floor(minFloat);
        const dir = isLat ? (decimal >= 0 ? 'N' : 'S') : (decimal >= 0 ? 'E' : 'W');
        return `${String(deg).padStart(2, '0')}°${String(min).padStart(2, '0')}'${dir}`;
      };

      const headingDeg = Cesium.Math.toDegrees(camera.heading);

      setMetrics({
        latDMS: toDMS(latDeg, true),
        lonDMS: toDMS(lonDeg, false),
        alt: carto.height >= 1000 ? Math.round(carto.height / 1000) + ' km' : Math.round(carto.height) + ' m',
        heading: Math.round(headingDeg) + '°',
      });
    };

    updateTelemetry();
    camera.changed.addEventListener(updateTelemetry);

    return () => {
      camera.changed.removeEventListener(updateTelemetry);
      camera.percentageChanged = originalPercentage;
    };
  }, []);

  const regionName = OCEAN_REGIONS[activeRegion]?.name || 'Arabian Sea Basin';

  return (
    <div className="hud-overlay">
      {/* Minimal Floating Single-Line Status Indicator */}
      <div className="hud-telemetry-pill">
        <div className="hud-telemetry-item">
          <div className="hud-recording-dot" />
          <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--accent-teal)', letterSpacing: '0.04em' }}>
            INCOIS SYS
          </span>
        </div>

        <div className="hud-divider" />

        <div className="hud-telemetry-item">
          <span>{regionName}</span>
        </div>

        <div className="hud-divider" />

        <div className="hud-telemetry-item">
          <strong>{metrics.latDMS} {metrics.lonDMS}</strong>
        </div>

        <div className="hud-divider" />

        <div className="hud-telemetry-item">
          <span style={{ color: 'var(--text-muted)' }}>ALT</span>
          <strong>{metrics.alt}</strong>
        </div>

        <div className="hud-divider" />

        <div className="hud-telemetry-item">
          <span style={{ color: 'var(--text-muted)' }}>HDG</span>
          <strong>{metrics.heading}</strong>
        </div>
      </div>
    </div>
  );
}
