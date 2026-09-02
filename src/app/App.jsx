import React from 'react';
import GlobeViewer from '../components/globe/GlobeViewer.jsx';
import HeaderBar from '../components/panels/HeaderBar.jsx';
import VariableSelector from '../components/panels/VariableSelector.jsx';
import LayerPanel from '../components/panels/LayerPanel.jsx';
import DepthSlider from '../components/panels/DepthSlider.jsx';
import TimelineControl from '../components/panels/TimelineControl.jsx';
import ObservationExplorer from '../components/scientific/ObservationExplorer.jsx';
import LeftInspectorDock from '../components/scientific/LeftInspectorDock.jsx';
import InspectorDock from '../components/scientific/InspectorDock.jsx';
import ColorbarEditorModal from '../components/panels/ColorbarEditorModal.jsx';
import OceanBasinQuickJumps from '../components/hud/OceanBasinQuickJumps.jsx';
import ScientificTelemetryHUD from '../components/hud/ScientificTelemetryHUD.jsx';
import LocationSearch from '../components/panels/LocationSearch.jsx';
import { useOceanView } from './AppContext.jsx';

export default function App() {
  const { analysisFeedback } = useOceanView();

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950">
      {/* Cesium 3D Globe with HUD overlays & Navigation controls */}
      <GlobeViewer />

      {/* Top Scientific Header Bar */}
      <HeaderBar />

      {/* Ocean Basin Quick Jump Carousel */}
      <OceanBasinQuickJumps />
      
      {/* Scientific Telemetry & Reticle Overlay */}
      <ScientificTelemetryHUD />

      {/* Analysis Feedback / Land Warning Banner */}
      {analysisFeedback && (
        <div
          style={{
            position: 'absolute',
            top: '76px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 60,
            background: 'rgba(220, 38, 38, 0.95)',
            color: '#ffffff',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          <span>⚠️ {analysisFeedback.message}</span>
        </div>
      )}

      {/* Left Sidebar Control Rail */}
      <aside className="oceanview-sidebar">
        <LocationSearch />
        <VariableSelector />
        <LayerPanel />
        <ObservationExplorer />
      </aside>

      {/* Consolidated Left Scientific Inspector Dock (Spatial Investigation & Subsurface 3D) */}
      <LeftInspectorDock />

      {/* Consolidated Right Scientific Inspector Dock (Probe, Profile, Insights, Nearby) */}
      <InspectorDock />

      {/* Color Scale & Palette Modal */}
      <ColorbarEditorModal />

      {/* Bottom Floating Control Dock */}
      <footer className="oceanview-dock glass-panel">
        <DepthSlider />
        <TimelineControl />
      </footer>
    </div>
  );
}
