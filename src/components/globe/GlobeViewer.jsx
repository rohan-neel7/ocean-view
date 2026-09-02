import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useOceanView } from '../../app/AppContext.jsx';
import { createOceanGlobeViewer } from './viewerSetup.js';
import { setupGlobeInteraction } from './interaction.js';
import { globalCameraController } from '../../engine/rendering/CentralizedCameraController.js';
import { globalOceanGridStore, globalOceanProfileStore } from '../../engine/index.js';
import { ScalarFieldLayer } from '../../visualization/scalar/ScalarFieldLayer.js';
import { ProfileLayer } from '../../visualization/profiles/ProfileLayer.js';
import { VectorFieldLayer } from '../../visualization/vector/VectorFieldLayer.js';
import { ParticleCurrentLayer } from '../../visualization/vector/ParticleCurrentLayer.js';
import { VerticalTransectLayer } from '../../visualization/depth/VerticalTransectLayer.js';
import { SubvolumeIsosurfaceLayer } from '../../visualization/volume/SubvolumeIsosurfaceLayer.js';
import { OceanBloomEffect } from '../../visualization/effects/OceanBloomEffect.js';
import { OrbitController } from '../../engine/rendering/OrbitController.js';
import { BasemapController } from '../../engine/rendering/BasemapController.js';
import { setupGlobeKeyboardNavigation } from '../../engine/rendering/globeNavigation.js';
import { extractVerticalSection } from '../../engine/ocean/VerticalSectionEngine.js';
import { extractIsosurface } from '../../engine/ocean/IsosurfaceEngine.js';
import { SCIENTIFIC_TRANSECTS } from '../scientific/SubsurfaceWorkstation.jsx';
import { teardownRenderGovernor } from '../../engine/rendering/renderGovernor.js';

import ScopeMask from '../hud/ScopeMask.jsx';
import GlobeToolRail from './GlobeToolRail.jsx';
import GlobeViewModes from './GlobeViewModes.jsx';
import GlobeTelemetry from './GlobeTelemetry.jsx';
import KeyboardShortcutsModal from './KeyboardShortcutsModal.jsx';
import ScientificDebugOverlay from '../../visualization/debug/ScientificDebugOverlay.jsx';

export default function GlobeViewer() {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const scalarLayerRef = useRef(null);
  const profileLayerRef = useRef(null);
  const vectorLayerRef = useRef(null);
  const particleLayerRef = useRef(null);
  const transectLayerRef = useRef(null);
  const isosurfaceLayerRef = useRef(null);

  // Controllers that are passed as props to child components are stored in state
  // (not refs) so that React can detect them as stable values for rendering.
  const [bloomEffect, setBloomEffect] = useState(null);
  const [orbitController, setOrbitController] = useState(null);
  const [basemapController, setBasemapController] = useState(null);

  const [isViewerReady, setIsViewerReady] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  const {
    activeVariable,
    activeColormap,
    activeDepthMeters,
    dataMode,
    sourceStatus,
    layers,
    colorScaleSettings,
    particleBudget,
    flowSpeed,
    isXRayMode,
    subsurfaceMode,
    verticalExaggeration,
    activeIsovalue,
    selectedTransectId,
    selectedProfile,
    setSelectedProfile,
    setProbedCoordinate,
  } = useOceanView();

  const handleToggleShortcuts = useCallback(() => {
    setShortcutsModalOpen((prev) => !prev);
  }, []);

  // Initialize Cesium Viewer, Visualizers & Cinematic Controllers
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    const viewer = createOceanGlobeViewer(containerRef.current);
    viewerRef.current = viewer;
    globalCameraController.setViewer(viewer);

    // Initialize Cinematic & Layer Controllers (stored in state for prop stability)
    const bloom = new OceanBloomEffect(viewer);
    const orbit = new OrbitController(viewer);
    const basemap = new BasemapController(viewer);
    setBloomEffect(bloom);
    setOrbitController(orbit);
    setBasemapController(basemap);

    scalarLayerRef.current = new ScalarFieldLayer(viewer);
    profileLayerRef.current = new ProfileLayer(viewer);
    vectorLayerRef.current = new VectorFieldLayer(viewer);
    particleLayerRef.current = new ParticleCurrentLayer(viewer);
    transectLayerRef.current = new VerticalTransectLayer(viewer);
    isosurfaceLayerRef.current = new SubvolumeIsosurfaceLayer(viewer);

    // Attach Interaction Handler (Pointer Selection & Probe)
    const cleanupInteraction = setupGlobeInteraction(viewer, {
      onProfileSelect: (profile) => setSelectedProfile(profile),
      onCoordinateProbe: (coord) => setProbedCoordinate(coord),
    });

    // Attach Global Keyboard Navigation Hotkeys
    const cleanupKeyboard = setupGlobeKeyboardNavigation({
      onToggleOrbit: () => orbit?.toggle(),
      onToggleShortcutsModal: () => handleToggleShortcuts(),
    });

    setIsViewerReady(true);

    return () => {
      cleanupKeyboard();
      cleanupInteraction();
      orbit?.stop();
      if (particleLayerRef.current) particleLayerRef.current.stop();
      if (vectorLayerRef.current) vectorLayerRef.current.clear();
      if (transectLayerRef.current) transectLayerRef.current.clear();
      if (isosurfaceLayerRef.current) isosurfaceLayerRef.current.clear();
      teardownRenderGovernor();
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [setSelectedProfile, setProbedCoordinate, handleToggleShortcuts]);

  // Fly camera to selected Argo/CTD/Glider profile
  useEffect(() => {
    if (selectedProfile?.location) {
      globalCameraController.focusProfile(selectedProfile);
    }
  }, [selectedProfile]);

  // Sync Scalar Grid Layer (Horizontal Slice)
  useEffect(() => {
    if (!scalarLayerRef.current) return;

    // Hide scalar field when viewing current velocity (show vector/particle instead)
    // or when scalar field layer is disabled or in wrong subsurface mode
    if (!layers.scalarField || subsurfaceMode !== 'HORIZONTAL_SLICE' || activeVariable === 'ocean_current_velocity') {
      scalarLayerRef.current.remove();
      return;
    }

    const allGrids = globalOceanGridStore.getAll();
    // Find the most recently added scalar grid that matches the active variable
    const scalarGrids = allGrids.filter((g) => g.kind === 'CANONICAL_GRID_SCALAR');
    const scalarGrid = scalarGrids.find((g) => g.variable === activeVariable)
      || scalarGrids[scalarGrids.length - 1]
      || null;

    if (scalarGrid) {
      const opacity = colorScaleSettings?.opacity ?? 0.85;
      scalarLayerRef.current.updateGrid(
        scalarGrid,
        activeColormap,
        activeDepthMeters,
        opacity,
        { min: colorScaleSettings?.min ?? null, max: colorScaleSettings?.max ?? null },
      );
    } else {
      // No data available for this variable — clear stale visualization
      scalarLayerRef.current.remove();
    }
  }, [activeVariable, activeColormap, activeDepthMeters, dataMode, sourceStatus, layers.scalarField, subsurfaceMode, colorScaleSettings]);

  // Sync 3D Vertical Transect Curtain Layer
  useEffect(() => {
    if (!transectLayerRef.current) return;

    if (subsurfaceMode !== 'VERTICAL_TRANSECT') {
      transectLayerRef.current.clear();
      return;
    }

    const allGrids = globalOceanGridStore.getAll();
    const scalarGrid = allGrids.find((g) => g.kind === 'CANONICAL_GRID_SCALAR') || null;
    const currentTransect = SCIENTIFIC_TRANSECTS.find((t) => t.id === selectedTransectId) || SCIENTIFIC_TRANSECTS[0];

    if (scalarGrid && currentTransect) {
      const section = extractVerticalSection(scalarGrid, currentTransect, { stationCount: 36 });
      transectLayerRef.current.updateTransect(section, activeColormap, verticalExaggeration);
    }
  }, [subsurfaceMode, selectedTransectId, verticalExaggeration, activeColormap, dataMode, sourceStatus]);

  // Sync 3D Isosurface Layer
  useEffect(() => {
    if (!isosurfaceLayerRef.current) return;

    if (subsurfaceMode !== 'ISOSURFACE_3D') {
      isosurfaceLayerRef.current.clear();
      return;
    }

    const allGrids = globalOceanGridStore.getAll();
    const scalarGrid = allGrids.find((g) => g.kind === 'CANONICAL_GRID_SCALAR') || null;

    if (scalarGrid) {
      const mesh = extractIsosurface(scalarGrid, activeIsovalue, { verticalExaggeration });
      isosurfaceLayerRef.current.updateIsosurface(mesh, activeColormap);
    }
  }, [subsurfaceMode, activeIsovalue, verticalExaggeration, activeColormap, dataMode, sourceStatus]);

  // Sync Vector Field Glyph Layer
  useEffect(() => {
    if (!vectorLayerRef.current) return;

    if (!layers.currentVectors) {
      vectorLayerRef.current.clear();
      return;
    }

    const allGrids = globalOceanGridStore.getAll();
    const vectorGrid = allGrids.find((g) => g.kind === 'CANONICAL_GRID_VECTOR') || null;

    if (vectorGrid) {
      vectorLayerRef.current.updateVectors(vectorGrid, activeDepthMeters, 1, isXRayMode);
    }
  }, [layers.currentVectors, activeDepthMeters, isXRayMode, dataMode, sourceStatus]);

  // Sync Particle Current Flow Layer
  useEffect(() => {
    if (!particleLayerRef.current) return;

    if (!layers.particleFlow) {
      particleLayerRef.current.stop();
      return;
    }

    const allGrids = globalOceanGridStore.getAll();
    const vectorGrid = allGrids.find((g) => g.kind === 'CANONICAL_GRID_VECTOR') || null;

    if (vectorGrid) {
      const budgetMap = { LOW: 1500, MEDIUM: 4000, HIGH: 8000 };
      const count = budgetMap[particleBudget] || 4000;
      particleLayerRef.current.start(vectorGrid, {
        particleCount: count,
        flowSpeed,
        depthMeters: activeDepthMeters,
      });
    }
  }, [layers.particleFlow, particleBudget, flowSpeed, activeDepthMeters, dataMode, sourceStatus]);

  // Sync Argo & In-Situ Profiles Layer
  useEffect(() => {
    if (!profileLayerRef.current) return;

    if (!layers.argoFloats && !layers.ctdStations && !layers.gliders) {
      profileLayerRef.current.clear();
      return;
    }

    const allProfiles = globalOceanProfileStore.getAll();
    profileLayerRef.current.updateProfiles(allProfiles, isXRayMode);
  }, [layers.argoFloats, layers.ctdStations, layers.gliders, isXRayMode, dataMode, sourceStatus]);

  return (
    <>
      <div ref={containerRef} className="cesium-container-wrapper" />
      <ScopeMask />

      {isViewerReady && (
        <>
          {/* Top-Right View Modes & Basemap Selector */}
          <GlobeViewModes
            bloomEffect={bloomEffect}
            basemapController={basemapController}
          />

          {/* Right-Hand Compact Tool Rail & Orientation Compass */}
          <GlobeToolRail
            orbitController={orbitController}
            onToggleShortcutsModal={handleToggleShortcuts}
          />

          {/* Bottom-Right Live Telemetry Readout */}
          <GlobeTelemetry />

          {/* Hotkeys Modal */}
          <KeyboardShortcutsModal
            isOpen={shortcutsModalOpen}
            onClose={() => setShortcutsModalOpen(false)}
          />

          {/* Developer-Only Scientific Debug Overlay (Ctrl+Shift+D) */}
          <ScientificDebugOverlay
            scalarLayer={scalarLayerRef}
            vectorLayer={vectorLayerRef}
            particleLayer={particleLayerRef}
            transectLayer={transectLayerRef}
            isosurfaceLayer={isosurfaceLayerRef}
            profileLayer={profileLayerRef}
          />
        </>
      )}
    </>
  );
}
