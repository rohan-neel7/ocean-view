import React from 'react';
import { Thermometer, Droplets, Wind, Leaf, Layers } from 'lucide-react';
import { useOceanView } from '../../app/AppContext.jsx';
import { COLORMAP_PRESETS } from '../../visualization/color/scientificColorMaps.js';
import { DATASET_CAPABILITIES } from '../../engine/index.js';

// Define UI mapping over the authoritative dataset capabilities
const VARIABLES = [
  {
    id: 'sea_surface_temperature',
    colormap: 'THERMAL',
    icon: Thermometer,
    unit: '°C'
  },
  {
    id: 'salinity',
    colormap: 'HALINE',
    icon: Droplets,
    unit: 'PSU'
  },
  {
    id: 'ocean_current_velocity',
    colormap: 'SPEED',
    icon: Wind,
    unit: 'm/s'
  },
  {
    id: 'chlorophyll_a',
    colormap: 'ALGAE',
    icon: Leaf,
    unit: 'mg/m³'
  },
];

export default function VariableSelector() {
  const { activeVariable, setActiveVariable, activeColormap, setActiveColormap, colorScaleSettings } = useOceanView();

  const handleSelect = (vId, colormap) => {
    setActiveVariable(vId);
    setActiveColormap(colormap);
  };

  const colormapDef = COLORMAP_PRESETS[activeColormap.toUpperCase()] || COLORMAP_PRESETS.THERMAL;
  const currentProvider = DATASET_CAPABILITIES[activeVariable]?.provider || 'Unknown';

  return (
    <div className="glass-panel" style={{ padding: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '11px', fontWeight: '600', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        <Layers style={{ width: '14px', height: '14px', color: '#38bdf8' }} />
        <span>Physical Variable</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {VARIABLES.map((v) => {
          const Icon = v.icon;
          const isActive = activeVariable === v.id;
          const caps = DATASET_CAPABILITIES[v.id];
          const isUnavailable = !caps || !caps.available;
          
          return (
            <div
              key={v.id}
              onClick={() => !isUnavailable && handleSelect(v.id, v.colormap)}
              className={`variable-chip ${isActive ? 'active' : ''}`}
              style={{ opacity: isUnavailable ? 0.45 : 1, cursor: isUnavailable ? 'not-allowed' : 'pointer' }}
              title={isUnavailable ? 'Data path not implemented — no backend endpoint wired' : undefined}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon style={{ width: '16px', height: '16px', color: isActive ? '#38bdf8' : '#94a3b8' }} />
                <span style={{ fontSize: '12px', fontWeight: '500', color: isActive ? '#f8fafc' : '#cbd5e1' }}>{caps?.displayName || v.id}</span>
              </div>
              {isUnavailable
                ? <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '3px', padding: '1px 5px' }}>UNAVAILABLE</span>
                : <span className="mono-readout" style={{ fontSize: '11px', color: isActive ? '#38bdf8' : '#64748b' }}>{v.unit}</span>
              }
            </div>
          );
        })}
      </div>

      {/* Dynamic Colormap Legend Bar */}
      <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
          <span>Source: <strong style={{color: '#94a3b8'}}>{currentProvider}</strong></span>
          <span>Scale: <strong style={{color: '#94a3b8'}}>{colorScaleSettings?.scaleType || 'Linear'}</strong></span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: '#94a3b8', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
          <span>{colorScaleSettings?.min ?? colormapDef.defaultRange[0]} {colormapDef.unit}</span>
          <span style={{ color: '#38bdf8', textTransform: 'uppercase', fontWeight: '600' }}>
            {colormapDef.name.split(' ')[0]} {colorScaleSettings?.min !== null ? '(MANUAL)' : '(AUTO)'}
          </span>
          <span>{colorScaleSettings?.max ?? colormapDef.defaultRange[1]} {colormapDef.unit}</span>
        </div>
        <div className={`sci-colorbar cmocean-${colormapDef.id}`} />
      </div>
    </div>
  );
}
