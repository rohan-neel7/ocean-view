/**
 * OceanView — Left Scientific Inspector Dock
 * Consolidates Spatial Scientific Investigation and Subsurface 3D Workstation
 * into a single viewport-clamped, non-overlapping dock with collapsible sections.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Crosshair, Layers, ChevronDown, ChevronRight, X } from 'lucide-react';
import { useOceanView } from '../../app/AppContext.jsx';
import SpatialInvestigationPanel from './SpatialInvestigationPanel.jsx';
import SubsurfaceWorkstation from './SubsurfaceWorkstation.jsx';

export default function LeftInspectorDock() {
  const { analysisLocation, clearAnalysis, subsurfaceMode } = useOceanView();

  const [expandedSections, setExpandedSections] = useState({
    investigation: true,
    subsurface: false,
  });

  const prevAnalysisRef = useRef(null);

  const hasInvestigation = Boolean(analysisLocation);
  const hasSubsurface = true; // Always available tool

  // Auto-collapse logic when analysis location triggers
  useEffect(() => {
    const analysisChanged = analysisLocation !== prevAnalysisRef.current;
    prevAnalysisRef.current = analysisLocation;

    if (analysisChanged && hasInvestigation) {
      // When user initiates an investigation, expand investigation and collapse subsurface
      setExpandedSections((prev) => ({
        ...prev,
        investigation: true,
        subsurface: false,
      }));
    }
  }, [analysisLocation, hasInvestigation]);

  const toggleSection = (id) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const investigationSummary = analysisLocation
    ? `${analysisLocation.formatted} (${analysisLocation.status})`
    : '';

  const subsurfaceSummary = subsurfaceMode
    ? `${subsurfaceMode.replace(/_/g, ' ')}`
    : '';

  // If no analysis is active and subsurface is not wanted, we can still show subsurface collapsed
  return (
    <aside className="oceanview-left-dock">
      {/* SECTION 1: SPATIAL SCIENTIFIC INVESTIGATION */}
      {hasInvestigation && (
        <div className="dock-section">
          <div className="dock-section-header" onClick={() => toggleSection('investigation')}>
            <div className="dock-section-title-group">
              <div className="dock-section-title">
                <Crosshair style={{ width: '14px', height: '14px', color: '#38bdf8', flexShrink: 0 }} />
                <span>SPATIAL INVESTIGATION</span>
              </div>
              {!expandedSections.investigation && investigationSummary && (
                <div className="dock-section-summary">{investigationSummary}</div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearAnalysis();
                }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                title="Clear Analysis Location"
              >
                <X style={{ width: '13px', height: '13px' }} />
              </button>
              {expandedSections.investigation ? (
                <ChevronDown style={{ width: '14px', height: '14px', color: '#94a3b8' }} />
              ) : (
                <ChevronRight style={{ width: '14px', height: '14px', color: '#94a3b8' }} />
              )}
            </div>
          </div>

          {expandedSections.investigation && (
            <div className="dock-section-body" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
              <SpatialInvestigationPanel isDocked={true} showHeader={false} />
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: SUBSURFACE 3D WORKSTATION */}
      {hasSubsurface && (
        <div className="dock-section">
          <div className="dock-section-header" onClick={() => toggleSection('subsurface')}>
            <div className="dock-section-title-group">
              <div className="dock-section-title">
                <Layers style={{ width: '14px', height: '14px', color: '#38bdf8', flexShrink: 0 }} />
                <span>SUBSURFACE 3D WORKSTATION</span>
              </div>
              {!expandedSections.subsurface && subsurfaceSummary && (
                <div className="dock-section-summary">{subsurfaceSummary}</div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {expandedSections.subsurface ? (
                <ChevronDown style={{ width: '14px', height: '14px', color: '#94a3b8' }} />
              ) : (
                <ChevronRight style={{ width: '14px', height: '14px', color: '#94a3b8' }} />
              )}
            </div>
          </div>

          {expandedSections.subsurface && (
            <div className="dock-section-body" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
              <SubsurfaceWorkstation isDocked={true} showHeader={false} />
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
