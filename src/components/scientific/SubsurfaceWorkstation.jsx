import React, { useState, useMemo } from 'react';
import { Layers, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { useOceanView } from '../../app/AppContext.jsx';
import { globalOceanGridStore } from '../../engine/index.js';
import { extractVerticalSection } from '../../engine/ocean/VerticalSectionEngine.js';
import { alignAndCompareProfile } from '../../engine/comparison/ProfileAlignmentEngine.js';
import { calculateMixedLayerDepth, calculateSigmaT } from '../../engine/ocean/subsurfacePhysics.js';

export const SCIENTIFIC_TRANSECTS = [
  {
    id: 'arabian_sea_basin',
    name: 'Arabian Sea Basin Transect',
    start: { lat: 10.0, lon: 62.0 },
    end: { lat: 18.0, lon: 72.0 },
    description: 'SW-to-NE section across central Arabian Sea',
  },
  {
    id: 'equatorial_jet',
    name: 'Equatorial Indian Ocean Section',
    start: { lat: 5.0, lon: 60.0 },
    end: { lat: 5.0, lon: 80.0 },
    description: 'Zonal section through Equatorial circulation',
  },
];

export default function SubsurfaceWorkstation({ isDocked = false, showHeader = true }) {
  const {
    subsurfaceMode,
    setSubsurfaceMode,
    selectedProfile,
    verticalExaggeration,
    setVerticalExaggeration,
    activeIsovalue,
    setActiveIsovalue,
    selectedTransectId,
    setSelectedTransectId,
  } = useOceanView();

  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState('TRANSECT'); // 'TRANSECT' | 'COMPARISON' | 'PHYSICS'
  const [hoveredCell, setHoveredCell] = useState(null);

  // Retrieve active scalar model grid
  const allGrids = globalOceanGridStore.getAll();
  const scalarGrid = allGrids.find((g) => g.kind === 'CANONICAL_GRID_SCALAR') || null;

  // Selected Transect Definition
  const currentTransect = useMemo(() => {
    return SCIENTIFIC_TRANSECTS.find((t) => t.id === selectedTransectId) || SCIENTIFIC_TRANSECTS[0];
  }, [selectedTransectId]);

  // Extract Vertical 2D Section
  const verticalSection = useMemo(() => {
    if (!scalarGrid || !currentTransect) return null;
    try {
      return extractVerticalSection(scalarGrid, currentTransect, { stationCount: 30 });
    } catch (_err) {
      return null;
    }
  }, [scalarGrid, currentTransect]);

  // Compute Model vs Obs Comparison
  const comparisonReport = useMemo(() => {
    if (!selectedProfile || !scalarGrid) return null;
    try {
      return alignAndCompareProfile(selectedProfile, scalarGrid, 'temperature', {
        maxTemporalMismatchDays: 45,
      });
    } catch (_err) {
      return null;
    }
  }, [selectedProfile, scalarGrid]);

  // Compute Derived Physics on Selected Profile
  const profilePhysics = useMemo(() => {
    if (!selectedProfile || !selectedProfile.depths || !selectedProfile.variables.temperature) return null;
    const depths = selectedProfile.depths;
    const temps = selectedProfile.variables.temperature;
    const sal = selectedProfile.variables.salinity?.[0] ?? 35.5;

    const mld = calculateMixedLayerDepth(depths, temps);
    const surfaceDensity = calculateSigmaT(sal, temps[0]);

    return { mld, surfaceDensity };
  }, [selectedProfile]);

  const containerStyle = isDocked
    ? {
        display: 'flex',
        flexDirection: 'column',
      }
    : {
        position: 'absolute',
        bottom: '84px',
        left: '16px',
        width: 'min(340px, calc(100vw - 32px))',
        maxHeight: 'calc(100vh - 160px)',
        display: 'flex',
        flexDirection: 'column',
        padding: '12px',
        zIndex: 40,
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        overflowY: 'auto',
      };

  return (
    <div className={isDocked ? '' : 'oceanview-subsurface-panel glass-panel-elevated'} style={containerStyle}>
      {/* Header */}
      {showHeader && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', color: '#f8fafc' }}>
            <Layers style={{ width: '16px', height: '16px', color: '#38bdf8' }} />
            <span>SUBSURFACE 3D WORKSTATION</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {!isMinimized && ['TRANSECT', 'COMPARISON', 'PHYSICS'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  border: activeTab === tab ? '1px solid rgba(56,189,248,0.5)' : '1px solid transparent',
                  background: activeTab === tab ? 'rgba(56,189,248,0.2)' : 'rgba(15,23,42,0.6)',
                  color: activeTab === tab ? '#38bdf8' : '#94a3b8',
                }}
              >
                {tab}
              </button>
            ))}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
              title={isMinimized ? 'Expand' : 'Minimize'}
            >
              {isMinimized ? <ChevronUp style={{ width: '16px', height: '16px' }} /> : <ChevronDown style={{ width: '16px', height: '16px' }} />}
            </button>
          </div>
        </div>
      )}

      {!isMinimized && (
        <>
          {/* Mode & Exaggeration Controls */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div>
              <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>MODE</span>
              <select
                value={subsurfaceMode}
                onChange={(e) => setSubsurfaceMode(e.target.value)}
                style={{ width: '100%', background: '#090d16', border: '1px solid rgba(255,255,255,0.15)', color: '#f8fafc', borderRadius: '4px', padding: '3px 6px', fontSize: '11px' }}
              >
                <option value="HORIZONTAL_SLICE">2D Depth Slice</option>
                <option value="VERTICAL_TRANSECT">3D Vertical Curtain</option>
                <option value="ISOSURFACE_3D">3D Isotherm Surface</option>
              </select>
            </div>

            {subsurfaceMode === 'VERTICAL_TRANSECT' && (
              <div>
                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>
                  EXAGGERATION: <span style={{ color: '#38bdf8' }}>{verticalExaggeration}x</span>
                </span>
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="5"
                  value={verticalExaggeration}
                  onChange={(e) => setVerticalExaggeration(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#38bdf8', height: '4px', marginTop: '6px' }}
                />
              </div>
            )}

            {subsurfaceMode === 'ISOSURFACE_3D' && (
              <div>
                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>
                  ISOTHERM: <span style={{ color: '#fbbf24' }}>{activeIsovalue}°C</span>
                </span>
                <input
                  type="range"
                  min="12"
                  max="28"
                  step="1"
                  value={activeIsovalue}
                  onChange={(e) => setActiveIsovalue(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#fbbf24', height: '4px', marginTop: '6px' }}
                />
              </div>
            )}
          </div>

          {/* TAB 1: VERTICAL TRANSECT SECTION */}
          {activeTab === 'TRANSECT' && verticalSection && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div>
                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>SELECTED TRANSECT</span>
                <select
                  value={selectedTransectId}
                  onChange={(e) => setSelectedTransectId(e.target.value)}
                  style={{ width: '100%', background: '#090d16', border: '1px solid rgba(255,255,255,0.15)', color: '#f8fafc', borderRadius: '4px', padding: '3px 6px', fontSize: '11px' }}
                >
                  {SCIENTIFIC_TRANSECTS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2D Section Matrix Grid View */}
              <div style={{ background: '#030712', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>
                  <span>0 km ({currentTransect.start.lat}°N)</span>
                  <span>{verticalSection.totalDistanceKm} km ({currentTransect.end.lat}°N)</span>
                </div>

                <div style={{ height: '90px', width: '100%', background: 'rgba(15,23,42,0.8)', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', padding: '2px', gap: '1px' }}>
                  {verticalSection.stations.map((st, sIdx) => {
                    const sVals = verticalSection.matrix.map((row) => row[sIdx]);
                    const sAvg =
                      sVals.filter((v) => v !== null).reduce((a, b) => a + b, 0) /
                      Math.max(1, sVals.filter((v) => v !== null).length);

                    return (
                      <div
                        key={sIdx}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
                        onMouseEnter={() =>
                          setHoveredCell({
                            station: st,
                            avgVal: sAvg,
                            surfaceVal: verticalSection.matrix[0][sIdx],
                          })
                        }
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        {verticalSection.depths.slice(0, 10).map((_, dIdx) => {
                          const val = verticalSection.matrix[dIdx][sIdx];
                          const norm =
                            val !== null
                              ? Math.max(0, Math.min(1, (val - verticalSection.stats.min) / Math.max(0.01, verticalSection.stats.max - verticalSection.stats.min)))
                              : null;

                          return (
                            <div
                              key={dIdx}
                              style={{
                                flex: 1,
                                backgroundColor: norm !== null ? `hsl(${220 - norm * 220}, 85%, 50%)` : '#1e293b',
                              }}
                            />
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                  <span>Depth: 5m - 500m</span>
                  {hoveredCell ? (
                    <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>
                      {hoveredCell.station.distanceKm} km | SST: {hoveredCell.surfaceVal?.toFixed(1)}°C
                    </span>
                  ) : (
                    <span>Hover section for readings</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MODEL VS ARGO COMPARISON */}
          {activeTab === 'COMPARISON' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {comparisonReport ? (
                comparisonReport.status === 'ALIGNED' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', background: 'rgba(8,47,73,0.4)', padding: '6px', borderRadius: '4px', border: '1px solid rgba(14,116,144,0.4)', textAlign: 'center' }}>
                      <div>
                        <span style={{ fontSize: '9px', color: '#94a3b8', display: 'block' }}>MEAN BIAS</span>
                        <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>
                          {comparisonReport.metrics.meanBias > 0
                            ? `+${comparisonReport.metrics.meanBias}`
                            : comparisonReport.metrics.meanBias}°C
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '9px', color: '#94a3b8', display: 'block' }}>RMSE</span>
                        <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{comparisonReport.metrics.rmse}°C</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '9px', color: '#94a3b8', display: 'block' }}>PAIRS</span>
                        <span style={{ color: '#f8fafc', fontWeight: 'bold' }}>{comparisonReport.metrics.validPairs} lvls</span>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(15,23,42,0.6)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)', maxHeight: '110px', overflowY: 'auto' }}>
                      <table style={{ width: '100%', fontSize: '10px', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'rgba(30,41,59,0.8)', color: '#94a3b8' }}>
                            <th style={{ padding: '2px 4px' }}>Depth</th>
                            <th style={{ padding: '2px 4px' }}>Obs</th>
                            <th style={{ padding: '2px 4px' }}>Model</th>
                            <th style={{ padding: '2px 4px', textAlign: 'right' }}>Δ (Obs-Mod)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {comparisonReport.levels.slice(0, 8).map((lvl, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <td style={{ padding: '2px 4px', color: '#38bdf8' }}>{lvl.depthMeters}m</td>
                              <td style={{ padding: '2px 4px' }}>{lvl.observedValue?.toFixed(2)}°C</td>
                              <td style={{ padding: '2px 4px' }}>{lvl.modeledValue?.toFixed(2)}°C</td>
                              <td style={{ padding: '2px 4px', textAlign: 'right', fontWeight: 'bold', color: lvl.delta > 0 ? '#fb7185' : '#38bdf8' }}>
                                {lvl.delta !== null ? `${lvl.delta > 0 ? '+' : ''}${lvl.delta.toFixed(2)}°C` : 'null'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: 'rgba(69,26,3,0.5)', padding: '8px', borderRadius: '4px', border: '1px solid rgba(217,119,6,0.5)', color: '#fde68a' }}>
                    <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>TEMPORAL MISMATCH (UNRESOLVED)</span>
                    <p style={{ fontSize: '10px', color: '#cbd5e1' }}>{comparisonReport.mismatchReason}</p>
                  </div>
                )
              ) : (
                <div style={{ textAlign: 'center', padding: '16px 0', color: '#64748b' }}>
                  Select an Argo float on the globe to inspect depth comparison.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DERIVED SUBSURFACE PHYSICS */}
          {activeTab === 'PHYSICS' && profilePhysics && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ background: 'rgba(15,23,42,0.6)', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '9px', color: '#94a3b8', display: 'block' }}>MIXED LAYER DEPTH (MLD)</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#38bdf8' }}>{profilePhysics.mld.mldMeters} m</span>
                  <span style={{ fontSize: '9px', background: '#082f49', color: '#38bdf8', padding: '1px 4px', borderRadius: '3px' }}>DERIVED</span>
                </div>
                <span style={{ fontSize: '9px', color: '#64748b', display: 'block', marginTop: '2px' }}>{profilePhysics.mld.criterion}</span>
              </div>

              <div style={{ background: 'rgba(15,23,42,0.6)', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '9px', color: '#94a3b8', display: 'block' }}>SURFACE POTENTIAL DENSITY (σ_t)</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#fbbf24' }}>
                    {profilePhysics.surfaceDensity.sigmaT} {profilePhysics.surfaceDensity.unit}
                  </span>
                  <span style={{ fontSize: '9px', color: '#94a3b8' }}>ρ: {profilePhysics.surfaceDensity.densityKgM3} kg/m³</span>
                </div>
              </div>
            </div>
          )}

          {/* Footer Provenance */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '6px', marginTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck style={{ width: '12px', height: '12px', color: '#38bdf8' }} />
              <span>SDC 4D + CORIOLIS ARGO</span>
            </span>
            <span style={{ color: '#38bdf8' }}>36 LEVELS</span>
          </div>
        </>
      )}
    </div>
  );
}
