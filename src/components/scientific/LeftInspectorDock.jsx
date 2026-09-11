/**
 * OceanView — Left Scientific Inspector Dock
 * Hosts Subsurface 3D Workstation (transects and vertical depth slices).
 * Spatial point investigation is handled contextually by SelectedAreaWeatherCard.
 */

import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronRight } from 'lucide-react';
import { useOceanView } from '../../app/AppContext.jsx';
import SubsurfaceWorkstation from './SubsurfaceWorkstation.jsx';

export default function LeftInspectorDock() {
  const { subsurfaceMode } = useOceanView();

  const [expandedSections, setExpandedSections] = useState({
    subsurface: false,
  });

  const isSubsurfaceActive = subsurfaceMode && subsurfaceMode !== 'HORIZONTAL_SLICE';

  // Only render if subsurface workstation is active or expanded
  if (!isSubsurfaceActive && !expandedSections.subsurface) {
    return null;
  }

  const toggleSection = (id) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const subsurfaceSummary = subsurfaceMode
    ? `${subsurfaceMode.replace(/_/g, ' ')}`
    : '';

  return (
    <aside className="oceanview-left-dock">
      {/* SUBSURFACE 3D WORKSTATION */}
      <div className="dock-section">
        <div className="dock-section-header" onClick={() => toggleSection('subsurface')}>
          <div className="dock-section-title-group">
            <div className="dock-section-title">
              <Layers style={{ width: '14px', height: '14px', color: '#6F9F96', flexShrink: 0 }} />
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
    </aside>
  );
}
