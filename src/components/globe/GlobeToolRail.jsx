import React, { useState, useEffect } from 'react';
import {
  Plus,
  Minus,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  RotateCw,
  RotateCw as OrbitIcon,
  Maximize,
  Minimize,
  Keyboard,
  Home,
  Globe,
} from 'lucide-react';
import { globalCameraController } from '../../engine/rendering/CentralizedCameraController.js';
import GlobeOrientationControl from './GlobeOrientationControl.jsx';

export default function GlobeToolRail({ orbitController, onToggleShortcutsModal }) {
  const [isOrbiting, setIsOrbiting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleZoomIn = () => globalCameraController.zoom(0.65, 0.4);
  const handleZoomOut = () => globalCameraController.zoom(1.5, 0.4);
  const handleTiltUp = () => globalCameraController.tilt(15, 0.4);
  const handleTiltDown = () => globalCameraController.tilt(-15, 0.4);
  const handleRotateLeft = () => globalCameraController.rotate(-30, 0.4);
  const handleRotateRight = () => globalCameraController.rotate(30, 0.4);
  const handleHome = () => globalCameraController.flyToRegion('ARABIAN_SEA', 1.8);
  const handleGlobalView = () => globalCameraController.flyTo({ lat: 0, lon: 75, alt: 22000000, pitch: -90, duration: 2.0 });

  const handleToggleOrbit = () => {
    if (!orbitController) return;
    const active = orbitController.toggle();
    setIsOrbiting(active);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  return (
    <div
      className="glass-panel"
      style={{
        position: 'absolute',
        top: '124px',
        right: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '5px',
        gap: '4px',
        zIndex: 42,
        borderRadius: '10px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
      }}
    >
      {/* Compass Orientation Needle */}
      <GlobeOrientationControl />

      <div style={{ width: '20px', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '2px 0' }} />

      {/* Zoom In */}
      <button
        onClick={handleZoomIn}
        className="btn-sci"
        style={{ width: '30px', height: '30px', padding: 0 }}
        title="Zoom In (+)"
        aria-label="Zoom in"
      >
        <Plus style={{ width: '15px', height: '15px' }} />
      </button>

      {/* Zoom Out */}
      <button
        onClick={handleZoomOut}
        className="btn-sci"
        style={{ width: '30px', height: '30px', padding: 0 }}
        title="Zoom Out (-)"
        aria-label="Zoom out"
      >
        <Minus style={{ width: '15px', height: '15px' }} />
      </button>

      {/* Tilt Up (Oblique) */}
      <button
        onClick={handleTiltUp}
        className="btn-sci"
        style={{ width: '30px', height: '30px', padding: 0 }}
        title="Tilt Up / 3D Oblique"
        aria-label="Tilt camera up"
      >
        <ChevronUp style={{ width: '15px', height: '15px' }} />
      </button>

      {/* Tilt Down (Top-down) */}
      <button
        onClick={handleTiltDown}
        className="btn-sci"
        style={{ width: '30px', height: '30px', padding: 0 }}
        title="Tilt Down / Top-Down"
        aria-label="Tilt camera down"
      >
        <ChevronDown style={{ width: '15px', height: '15px' }} />
      </button>

      <div style={{ width: '20px', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '2px 0' }} />

      {/* Rotate Left */}
      <button
        onClick={handleRotateLeft}
        className="btn-sci"
        style={{ width: '30px', height: '30px', padding: 0 }}
        title="Rotate Left (-30°)"
        aria-label="Rotate camera left"
      >
        <RotateCcw style={{ width: '14px', height: '14px' }} />
      </button>

      {/* Rotate Right */}
      <button
        onClick={handleRotateRight}
        className="btn-sci"
        style={{ width: '30px', height: '30px', padding: 0 }}
        title="Rotate Right (+30°)"
        aria-label="Rotate camera right"
      >
        <RotateCw style={{ width: '14px', height: '14px' }} />
      </button>

      {/* Cinematic Orbit Toggle */}
      <button
        onClick={handleToggleOrbit}
        className={`btn-sci ${isOrbiting ? 'btn-sci-active' : ''}`}
        style={{ width: '30px', height: '30px', padding: 0 }}
        title="Toggle 3D Orbit (O)"
        aria-label="Toggle cinematic 3D orbit"
      >
        <OrbitIcon
          style={{
            width: '14px',
            height: '14px',
            animation: isOrbiting ? 'spin 6s linear infinite' : 'none',
          }}
        />
      </button>

      {/* Home / Recenter */}
      <button
        onClick={handleHome}
        className="btn-sci"
        style={{ width: '30px', height: '30px', padding: 0 }}
        title="Recenter Arabian Sea (H)"
        aria-label="Recenter to home view"
      >
        <Home style={{ width: '14px', height: '14px', color: '#38bdf8' }} />
      </button>

      {/* Global View */}
      <button
        onClick={handleGlobalView}
        className="btn-sci"
        style={{ width: '30px', height: '30px', padding: 0 }}
        title="Zoom Out to Global View"
        aria-label="Zoom out to whole globe"
      >
        <Globe style={{ width: '14px', height: '14px', color: '#94a3b8' }} />
      </button>

      <div style={{ width: '20px', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '2px 0' }} />

      {/* Fullscreen Toggle */}
      <button
        onClick={handleToggleFullscreen}
        className="btn-sci"
        style={{ width: '30px', height: '30px', padding: 0 }}
        title={isFullscreen ? 'Exit Fullscreen (F)' : 'Enter Fullscreen (F)'}
        aria-label="Toggle fullscreen mode"
      >
        {isFullscreen ? <Minimize style={{ width: '14px', height: '14px' }} /> : <Maximize style={{ width: '14px', height: '14px' }} />}
      </button>

      {/* Keyboard Shortcuts Help */}
      <button
        onClick={onToggleShortcutsModal}
        className="btn-sci"
        style={{ width: '30px', height: '30px', padding: 0 }}
        title="Keyboard Shortcuts (?)"
        aria-label="Show keyboard navigation shortcuts"
      >
        <Keyboard style={{ width: '14px', height: '14px', color: '#94a3b8' }} />
      </button>
    </div>
  );
}
