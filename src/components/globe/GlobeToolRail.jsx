/**
 * OceanView — Minimal Floating Navigation Rail
 * Replaces the 12-button column with a sleek 4-button pill (+, −, ⌖, ⟳)
 * and a clean Camera ▾ popover menu.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Minus,
  Target,
  RotateCw,
  Video,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Maximize,
  Minimize,
  Keyboard,
  Globe,
  Compass,
} from 'lucide-react';
import { globalCameraController } from '../../engine/rendering/CentralizedCameraController.js';

export default function GlobeToolRail({ orbitController, onToggleShortcutsModal }) {
  const [isOrbiting, setIsOrbiting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCameraMenuOpen, setIsCameraMenuOpen] = useState(false);
  const railRef = useRef(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Close camera popover on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (railRef.current && !railRef.current.contains(e.target)) {
        setIsCameraMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleZoomIn = () => globalCameraController.zoom(0.65, 0.4);
  const handleZoomOut = () => globalCameraController.zoom(1.5, 0.4);
  const handleHome = () => globalCameraController.flyToRegion('ARABIAN_SEA', 1.8);

  const handleResetOrientation = () => {
    if (isOrbiting && orbitController) {
      orbitController.stop();
      setIsOrbiting(false);
    }
    globalCameraController.rotate(0, 0.4);
    globalCameraController.tilt(0, 0.4);
  };

  const handleToggleOrbit = () => {
    if (!orbitController) return;
    const active = orbitController.toggle();
    setIsOrbiting(active);
    setIsCameraMenuOpen(false);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsCameraMenuOpen(false);
  };

  return (
    <div
      ref={railRef}
      style={{
        position: 'absolute',
        bottom: '24px',
        right: '18px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        zIndex: 42,
      }}
    >
      {/* 4-Button Floating Rail (+, −, ⌖, ⟳) */}
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '4px',
          gap: '3px',
          borderRadius: '24px',
          background: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
        }}
      >
        {/* Zoom In (+) */}
        <button
          onClick={handleZoomIn}
          className="btn-sci"
          style={{ width: '32px', height: '32px', borderRadius: '50%', padding: 0 }}
          title="Zoom In (+)"
          aria-label="Zoom in"
        >
          <Plus style={{ width: '15px', height: '15px', color: 'var(--text-primary)' }} />
        </button>

        {/* Zoom Out (−) */}
        <button
          onClick={handleZoomOut}
          className="btn-sci"
          style={{ width: '32px', height: '32px', borderRadius: '50%', padding: 0 }}
          title="Zoom Out (-)"
          aria-label="Zoom out"
        >
          <Minus style={{ width: '15px', height: '15px', color: 'var(--text-primary)' }} />
        </button>

        <div style={{ width: '16px', height: '1px', background: 'var(--border-subtle)', margin: '1px 0' }} />

        {/* Recenter / Focus (⌖) */}
        <button
          onClick={handleHome}
          className="btn-sci"
          style={{ width: '32px', height: '32px', borderRadius: '50%', padding: 0 }}
          title="Recenter to Arabian Sea Basin (Home)"
          aria-label="Recenter camera"
        >
          <Target style={{ width: '15px', height: '15px', color: 'var(--accent-teal)' }} />
        </button>

        {/* Reset Orientation / Heading (⟳) */}
        <button
          onClick={handleResetOrientation}
          className={`btn-sci ${isOrbiting ? 'btn-sci-active' : ''}`}
          style={{ width: '32px', height: '32px', borderRadius: '50%', padding: 0 }}
          title="Reset Camera Orientation to North (N)"
          aria-label="Reset camera orientation"
        >
          <RotateCw style={{ width: '14px', height: '14px', color: 'var(--text-secondary)' }} />
        </button>

        {/* Camera Popover Menu Trigger */}
        <button
          onClick={() => setIsCameraMenuOpen(!isCameraMenuOpen)}
          className={`btn-sci ${isCameraMenuOpen ? 'btn-sci-active' : ''}`}
          style={{ width: '32px', height: '32px', borderRadius: '50%', padding: 0, marginTop: '2px' }}
          title="Camera Controls & Presets"
          aria-label="Camera controls"
        >
          <Video style={{ width: '14px', height: '14px', color: 'var(--accent-amber)' }} />
        </button>
      </div>

      {/* Camera Dropdown Popover */}
      {isCameraMenuOpen && (
        <div
          className="sci-dropdown-menu"
          style={{
            position: 'absolute',
            bottom: '0',
            right: '42px',
            top: 'auto',
            width: '200px',
          }}
        >
          <div className="sci-dropdown-header">Camera Verbs</div>

          <button
            onClick={() => {
              globalCameraController.tilt(15, 0.4);
              setIsCameraMenuOpen(false);
            }}
            className="sci-dropdown-item"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ChevronUp style={{ width: '13px', height: '13px' }} />
              <span>Tilt Oblique (3D)</span>
            </div>
          </button>

          <button
            onClick={() => {
              globalCameraController.tilt(-15, 0.4);
              setIsCameraMenuOpen(false);
            }}
            className="sci-dropdown-item"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ChevronDown style={{ width: '13px', height: '13px' }} />
              <span>Tilt Top-Down (Nadir)</span>
            </div>
          </button>

          <button
            onClick={handleToggleOrbit}
            className={`sci-dropdown-item ${isOrbiting ? 'active' : ''}`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RotateCw style={{ width: '13px', height: '13px' }} />
              <span>{isOrbiting ? 'Stop 3D Orbit' : 'Start 3D Orbit'}</span>
            </div>
          </button>

          <button
            onClick={() => {
              globalCameraController.flyTo({ lat: 0, lon: 75, alt: 22000000, pitch: -90, duration: 2.0 });
              setIsCameraMenuOpen(false);
            }}
            className="sci-dropdown-item"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe style={{ width: '13px', height: '13px' }} />
              <span>Global View</span>
            </div>
          </button>

          <div className="sci-dropdown-divider" />

          <button onClick={handleToggleFullscreen} className="sci-dropdown-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isFullscreen ? <Minimize style={{ width: '13px', height: '13px' }} /> : <Maximize style={{ width: '13px', height: '13px' }} />}
              <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen (F)'}</span>
            </div>
          </button>

          {onToggleShortcutsModal && (
            <button
              onClick={() => {
                onToggleShortcutsModal();
                setIsCameraMenuOpen(false);
              }}
              className="sci-dropdown-item"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Keyboard style={{ width: '13px', height: '13px' }} />
                <span>Shortcuts (?)</span>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
