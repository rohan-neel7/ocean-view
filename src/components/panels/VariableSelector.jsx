import React from 'react';
import { Thermometer, Droplets, Wind, Leaf, Layers } from 'lucide-react';
import { useOceanView } from '../../app/AppContext.jsx';
import { COLORMAP_PRESETS } from '../../visualization/color/scientificColorMaps.js';

const VARIABLES = [
  {
    id: 'sea_surface_temperature',
    name: 'Temperature (SST)',
    unit: '°C',
    colormap: 'THERMAL',
    icon: Thermometer,
    range: '15°C — 32°C',
    available: true,
  },
  {
    id: 'salinity',
    name: 'Salinity (SSS)',
    unit: 'PSU',
    colormap: 'HALINE',
    icon: Droplets,
    range: '32 — 37 PSU',
    available: true,
  },
  {
    id: 'ocean_current_velocity',
    name: 'Current Velocity',
    unit: 'm/s',
    colormap: 'SPEED',
    icon: Wind,
    range: '0.0 — 1.8 m/s',
    available: true, // Available via vector/particle layers
  },
  {
    id: 'chlorophyll_a',
    name: 'Chlorophyll-a',
    unit: 'mg/m³',
    colormap: 'ALGAE',
    icon: Leaf,
    range: '0.01 — 5.0 mg/m³',
    available: false, // No ERDDAP grid endpoint wired — data path not implemented
  },
];

export default function VariableSelector() {
  const { activeVariable, setActiveVariable, activeColormap, setActiveColormap, colorScaleSettings } = useOceanView();

  const handleSelect = (varDef) => {
    setActiveVariable(varDef.id);
    setActiveColormap(varDef.colormap);
  };

  const colormapDef = COLORMAP_PRESETS[activeColormap.toUpperCase()] || COLORMAP_PRESETS.THERMAL;

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
          const isUnavailable = !v.available;
          return (
            <div
              key={v.id}
              onClick={() => !isUnavailable && handleSelect(v)}
              className={`variable-chip ${isActive ? 'active' : ''}`}
              style={{ opacity: isUnavailable ? 0.45 : 1, cursor: isUnavailable ? 'not-allowed' : 'pointer' }}
              title={isUnavailable ? 'Data path not implemented — no ERDDAP endpoint wired' : undefined}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon style={{ width: '16px', height: '16px', color: isActive ? '#38bdf8' : '#94a3b8' }} />
                <span style={{ fontSize: '12px', fontWeight: '500', color: isActive ? '#f8fafc' : '#cbd5e1' }}>{v.name}</span>
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
          <span>Source: <strong style={{color: '#94a3b8'}}>{activeVariable === 'ocean_current_velocity' ? 'ANDRO/Ifremer' : 'SeaDataNet'}</strong></span>
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
