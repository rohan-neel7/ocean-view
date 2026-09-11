/**
 * OceanView — Scientific Data Control Panel
 * Compact floating workstation: physical variable, colorbar, layers, in-situ assets.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Thermometer,
  Droplets,
  Wind,
  Leaf,
  Layers,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Sparkles,
  Radio,
  Navigation,
  MapPin,
  Sliders,
  Check,
  ChevronUp,
  Database,
} from 'lucide-react';
import { useOceanView } from '../../app/AppContext.jsx';
import { COLORMAP_PRESETS } from '../../visualization/color/scientificColorMaps.js';
import { DATASET_CAPABILITIES } from '../../engine/index.js';
import ObservationExplorer from '../scientific/ObservationExplorer.jsx';

const VARIABLES = [
  { id: 'sea_surface_temperature',  name: 'Sea Surface Temp.',        short: 'Temperature',     colormap: 'THERMAL', icon: Thermometer, unit: '°C',   accentColor: '#E07B5A' },
  { id: 'salinity',                 name: 'Sea Surface Salinity',     short: 'Salinity',        colormap: 'HALINE',  icon: Droplets,    unit: 'PSU',  accentColor: '#5A9BE0' },
  { id: 'ocean_current_velocity',   name: 'Current Velocity & Winds', short: 'Current Velocity',colormap: 'WINDY',   icon: Wind,        unit: 'm/s',  accentColor: '#7BBDB4' },
  { id: 'chlorophyll_a',            name: 'Chlorophyll-a Conc.',      short: 'Chlorophyll-a',   colormap: 'ALGAE',   icon: Leaf,        unit: 'mg/m³',accentColor: '#6DB03E' },
];

const LAYER_CONFIG = [
  { key: 'scalarField',    name: 'Scalar Field Grid',    icon: Sliders,    accentColor: 'var(--teal-500)' },
  { key: 'currentVectors', name: 'Velocity Vectors',     icon: Navigation, accentColor: 'var(--accent-amber)' },
  { key: 'particleFlow',   name: 'Flow Streamlines',     icon: Sparkles,   accentColor: 'var(--teal-300)' },
  { key: 'weatherMarkers', name: 'Temperature Markers',  icon: Thermometer,accentColor: '#E07B5A' },
  { key: 'windDirections', name: 'Wind & Flow Arrows',   icon: Wind,       accentColor: 'var(--text-secondary)' },
];

const INSITU_LAYERS = [
  { key: 'argoFloats',  name: 'Argo Floats',         icon: Radio,      accentColor: 'var(--accent-amber)' },
  { key: 'gliders',     name: 'Autonomous Gliders',  icon: Navigation, accentColor: '#8E82A1' },
  { key: 'ctdStations', name: 'CTD Cast Stations',   icon: MapPin,     accentColor: '#A68B82' },
];

/* ── Toggle Switch ─────────────────────────────────────────────────── */
function ToggleSwitch({ on, onChange, accentColor = 'var(--teal-500)' }) {
  return (
    <button
      onClick={onChange}
      style={{
        position: 'relative',
        width: '28px',
        height: '15px',
        flexShrink: 0,
        background: on ? `${accentColor}28` : 'rgba(255,255,255,0.06)',
        border: `1px solid ${on ? accentColor + '55' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '10px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        padding: 0,
      }}
    >
      <span style={{
        position: 'absolute',
        top: '2px',
        left: on ? '14px' : '2px',
        width: '11px',
        height: '11px',
        borderRadius: '50%',
        background: on ? accentColor : 'rgba(255,255,255,0.25)',
        boxShadow: on ? `0 0 6px ${accentColor}` : 'none',
        transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
      }} />
    </button>
  );
}

/* ── Layer Row ─────────────────────────────────────────────────────── */
function LayerRow({ layerKey, name, icon: Icon, accentColor, layers, onToggle }) {
  const isOn = Boolean(layers[layerKey]);
  return (
    <div
      onClick={() => onToggle(layerKey)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '7px 10px',
        borderRadius: '7px',
        cursor: 'pointer',
        background: isOn ? `${accentColor}10` : 'transparent',
        border: `1px solid ${isOn ? accentColor + '30' : 'transparent'}`,
        transition: 'all 0.15s ease',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Icon style={{ width: '12px', height: '12px', color: isOn ? accentColor : 'var(--text-muted)', flexShrink: 0 }} />
        <span style={{ fontSize: '11.5px', fontWeight: 500, color: isOn ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
          {name}
        </span>
      </div>
      <ToggleSwitch on={isOn} onChange={() => onToggle(layerKey)} accentColor={accentColor} />
    </div>
  );
}

/* ── Collapsible Section ───────────────────────────────────────────── */
function Section({ title, icon: Icon, iconColor, isOpen, onToggle, children, badge }) {
  return (
    <div>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 2px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'opacity 0.15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Icon style={{ width: '12px', height: '12px', color: iconColor || 'var(--text-muted)', flexShrink: 0 }} />
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
            {title}
          </span>
          {badge !== undefined && (
            <span style={{
              fontSize: '9px',
              fontWeight: 600,
              color: 'var(--teal-500)',
              background: 'var(--teal-soft)',
              border: '1px solid var(--border-medium)',
              borderRadius: '99px',
              padding: '1px 5px',
              fontFamily: 'var(--font-mono)',
            }}>
              {badge}
            </span>
          )}
        </div>
        <ChevronDown style={{
          width: '12px', height: '12px',
          color: 'var(--text-muted)',
          transform: isOpen ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s ease',
          flexShrink: 0,
        }} />
      </button>

      {isOpen && (
        <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────────────── */
export default function DataPanel() {
  const {
    activeVariable, setActiveVariable,
    activeColormap,  setActiveColormap,
    colorScaleSettings,
    layers, toggleLayer,
    particleBudget, setParticleBudget,
    activeDepthMeters,
    setColorbarModalOpen,
  } = useOceanView();

  const [collapsed,       setCollapsed]       = useState(false);
  const [varDropOpen,     setVarDropOpen]      = useState(false);
  const [layersOpen,      setLayersOpen]       = useState(true);
  const [inSituOpen,      setInSituOpen]       = useState(false);

  const panelRef = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setVarDropOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const varObj     = VARIABLES.find(v => v.id === activeVariable) || VARIABLES[0];
  const VarIcon    = varObj.icon;
  const colormapDef = COLORMAP_PRESETS[activeColormap.toUpperCase()] || COLORMAP_PRESETS.THERMAL;
  const activeLayers = Object.values(layers).filter(Boolean).length;

  return (
    <div
      ref={panelRef}
      className="floating-data-panel"
      style={{ top: '72px', left: '14px', width: collapsed ? 'auto' : '272px' }}
    >
      {/* ── Panel Card ── */}
      <div style={{
        background: 'var(--bg-card)',
        backdropFilter: 'var(--blur-glass)',
        WebkitBackdropFilter: 'var(--blur-glass)',
        border: '1px solid var(--border-faint)',
        borderRadius: '14px',
        boxShadow: 'var(--shadow-lg), 0 0 0 0.5px rgba(255,255,255,0.03) inset',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div
          onClick={() => setCollapsed(!collapsed)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database style={{ width: '13px', height: '13px', color: 'var(--teal-500)' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>
              Data
            </span>
            {collapsed && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
                · {varObj.short}
              </span>
            )}
          </div>
          <ChevronDown style={{
            width: '13px', height: '13px', color: 'var(--text-muted)',
            transform: collapsed ? 'rotate(-90deg)' : 'none',
            transition: 'transform 0.2s ease',
          }} />
        </div>

        {!collapsed && (
          <div style={{ borderTop: '1px solid var(--border-faint)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* ── Variable Selector ── */}
            <div>
              <div style={{ marginBottom: '7px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Physical Variable
                </span>
                <button
                  onClick={() => setColorbarModalOpen(true)}
                  className="btn-sci"
                  style={{ padding: '2px 7px', fontSize: '9px', gap: '3px' }}
                >
                  <Sliders style={{ width: '9px', height: '9px' }} /> Calibrate
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setVarDropOpen(!varDropOpen)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-faint)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    fontFamily: 'var(--font-sans)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.055)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)';  e.currentTarget.style.borderColor = 'var(--border-faint)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '6px',
                      background: `${varObj.accentColor}18`,
                      border: `1px solid ${varObj.accentColor}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <VarIcon style={{ width: '12px', height: '12px', color: varObj.accentColor }} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                        {varObj.short}
                      </div>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '1px' }}>
                        {DATASET_CAPABILITIES[varObj.id]?.provider || 'INCOIS Model'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                      {varObj.unit}
                    </span>
                    <ChevronDown style={{
                      width: '12px', height: '12px', color: 'var(--text-muted)',
                      transform: varDropOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s',
                    }} />
                  </div>
                </button>

                {/* Variable dropdown */}
                {varDropOpen && (
                  <div className="sci-dropdown-menu align-left" style={{ width: '100%', top: 'calc(100% + 5px)', borderRadius: '10px' }}>
                    {VARIABLES.map(v => {
                      const Icon = v.icon;
                      const isSelected = v.id === activeVariable;
                      const available = DATASET_CAPABILITIES[v.id]?.available !== false;
                      return (
                        <button
                          key={v.id}
                          disabled={!available}
                          onClick={() => { setActiveVariable(v.id); setActiveColormap(v.colormap); setVarDropOpen(false); }}
                          className={`sci-dropdown-item ${isSelected ? 'active' : ''}`}
                          style={{ opacity: available ? 1 : 0.35, gap: '10px' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Icon style={{ width: '13px', height: '13px', color: isSelected ? 'var(--teal-300)' : v.accentColor, flexShrink: 0 }} />
                            <span style={{ fontSize: '12px' }}>{v.name}</span>
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: isSelected ? 'var(--teal-500)' : 'var(--text-muted)', flexShrink: 0 }}>
                            {v.unit}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Colorbar strip */}
              <div style={{ marginTop: '9px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px',
                }}>
                  <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {colorScaleSettings?.min ?? colormapDef.defaultRange?.[0] ?? ''}
                  </span>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--teal-500)', letterSpacing: '0.05em' }}>
                    {colormapDef.name?.split(' ')?.[0]?.toUpperCase() || activeColormap}
                  </span>
                  <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {colorScaleSettings?.max ?? colormapDef.defaultRange?.[1] ?? ''}
                  </span>
                </div>
                <div
                  className={`colorbar-strip cmocean-${colormapDef.id || colormapDef.name?.toLowerCase()?.split(' ')?.[0] || 'thermal'}`}
                  style={{ height: '6px', borderRadius: '4px', opacity: 0.85 }}
                />
              </div>
            </div>

            {/* Separator */}
            <div style={{ height: '1px', background: 'var(--border-faint)', margin: '0 -14px' }} />

            {/* ── Layers Section ── */}
            <Section
              title="Layers"
              icon={Layers}
              iconColor="var(--teal-500)"
              isOpen={layersOpen}
              onToggle={() => setLayersOpen(!layersOpen)}
              badge={activeLayers}
            >
              {LAYER_CONFIG.map(l => (
                <LayerRow
                  key={l.key}
                  layerKey={l.key}
                  name={l.name}
                  icon={l.icon}
                  accentColor={l.accentColor}
                  layers={layers}
                  onToggle={toggleLayer}
                />
              ))}

              {/* Particle budget controls */}
              {layers.particleFlow && (
                <div style={{ margin: '4px 2px 0', padding: '8px 10px', background: 'rgba(95,163,154,0.06)', borderRadius: '7px', border: '1px solid rgba(95,163,154,0.15)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      Streamline Density
                    </span>
                    <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--teal-500)', fontWeight: 600 }}>
                      {particleBudget}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {['LOW', 'MEDIUM', 'HIGH'].map(t => (
                      <button
                        key={t}
                        onClick={() => setParticleBudget(t)}
                        style={{
                          flex: 1,
                          padding: '3px 0',
                          fontSize: '9px',
                          fontWeight: 600,
                          fontFamily: 'var(--font-mono)',
                          background: particleBudget === t ? 'var(--teal-soft)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${particleBudget === t ? 'var(--border-medium)' : 'var(--border-faint)'}`,
                          borderRadius: '5px',
                          color: particleBudget === t ? 'var(--teal-300)' : 'var(--text-muted)',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {t.charAt(0) + t.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Section>

            {/* Separator */}
            <div style={{ height: '1px', background: 'var(--border-faint)', margin: '0 -14px' }} />

            {/* ── In-Situ Section ── */}
            <Section
              title="In-Situ Platforms"
              icon={Radio}
              iconColor="var(--accent-amber)"
              isOpen={inSituOpen}
              onToggle={() => setInSituOpen(!inSituOpen)}
            >
              {INSITU_LAYERS.map(l => (
                <LayerRow
                  key={l.key}
                  layerKey={l.key}
                  name={l.name}
                  icon={l.icon}
                  accentColor={l.accentColor}
                  layers={layers}
                  onToggle={toggleLayer}
                />
              ))}
              {inSituOpen && (
                <div style={{ marginTop: '8px' }}>
                  <ObservationExplorer isCompact={true} />
                </div>
              )}
            </Section>

          </div>
        )}
      </div>
    </div>
  );
}
