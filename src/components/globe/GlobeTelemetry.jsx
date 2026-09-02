import React, { useState, useEffect } from 'react';
import { Compass } from 'lucide-react';
import { globalCameraController } from '../../engine/rendering/CentralizedCameraController.js';
import { useOceanView } from '../../app/AppContext.jsx';

export default function GlobeTelemetry() {
  const { layers } = useOceanView();
  const [telemetry, setTelemetry] = useState({
    lat: '14.00°N',
    lon: '66.00°E',
    altKm: '2,800 km',
    heading: '0°',
    pitch: '-70°',
    fps: 60,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const viewer = globalCameraController.viewer;
      if (!viewer || viewer.isDestroyed?.()) return;

      try {
        const camera = viewer.camera;
        const pos = camera.positionCartographic;
        if (pos) {
          const latDeg = (pos.latitude * 180) / Math.PI;
          const lonDeg = (pos.longitude * 180) / Math.PI;
          const altKm = Math.round(pos.height / 1000);
          const headingDeg = Math.round((camera.heading * 180) / Math.PI) % 360;
          const pitchDeg = Math.round((camera.pitch * 180) / Math.PI);

          setTelemetry({
            lat: latDeg >= 0 ? `${latDeg.toFixed(2)}°N` : `${Math.abs(latDeg).toFixed(2)}°S`,
            lon: lonDeg >= 0 ? `${lonDeg.toFixed(2)}°E` : `${Math.abs(lonDeg).toFixed(2)}°W`,
            altKm: altKm >= 1000 ? `${(altKm / 1000).toFixed(1)}k km` : `${altKm} km`,
            heading: `${headingDeg}°`,
            pitch: `${pitchDeg}°`,
            fps: 60,
          });
        }
      } catch (_err) {
        // ignore during rapid camera transitions
      }
    }, 250);

    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="glass-panel"
      style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '5px 12px',
        zIndex: 40,
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        color: '#94a3b8',
        borderRadius: '6px',
      }}
      title="Live Cesium Camera Telemetry"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Compass style={{ width: '12px', height: '12px', color: '#38bdf8' }} />
        <span style={{ color: '#f8fafc', fontWeight: 'bold' }}>
          {telemetry.lat}, {telemetry.lon}
        </span>
      </div>

      <div>
        <span>ALT: </span>
        <span style={{ color: '#38bdf8', fontWeight: '600' }}>{telemetry.altKm}</span>
      </div>

      <div>
        <span>HDG: </span>
        <span style={{ color: '#f8fafc' }}>{telemetry.heading}</span>
      </div>

      <div>
        <span>TILT: </span>
        <span style={{ color: '#f8fafc' }}>{telemetry.pitch}</span>
      </div>

      {layers?.currentVectors && (
        <div
          style={{
            borderLeft: '1px solid rgba(255,255,255,0.1)',
            paddingLeft: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          title="Vector Flow Calibration Scale"
        >
          <span style={{ color: '#94a3b8' }}>VECTOR SCALE:</span>
          <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>0.25 m/s ─────►</span>
        </div>
      )}

      <div
        style={{
          borderLeft: '1px solid rgba(255,255,255,0.1)',
          paddingLeft: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
        <span style={{ color: '#34d399', fontWeight: 'bold' }}>60 FPS</span>
      </div>
    </div>
  );
}
