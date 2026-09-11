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
import { WeatherMarkersLayer } from '../../visualization/weather/WeatherMarkersLayer.js';
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

import GlobeToolRail from './GlobeToolRail.jsx';
import KeyboardShortcutsModal from './KeyboardShortcutsModal.jsx';
import ScientificDebugOverlay from '../../visualization/debug/ScientificDebugOverlay.jsx';
import SelectedAreaWeatherCard from '../hud/SelectedAreaWeatherCard.jsx';

export default function GlobeViewer() {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const scalarLayerRef = useRef(null);
  const profileLayerRef = useRef(null);
  const vectorLayerRef = useRef(null);
  const particleLayerRef = useRef(null);
  const transectLayerRef = useRef(null);
  const isosurfaceLayerRef = useRef(null);
  const weatherMarkersLayerRef = useRef(null);
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
    labelSettings,
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
    weatherMarkersLayerRef.current = new WeatherMarkersLayer(viewer);

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
      if (weatherMarkersLayerRef.current) {
        weatherMarkersLayerRef.current.destroy();
        weatherMarkersLayerRef.current = null;
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

  // Dedicated Unmistakable Analysis Location Scientific Boundary
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
      const renderAltitude = 25.0; // Elevation above ocean surface

      // 1. Outer vignette dimming ring (largest, darkest - creates focus/spotlight)
      ds.entities.add({
        id: 'analysis_location_vignette',
        position: Cesium.Cartesian3.fromDegrees(lon, lat, renderAltitude - 5),
        ellipse: {
          semiMajorAxis: 90000.0,
          semiMinorAxis: 90000.0,
          material: Cesium.Color.fromCssColorString('#070808').withAlpha(0.30),
          outline: false,
          height: renderAltitude - 5,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });

      // 2. Mid feathered zone - soft teal tint
      ds.entities.add({
        id: 'analysis_location_mid',
        position: Cesium.Cartesian3.fromDegrees(lon, lat, renderAltitude),
        ellipse: {
          semiMajorAxis: 55000.0,
          semiMinorAxis: 55000.0,
          material: Cesium.Color.fromCssColorString('#6F9F96').withAlpha(0.055),
          outline: false,
          height: renderAltitude,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });

      // 3. Inner observation zone - slightly brighter teal
      ds.entities.add({
        id: 'analysis_location_inner',
        position: Cesium.Cartesian3.fromDegrees(lon, lat, renderAltitude + 2),
        ellipse: {
          semiMajorAxis: 28000.0,
          semiMinorAxis: 28000.0,
          material: Cesium.Color.fromCssColorString('#6F9F96').withAlpha(0.08),
          outline: false,
          height: renderAltitude + 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });

      // 4. Precision outer boundary ring (dashed elegant ring)
      ds.entities.add({
        id: 'analysis_location_outer_ring',
        position: Cesium.Cartesian3.fromDegrees(lon, lat, renderAltitude + 6),
        ellipse: {
          semiMajorAxis: 45000.0,
          semiMinorAxis: 45000.0,
          material: Cesium.Color.fromCssColorString('#000000').withAlpha(0.0), // transparent fill
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString('#6F9F96').withAlpha(0.85),
          outlineWidth: 2.0,
          height: renderAltitude + 6,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });

      // 5. Fine inner target ring
      ds.entities.add({
        id: 'analysis_location_inner_ring',
        position: Cesium.Cartesian3.fromDegrees(lon, lat, renderAltitude + 8),
        ellipse: {
          semiMajorAxis: 14000.0,
          semiMinorAxis: 14000.0,
          material: Cesium.Color.fromCssColorString('#000000').withAlpha(0.0),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString('#6F9F96').withAlpha(0.55),
          outlineWidth: 1.5,
          height: renderAltitude + 8,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });

      // 6. Center focal pip (dual halo: outer white, inner teal)
      ds.entities.add({
        id: 'analysis_location_marker',
        position: Cesium.Cartesian3.fromDegrees(lon, lat, renderAltitude + 12),
        point: {
          pixelSize: 10,
          color: Cesium.Color.fromCssColorString('#F1F0EA'),
          outlineColor: Cesium.Color.fromCssColorString('#0D0F0F'),
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
      ds.entities.add({
        id: 'analysis_location_marker_center',
        position: Cesium.Cartesian3.fromDegrees(lon, lat, renderAltitude + 13),
        point: {
          pixelSize: 4,
          color: Cesium.Color.fromCssColorString('#6F9F96'),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });

      // 7. Cardinal precision ticks (N, S, E, W - thin elegant)
      const dLat = 45000.0 / 111000.0;
      const dLon = 45000.0 / (111000.0 * Math.max(0.2, Math.cos((lat * Math.PI) / 180.0)));
      const tickExt = 9000.0 / 111000.0;
      const tickColor = Cesium.Color.fromCssColorString('#6F9F96').withAlpha(0.75);

      [['N', 0, dLat], ['S', 0, -dLat], ['E', dLon, 0], ['W', -dLon, 0]].forEach(([dir, dlo, dla]) => {
        ds.entities.add({
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights([
              lon + dlo, lat + dla, renderAltitude + 8,
              lon + dlo + (dir === 'E' ? tickExt : dir === 'W' ? -tickExt : 0),
              lat + dla + (dir === 'N' ? tickExt : dir === 'S' ? -tickExt : 0),
              renderAltitude + 8,
            ]),
            width: 1.5,
            material: tickColor,
            depthFailMaterial: tickColor,
            arcType: Cesium.ArcType.NONE,
          },
        });
      });

      // 8. Active model grid cell highlight
      try {
        const allGrids = globalOceanGridStore.getAll();
        const activeGrid = allGrids.find((g) => g.kind === 'CANONICAL_GRID_SCALAR' && g.coordinates?.latitudes);
        if (activeGrid) {
          const lats = activeGrid.coordinates.latitudes;
          const lons = activeGrid.coordinates.longitudes;
          let r0 = -1;
          for (let r = 0; r < lats.length - 1; r++) {
            if (lat >= lats[r] && lat <= lats[r + 1]) { r0 = r; break; }
          }
          let c0 = -1;
          for (let c = 0; c < lons.length - 1; c++) {
            if (lon >= lons[c] && lon <= lons[c + 1]) { c0 = c; break; }
          }
          if (r0 !== -1 && c0 !== -1) {
            ds.entities.add({
              id: 'analysis_location_grid_cell',
              rectangle: {
                coordinates: Cesium.Rectangle.fromDegrees(lons[c0], lats[r0], lons[c0 + 1], lats[r0 + 1]),
                material: Cesium.Color.fromCssColorString('#6F9F96').withAlpha(0.05),
                outline: true,
                outlineColor: Cesium.Color.fromCssColorString('#6F9F96').withAlpha(0.6),
                outlineWidth: 1.5,
                height: renderAltitude + 2,
              },
            });
          }
        }
      } catch (_e) {
        // graceful grid bbox fallback
      }

      governorRequestRender();
    }
  }, [analysisLocation]);

  // Scalar Field Layer Updates
  const csMin = colorScaleSettings?.min;
  const csMax = colorScaleSettings?.max;
  const csOpacity = colorScaleSettings?.opacity;
  const modelStatus = sourceStatuses.model;
  useEffect(() => {
    if (!scalarLayerRef.current) return;

    if (!layers.scalarField || subsurfaceMode !== 'HORIZONTAL_SLICE') {
      scalarLayerRef.current.remove();
      return;
    }

    const allGrids = globalOceanGridStore.getAll();
    const scalarGrids = allGrids.filter((g) => g.kind === 'CANONICAL_GRID_SCALAR');
    const scalarGrid = scalarGrids.find((g) => g.variable === activeVariable) || (activeVariable === 'ocean_current_velocity' ? null : scalarGrids[scalarGrids.length - 1]) || null;

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
  }, [activeVariable, activeColormap, activeDepthMeters, dataMode, modelStatus, layers.scalarField, layers.currentVectors, layers.particleFlow, subsurfaceMode, csMin, csMax, csOpacity]);

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
  }, [subsurfaceMode, selectedTransectId, verticalExaggeration, activeColormap, dataMode, modelStatus]);

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
  }, [subsurfaceMode, activeIsovalue, verticalExaggeration, activeColormap, dataMode, modelStatus]);

  // Vector Glyphs (Currents) Updates
  const currentStatus = sourceStatuses.current;
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
  }, [layers.currentVectors, layers.scalarField, layers.particleFlow, activeDepthMeters, isXRayMode, dataMode, currentStatus, activeVariable]);

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
  }, [layers.particleFlow, particleBudget, flowSpeed, activeDepthMeters, dataMode, currentStatus, activeVariable]);

  // In-Situ Profile Visualizer Updates
  const argoStatus = sourceStatuses.argo;
  const gliderStatus = sourceStatuses.glider;
  const ctdStatus = sourceStatuses.ctd;
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
  }, [layers.argoFloats, layers.ctdStations, layers.gliders, isXRayMode, dataMode, argoStatus, gliderStatus, ctdStatus, selectedProfile]);

  // Regional Weather Markers & Wind/Flow Directions
  const weatherMarkersVisible = layers.weatherMarkers;
  const windDirectionsVisible = layers.windDirections;
  useEffect(() => {
    if (!weatherMarkersLayerRef.current) return;

    if (!weatherMarkersVisible && !windDirectionsVisible) {
      weatherMarkersLayerRef.current.clear();
      return;
    }

    const allGrids = globalOceanGridStore.getAll();
    const scalarGrid =
      allGrids.find((g) => g.kind === 'CANONICAL_GRID_SCALAR' && (g.variable === 'temperature' || g.variable === 'sea_surface_temperature')) ||
      allGrids.find((g) => g.kind === 'CANONICAL_GRID_SCALAR') ||
      null;
    const vectorGrid = allGrids.find((g) => g.kind === 'CANONICAL_GRID_VECTOR') || null;

    if (scalarGrid) {
      weatherMarkersLayerRef.current.update({
        scalarGrid,
        vectorGrid,
        depthMeters: activeDepthMeters,
        colormapKey: activeColormap,
        showMarkers: weatherMarkersVisible,
        showDirections: windDirectionsVisible,
        labelSettings,
      });
    } else {
      weatherMarkersLayerRef.current.clear();
    }
  }, [
    weatherMarkersVisible,
    windDirectionsVisible,
    activeDepthMeters,
    activeColormap,
    dataMode,
    modelStatus,
    currentStatus,
    labelSettings,
  ]);

  return (
    <>
      <div ref={containerRef} className="cesium-container-wrapper" />
      {isViewerReady && (
        <>
          <GlobeToolRail orbitController={orbitController} onToggleShortcutsModal={handleToggleShortcuts} />
          <SelectedAreaWeatherCard viewerRef={viewerRef} />
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
