/**
 * OceanView — Multi-Platform Observation Explorer
 * Allows scientists to filter, discover, and inspect multi-platform observational assets:
 * Argo floats, autonomous gliders, shipboard CTD casts, and BGC platforms.
 */

import React from 'react';
import { Activity, Navigation, Anchor, Compass, Dna, Eye } from 'lucide-react';
import { useOceanView } from '../../app/AppContext.jsx';
import { globalOceanProfileStore } from '../../engine/index.js';

export default function ObservationExplorer({ isCompact = false }) {
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
        return <Navigation style={{ width: '12px', height: '12px', color: '#10b981' }} />;
      case 'CTD_STATION':
        return <Anchor style={{ width: '12px', height: '12px', color: 'var(--accent-amber)' }} />;
      case 'BGC_ARGO_FLOAT':
        return <Dna style={{ width: '12px', height: '12px', color: '#ec4899' }} />;
      default:
        return <Compass style={{ width: '12px', height: '12px', color: 'var(--accent-teal)' }} />;
    }
  };

  return (
    <div
      className={isCompact ? '' : 'glass-panel'}
      style={{
        padding: isCompact ? '4px 0' : '10px 12px',
        maxHeight: isCompact ? '200px' : '320px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      {!isCompact && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity style={{ width: '13px', height: '13px', color: 'var(--accent-teal)' }} />
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              In-Situ Assets ({filteredProfiles.length})
            </span>
          </div>
        </div>
      )}

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
            disabled
          >
            <option value="ALL">Region: Global (PLANNED)</option>
          </select>
          <select 
            className="sci-select" 
            style={{ fontSize: '9px', padding: '2px', background: 'rgba(15,23,42,0.8)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', flex: 1 }}
            disabled
          >
            <option value="ALL">Depth: All (PLANNED)</option>
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
                background: isSelected ? 'var(--accent-teal-soft)' : 'rgba(255, 255, 255, 0.02)',
                border: isSelected ? '1px solid var(--border-highlight)' : '1px solid rgba(255, 255, 255, 0.05)',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                {getPlatformIcon(prof.platformType)}
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: '11px', color: isSelected ? 'var(--accent-teal)' : 'var(--text-primary)', fontWeight: 500 }}>
                    {prof.platformId}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                    {prof.location.lat.toFixed(2)}°N, {prof.location.lon.toFixed(2)}°E • {prof.depths.length} pts
                  </div>
                </div>
              </div>

              {isSelected && <Eye style={{ width: '12px', height: '12px', color: 'var(--accent-teal)', flexShrink: 0 }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
