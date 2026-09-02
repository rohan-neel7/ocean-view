import React from 'react';
import { Waves, Compass, Activity, Database, ShieldCheck, Sliders, BookOpen, Microscope } from 'lucide-react';
import { useOceanView } from '../../app/AppContext.jsx';
import { globalCameraController } from '../../engine/rendering/CentralizedCameraController.js';
import { OCEAN_REGIONS } from '../../engine/rendering/cameraVerbs.js';

export default function HeaderBar() {
  const {
    activeRegion,
    setActiveRegion,
    dataMode,
    setDataMode,
    sourceStatus,
    presentationMode,
    setPresentationMode,
    setColorbarModalOpen,
  } = useOceanView();

  const handleRegionChange = (regionKey) => {
    setActiveRegion(regionKey);
    globalCameraController.flyToRegion(regionKey, 2.0);
  };

  return (
    <header className="oceanview-header glass-panel">
      {/* Brand & Mission Title */}
      <div className="brand-title">
        <Waves style={{ width: '20px', height: '20px', color: '#38bdf8' }} />
        <span style={{ fontSize: '15px', fontWeight: 'bold', letterSpacing: '-0.02em', color: '#ffffff' }}>OceanView</span>
        <span className="brand-badge">INCOIS 3D</span>
      </div>

      {/* Dynamic Truthfulness Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {sourceStatus === 'LIVE' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(6,78,59,0.8)', borderRadius: '6px', border: '1px solid #059669', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#6ee7b7' }}>
            <ShieldCheck style={{ width: '14px', height: '14px', color: '#34d399' }} />
            <span>LIVE SCIENTIFIC FEED (ERDDAP / GDAC)</span>
          </div>
        )}
        {sourceStatus === 'FIXTURE' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(8,47,73,0.8)', borderRadius: '6px', border: '1px solid #0e7490', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#7dd3fc' }}>
            <Database style={{ width: '14px', height: '14px', color: '#38bdf8' }} />
            <span>VERIFIED ARGO / SEADATANET FIXTURE</span>
          </div>
        )}
        {sourceStatus === 'SYNTHETIC' && (
          <div className="synthetic-banner">
            <Activity style={{ width: '14px', height: '14px' }} />
            <span>SYNTHETIC DEMONSTRATION DATA</span>
          </div>
        )}
        {sourceStatus === 'FETCHING' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(15,23,42,0.8)', borderRadius: '6px', border: '1px solid #334155', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>
            <Activity style={{ width: '14px', height: '14px', color: '#38bdf8' }} />
            <span>FETCHING UPSTREAM DATA...</span>
          </div>
        )}
      </div>

      {/* Presentation Mode & Quick Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Operational vs Outreach Mode Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(15,23,42,0.8)', padding: '2px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={() => setPresentationMode('OPERATIONAL')}
            className={`btn-sci ${presentationMode === 'OPERATIONAL' ? 'btn-sci-active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '10px' }}
            title="Operational Scientist Workstation (Dense metrics, deltas, RMSE)"
          >
            <Microscope style={{ width: '12px', height: '12px' }} />
            <span>Operational</span>
          </button>
          <button
            onClick={() => setPresentationMode('OUTREACH')}
            className={`btn-sci ${presentationMode === 'OUTREACH' ? 'btn-sci-active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '10px' }}
            title="Public Outreach & Science Communication (Guided explanations)"
          >
            <BookOpen style={{ width: '12px', height: '12px' }} />
            <span>Outreach</span>
          </button>
        </div>

        {/* Colorbar Customization Button */}
        <button
          onClick={() => setColorbarModalOpen(true)}
          className="btn-sci"
          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 9px', fontSize: '10px' }}
          title="Customize Colormap, Min/Max, Scaling, and Opacity"
        >
          <Sliders style={{ width: '13px', height: '13px', color: '#38bdf8' }} />
          <span>Color Scale</span>
        </button>

        {/* Region Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(15,23,42,0.8)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Compass style={{ width: '14px', height: '14px', color: '#94a3b8' }} />
          <select
            value={activeRegion}
            onChange={(e) => handleRegionChange(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: '#f8fafc', fontSize: '11px', fontWeight: '500', outline: 'none', cursor: 'pointer' }}
          >
            {Object.keys(OCEAN_REGIONS).map((regKey) => (
              <option key={regKey} value={regKey} style={{ background: '#0f172a', color: '#f8fafc' }}>
                {OCEAN_REGIONS[regKey].name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
