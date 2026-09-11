import React, { useState, useCallback } from 'react';
import GlobeViewer from '../components/globe/GlobeViewer.jsx';
import HeaderBar from '../components/panels/HeaderBar.jsx';
import DataPanel from '../components/panels/DataPanel.jsx';
import LocationSearch from '../components/panels/LocationSearch.jsx';
import LeftInspectorDock from '../components/scientific/LeftInspectorDock.jsx';
import InspectorDock from '../components/scientific/InspectorDock.jsx';
import ColorbarEditorModal from '../components/panels/ColorbarEditorModal.jsx';
import ScientificTelemetryHUD from '../components/hud/ScientificTelemetryHUD.jsx';
import KeyboardShortcutsModal from '../components/globe/KeyboardShortcutsModal.jsx';
import { useOceanView } from './AppContext.jsx';

export default function App() {
  const { analysisFeedback } = useOceanView();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const handleToggleShortcuts = useCallback(() => {
    setShortcutsOpen((prev) => !prev);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-deep)' }}>
      {/* Level 1 (Hero): Cesium 3D Globe with silky streamlines, weather markers & in-situ floats */}
      <GlobeViewer />

      {/* Top Scientific Header Bar (Slim 56px with dropdowns for Dataset, Layers, View, Basin) */}
      <HeaderBar onToggleShortcuts={handleToggleShortcuts} />

      {/* Level 2: Minimal Floating Location Search Pill (Upper Left) */}
      <LocationSearch />

      {/* Level 2: Compact Collapsible Scientific DATA Panel (Variable, Layers, In-Situ) */}
      <DataPanel />

      {/* Level 2: Non-intrusive Scientific Status Bar */}
      <ScientificTelemetryHUD />

      {/* Level 3: Contextual Spatial Investigation (Appears only upon ocean click) */}
      <LeftInspectorDock />

      {/* Level 3: Contextual Profile / Asset Inspector (Appears only upon asset click) */}
      <InspectorDock />

      {/* Interactive Color Scale & Palette Modal */}
      <ColorbarEditorModal />

      {/* Keyboard Shortcuts Navigation Modal */}
      <KeyboardShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {/* Analysis Feedback / Land Warning Banner */}
      {analysisFeedback && (
        <div
          style={{
            position: 'absolute',
            top: '74px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 60,
            background: 'var(--accent-danger)',
            color: '#ffffff',
            padding: '7px 16px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          <span>⚠️ {analysisFeedback.message}</span>
        </div>
      )}
    </div>
  );
}
