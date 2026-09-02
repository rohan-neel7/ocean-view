/**
 * OceanView — Right Scientific Inspector Dock
 * Consolidates floating right-side inspectors (CurrentInspector, ProfileInspector,
 * Nearby Observations, Analysis Point Telemetry) into a single viewport-clamped,
 * non-overlapping dock with collapsible sections and zero data loss.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Wind,
  Compass,
  Activity,
  Crosshair,
  BarChart2,
  Database,
  ChevronDown,
  ChevronRight,
  X,
  Navigation,
  Anchor,
  Dna,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { useOceanView } from '../../app/AppContext.jsx';
import { globalOceanGridStore } from '../../engine/index.js';
import { sampleVectorFieldBilinear } from '../../engine/ocean/currentMetrics.js';
import { globalCameraController } from '../../engine/rendering/CentralizedCameraController.js';
import CurrentInspector from './CurrentInspector.jsx';
import ProfileInspector from './ProfileInspector.jsx';

export default function InspectorDock() {
  const {
    probedCoordinate,
    setProbedCoordinate,
    selectedProfile,
    setSelectedProfile,
    analysisLocation,
    clearAnalysis,
    setAnalysisLocation,
    sampleModelValues,
    getNearbyObservations,
    analysisHistory,
    activeDepthMeters,
    presentationMode,
  } = useOceanView();

  // Local state for tracking manual expand/collapse of each section
  const [expandedSections, setExpandedSections] = useState({
    probe: true,
    profile: true,
    nearby: false,
    analysis: false,
  });

  // Track previous triggers to auto-expand the most recently activated section
  const prevProbeRef = useRef(null);
  const prevProfileRef = useRef(null);
  const prevAnalysisRef = useRef(null);

  // Compute probed vector data for header summary
  const probedVector = useMemo(() => {
    if (!probedCoordinate) return null;
    const allGrids = globalOceanGridStore.getAll();
    const vectorGrid = allGrids.find((g) => g.kind === 'CANONICAL_GRID_VECTOR') || null;
    if (!vectorGrid) return null;
    return sampleVectorFieldBilinear(vectorGrid, probedCoordinate.lat, probedCoordinate.lon, 0);
  }, [probedCoordinate]);

  // Compute nearby observations for header summary
  const nearby = useMemo(() => {
    if (!analysisLocation) return { nearbyProfiles: [], nearest: null, counts: { argo: 0, glider: 0, ctd: 0, bgc: 0, total: 0 } };
    return getNearbyObservations(500);
  }, [analysisLocation, getNearbyObservations]);

  // Determine active sections
  const hasProbe = Boolean(probedCoordinate);
  const hasProfile = Boolean(selectedProfile);
  const hasNearby = Boolean(analysisLocation && nearby && nearby.counts.total > 0);
  const hasAnalysis = Boolean(analysisLocation);

  const activeCount = [hasProbe, hasProfile, hasNearby, hasAnalysis].filter(Boolean).length;

  // Auto-collapse logic when multiple sections have data
  useEffect(() => {
    const probeChanged = probedCoordinate !== prevProbeRef.current;
    const profileChanged = selectedProfile !== prevProfileRef.current;
    const analysisChanged = analysisLocation !== prevAnalysisRef.current;

    prevProbeRef.current = probedCoordinate;
    prevProfileRef.current = selectedProfile;
    prevAnalysisRef.current = analysisLocation;

    if (activeCount === 0) return;

    if (activeCount === 1) {
      // Only one section active: expand it
      setExpandedSections({
        probe: hasProbe,
        profile: hasProfile,
        nearby: hasNearby,
        analysis: hasAnalysis,
      });
    } else {
      // Multiple active sections collision case:
      // Expand the most recently triggered section, collapse the others by default
      if (profileChanged && hasProfile) {
        setExpandedSections((prev) => ({ ...prev, profile: true, probe: false, nearby: false, analysis: false }));
      } else if (probeChanged && hasProbe) {
        setExpandedSections((prev) => ({ ...prev, probe: true, profile: false, nearby: false, analysis: false }));
      } else if (analysisChanged && hasAnalysis) {
        setExpandedSections((prev) => ({ ...prev, analysis: true, nearby: hasNearby, probe: false, profile: false }));
      }
    }
  }, [probedCoordinate, selectedProfile, analysisLocation, activeCount, hasProbe, hasProfile, hasNearby, hasAnalysis]);

  if (activeCount === 0) return null;

  const toggleSection = (id) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
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

  // 1-line summaries
  const probeSummary = probedVector && probedVector.speed !== null
    ? `Current: ${probedVector.speed.toFixed(2)} m/s @ ${Math.round(probedVector.headingDeg)}°`
    : probedCoordinate
      ? `Coord: ${probedCoordinate.lat.toFixed(2)}°N, ${probedCoordinate.lon.toFixed(2)}°E (${activeDepthMeters}m)`
      : '';

  const profileSummary = selectedProfile
    ? `${selectedProfile.platformId} (${selectedProfile.platformType}) • ${selectedProfile.depths?.length || 0} lvls`
    : '';

  const nearbySummary = nearby
    ? `Nearby Observations (${nearby.counts.total})${nearby.nearest ? ` • ${nearby.nearest.distanceKm} km` : ''}`
    : '';

  const analysisSummary = analysisLocation
    ? `Analysis: ${analysisLocation.formatted} (${analysisLocation.status})`
    : '';

  return (
    <div className="oceanview-inspector-dock">
      {/* SECTION 1: COORDINATE PROBE & CURRENT VECTOR */}
      {hasProbe && (
        <div className="dock-section">
          <div className="dock-section-header" onClick={() => toggleSection('probe')}>
            <div className="dock-section-title-group">
              <div className="dock-section-title">
                <Wind style={{ width: '14px', height: '14px', color: '#38bdf8', flexShrink: 0 }} />
                <span>CURRENT VECTOR PROBE</span>
              </div>
              {!expandedSections.probe && probeSummary && (
                <div className="dock-section-summary">{probeSummary}</div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setProbedCoordinate(null);
                }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                title="Close Probe"
              >
                <X style={{ width: '13px', height: '13px' }} />
              </button>
              {expandedSections.probe ? (
                <ChevronDown style={{ width: '14px', height: '14px', color: '#94a3b8' }} />
              ) : (
                <ChevronRight style={{ width: '14px', height: '14px', color: '#94a3b8' }} />
              )}
            </div>
          </div>

          {expandedSections.probe && (
            <div className="dock-section-body">
              <CurrentInspector isDocked={true} showHeader={false} />
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: IN-SITU PROFILE CAST & INTERCOMPARISON */}
      {hasProfile && (
        <div className="dock-section">
          <div className="dock-section-header" onClick={() => toggleSection('profile')}>
            <div className="dock-section-title-group">
              <div className="dock-section-title">
                {getPlatformIcon(selectedProfile.platformType)}
                <span>{selectedProfile.platformId}</span>
              </div>
              {!expandedSections.profile && profileSummary && (
                <div className="dock-section-summary">{profileSummary}</div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedProfile(null);
                }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                title="Close Profile"
              >
                <X style={{ width: '13px', height: '13px' }} />
              </button>
              {expandedSections.profile ? (
                <ChevronDown style={{ width: '14px', height: '14px', color: '#94a3b8' }} />
              ) : (
                <ChevronRight style={{ width: '14px', height: '14px', color: '#94a3b8' }} />
              )}
            </div>
          </div>

          {expandedSections.profile && (
            <div className="dock-section-body" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
              <ProfileInspector isDocked={true} showHeader={false} />
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: NEARBY OBSERVATIONS DISCOVERY */}
      {hasNearby && (
        <div className="dock-section">
          <div className="dock-section-header" onClick={() => toggleSection('nearby')}>
            <div className="dock-section-title-group">
              <div className="dock-section-title">
                <Activity style={{ width: '14px', height: '14px', color: '#38bdf8', flexShrink: 0 }} />
                <span>NEARBY OBSERVATIONS ({nearby.counts.total})</span>
              </div>
              {!expandedSections.nearby && nearbySummary && (
                <div className="dock-section-summary">{nearbySummary}</div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {expandedSections.nearby ? (
                <ChevronDown style={{ width: '14px', height: '14px', color: '#94a3b8' }} />
              ) : (
                <ChevronRight style={{ width: '14px', height: '14px', color: '#94a3b8' }} />
              )}
            </div>
          </div>

          {expandedSections.nearby && (
            <div className="dock-section-body">
              <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                <span className="badge-sci" style={{ fontSize: '9px', padding: '1px 6px' }}>Argo: {nearby.counts.argo}</span>
                <span className="badge-sci" style={{ fontSize: '9px', padding: '1px 6px' }}>Glider: {nearby.counts.glider}</span>
                <span className="badge-sci" style={{ fontSize: '9px', padding: '1px 6px' }}>CTD: {nearby.counts.ctd}</span>
                {nearby.counts.bgc > 0 && (
                  <span className="badge-sci" style={{ fontSize: '9px', padding: '1px 6px' }}>BGC: {nearby.counts.bgc}</span>
                )}
              </div>

              {nearby.nearest && (
                <div
                  style={{
                    padding: '8px 10px',
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

                  <button
                    onClick={() => {
                      setSelectedProfile(nearby.nearest.profile);
                      if (nearby.nearest.profile.location) {
                        globalCameraController.focusProfile(nearby.nearest.profile);
                      }
                    }}
                    className="btn-sci btn-sci-active"
                    style={{ width: '100%', marginTop: '6px', padding: '4px 8px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  >
                    <span>Compare with Nearest Observation</span>
                    <ChevronRight style={{ width: '11px', height: '11px' }} />
                  </button>
                </div>
              )}

              {nearby.nearbyProfiles.length > 1 && (
                <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                  {nearby.nearbyProfiles.slice(1).map((item) => (
                    <div
                      key={item.profile.id}
                      onClick={() => {
                        setSelectedProfile(item.profile);
                        if (item.profile.location) {
                          globalCameraController.focusProfile(item.profile);
                        }
                      }}
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
      )}

      {/* SECTION 4: ANALYSIS POINT TELEMETRY & HISTORY */}
      {hasAnalysis && (
        <div className="dock-section">
          <div className="dock-section-header" onClick={() => toggleSection('analysis')}>
            <div className="dock-section-title-group">
              <div className="dock-section-title">
                <Crosshair style={{ width: '14px', height: '14px', color: '#38bdf8', flexShrink: 0 }} />
                <span>ANALYSIS POINT</span>
              </div>
              {!expandedSections.analysis && analysisSummary && (
                <div className="dock-section-summary">{analysisSummary}</div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearAnalysis();
                }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                title="Clear Analysis"
              >
                <X style={{ width: '13px', height: '13px' }} />
              </button>
              {expandedSections.analysis ? (
                <ChevronDown style={{ width: '14px', height: '14px', color: '#94a3b8' }} />
              ) : (
                <ChevronRight style={{ width: '14px', height: '14px', color: '#94a3b8' }} />
              )}
            </div>
          </div>

          {expandedSections.analysis && (
            <div className="dock-section-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ color: '#38bdf8', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                  {analysisLocation.formatted}
                </span>
                <span style={{ fontSize: '9px', color: '#94a3b8' }}>{analysisLocation.source}</span>
              </div>

              {/* Point Telemetry Grid */}
              {(() => {
                const sampled = sampleModelValues();
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                      <span style={{ color: '#94a3b8', fontSize: '10px' }}>TEMPERATURE</span>
                      <span style={{ color: '#f8fafc', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {sampled?.temperature ? `${sampled.temperature.value.toFixed(2)} ${sampled.temperature.unit}` : '—'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                      <span style={{ color: '#94a3b8', fontSize: '10px' }}>SALINITY</span>
                      <span style={{ color: '#f8fafc', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {sampled?.salinity ? `${sampled.salinity.value.toFixed(2)} ${sampled.salinity.unit}` : '—'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                      <span style={{ color: '#94a3b8', fontSize: '10px' }}>CURRENT</span>
                      <span style={{ color: '#38bdf8', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {sampled?.current ? `${sampled.current.speed.toFixed(2)} m/s @ ${Math.round(sampled.current.headingDeg)}°` : '—'}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Focus & Clear Action Buttons */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                <button
                  onClick={() => {
                    globalCameraController.spiralIn(
                      { lat: analysisLocation.latitude, lon: analysisLocation.longitude },
                      800000
                    );
                  }}
                  className="btn-sci"
                  style={{ flex: 1, padding: '4px 6px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                  <Crosshair style={{ width: '11px', height: '11px', color: '#38bdf8' }} />
                  <span>Focus Point</span>
                </button>
                <button
                  onClick={clearAnalysis}
                  className="btn-sci"
                  style={{ padding: '4px 6px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <RotateCcw style={{ width: '11px', height: '11px' }} />
                  <span>Clear</span>
                </button>
              </div>

              {/* Recent History Chips */}
              {analysisHistory.length > 1 && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px' }}>
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
                          padding: '1px 5px',
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
          )}
        </div>
      )}
    </div>
  );
}
