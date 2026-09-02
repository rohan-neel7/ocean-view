import React, { useState, useEffect } from 'react';
import { Compass, Eye, Sparkles, RotateCw, Maximize, Minimize, Map, Layers } from 'lucide-react';
import { globalCameraController } from '../../engine/rendering/CentralizedCameraController.js';
import { BASEMAPS } from '../../engine/rendering/BasemapController.js';

export default function GlobeTelemetryHUD({ orbitController, bloomEffect, basemapController }) {
  const [telemetry, setTelemetry] = useState({
    lat: '14.00°N',
    lon: '66.00°E',
    altKm: '5,500 km',
    heading: '0°',
    pitch: '-65°',
    fps: 60,
  });

  const [isOrbiting, setIsOrbiting] = useState(false);
  const [bloomActive, setBloomActive] = useState(true);
  const [activeBasemap, setActiveBasemap] = useState('DARK_MATTER');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 4Hz Telemetry Update Loop
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
        // ignore telemetry polling error during transit
      }
    }, 250);

    return () => clearInterval(timer);
  }, []);

  const handlePerspective = (type) => {
    const viewer = globalCameraController.viewer;
    if (!viewer || viewer.isDestroyed?.()) return;

    if (orbitController && isOrbiting) {
      orbitController.stop();
      setIsOrbiting(false);
    }

    if (type === 'ORBITAL') {
      globalCameraController.flyToRegion('INDIAN_OCEAN_BASIN', 1.8);
    } else if (type === 'OBLIQUE') {
      // 3D Oblique 45° angle optimal for vertical curtains & particle streamlines
      globalCameraController.flyTo({
        lat: 12.0,
        lon: 64.0,
        alt: 1400000.0,
        heading: 30.0,
        pitch: -42.0,
        duration: 1.8,
      });
    } else if (type === 'SURFACE') {
      // Low grazing angle for thermocline & flow
      globalCameraController.flyTo({
        lat: 15.0,
        lon: 68.0,
        alt: 450000.0,
        heading: 45.0,
        pitch: -18.0,
        duration: 1.8,
      });
    } else if (type === 'RESET') {
      globalCameraController.flyToRegion('ARABIAN_SEA', 1.8);
    }
  };

  const handleToggleOrbit = () => {
    if (!orbitController) return;
    const newState = orbitController.toggle();
    setIsOrbiting(newState);
  };

  const handleToggleBloom = () => {
    if (!bloomEffect) return;
    const newState = bloomEffect.toggle();
    setBloomActive(newState);
  };

  const handleBasemapChange = (id) => {
    if (!basemapController) return;
    basemapController.setBasemap(id);
    setActiveBasemap(id);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  return (
    <>
      {/* Top-Right Quick Toolbar (Perspective, Orbit, Bloom, Basemap, Fullscreen) */}
      <div
        className="glass-panel"
        style={{
          position: 'absolute',
          top: '76px',
          right: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 10px',
          zIndex: 45,
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
        }}
      >
        {/* Perspective Quick Jumps */}
        <div style={{ display: 'flex', gap: '3px', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '6px' }}>
          <button
            onClick={() => handlePerspective('ORBITAL')}
            className="btn-sci"
            style={{ padding: '4px 7px', fontSize: '10px' }}
            title="Global Orbital Perspective"
          >
            Orbital
          </button>
          <button
            onClick={() => handlePerspective('OBLIQUE')}
            className="btn-sci"
            style={{ padding: '4px 7px', fontSize: '10px' }}
            title="3D Oblique 45° (Curtain View)"
          >
            3D Oblique
          </button>
          <button
            onClick={() => handlePerspective('SURFACE')}
            className="btn-sci"
            style={{ padding: '4px 7px', fontSize: '10px' }}
            title="Low Surface Glancer"
          >
            Surface
          </button>
          <button
            onClick={() => handlePerspective('RESET')}
            className="btn-sci"
            style={{ padding: '4px 7px', fontSize: '10px' }}
            title="Reset Arabian Sea View"
          >
            Reset
          </button>
        </div>

        {/* Cinematic Auto-Orbit */}
        <button
          onClick={handleToggleOrbit}
          className={`btn-sci ${isOrbiting ? 'btn-sci-active' : ''}`}
          style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}
          title="Toggle Cinematic 3D Orbit"
        >
          <RotateCw style={{ width: '13px', height: '13px', animation: isOrbiting ? 'spin 6s linear infinite' : 'none' }} />
          <span>Orbit</span>
        </button>

        {/* HDR Glow / Bloom */}
        <button
          onClick={handleToggleBloom}
          className={`btn-sci ${bloomActive ? 'btn-sci-active' : ''}`}
          style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}
          title="Toggle HDR Luminous Glow"
        >
          <Sparkles style={{ width: '13px', height: '13px', color: bloomActive ? '#38bdf8' : '#94a3b8' }} />
          <span>Glow</span>
        </button>

        {/* Basemap Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '6px' }}>
          <Map style={{ width: '13px', height: '13px', color: '#94a3b8' }} />
          <select
            value={activeBasemap}
            onChange={(e) => handleBasemapChange(e.target.value)}
            style={{
              background: '#090d16',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#f8fafc',
              borderRadius: '4px',
              padding: '2px 5px',
              fontSize: '10px',
              cursor: 'pointer',
            }}
          >
            {BASEMAPS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Fullscreen Toggle */}
        <button
          onClick={handleToggleFullscreen}
          className="btn-sci"
          style={{ padding: '4px 6px', borderLeft: '1px solid rgba(255,255,255,0.1)', marginLeft: '2px' }}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize style={{ width: '13px', height: '13px' }} /> : <Maximize style={{ width: '13px', height: '13px' }} />}
        </button>
      </div>

      {/* Bottom-Right Live Telemetry HUD Chip */}
      <div
        className="glass-panel"
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '6px 12px',
          zIndex: 40,
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: '#94a3b8',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Compass style={{ width: '12px', height: '12px', color: '#38bdf8' }} />
          <span style={{ color: '#f8fafc', fontWeight: 'bold' }}>{telemetry.lat}, {telemetry.lon}</span>
        </div>
        <div>
          <span>ALT: </span>
          <span style={{ color: '#38bdf8' }}>{telemetry.altKm}</span>
        </div>
        <div>
          <span>HDG: </span>
          <span style={{ color: '#f8fafc' }}>{telemetry.heading}</span>
        </div>
        <div>
          <span>TILT: </span>
          <span style={{ color: '#f8fafc' }}>{telemetry.pitch}</span>
        </div>
        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
          <span style={{ color: '#34d399', fontWeight: 'bold' }}>60 FPS</span>
        </div>
      </div>
    </>
  );
}
