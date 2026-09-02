import React from 'react';
import GlobeViewer from '../components/globe/GlobeViewer.jsx';
import HeaderBar from '../components/panels/HeaderBar.jsx';
import VariableSelector from '../components/panels/VariableSelector.jsx';
import LayerPanel from '../components/panels/LayerPanel.jsx';
import DepthSlider from '../components/panels/DepthSlider.jsx';
import TimelineControl from '../components/panels/TimelineControl.jsx';
import ProfileInspector from '../components/scientific/ProfileInspector.jsx';
import CurrentInspector from '../components/scientific/CurrentInspector.jsx';
import SubsurfaceWorkstation from '../components/scientific/SubsurfaceWorkstation.jsx';
import ObservationExplorer from '../components/scientific/ObservationExplorer.jsx';
import ColorbarEditorModal from '../components/panels/ColorbarEditorModal.jsx';
import OceanBasinQuickJumps from '../components/hud/OceanBasinQuickJumps.jsx';
import ScientificTelemetryHUD from '../components/hud/ScientificTelemetryHUD.jsx';

export default function App() {
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

      {/* Left Sidebar Control Rail */}
      <aside className="oceanview-sidebar">
        <VariableSelector />
        <LayerPanel />
        <ObservationExplorer />
      </aside>

      {/* Subsurface 3D Analysis Workstation */}
      <SubsurfaceWorkstation />

      {/* Right Scientific Inspector Rails */}
      <ProfileInspector />
      <CurrentInspector />

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
