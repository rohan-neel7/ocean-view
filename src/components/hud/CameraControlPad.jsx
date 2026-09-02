import React from 'react';
import { Plus, Minus, ChevronUp, ChevronDown, RotateCcw, RotateCw, Globe } from 'lucide-react';
import { globalCameraController } from '../../engine/rendering/CentralizedCameraController.js';
import {
  nudgeHeading,
  nudgePitch,
  zoomCamera,
  resetNorth,
} from '../../engine/rendering/cameraVerbs.js';

export default function CameraControlPad() {
  const getViewer = () => globalCameraController.viewer;

  const handleZoomIn = () => {
    const v = getViewer();
    if (v) zoomCamera(v, 0.65, 0.4);
  };

  const handleZoomOut = () => {
    const v = getViewer();
    if (v) zoomCamera(v, 1.5, 0.4);
  };

  const handleTiltUp = () => {
    const v = getViewer();
    if (v) nudgePitch(v, 15, 0.4);
  };

  const handleTiltDown = () => {
    const v = getViewer();
    if (v) nudgePitch(v, -15, 0.4);
  };

  const handleRotateLeft = () => {
    const v = getViewer();
    if (v) nudgeHeading(v, -30, 0.4);
  };

  const handleRotateRight = () => {
    const v = getViewer();
    if (v) nudgeHeading(v, 30, 0.4);
  };

  const handleReset = () => {
    const v = getViewer();
    if (v) {
      resetNorth(v);
      globalCameraController.flyToRegion('ARABIAN_SEA', 1.5);
    }
  };

  return (
    <div
      className="glass-panel"
      style={{
        position: 'absolute',
        top: '172px',
        right: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '4px',
        gap: '3px',
        zIndex: 42,
        borderRadius: '8px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
      }}
    >
      {/* Zoom In */}
      <button
        onClick={handleZoomIn}
        className="btn-sci"
        style={{ width: '28px', height: '28px', padding: 0 }}
        title="Zoom In (+)"
      >
        <Plus style={{ width: '14px', height: '14px' }} />
      </button>

      {/* Zoom Out */}
      <button
        onClick={handleZoomOut}
        className="btn-sci"
        style={{ width: '28px', height: '28px', padding: 0 }}
        title="Zoom Out (-)"
      >
        <Minus style={{ width: '14px', height: '14px' }} />
      </button>

      {/* Tilt Up */}
      <button
        onClick={handleTiltUp}
        className="btn-sci"
        style={{ width: '28px', height: '28px', padding: 0, marginTop: '2px' }}
        title="Tilt Up / Oblique"
      >
        <ChevronUp style={{ width: '14px', height: '14px' }} />
      </button>

      {/* Tilt Down */}
      <button
        onClick={handleTiltDown}
        className="btn-sci"
        style={{ width: '28px', height: '28px', padding: 0 }}
        title="Tilt Down / Top-Down"
      >
        <ChevronDown style={{ width: '14px', height: '14px' }} />
      </button>

      {/* Rotate Left */}
      <button
        onClick={handleRotateLeft}
        className="btn-sci"
        style={{ width: '28px', height: '28px', padding: 0, marginTop: '2px' }}
        title="Rotate Left (-30°)"
      >
        <RotateCcw style={{ width: '13px', height: '13px' }} />
      </button>

      {/* Rotate Right */}
      <button
        onClick={handleRotateRight}
        className="btn-sci"
        style={{ width: '28px', height: '28px', padding: 0 }}
        title="Rotate Right (+30°)"
      >
        <RotateCw style={{ width: '13px', height: '13px' }} />
      </button>

      {/* Home / Reset View */}
      <button
        onClick={handleReset}
        className="btn-sci"
        style={{ width: '28px', height: '28px', padding: 0, marginTop: '2px' }}
        title="Reset Arabian Sea Perspective"
      >
        <Globe style={{ width: '14px', height: '14px', color: '#38bdf8' }} />
      </button>
    </div>
  );
}
