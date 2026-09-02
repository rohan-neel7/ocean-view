import React from 'react';
import { Eye, EyeOff, Radio, Navigation, Compass, MapPin, Wind, Sparkles } from 'lucide-react';
import { useOceanView } from '../../app/AppContext.jsx';

export default function LayerPanel() {
  const {
    layers,
    toggleLayer,
    particleBudget,
    setParticleBudget,
    flowSpeed,
    setFlowSpeed,
  } = useOceanView();

  const layerItems = [
    { key: 'scalarField', name: 'Scalar Field Grid', icon: Compass, count: '16×21' },
    { key: 'currentVectors', name: 'Velocity Vector Glyphs', icon: Wind, count: '8×11' },
    { key: 'particleFlow', name: 'Particle Flow Streamlines', icon: Sparkles, count: `${particleBudget} pts` },
    { key: 'argoFloats', name: 'Argo Profiling Floats', icon: Radio, count: 'Real In-Situ' },
    { key: 'gliders', name: 'Autonomous Gliders', icon: Navigation, count: '1 Mission' },
    { key: 'ctdStations', name: 'CTD Stations', icon: MapPin, count: '12 Casts' },
  ];

  return (
    <div className="glass-panel" style={{ padding: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', fontSize: '11px', fontWeight: '600', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        <span>Active Ocean Layers</span>
      </div>
      
      {/* Fallback Disclosure (Issue 3 resolution) */}
      <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: '4px', fontSize: '10px', color: '#fde047', fontFamily: 'var(--font-mono)' }}>
        <span style={{ fontWeight: 'bold' }}>INFO:</span>
        <span>Surface layers (0-5m) use a +5m approximate offset to clear terrain constraints.</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {layerItems.map((item) => {
          const Icon = item.icon;
          const isEnabled = layers[item.key];
          return (
            <div key={item.key} className="layer-toggle-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon style={{ width: '14px', height: '14px', color: isEnabled ? '#38bdf8' : '#64748b' }} />
                <span style={{ fontSize: '12px', color: isEnabled ? '#f8fafc' : '#94a3b8' }}>{item.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="mono-readout" style={{ fontSize: '10px', color: '#64748b' }}>{item.count}</span>
                <button
                  onClick={() => toggleLayer(item.key)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                  title={isEnabled ? 'Hide Layer' : 'Show Layer'}
                >
                  {isEnabled ? (
                    <Eye style={{ width: '15px', height: '15px', color: '#38bdf8' }} />
                  ) : (
                    <EyeOff style={{ width: '15px', height: '15px', color: '#475569' }} />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Particle Controls Subpanel */}
      {layers.particleFlow && (
        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#94a3b8' }}>PARTICLE BUDGET</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {['LOW', 'MEDIUM', 'HIGH'].map((tier) => (
                <button
                  key={tier}
                  onClick={() => setParticleBudget(tier)}
                  style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    cursor: 'pointer',
                    border: particleBudget === tier ? '1px solid rgba(56,189,248,0.5)' : '1px solid transparent',
                    background: particleBudget === tier ? 'rgba(56,189,248,0.2)' : 'rgba(15,23,42,0.6)',
                    color: particleBudget === tier ? '#38bdf8' : '#94a3b8',
                  }}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#94a3b8' }}>FLOW SPEED</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={flowSpeed}
                onChange={(e) => setFlowSpeed(parseFloat(e.target.value))}
                style={{ width: '70px', accentColor: '#38bdf8', height: '4px' }}
              />
              <span style={{ color: '#38bdf8', width: '28px', textAlign: 'right', fontWeight: 'bold' }}>{flowSpeed}x</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
