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
import * as Cesium from 'cesium';
import { teardownRenderGovernor, governorRequestRender } from '../../engine/rendering/renderGovernor.js';
import { globalLifecycleTracker } from '../../engine/rendering/cesiumLifecycleTracker.js';

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
  const basemapControllerRef = useRef(null);
  const orbitControllerRef = useRef(null);
  const analysisMarkerDataSourceRef = useRef(null);

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
    sourceStatuses,
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
    analysisLocation,
    setAnalysisLocation,
    setAnalysisFeedback,
  } = useOceanView();

  const handleToggleShortcuts = useCallback(() => {
    setShortcutsModalOpen((prev) => !prev);
  }, []);

  // Mutable ref for interaction callbacks to prevent effect re-triggers
  const handlersRef = useRef({
    setSelectedProfile,
    setProbedCoordinate,
    setAnalysisLocation,
    setAnalysisFeedback,
    handleToggleShortcuts,
  });
  useEffect(() => {
    handlersRef.current = {
      setSelectedProfile,
      setProbedCoordinate,
      setAnalysisLocation,
      setAnalysisFeedback,
      handleToggleShortcuts,
    };
  });

  // Single Authoritative Cesium Viewer Lifecycle (Mount & Unmount Only)
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    const viewer = createOceanGlobeViewer(containerRef.current);
    viewerRef.current = viewer;
    globalCameraController.setViewer(viewer);

    const bloom = new OceanBloomEffect(viewer);
    const orbit = new OrbitController(viewer);
    const basemap = new BasemapController(viewer);

    orbitControllerRef.current = orbit;
    basemapControllerRef.current = basemap;

    setBloomEffect(bloom);
    setOrbitController(orbit);
    setBasemapController(basemap);

    scalarLayerRef.current = new ScalarFieldLayer(viewer);
    profileLayerRef.current = new ProfileLayer(viewer);
    vectorLayerRef.current = new VectorFieldLayer(viewer);
    particleLayerRef.current = new ParticleCurrentLayer(viewer);
    transectLayerRef.current = new VerticalTransectLayer(viewer);
    isosurfaceLayerRef.current = new SubvolumeIsosurfaceLayer(viewer);

    const cleanupInteraction = setupGlobeInteraction(viewer, {
      onProfileSelect: (profile) => handlersRef.current.setSelectedProfile(profile),
      onCoordinateProbe: (coord) => handlersRef.current.setProbedCoordinate(coord),
      onAnalysisLocationSelect: (loc) => handlersRef.current.setAnalysisLocation(loc),
      onLandClick: (fb) => handlersRef.current.setAnalysisFeedback?.({ type: 'warning', message: fb.reason }),
    });

    const cleanupKeyboard = setupGlobeKeyboardNavigation({
      onToggleOrbit: () => orbitControllerRef.current?.toggle(),
      onToggleShortcutsModal: () => handlersRef.current.handleToggleShortcuts(),
    });

    setIsViewerReady(true);

    return () => {
      setIsViewerReady(false);
      cleanupKeyboard();
      cleanupInteraction();

      if (analysisMarkerDataSourceRef.current) {
        if (viewerRef.current && !viewerRef.current.isDestroyed?.()) {
          viewerRef.current.dataSources.remove(analysisMarkerDataSourceRef.current, true);
        }
        analysisMarkerDataSourceRef.current = null;
      }

      if (orbitControllerRef.current) {
        orbitControllerRef.current.destroy();
        orbitControllerRef.current = null;
      }
      if (particleLayerRef.current) {
        particleLayerRef.current.destroy();
        particleLayerRef.current = null;
      }
      if (vectorLayerRef.current) {
        vectorLayerRef.current.clear();
        vectorLayerRef.current = null;
      }
      if (transectLayerRef.current) {
        transectLayerRef.current.clear();
        transectLayerRef.current = null;
      }
      if (isosurfaceLayerRef.current) {
        isosurfaceLayerRef.current.clear();
        isosurfaceLayerRef.current = null;
      }
      if (scalarLayerRef.current) {
        scalarLayerRef.current.remove();
        scalarLayerRef.current = null;
      }
      if (profileLayerRef.current) {
        profileLayerRef.current.clear();
        profileLayerRef.current = null;
      }
      if (basemapControllerRef.current) {
        basemapControllerRef.current.destroy();
        basemapControllerRef.current = null;
      }

      teardownRenderGovernor();

      if (viewerRef.current && !viewerRef.current.isDestroyed?.()) {
        globalLifecycleTracker.trackViewerDestroyed(viewerRef.current);
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []); // Run strictly once on mount

  // Focus on selected profile cast without viewer recreation
  useEffect(() => {
    if (selectedProfile?.location) {
      globalCameraController.focusProfile(selectedProfile);
    }
  }, [selectedProfile]);

  // Dedicated Analysis Location visual marker
  useEffect(() => {
    if (!viewerRef.current || viewerRef.current.isDestroyed?.()) return;

    if (!analysisMarkerDataSourceRef.current) {
      const ds = new Cesium.CustomDataSource('AnalysisLocationMarker');
      viewerRef.current.dataSources.add(ds);
      analysisMarkerDataSourceRef.current = ds;
    }

    const ds = analysisMarkerDataSourceRef.current;
    ds.entities.removeAll();

    if (analysisLocation) {
      const { latitude: lat, longitude: lon } = analysisLocation;
      const renderAltitude = 15.0; // Elevation above ocean surface

      // 1. Center target dot
      ds.entities.add({
        id: 'analysis_location_marker',
        position: Cesium.Cartesian3.fromDegrees(lon, lat, renderAltitude),
        point: {
          pixelSize: 11,
          color: Cesium.Color.fromCssColorString('#06b6d4'),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });

      // 2. Target ring
      ds.entities.add({
        id: 'analysis_location_ring',
        position: Cesium.Cartesian3.fromDegrees(lon, lat, renderAltitude),
        ellipse: {
          semiMajorAxis: 30000.0,
          semiMinorAxis: 30000.0,
          material: Cesium.Color.fromCssColorString('#06b6d4').withAlpha(0.2),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString('#38bdf8'),
          outlineWidth: 2,
          height: renderAltitude,
        },
      });

      governorRequestRender();
    }
  }, [analysisLocation]);

  // Scalar Field Layer Updates
  useEffect(() => {
    if (!scalarLayerRef.current) return;

    if (!layers.scalarField || subsurfaceMode !== 'HORIZONTAL_SLICE' || activeVariable === 'ocean_current_velocity') {
      scalarLayerRef.current.remove();
      return;
    }

    const allGrids = globalOceanGridStore.getAll();
    const scalarGrids = allGrids.filter((g) => g.kind === 'CANONICAL_GRID_SCALAR');
    const scalarGrid = scalarGrids.find((g) => g.variable === activeVariable) || scalarGrids[scalarGrids.length - 1] || null;

    if (scalarGrid) {
      const opacity = colorScaleSettings?.opacity ?? 0.85;
      scalarLayerRef.current.updateGrid(
        scalarGrid,
        activeColormap,
        activeDepthMeters,
        opacity,
        {
          min: colorScaleSettings?.min ?? null,
          max: colorScaleSettings?.max ?? null,
        },
        {
          vectorVisible: layers.currentVectors,
          particleVisible: layers.particleFlow,
        }
      );
    } else {
      scalarLayerRef.current.remove();
    }
  }, [activeVariable, activeColormap, activeDepthMeters, dataMode, sourceStatuses.model, layers.scalarField, layers.currentVectors, layers.particleFlow, subsurfaceMode, colorScaleSettings]);

  // Vertical Transect Section Updates
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
  }, [subsurfaceMode, selectedTransectId, verticalExaggeration, activeColormap, dataMode, sourceStatuses.model]);

  // Subvolume 3D Isosurface Updates
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
  }, [subsurfaceMode, activeIsovalue, verticalExaggeration, activeColormap, dataMode, sourceStatuses.model]);

  // Vector Glyphs (Currents) Updates
  useEffect(() => {
    if (!vectorLayerRef.current) return;
    if (!layers.currentVectors) {
      vectorLayerRef.current.clear();
      return;
    }
    const allGrids = globalOceanGridStore.getAll();
    const vectorGrid = allGrids.find((g) => g.kind === 'CANONICAL_GRID_VECTOR') || null;
    if (vectorGrid) {
      vectorLayerRef.current.updateVectors(vectorGrid, activeDepthMeters, null, isXRayMode, {
        scalarVisible: layers.scalarField && activeVariable !== 'ocean_current_velocity',
        particleVisible: layers.particleFlow,
      });
    } else {
      vectorLayerRef.current.clear();
    }
  }, [layers.currentVectors, layers.scalarField, layers.particleFlow, activeDepthMeters, isXRayMode, dataMode, sourceStatuses.current, activeVariable]);

  // Particle Streamlines Flow Simulation Updates
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
      particleLayerRef.current.start(vectorGrid, { particleCount: count, flowSpeed, depthMeters: activeDepthMeters });
    } else {
      particleLayerRef.current.stop();
    }
  }, [layers.particleFlow, particleBudget, flowSpeed, activeDepthMeters, dataMode, sourceStatuses.current, activeVariable]);

  // In-Situ Profile Visualizer Updates
  useEffect(() => {
    if (!profileLayerRef.current) return;
    if (!layers.argoFloats && !layers.ctdStations && !layers.gliders) {
      profileLayerRef.current.clear();
      return;
    }
    const allProfiles = globalOceanProfileStore.getAll();
    profileLayerRef.current.updateProfiles(allProfiles, isXRayMode, {
      showArgo: layers.argoFloats,
      showGliders: layers.gliders,
      showCTD: layers.ctdStations,
      selectedProfileId: selectedProfile?.wmo || selectedProfile?.id || null,
    });
  }, [layers.argoFloats, layers.ctdStations, layers.gliders, isXRayMode, dataMode, sourceStatuses.argo, sourceStatuses.glider, sourceStatuses.ctd, selectedProfile]);

  return (
    <>
      <div ref={containerRef} className="cesium-container-wrapper" />
      <ScopeMask />
      {isViewerReady && (
        <>
          <GlobeViewModes bloomEffect={bloomEffect} basemapController={basemapController} />
          <GlobeToolRail orbitController={orbitController} onToggleShortcutsModal={handleToggleShortcuts} />
          <GlobeTelemetry />
          <KeyboardShortcutsModal isOpen={shortcutsModalOpen} onClose={() => setShortcutsModalOpen(false)} />
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
