import React, { useState, useEffect, useRef } from 'react';
import {
  Waves,
  Compass,
  Activity,
  Layers as LayersIcon,
  Eye,
  EyeOff,
  Sliders,
  ChevronDown,
  Sparkles,
  Wind,
  Thermometer,
  Radio,
  Navigation,
  MapPin,
  Check,
  Globe,
  Sun,
  ShieldAlert,
  HelpCircle,
  Clock,
  Play,
  Pause,
  Tag,
} from 'lucide-react';
import { useOceanView } from '../../app/AppContext.jsx';
import { globalCameraController } from '../../engine/rendering/CentralizedCameraController.js';
import { OCEAN_REGIONS } from '../../engine/rendering/cameraVerbs.js';
import { SCIENTIFIC_VIEW_MODES } from '../../engine/rendering/globeViewState.js';
import { DATASET_CAPABILITIES } from '../../engine/index.js';

export default function HeaderBar({ onToggleShortcuts }) {
  const {
    activeRegion,
    setActiveRegion,
    activeVariable,
    dataMode,
    setDataMode,
    sourceStatuses,
    presentationMode,
    setPresentationMode,
    setColorbarModalOpen,
    layers,
    toggleLayer,
    isXRayMode,
    setIsXRayMode,
    activeDepthMeters,
    setActiveDepthMeters,
    scientificSelection,
    setScientificSelection,
    isPlayingTimeline,
    setIsPlayingTimeline,
    labelSettings,
    toggleLabelSetting,
  } = useOceanView();

  const [activeDropdown, setActiveDropdown] = useState(null); // 'DATA' | 'TIME' | 'LAYERS' | 'VIEW' | 'LABELS' | 'BASIN' | null
  const headerRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const toggleDropdown = (name) => {
    setActiveDropdown((prev) => (prev === name ? null : name));
  };

  const handleRegionSelect = (regionKey) => {
    setActiveRegion(regionKey);
    globalCameraController.flyToRegion(regionKey, 2.0);
    setActiveDropdown(null);
  };

  const handleViewModeSelect = (modeKey) => {
    globalCameraController.setPerspective(modeKey, 1.6);
    setActiveDropdown(null);
  };

  const activeRegionName = OCEAN_REGIONS[activeRegion]?.name || 'Arabian Sea Basin';
  const readySourcesCount = Object.values(sourceStatuses).filter((s) => s === 'READY').length;
  const activeLayersCount = Object.values(layers).filter(Boolean).length;

  const caps = DATASET_CAPABILITIES[activeVariable];
  const supportedTimes = caps?.supportedTimes || [
    { value: '2026-09-11T00:00:00Z', label: '11 Sep 2026 · 00:00 UTC' },
    { value: '2026-09-11T06:00:00Z', label: '11 Sep 2026 · 06:00 UTC' },
    { value: '2026-09-11T12:00:00Z', label: '11 Sep 2026 · 12:00 UTC' },
    { value: '2026-09-11T14:00:00Z', label: '11 Sep 2026 · 14:00 UTC' },
    { value: '2026-09-11T18:00:00Z', label: '11 Sep 2026 · 18:00 UTC' },
  ];
  const currentTimeObj = supportedTimes.find((t) => t.value === scientificSelection?.timeValue) || supportedTimes[3] || supportedTimes[0];
  const displayTimeStr = currentTimeObj?.label || '11 Sep 2026 · 14:00 UTC';
  const depthLevels = caps?.supportedDepths || [0, 5, 10, 25, 50, 100, 200, 500];

  return (
    <header ref={headerRef} className="oceanview-header">
      {/* Brand & Mission Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="brand-title">
          <Waves style={{ width: '18px', height: '18px', color: 'var(--teal-500)' }} />
          <span>OceanView</span>
          <span className="brand-badge">INCOIS 3D</span>
        </div>
      </div>

      {/* Center: Dataset / Scientific Mode Dropdown */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => toggleDropdown('DATA')}
          className={`btn-sci ${activeDropdown === 'DATA' ? 'btn-sci-active' : ''}`}
          style={{
            padding: '5px 12px',
            gap: '8px',
            background: activeDropdown === 'DATA' ? 'var(--accent-teal-soft)' : 'rgba(23, 26, 25, 0.7)',
            borderColor: activeDropdown === 'DATA' ? 'var(--border-highlight)' : 'var(--border-subtle)',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: dataMode === 'REAL_SCIENTIFIC' ? 'var(--accent-teal)' : 'var(--accent-amber)',
            }}
          />
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {dataMode === 'REAL_SCIENTIFIC' ? 'Scientific In-Situ / Model' : 'Synthetic Demo'}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            ({readySourcesCount} Live)
          </span>
          <ChevronDown style={{ width: '12px', height: '12px', color: 'var(--text-muted)' }} />
        </button>

        {activeDropdown === 'DATA' && (
          <div className="sci-dropdown-menu align-left" style={{ width: '280px' }}>
            <div className="sci-dropdown-header">Scientific Data Pipeline</div>
            <div style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span>Operational Sources</span>
                <span className="mono-readout" style={{ color: 'var(--accent-teal)' }}>{readySourcesCount} Active</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span>Quality Gate</span>
                <span className="mono-readout" style={{ color: 'var(--accent-teal)' }}>NOMINAL</span>
              </div>
            </div>

            <div className="sci-dropdown-divider" />
            <div className="sci-dropdown-header">Data Source Mode</div>

            <button
              onClick={() => {
                setDataMode('REAL_SCIENTIFIC');
                setActiveDropdown(null);
              }}
              className={`sci-dropdown-item ${dataMode === 'REAL_SCIENTIFIC' ? 'active' : ''}`}
            >
              <span>Authentic INCOIS / Argo Feed</span>
              {dataMode === 'REAL_SCIENTIFIC' && <Check style={{ width: '13px', height: '13px' }} />}
            </button>

            <button
              onClick={() => {
                setDataMode('SYNTHETIC_DEMO');
                setActiveDropdown(null);
              }}
              className={`sci-dropdown-item ${dataMode === 'SYNTHETIC_DEMO' ? 'active' : ''}`}
            >
              <span>Synthetic Demonstration Feed</span>
              {dataMode === 'SYNTHETIC_DEMO' && <Check style={{ width: '13px', height: '13px' }} />}
            </button>

            <div className="sci-dropdown-divider" />
            <div className="sci-dropdown-header">Workstation Role</div>

            <button
              onClick={() => {
                setPresentationMode('OPERATIONAL');
                setActiveDropdown(null);
              }}
              className={`sci-dropdown-item ${presentationMode === 'OPERATIONAL' ? 'active' : ''}`}
            >
              <span>Operational Scientist</span>
              {presentationMode === 'OPERATIONAL' && <Check style={{ width: '13px', height: '13px' }} />}
            </button>

            <button
              onClick={() => {
                setPresentationMode('OUTREACH');
                setActiveDropdown(null);
              }}
              className={`sci-dropdown-item ${presentationMode === 'OUTREACH' ? 'active' : ''}`}
            >
              <span>Public Outreach & Briefing</span>
              {presentationMode === 'OUTREACH' && <Check style={{ width: '13px', height: '13px' }} />}
            </button>
          </div>
        )}
      </div>

      {/* Right Controls: Time, Layers, View, Labels, Color Scale, Basin Dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Temporal Dropdown: Time [ 11 Sep 2026 · 14:00 UTC ▾ ] */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => toggleDropdown('TIME')}
            className={`btn-sci ${activeDropdown === 'TIME' ? 'btn-sci-active' : ''}`}
            style={{ padding: '5px 11px', gap: '6px' }}
            title="Temporal Coordinates & Forecast Loop"
          >
            <Clock style={{ width: '13px', height: '13px', color: 'var(--accent-teal)' }} />
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {displayTimeStr}
            </span>
            <ChevronDown style={{ width: '12px', height: '12px', color: 'var(--text-muted)' }} />
          </button>

          {activeDropdown === 'TIME' && (
            <div className="sci-dropdown-menu" style={{ width: '270px' }}>
              <div className="sci-dropdown-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Forecast Coordinates</span>
                <button
                  onClick={() => setIsPlayingTimeline(!isPlayingTimeline)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: isPlayingTimeline ? 'var(--accent-teal-soft)' : 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '10px',
                    color: isPlayingTimeline ? 'var(--accent-teal)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {isPlayingTimeline ? <Pause style={{ width: '10px', height: '10px' }} /> : <Play style={{ width: '10px', height: '10px' }} />}
                  <span>{isPlayingTimeline ? 'Pause' : 'Loop'}</span>
                </button>
              </div>

              {supportedTimes.map((t) => {
                const isCurrent = scientificSelection?.timeValue === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => {
                      setScientificSelection((prev) => ({ ...prev, timeValue: t.value }));
                      setActiveDropdown(null);
                    }}
                    className={`sci-dropdown-item ${isCurrent ? 'active' : ''}`}
                    style={{ justifyContent: 'space-between' }}
                  >
                    <span style={{ fontSize: '11px' }}>{t.label}</span>
                    {isCurrent && <Check style={{ width: '13px', height: '13px', color: 'var(--accent-teal)' }} />}
                  </button>
                );
              })}

              <div className="sci-dropdown-divider" />
              <div className="sci-dropdown-header">Active Vertical Depth</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '6px 12px' }}>
                {depthLevels.map((d) => (
                  <button
                    key={d}
                    onClick={() => setActiveDepthMeters(d)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      border: '1px solid',
                      background: activeDepthMeters === d ? 'var(--accent-teal-soft)' : 'rgba(255,255,255,0.04)',
                      borderColor: activeDepthMeters === d ? 'var(--border-highlight)' : 'rgba(255,255,255,0.08)',
                      color: activeDepthMeters === d ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    -{d}m
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Layers Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => toggleDropdown('LAYERS')}
            className={`btn-sci ${activeDropdown === 'LAYERS' ? 'btn-sci-active' : ''}`}
            style={{ padding: '5px 10px', gap: '6px' }}
            title="Toggle Visualized Oceanographic Layers"
          >
            <LayersIcon style={{ width: '13px', height: '13px', color: 'var(--accent-teal)' }} />
            <span>Layers ({activeLayersCount})</span>
            <ChevronDown style={{ width: '12px', height: '12px', color: 'var(--text-muted)' }} />
          </button>

          {activeDropdown === 'LAYERS' && (
            <div className="sci-dropdown-menu" style={{ width: '250px' }}>
              <div className="sci-dropdown-header">Oceanographic Layers</div>

              {[
                { key: 'scalarField', label: 'Scalar Field Grid', icon: Compass },
                { key: 'currentVectors', label: 'Velocity Vectors', icon: Wind },
                { key: 'weatherMarkers', label: 'Temperature Markers', icon: Thermometer },
                { key: 'windDirections', label: 'Wind & Flow Directions', icon: Wind },
                { key: 'particleFlow', label: 'Silky Streamlines', icon: Sparkles },
                { key: 'argoFloats', label: 'Argo Floats', icon: Radio },
                { key: 'gliders', label: 'Autonomous Gliders', icon: Navigation },
                { key: 'ctdStations', label: 'CTD Stations', icon: MapPin },
              ].map((item) => {
                const Icon = item.icon;
                const isEnabled = Boolean(layers[item.key]);
                return (
                  <button
                    key={item.key}
                    onClick={() => toggleLayer(item.key)}
                    className="sci-dropdown-item"
                    style={{ justifyContent: 'space-between' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icon style={{ width: '13px', height: '13px', color: isEnabled ? 'var(--accent-teal)' : 'var(--text-muted)' }} />
                      <span style={{ color: isEnabled ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{item.label}</span>
                    </div>
                    {isEnabled ? (
                      <Eye style={{ width: '13px', height: '13px', color: 'var(--accent-teal)' }} />
                    ) : (
                      <EyeOff style={{ width: '13px', height: '13px', color: 'var(--text-muted)' }} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* View Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => toggleDropdown('VIEW')}
            className={`btn-sci ${activeDropdown === 'VIEW' ? 'btn-sci-active' : ''}`}
            style={{ padding: '5px 10px', gap: '6px' }}
            title="Camera Perspectives, Basemaps & Visualization Modes"
          >
            <Globe style={{ width: '13px', height: '13px', color: 'var(--text-secondary)' }} />
            <span>View</span>
            <ChevronDown style={{ width: '12px', height: '12px', color: 'var(--text-muted)' }} />
          </button>

          {activeDropdown === 'VIEW' && (
            <div className="sci-dropdown-menu" style={{ width: '220px' }}>
              <div className="sci-dropdown-header">Camera Perspective</div>
              {Object.entries(SCIENTIFIC_VIEW_MODES).map(([key, mode]) => (
                <button
                  key={key}
                  onClick={() => handleViewModeSelect(key)}
                  className="sci-dropdown-item"
                >
                  <span>{mode.name}</span>
                </button>
              ))}

              <div className="sci-dropdown-divider" />
              <div className="sci-dropdown-header">Rendering Modes</div>

              <button
                onClick={() => setIsXRayMode(!isXRayMode)}
                className={`sci-dropdown-item ${isXRayMode ? 'active' : ''}`}
              >
                <span>Bathymetry X-Ray Mode</span>
                {isXRayMode && <Check style={{ width: '13px', height: '13px' }} />}
              </button>
            </div>
          )}
        </div>

        {/* Labels Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => toggleDropdown('LABELS')}
            className={`btn-sci ${activeDropdown === 'LABELS' ? 'btn-sci-active' : ''}`}
            style={{ padding: '5px 10px', gap: '6px' }}
            title="Cartographic & Scientific Label Density"
          >
            <Tag style={{ width: '13px', height: '13px', color: 'var(--accent-amber)' }} />
            <span>Labels</span>
            <ChevronDown style={{ width: '12px', height: '12px', color: 'var(--text-muted)' }} />
          </button>

          {activeDropdown === 'LABELS' && (
            <div className="sci-dropdown-menu" style={{ width: '240px' }}>
              <div className="sci-dropdown-header">Map Annotation Density</div>

              {[
                { key: 'majorCities', label: 'Major Cities (Mumbai, etc.)' },
                { key: 'secondaryCities', label: 'Secondary Coastal Cities' },
                { key: 'countryBorders', label: 'Country Borders' },
                { key: 'coordinates', label: 'Coordinates Graticule' },
                { key: 'flowDirection', label: 'Flow Direction' },
                { key: 'stations', label: 'Measurement Stations' },
              ].map((opt) => {
                const isChecked = Boolean(labelSettings?.[opt.key]);
                return (
                  <button
                    key={opt.key}
                    onClick={() => {
                      if (opt.key === 'flowDirection') {
                        toggleLabelSetting('flowDirection');
                        toggleLayer('windDirections');
                      } else if (opt.key === 'stations') {
                        toggleLabelSetting('stations');
                        toggleLayer('argoFloats');
                      } else {
                        toggleLabelSetting(opt.key);
                      }
                    }}
                    className="sci-dropdown-item"
                    style={{ justifyContent: 'space-between' }}
                  >
                    <span style={{ fontSize: '11px', color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {opt.label}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '14px',
                        height: '14px',
                        borderRadius: '3px',
                        border: '1px solid',
                        borderColor: isChecked ? 'var(--accent-teal)' : 'var(--border-subtle)',
                        background: isChecked ? 'var(--accent-teal-soft)' : 'transparent',
                      }}
                    >
                      {isChecked && <Check style={{ width: '11px', height: '11px', color: 'var(--accent-teal)' }} />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Color Scale Button */}
        <button
          onClick={() => setColorbarModalOpen(true)}
          className="btn-sci"
          style={{ padding: '5px 10px', gap: '6px' }}
          title="Customize Colormap, Min/Max Range, and Opacity"
        >
          <Sliders style={{ width: '13px', height: '13px', color: 'var(--accent-teal)' }} />
          <span>Color Scale</span>
        </button>

        {/* Basin Selector Dropdown (Replaces horizontal row) */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => toggleDropdown('BASIN')}
            className={`btn-sci ${activeDropdown === 'BASIN' ? 'btn-sci-active' : ''}`}
            style={{
              padding: '5px 12px',
              gap: '6px',
              background: 'rgba(23, 26, 25, 0.75)',
            }}
            title="Select Ocean Basin"
          >
            <Compass style={{ width: '13px', height: '13px', color: 'var(--accent-amber)' }} />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{activeRegionName}</span>
            <ChevronDown style={{ width: '12px', height: '12px', color: 'var(--text-muted)' }} />
          </button>

          {activeDropdown === 'BASIN' && (
            <div className="sci-dropdown-menu" style={{ width: '240px' }}>
              <div className="sci-dropdown-header">Indian Ocean Basins</div>
              {Object.entries(OCEAN_REGIONS).map(([regKey, reg]) => {
                const isActive = activeRegion === regKey;
                return (
                  <button
                    key={regKey}
                    onClick={() => handleRegionSelect(regKey)}
                    className={`sci-dropdown-item ${isActive ? 'active' : ''}`}
                  >
                    <span>{reg.name}</span>
                    {isActive && <Check style={{ width: '13px', height: '13px', color: 'var(--accent-teal)' }} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Help / Keyboard Shortcuts Modal */}
        {onToggleShortcuts && (
          <button
            onClick={onToggleShortcuts}
            className="btn-sci"
            style={{ padding: '5px 8px' }}
            title="Keyboard Shortcuts & Navigation Guide (?)"
          >
            <HelpCircle style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} />
          </button>
        )}
      </div>
    </header>
  );
}
