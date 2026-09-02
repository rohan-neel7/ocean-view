import React, { useEffect, useState } from 'react';
import * as Cesium from 'cesium';
import { globalCameraController } from '../../engine/rendering/CentralizedCameraController.js';
import { useOceanView } from '../../app/AppContext.jsx';
import { Target, Navigation, Layers, Compass, Sun, MapPin } from 'lucide-react';
import { OCEAN_REGIONS } from '../../engine/rendering/cameraVerbs.js';

export default function ScientificTelemetryHUD() {
  const { activeRegion, activeVariable, layers } = useOceanView();
  
  const [metrics, setMetrics] = useState({
    latDMS: '--°--\'--"N',
    lonDMS: '---°--\'--"E',
    alt: '--',
    sunEl: '--',
    ona: '--',
    pitch: '--',
    heading: '--',
  });

  const [currentTime, setCurrentTime] = useState('');

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toISOString().replace('T', ' ').substring(0, 19) + 'Z');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Telemetry tick
  useEffect(() => {
    const timer = setInterval(() => {
      const viewer = globalCameraController.viewer;
      if (!viewer || !viewer.camera) return;

      const camera = viewer.camera;
      const carto = camera.positionCartographic;
      if (!carto) return;

      const latDeg = Cesium.Math.toDegrees(carto.latitude);
      const lonDeg = Cesium.Math.toDegrees(carto.longitude);
      
      const toDMS = (decimal, isLat) => {
        const abs = Math.abs(decimal);
        const deg = Math.floor(abs);
        const minFloat = (abs - deg) * 60;
        const min = Math.floor(minFloat);
        const sec = ((minFloat - min) * 60).toFixed(1);
        const dir = isLat ? (decimal >= 0 ? 'N' : 'S') : (decimal >= 0 ? 'E' : 'W');
        return `${String(deg).padStart(isLat ? 2 : 3, '0')}°${String(min).padStart(2, '0')}'${String(sec).padStart(4, '0')}"${dir}`;
      };

      // Sun Elevation estimation
      const now = new Date();
      const hours = now.getUTCHours() + now.getUTCMinutes() / 60 + lonDeg / 15;
      const hourAngle = (hours - 12) * 15;
      const declination = 23.45 * Math.sin(Cesium.Math.toRadians((360 / 365) * (now.getUTCDate() - 81)));
      const sinEl = Math.sin(Cesium.Math.toRadians(latDeg)) * Math.sin(Cesium.Math.toRadians(declination)) + 
                    Math.cos(Cesium.Math.toRadians(latDeg)) * Math.cos(Cesium.Math.toRadians(declination)) * Math.cos(Cesium.Math.toRadians(hourAngle));
      const sunEl = Cesium.Math.toDegrees(Math.asin(Math.max(-1, Math.min(1, sinEl))));

      const pitchDeg = Cesium.Math.toDegrees(camera.pitch);
      const ona = Math.max(0, 90 + pitchDeg);
      const headingDeg = Cesium.Math.toDegrees(camera.heading);

      setMetrics({
        latDMS: toDMS(latDeg, true),
        lonDMS: toDMS(lonDeg, false),
        alt: carto.height >= 1000 ? (carto.height / 1000).toFixed(1) + ' km' : Math.round(carto.height) + ' m',
        sunEl: sunEl.toFixed(1) + '°',
        ona: ona.toFixed(1) + '°',
        pitch: pitchDeg.toFixed(1) + '°',
        heading: headingDeg.toFixed(1) + '°',
      });
    }, 100); // 10Hz telemetry
    return () => clearInterval(timer);
  }, []);

  const regionName = OCEAN_REGIONS[activeRegion]?.name || 'Global Ocean';

  const activeLayersCount = Object.values(layers).filter(Boolean).length;

  return (
    <div className="hud-overlay">
      {/* Top Left Bracket */}
      <div className="hud-bracket hud-top-left">
        <div className="hud-title">
          <Navigation size={12} />
          OCEANVIEW SYS-CORE
        </div>
        <div className="hud-subtitle">
          {regionName}
        </div>
        <div className="hud-metrics">
          <div className="hud-metric-row">
            <span className="hud-metric-label">LAT</span> {metrics.latDMS}
          </div>
          <div className="hud-metric-row">
            <span className="hud-metric-label">LON</span> {metrics.lonDMS}
          </div>
          <div className="hud-metric-divider"></div>
          <div className="hud-metric-row">
            <span className="hud-metric-label">ALT</span> {metrics.alt}
          </div>
        </div>
      </div>

      {/* Top Right Bracket */}
      <div className="hud-bracket hud-top-right">
        <div className="hud-title">
          {currentTime}
          <div className="hud-recording-dot" />
        </div>
        <div className="hud-subtitle">
          TELEMETRY ACTIVE
        </div>
        <div className="hud-metrics">
          <div className="hud-metric-row">
            {metrics.heading} <span className="hud-metric-label" style={{textAlign: 'right'}}>HDG</span>
          </div>
          <div className="hud-metric-row">
            {metrics.pitch} <span className="hud-metric-label" style={{textAlign: 'right'}}>PTCH</span>
          </div>
          <div className="hud-metric-divider"></div>
          <div className="hud-metric-row">
             {metrics.ona} <span className="hud-metric-label" style={{textAlign: 'right'}}>ONA</span> 
          </div>
        </div>
      </div>

      {/* Bottom Center Mini Summary */}
      <div className="hud-mini-summary">
        <div className="hud-summary-item highlight">
          <MapPin size={12} color="#38bdf8" />
          <span>{regionName}</span>
        </div>
        <div className="hud-divider" />
        <div className="hud-summary-item">
          <Sun size={12} color="#facc15" />
          SUN {metrics.sunEl}
        </div>
        <div className="hud-divider" />
        <div className="hud-summary-item">
          <Layers size={12} color="#34d399" />
          {activeLayersCount} LAYERS
        </div>
      </div>
      
      {/* Center Reticle (Subtle) */}
      <div className="hud-reticle">
        <Target size={48} color="#38bdf8" strokeWidth={1} />
      </div>
    </div>
  );
}
