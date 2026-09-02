import React, { useState } from 'react';
import { Layers, Sparkles, Eye } from 'lucide-react';
import { useOceanView } from '../../app/AppContext.jsx';
import { globalCameraController } from '../../engine/rendering/CentralizedCameraController.js';
import { SCIENTIFIC_VIEW_MODES } from '../../engine/rendering/globeViewState.js';
import { BASEMAPS } from '../../engine/rendering/BasemapController.js';
import SunLightingControl from '../hud/SunLightingControl.jsx';

export default function GlobeViewModes({ bloomEffect, basemapController }) {
  const { isXRayMode, setIsXRayMode } = useOceanView();
  const [activeMode, setActiveMode] = useState('RESET');
  const [bloomActive, setBloomActive] = useState(false);
  const [activeBasemap, setActiveBasemap] = useState('SATELLITE');

  const handleSelectMode = (modeKey) => {
    setActiveMode(modeKey);
    globalCameraController.setPerspective(modeKey, 1.5);
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

  return (
    <div
      className="glass-panel"
      style={{
        position: 'absolute',
        top: '76px',
        right: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '5px 10px',
        zIndex: 42,
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
      }}
    >
      {/* View Mode Chips */}
      <div style={{ display: 'flex', gap: '3px', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '6px' }}>
        {Object.entries(SCIENTIFIC_VIEW_MODES).map(([key, mode]) => {
          const isActive = activeMode === key;
          return (
            <button
              key={key}
              onClick={() => handleSelectMode(key)}
              className={`btn-sci ${isActive ? 'btn-sci-active' : ''}`}
              style={{ padding: '4px 7px', fontSize: '10px' }}
              title={mode.description}
            >
              {mode.name.split(' ')[0]}
            </button>
          );
        })}
      </div>

      {/* HDR Glow */}
      <button
        onClick={handleToggleBloom}
        className={`btn-sci ${bloomActive ? 'btn-sci-active' : ''}`}
        style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}
        title="Toggle Luminescent HDR Glow"
      >
        <Sparkles style={{ width: '13px', height: '13px', color: bloomActive ? '#38bdf8' : '#94a3b8' }} />
        <span>Glow</span>
      </button>

      {/* X-Ray Mode Toggle */}
      <button
        onClick={() => setIsXRayMode(!isXRayMode)}
        className={`btn-sci ${isXRayMode ? 'btn-sci-active' : ''}`}
        style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}
        title="Toggle X-Ray / HUD Mode for Markers"
      >
        <Eye style={{ width: '13px', height: '13px', color: isXRayMode ? '#ef4444' : '#94a3b8' }} />
        <span style={{ color: isXRayMode ? '#fca5a5' : 'inherit' }}>
          {isXRayMode ? 'X-Ray Active' : 'X-Ray'}
        </span>
      </button>

      <div style={{ paddingLeft: '2px' }}>
        <SunLightingControl />
      </div>

      {/* Basemap Dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '6px' }}>
        <Layers style={{ width: '13px', height: '13px', color: '#94a3b8' }} />
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
    </div>
  );
}
