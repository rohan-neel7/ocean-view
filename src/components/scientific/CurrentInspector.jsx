import React from 'react';
import { Wind, Compass, ShieldCheck, Database, X } from 'lucide-react';
import { useOceanView } from '../../app/AppContext.jsx';
import { globalOceanGridStore } from '../../engine/index.js';
import { sampleVectorFieldBilinear } from '../../engine/ocean/currentMetrics.js';

export default function CurrentInspector({ isDocked = false, showHeader = true }) {
  const { probedCoordinate, setProbedCoordinate, activeDepthMeters } = useOceanView();

  if (!probedCoordinate) return null;

  // Query active vector grid from store
  const allGrids = globalOceanGridStore.getAll();
  const vectorGrid = allGrids.find((g) => g.kind === 'CANONICAL_GRID_VECTOR') || null;

  let probedVector = null;
  if (vectorGrid && probedCoordinate) {
    probedVector = sampleVectorFieldBilinear(
      vectorGrid,
      probedCoordinate.lat,
      probedCoordinate.lon,
      0
    );
  }

  const { lat, lon } = probedCoordinate;

  const containerStyle = isDocked
    ? { fontSize: '11px', fontFamily: 'var(--font-mono)' }
    : {
        padding: '14px',
        fontSize: '11px',
        fontFamily: 'var(--font-mono)',
        width: 'min(320px, calc(100vw - 32px))',
        position: 'absolute',
        top: '76px',
        right: '16px',
        zIndex: 40,
        maxHeight: 'calc(100vh - 160px)',
        overflowY: 'auto',
      };

  return (
    <div className={isDocked ? '' : 'glass-panel-elevated'} style={containerStyle}>
      {/* Header (optional if dock provides its own collapsible header) */}
      {showHeader && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', color: '#f8fafc' }}>
            <Wind style={{ width: '16px', height: '16px', color: '#38bdf8' }} />
            <span>CURRENT VECTOR PROBE</span>
          </div>
          <button
            onClick={() => setProbedCoordinate(null)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
            title="Close Probe"
          >
            <X style={{ width: '14px', height: '14px' }} />
          </button>
        </div>
      )}

      {/* Coordinate & Depth Readouts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px', background: 'rgba(15,23,42,0.6)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)', fontSize: '11px' }}>
        <div>
          <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>COORDINATE</span>
          <span style={{ color: '#e2e8f0' }}>
            {lat > 0 ? `${lat}°N` : `${Math.abs(lat)}°S`}, {lon > 0 ? `${lon}°E` : `${Math.abs(lon)}°W`}
          </span>
        </div>
        <div>
          <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>DEPTH LEVEL</span>
          <span style={{ color: '#38bdf8', fontWeight: '600' }}>{activeDepthMeters}m</span>
        </div>
      </div>

      {/* Probed Velocity Components */}
      {probedVector && probedVector.speed !== null ? (
        <div style={{ marginBottom: '10px', background: 'rgba(8,47,73,0.4)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(14,116,144,0.4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div>
              <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>EASTWARD (U)</span>
              <span style={{ color: '#f8fafc', fontWeight: 'bold' }}>{probedVector.u > 0 ? `+${probedVector.u}` : probedVector.u} m/s</span>
            </div>
            <div>
              <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>NORTHWARD (V)</span>
              <span style={{ color: '#f8fafc', fontWeight: 'bold' }}>{probedVector.v > 0 ? `+${probedVector.v}` : probedVector.v} m/s</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', borderTop: '1px solid rgba(14,116,144,0.3)', paddingTop: '6px' }}>
            <div>
              <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>CURRENT SPEED</span>
              <span style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '14px' }}>{probedVector.speed} m/s</span>
            </div>
            <div>
              <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>FLOW BEARING</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#38bdf8', fontWeight: 'bold', fontSize: '14px' }}>
                <Compass style={{ width: '14px', height: '14px' }} />
                <span>{probedVector.headingDeg}°</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: '10px', background: 'rgba(15,23,42,0.4)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)', color: '#94a3b8' }}>
          <span>No current velocity data at this coordinate (land / unmeasured)</span>
        </div>
      )}

      {/* Provenance Footer */}
      {vectorGrid && (
        <div style={{ paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px', color: '#64748b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck style={{ width: '12px', height: '12px', color: '#38bdf8' }} />
              <span>SOURCE: {vectorGrid.source}</span>
            </span>
            <span style={{ color: '#38bdf8', fontWeight: '600' }}>{vectorGrid.temporalState}</span>
          </div>
        </div>
      )}
    </div>
  );
}
