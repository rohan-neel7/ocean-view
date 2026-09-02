/**
 * OceanView — Spatial Scientific Investigation Workspace
 * Displays bounded scientific context, direct bilinear model sampling (Temperature, Salinity, Current),
 * in-situ observation discovery with geodesic radius filtering, and 1-click model-observation comparison.
 */

import React, { useState } from 'react';
import {
  Crosshair,
  Compass,
  Activity,
  Layers,
  MapPin,
  X,
  ChevronRight,
  RotateCcw,
  Navigation,
  Anchor,
  Dna,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useOceanView } from '../../app/AppContext.jsx';
import { globalCameraController } from '../../engine/rendering/CentralizedCameraController.js';

export default function SpatialInvestigationPanel({ isDocked = false, showHeader = true }) {
  const {
    analysisLocation,
    clearAnalysis,
    setAnalysisLocation,
    sampleModelValues,
    getNearbyObservations,
    setSelectedProfile,
    analysisHistory,
    activeDepthMeters,
  } = useOceanView();

  const [expandedObservations, setExpandedObservations] = useState(false);

  if (!analysisLocation) return null;

  const sampled = sampleModelValues();
  const nearby = getNearbyObservations(500);

  const handleFocusAnalysisPoint = () => {
    globalCameraController.spiralIn(
      { lat: analysisLocation.latitude, lon: analysisLocation.longitude },
      800000
    );
  };

  const handleSelectObservation = (profile) => {
    setSelectedProfile(profile);
    if (profile.location) {
      globalCameraController.focusProfile(profile);
    }
  };

  const getPlatformIcon = (type) => {
    switch (type) {
      case 'GLIDER':
        return <Navigation style={{ width: '12px', height: '12px', color: '#10b981' }} />;
      case 'CTD_CAST':
      case 'CTD_STATION':
        return <Anchor style={{ width: '12px', height: '12px', color: '#f59e0b' }} />;
      case 'BGC_ARGO':
      case 'BGC_ARGO_FLOAT':
        return <Dna style={{ width: '12px', height: '12px', color: '#ec4899' }} />;
      default:
        return <Compass style={{ width: '12px', height: '12px', color: '#38bdf8' }} />;
    }
  };

  const getStatusBadge = () => {
    switch (analysisLocation.status) {
      case 'ANALYZING':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#38bdf8', fontSize: '10px' }}>
            <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            ANALYZING...
          </span>
        );
      case 'PARTIAL':
        return <span style={{ color: '#f59e0b', fontSize: '10px', fontWeight: 600 }}>PARTIAL DATA</span>;
      case 'UNAVAILABLE':
        return <span style={{ color: '#94a3b8', fontSize: '10px' }}>UNAVAILABLE</span>;
      default:
        return <span style={{ color: '#10b981', fontSize: '10px', fontWeight: 600 }}>READY</span>;
    }
  };

  const containerStyle = isDocked
    ? {
        display: 'flex',
        flexDirection: 'column',
      }
    : {
        position: 'absolute',
        top: '76px',
        left: '304px',
        width: 'min(340px, calc(100vw - 320px))',
        maxHeight: 'calc(100vh - 160px)',
        zIndex: 35,
        display: 'flex',
        flexDirection: 'column',
        padding: '14px',
        borderRadius: '8px',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
        overflowY: 'auto',
      };

  return (
    <div
      className={isDocked ? '' : 'oceanview-investigation glass-panel-elevated'}
      style={containerStyle}
    >
      {/* Header */}
      {showHeader && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            paddingBottom: '10px',
            marginBottom: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                padding: '6px',
                borderRadius: '6px',
                background: 'rgba(6,182,212,0.15)',
                border: '1px solid rgba(6,182,212,0.4)',
                color: '#38bdf8',
              }}
            >
              <Crosshair style={{ width: '16px', height: '16px' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', margin: 0, letterSpacing: '0.04em' }}>
                  SPATIAL INVESTIGATION
                </h3>
                <span
                  style={{
                    fontSize: '9px',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#94a3b8',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {analysisLocation.source}
                </span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#38bdf8', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                {analysisLocation.formatted}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {getStatusBadge()}
            <button
              onClick={clearAnalysis}
              className="btn-sci"
              style={{ padding: '4px 6px', color: '#94a3b8' }}
              title="Clear Analysis Location"
            >
              <X style={{ width: '13px', height: '13px' }} />
            </button>
          </div>
        </div>
      )}

      {/* Extent & Depth Metadata */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(15,23,42,0.6)',
          padding: '6px 10px',
          borderRadius: '4px',
          fontSize: '10px',
          fontFamily: 'var(--font-mono)',
          color: '#cbd5e1',
          marginBottom: '10px',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <span>
          BBox: {analysisLocation.bounds.minLat}°–{analysisLocation.bounds.maxLat}°N, {analysisLocation.bounds.minLon}°–{analysisLocation.bounds.maxLon}°E
        </span>
        <span style={{ color: '#38bdf8' }}>Depth: {activeDepthMeters}m</span>
      </div>

      {/* Point Telemetry Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
        {/* Temperature */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '7px 10px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Sea Water Temperature
            </div>
            <div style={{ fontSize: '9px', color: '#64748b' }}>
              {sampled?.temperature ? `${sampled.temperature.source} • ${sampled.temperature.dataState}` : 'No grid coverage'}
            </div>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#f8fafc' }}>
            {sampled?.temperature ? `${sampled.temperature.value.toFixed(2)} ${sampled.temperature.unit}` : '—'}
          </div>
        </div>

        {/* Salinity */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '7px 10px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Practical Salinity
            </div>
            <div style={{ fontSize: '9px', color: '#64748b' }}>
              {sampled?.salinity ? `${sampled.salinity.source} • ${sampled.salinity.dataState}` : 'No grid coverage'}
            </div>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#f8fafc' }}>
            {sampled?.salinity ? `${sampled.salinity.value.toFixed(2)} ${sampled.salinity.unit}` : '—'}
          </div>
        </div>

        {/* Current Velocity */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '7px 10px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Ocean Current Velocity
            </div>
            <div style={{ fontSize: '9px', color: '#64748b' }}>
              {sampled?.current ? `${sampled.current.source} • ${sampled.current.dataState} (u: ${sampled.current.u.toFixed(2)}, v: ${sampled.current.v.toFixed(2)})` : 'No vector coverage'}
            </div>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
            {sampled?.current ? `${sampled.current.speed.toFixed(2)} m/s @ ${Math.round(sampled.current.headingDeg)}°` : '—'}
          </div>
        </div>
      </div>

      {/* In-Situ Observation Discovery */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity style={{ width: '13px', height: '13px', color: '#38bdf8' }} />
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#f8fafc', textTransform: 'uppercase' }}>
              Nearby Observations ({nearby.counts.total})
            </span>
          </div>
          <span style={{ fontSize: '9px', color: '#94a3b8' }}>&le; 500 km radius</span>
        </div>

        {/* Breakdown Badges */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
          <span className="badge-sci" style={{ fontSize: '9px', padding: '1px 6px' }}>
            Argo: {nearby.counts.argo}
          </span>
          <span className="badge-sci" style={{ fontSize: '9px', padding: '1px 6px' }}>
            Glider: {nearby.counts.glider}
          </span>
          <span className="badge-sci" style={{ fontSize: '9px', padding: '1px 6px' }}>
            CTD: {nearby.counts.ctd}
          </span>
          {nearby.counts.bgc > 0 && (
            <span className="badge-sci" style={{ fontSize: '9px', padding: '1px 6px' }}>
              BGC: {nearby.counts.bgc}
            </span>
          )}
        </div>

        {/* Nearest Observation Card */}
        {nearby.nearest ? (
          <div
            style={{
              padding: '9px 10px',
              borderRadius: '6px',
              background: 'rgba(6,182,212,0.08)',
              border: '1px solid rgba(6,182,212,0.25)',
              marginBottom: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {getPlatformIcon(nearby.nearest.profile.platformType)}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc' }}>
                    {nearby.nearest.profile.platformId}
                  </div>
                  <div style={{ fontSize: '9px', color: '#94a3b8' }}>
                    {nearby.nearest.profile.platformType} • {nearby.nearest.profile.depths?.length || 0} levels
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                  {nearby.nearest.distanceKm} km
                </span>
                <div style={{ fontSize: '9px', color: '#64748b' }}>away</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              <button
                onClick={() => handleSelectObservation(nearby.nearest.profile)}
                className="btn-sci btn-sci-active"
                style={{ flex: 1, padding: '4px 8px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
              >
                <span>Compare with Nearest Observation</span>
                <ChevronRight style={{ width: '11px', height: '11px' }} />
              </button>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic', padding: '4px 0' }}>
            No in-situ observations within 500 km.
          </div>
        )}

        {/* Toggle additional observations list */}
        {nearby.nearbyProfiles.length > 1 && (
          <div>
            <button
              onClick={() => setExpandedObservations((prev) => !prev)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#38bdf8',
                fontSize: '10px',
                cursor: 'pointer',
                padding: '2px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>{expandedObservations ? 'Hide other observations' : `View ${nearby.nearbyProfiles.length - 1} other observations`}</span>
            </button>

            {expandedObservations && (
              <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                {nearby.nearbyProfiles.slice(1).map((item) => (
                  <div
                    key={item.profile.id}
                    onClick={() => handleSelectObservation(item.profile)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 8px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '10px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(56,189,248,0.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {getPlatformIcon(item.profile.platformType)}
                      <span style={{ color: '#e2e8f0' }}>{item.profile.platformId}</span>
                    </span>
                    <span style={{ color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>{item.distanceKm} km</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action Controls */}
      <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
        <button
          onClick={handleFocusAnalysisPoint}
          className="btn-sci"
          style={{ flex: 1, padding: '5px 8px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
        >
          <Crosshair style={{ width: '11px', height: '11px', color: '#38bdf8' }} />
          <span>Focus Analysis Point</span>
        </button>
        <button
          onClick={clearAnalysis}
          className="btn-sci"
          style={{ padding: '5px 8px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <RotateCcw style={{ width: '11px', height: '11px' }} />
          <span>Clear</span>
        </button>
      </div>

      {/* Recent History Chips */}
      {analysisHistory.length > 1 && (
        <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
            Recent Analysis Points
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {analysisHistory.map((item) => (
              <button
                key={item.formatted}
                onClick={() => setAnalysisLocation({ latitude: item.latitude, longitude: item.longitude, source: 'HISTORY' })}
                style={{
                  background: item.formatted === analysisLocation.formatted ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.05)',
                  border: item.formatted === analysisLocation.formatted ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '3px',
                  padding: '2px 6px',
                  fontSize: '9px',
                  color: item.formatted === analysisLocation.formatted ? '#38bdf8' : '#cbd5e1',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                }}
              >
                {item.formatted}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
