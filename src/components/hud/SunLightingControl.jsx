import React, { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { globalCameraController } from '../../engine/rendering/CentralizedCameraController.js';
import { governorRequestRender } from '../../engine/rendering/renderGovernor.js';

export default function SunLightingControl() {
  const [isSunLighting, setIsSunLighting] = useState(false);

  const toggleLighting = () => {
    const viewer = globalCameraController.viewer;
    if (!viewer || viewer.isDestroyed?.()) return;

    const nextState = !isSunLighting;
    viewer.scene.globe.enableLighting = nextState;
    setIsSunLighting(nextState);
    governorRequestRender();
  };

  return (
    <button
      onClick={toggleLighting}
      className={`btn-sci ${isSunLighting ? 'btn-sci-active' : ''}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '5px 8px',
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
      }}
      title={isSunLighting ? 'Disable Solar Illumination' : 'Enable Real-time Solar Lighting'}
    >
      {isSunLighting ? <Sun style={{ width: '13px', height: '13px', color: '#fbbf24' }} /> : <Moon style={{ width: '13px', height: '13px', color: '#94a3b8' }} />}
      <span>{isSunLighting ? 'Solar ON' : 'Solar Light'}</span>
    </button>
  );
}
