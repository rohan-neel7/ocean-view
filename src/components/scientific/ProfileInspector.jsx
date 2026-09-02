/**
 * OceanView — Multi-Platform Scientific Profile Inspector
 * Visualizes in-situ ocean profiles (Argo, Glider, CTD, BGC) and evaluates real-time alignment against 4D numerical model slices.
 * Adapts between Operational Scientist Mode (dense metrics, deltas, MAE/RMSE) and Outreach Mode (guided takeaways).
 */

import React, { useState } from 'react';
import { X, Radio, BarChart2, ShieldCheck, Database, Compass, Navigation, Anchor, Dna, Info } from 'lucide-react';
import { useOceanView } from '../../app/AppContext.jsx';
import { globalOceanGridStore, compareProfileAgainstModel } from '../../engine/index.js';

export default function ProfileInspector() {
  const { selectedProfile, setSelectedProfile, activeVariable, presentationMode } = useOceanView();
  const [selectedChannel, setSelectedChannel] = useState(null);

  if (!selectedProfile) return null;

  const { platformId, platformType, location, depths, variables, units, dataState, observedAt, quality, provenance } =
    selectedProfile;

  // Available variable channels in this cast
  const availableChannels = Object.keys(variables || {}).filter((k) => Array.isArray(variables[k]));
  const currentVar = selectedChannel || (availableChannels.includes(activeVariable) ? activeVariable : availableChannels[0] || 'temperature');

  // Retrieve active model grid slice for real comparison
  const allGrids = globalOceanGridStore.getAll();
  const currentGrid = allGrids.length > 0 ? allGrids[0] : null;

  let comparison = null;
  if (currentGrid && variables[currentVar] && (currentVar === 'temperature' || currentVar === 'salinity' || currentVar === 'sea_surface_temperature')) {
    try {
      comparison = compareProfileAgainstModel(selectedProfile, currentGrid, currentVar);
    } catch (_err) {
      // Coordinates outside model domain
    }
  }

  // Calculate Mean Absolute Error (MAE) and Mean Bias Error (MBE) if comparison exists
  let mae = null;
  let mbe = null;
  let rmse = null;
  if (comparison?.metrics?.validPairs > 0) {
    rmse = comparison.metrics.rmse;
    mbe = comparison.metrics.meanBias;
    const deltas = comparison.alignment.filter((a) => a.delta !== null).map((a) => Math.abs(a.delta));
    if (deltas.length > 0) {
      mae = deltas.reduce((sum, d) => sum + d, 0) / deltas.length;
    }
  }

  const getPlatformBadge = () => {
    switch (platformType) {
      case 'GLIDER':
        return { label: 'Autonomous Glider', icon: <Navigation style={{ width: '13px', height: '13px' }} />, color: '#10b981' };
      case 'CTD_STATION':
        return { label: 'Shipboard CTD Rosette', icon: <Anchor style={{ width: '13px', height: '13px' }} />, color: '#f59e0b' };
      case 'BGC_ARGO_FLOAT':
        return { label: 'BGC-Argo Profiler', icon: <Dna style={{ width: '13px', height: '13px' }} />, color: '#ec4899' };
      default:
        return { label: 'Core Argo Float', icon: <Compass style={{ width: '13px', height: '13px' }} />, color: '#38bdf8' };
    }
  };

  const badge = getPlatformBadge();

  return (
    <div
      className="oceanview-inspector glass-panel-elevated"
      style={{
        padding: '16px',
        top: '76px',
        right: '16px',
        width: '360px',
        maxHeight: 'calc(100vh - 180px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          paddingBottom: '10px',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ color: badge.color }}>{badge.icon}</div>
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#f8fafc', margin: 0 }}>{platformId}</h3>
            <span style={{ fontSize: '10px', color: badge.color, fontWeight: 600, textTransform: 'uppercase' }}>
              {badge.label}
            </span>
          </div>
        </div>
        <button
          onClick={() => setSelectedProfile(null)}
          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
          title="Close Inspector"
        >
          <X style={{ width: '16px', height: '16px' }} />
        </button>
      </div>

      {/* Metadata Readout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          marginBottom: '12px',
          background: 'rgba(15,23,42,0.6)',
          padding: '8px',
          borderRadius: '6px',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div>
          <span style={{ fontSize: '9px', color: '#94a3b8', display: 'block' }}>COORDINATES</span>
          <span style={{ color: '#e2e8f0' }}>
            {location.lat.toFixed(2)}°N, {location.lon.toFixed(2)}°E
          </span>
        </div>
        <div>
          <span style={{ fontSize: '9px', color: '#94a3b8', display: 'block' }}>DATA STATE</span>
          <span style={{ color: '#34d399', fontWeight: '600' }}>{dataState}</span>
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <span style={{ fontSize: '9px', color: '#94a3b8', display: 'block' }}>OBSERVED (UTC)</span>
          <span style={{ color: '#38bdf8', fontSize: '10px' }}>
            {observedAt ? new Date(observedAt).toUTCString() : '—'}
          </span>
        </div>
      </div>

      {/* Channel Switcher */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', overflowX: 'auto', paddingBottom: '2px' }}>
        {availableChannels.map((chan) => (
          <button
            key={chan}
            onClick={() => setSelectedChannel(chan)}
            className={`btn-sci ${currentVar === chan ? 'btn-sci-active' : ''}`}
            style={{ padding: '3px 7px', fontSize: '10px', textTransform: 'capitalize' }}
          >
            {chan.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* OUTREACH PRESENTATION MODE: Educational Takeaways */}
      {presentationMode === 'OUTREACH' && (
        <div
          style={{
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '6px',
            padding: '10px',
            marginBottom: '12px',
            fontSize: '11px',
            color: '#e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontWeight: 600, marginBottom: '4px' }}>
            <Info style={{ width: '13px', height: '13px' }} />
            <span>Ocean Science Insight</span>
          </div>
          <p style={{ margin: 0, lineHeight: 1.4, fontSize: '10px', color: '#cbd5e1' }}>
            {currentVar === 'temperature' &&
              'The sharp temperature drop in the upper 200m marks the marine thermocline, separating warm solar-heated surface water from cold abyssal ocean.'}
            {currentVar === 'salinity' &&
              'High salinity water (>36 PSU) in the Arabian Sea is driven by intense evaporation and low river runoff.'}
            {currentVar === 'chlorophyll_a' &&
              'Subsurface Chlorophyll Maximum (SCM) indicates the active photosynthetic zone of marine phytoplankton.'}
            {currentVar === 'dissolved_oxygen' &&
              'The deep oxygen minimum zone (OMZ) reflects high organic decomposition below the photic layer.'}
          </p>
        </div>
      )}

      {/* OPERATIONAL MODE: Scientific Insights */}
      {presentationMode === 'OPERATIONAL' && comparison && comparison.metrics && comparison.metrics.validPairs > 1 && (
        <div
          style={{
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '6px',
            padding: '10px',
            marginBottom: '12px',
            fontSize: '11px',
            color: '#e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontWeight: 600, marginBottom: '4px' }}>
            <Info style={{ width: '13px', height: '13px' }} />
            <span>Deterministic Insight</span>
          </div>
          <p style={{ margin: 0, lineHeight: 1.4, fontSize: '10px', color: '#cbd5e1' }}>
            {mbe > 0 
              ? `Observed profile is generally warmer/higher than model (MBE = +${mbe.toFixed(3)} ${comparison.unit}). ` 
              : mbe < 0 
                ? `Observed profile is generally cooler/lower than model (MBE = ${mbe.toFixed(3)} ${comparison.unit}). ` 
                : 'Observed profile matches model mean with negligible bias. '}
            {rmse !== null && `Model-observation RMSE is ${rmse.toFixed(3)} ${comparison.unit} across ${comparison.metrics.validPairs} valid matched levels.`}
          </p>
        </div>
      )}

      {/* OPERATIONAL MODE: Model vs In-Situ Statistical Comparison */}
      {presentationMode === 'OPERATIONAL' && comparison && comparison.metrics && comparison.metrics.validPairs > 1 && (
        <div
          style={{
            marginBottom: '12px',
            background: 'rgba(8,47,73,0.4)',
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid rgba(14,116,144,0.4)',
            fontSize: '11px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: '600', color: '#38bdf8', fontSize: '11px', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BarChart2 style={{ width: '14px', height: '14px' }} />
              <span>INTERCOMPARISON</span>
            </div>
            <span style={{ fontSize: '10px', color: comparison.alignmentStatus === 'MATCHED' ? '#34d399' : '#f59e0b', fontFamily: 'var(--font-mono)' }}>
              {comparison.alignmentStatus} ({comparison.metrics.validPairs} lvls)
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '10px', textAlign: 'center', marginBottom: '8px' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '4px' }}>
              <div style={{ color: '#94a3b8', fontSize: '8px' }}>RMSE</div>
              <div style={{ color: '#38bdf8', fontWeight: 600 }}>{rmse !== null ? rmse.toFixed(3) : '—'}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '4px' }}>
              <div style={{ color: '#94a3b8', fontSize: '8px' }}>MAE</div>
              <div style={{ color: '#38bdf8', fontWeight: 600 }}>{mae !== null ? mae.toFixed(3) : '—'}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '4px' }}>
              <div style={{ color: '#94a3b8', fontSize: '8px' }}>MEAN BIAS</div>
              <div style={{ color: mbe >= 0 ? '#34d399' : '#f87171', fontWeight: 600 }}>
                {mbe !== null ? (mbe > 0 ? `+${mbe.toFixed(3)}` : mbe.toFixed(3)) : '—'}
              </div>
            </div>
          </div>
          
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', marginTop: '6px' }}>
            <div style={{ fontSize: '9px', color: '#94a3b8', marginBottom: '4px' }}>ALIGNMENT METADATA</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '9px', color: '#cbd5e1' }}>
              <div>Time Diff: &le; {comparison.alignmentMetadata?.maxTimeDifferenceHours} hrs</div>
              <div>Space Diff: &le; {comparison.alignmentMetadata?.maxSpatialDistanceKm} km</div>
              <div>Vertical: {comparison.alignmentMetadata?.verticalInterpolation}</div>
              <div>Temporal: {comparison.alignmentMetadata?.temporalInterpolation}</div>
            </div>
          </div>
        </div>
      )}

      {/* PROVENANCE */}
      {presentationMode === 'OPERATIONAL' && (
        <div style={{ marginBottom: '12px', padding: '8px', background: 'rgba(15,23,42,0.6)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '9px', fontWeight: 'bold', marginBottom: '4px' }}>
            <Database style={{ width: '12px', height: '12px' }} /> PROVENANCE
          </div>
          <div style={{ fontSize: '10px', color: '#cbd5e1' }}>
            Source: <span style={{ color: '#e2e8f0' }}>{selectedProfile.source || 'Unknown'}</span><br/>
            Mode: <span style={{ color: selectedProfile.sourceMode === 'LIVE' ? '#34d399' : '#f59e0b' }}>{selectedProfile.sourceMode}</span>
          </div>
        </div>
      )}

      {/* Vertical Column Cast Table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', fontSize: '10px', fontFamily: 'var(--font-mono)', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', textAlign: 'left' }}>
              <th style={{ padding: '4px 6px' }}>DEPTH</th>
              <th style={{ padding: '4px 6px' }}>OBSERVED</th>
              {presentationMode === 'OPERATIONAL' && comparison && <th style={{ padding: '4px 6px' }}>MODEL</th>}
              {presentationMode === 'OPERATIONAL' && comparison && <th style={{ padding: '4px 6px' }}>DELTA</th>}
            </tr>
          </thead>
          <tbody>
            {depths.map((d, idx) => {
              const obsVal = variables[currentVar] ? variables[currentVar][idx] : null;
              const unitStr = units[currentVar] || '';
              const align = comparison?.alignment?.find((a) => a.depthMeters === d);

              return (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '4px 6px', color: '#94a3b8' }}>{d} m</td>
                  <td style={{ padding: '4px 6px', color: '#38bdf8', fontWeight: 500 }}>
                    {obsVal !== null && obsVal !== undefined ? `${obsVal} ${unitStr}` : '—'}
                  </td>
                  {presentationMode === 'OPERATIONAL' && comparison && (
                    <td style={{ padding: '4px 6px', color: '#cbd5e1' }}>
                      {align?.modelVal !== null && align?.modelVal !== undefined ? `${align.modelVal} ${unitStr}` : '—'}
                    </td>
                  )}
                  {presentationMode === 'OPERATIONAL' && comparison && (
                    <td
                      style={{
                        padding: '4px 6px',
                        color: align?.delta > 0 ? '#34d399' : align?.delta < 0 ? '#f87171' : '#94a3b8',
                      }}
                    >
                      {align?.delta !== null && align?.delta !== undefined
                        ? align.delta > 0
                          ? `+${align.delta.toFixed(2)}`
                          : align.delta.toFixed(2)
                        : '—'}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
