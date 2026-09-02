/**
 * OceanView — Multi-Platform Observation Explorer
 * Allows scientists to filter, discover, and inspect multi-platform observational assets:
 * Argo floats, autonomous gliders, shipboard CTD casts, and BGC platforms.
 */

import React, { useState } from 'react';
import { Activity, Navigation, Anchor, Compass, Dna, Eye } from 'lucide-react';
import { useOceanView } from '../../app/AppContext.jsx';
import { globalOceanProfileStore } from '../../engine/index.js';

export default function ObservationExplorer() {
  const {
    selectedProfile,
    setSelectedProfile,
    selectedPlatformType,
    setSelectedPlatformType,
  } = useOceanView();

  const allProfiles = globalOceanProfileStore.getAll();

  const filteredProfiles = allProfiles.filter((p) => {
    if (selectedPlatformType === 'ALL') return true;
    if (selectedPlatformType === 'ARGO' && p.platformType === 'ARGO_FLOAT') return true;
    if (selectedPlatformType === 'GLIDER' && p.platformType === 'GLIDER') return true;
    if (selectedPlatformType === 'CTD' && p.platformType === 'CTD_STATION') return true;
    if (selectedPlatformType === 'BGC' && p.platformType === 'BGC_ARGO_FLOAT') return true;
    return false;
  });

  const getPlatformIcon = (type) => {
    switch (type) {
      case 'GLIDER':
        return <Navigation style={{ width: '13px', height: '13px', color: '#10b981' }} />;
      case 'CTD_STATION':
        return <Anchor style={{ width: '13px', height: '13px', color: '#f59e0b' }} />;
      case 'BGC_ARGO_FLOAT':
        return <Dna style={{ width: '13px', height: '13px', color: '#ec4899' }} />;
      default:
        return <Compass style={{ width: '13px', height: '13px', color: '#38bdf8' }} />;
    }
  };

  return (
    <div
      className="glass-panel"
      style={{
        padding: '12px 14px',
        maxHeight: '320px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity style={{ width: '14px', height: '14px', color: '#38bdf8' }} />
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            In-Situ Assets ({filteredProfiles.length})
          </span>
        </div>
      </div>

      {/* Filters: Platform, Region, Depth */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px', paddingBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto' }}>
          {['ALL', 'ARGO', 'GLIDER', 'CTD', 'BGC'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedPlatformType(type)}
              className={`btn-sci ${selectedPlatformType === type ? 'btn-sci-active' : ''}`}
              style={{ padding: '3px 7px', fontSize: '9px' }}
            >
              {type}
            </button>
          ))}
        </div>
        
        <div style={{ display: 'flex', gap: '6px' }}>
          <select 
            className="sci-select" 
            style={{ fontSize: '9px', padding: '2px', background: 'rgba(15,23,42,0.8)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', flex: 1 }}
          >
            <option value="ALL">Region: Global</option>
            <option value="ARABIAN_SEA">Region: Arabian Sea</option>
            <option value="BOB">Region: Bay of Bengal</option>
          </select>
          <select 
            className="sci-select" 
            style={{ fontSize: '9px', padding: '2px', background: 'rgba(15,23,42,0.8)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', flex: 1 }}
          >
            <option value="ALL">Depth: All</option>
            <option value="SHALLOW">Depth: &lt; 500m</option>
            <option value="DEEP">Depth: &gt; 500m</option>
          </select>
        </div>
      </div>

      {/* Profile List */}
      <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {filteredProfiles.map((prof) => {
          const isSelected = selectedProfile?.id === prof.id;
          return (
            <div
              key={prof.id}
              onClick={() => setSelectedProfile(prof)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.05)',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                {getPlatformIcon(prof.platformType)}
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: '11px', color: isSelected ? '#38bdf8' : '#e2e8f0', fontWeight: 500 }}>
                    {prof.platformId}
                  </div>
                  <div style={{ fontSize: '9px', color: '#94a3b8' }}>
                    {prof.location.lat.toFixed(2)}°N, {prof.location.lon.toFixed(2)}°E • {prof.depths.length} pts
                  </div>
                </div>
              </div>

              {isSelected && <Eye style={{ width: '12px', height: '12px', color: '#38bdf8', flexShrink: 0 }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
