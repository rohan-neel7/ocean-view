import React from 'react';
import { Compass, MapPin } from 'lucide-react';
import { useOceanView } from '../../app/AppContext.jsx';
import { globalCameraController } from '../../engine/rendering/CentralizedCameraController.js';
import { OCEAN_REGIONS } from '../../engine/rendering/cameraVerbs.js';

export default function OceanBasinQuickJumps() {
  const { activeRegion, setActiveRegion } = useOceanView();

  const handleSelect = (key) => {
    setActiveRegion(key);
    globalCameraController.flyToRegion(key, 1.8);
  };

  return (
    <div
      className="glass-panel"
      style={{
        position: 'absolute',
        top: '76px',
        left: '308px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        zIndex: 40,
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8', marginRight: '4px' }}>
        <MapPin style={{ width: '13px', height: '13px', color: '#38bdf8' }} />
        <span style={{ fontSize: '10px', fontWeight: 'bold' }}>BASIN JUMP:</span>
      </div>

      {Object.entries(OCEAN_REGIONS).map(([key, reg]) => {
        const isActive = activeRegion === key;
        return (
          <button
            key={key}
            onClick={() => handleSelect(key)}
            className={`btn-sci ${isActive ? 'btn-sci-active' : ''}`}
            style={{
              padding: '3px 8px',
              fontSize: '10px',
              fontWeight: isActive ? '600' : 'normal',
            }}
          >
            {reg.name.split(' ')[0]}
          </button>
        );
      })}
    </div>
  );
}
