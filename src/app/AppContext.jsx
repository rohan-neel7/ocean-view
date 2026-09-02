/**
 * OceanView — Application Context & Real Scientific State Provider
 * Manages real scientific dataset feeds, velocity fields, multi-platform observations (Argo, Glider, CTD, BGC),
 * variable selection, depth slicing, customizable color scales, and dual presentation modes (Operational vs Outreach).
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  globalOceanGridStore,
  globalOceanProfileStore,
  createCanonicalGridScalar,
  createCanonicalProfile,
  DataState,
  SourceMode,
} from '../engine/index.js';
import { normalizeArgoProfile } from '../adapters/ArgoAdapter.js';
import { normalizeGliderMission } from '../adapters/GliderAdapter.js';
import { normalizeCTDCast } from '../adapters/CTDAdapter.js';
import { normalizeBGCProfile } from '../adapters/BGCAdapter.js';
import { normalizeOceanModelGrid } from '../adapters/OceanModelAdapter.js';
import { normalizeOceanCurrentGrid } from '../adapters/OceanCurrentAdapter.js';
import { ColorScaleManager } from '../visualization/color/ColorScaleManager.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Scientific Presentation Mode: 'OPERATIONAL' (High-density analysis) vs 'OUTREACH' (Educational exploration)
  const [presentationMode, setPresentationMode] = useState('OPERATIONAL');

  // Scientific Data Mode: 'REAL_SCIENTIFIC' or 'SYNTHETIC_DEMO'
  const [dataMode, setDataMode] = useState('REAL_SCIENTIFIC');
  const [sourceStatus, setSourceStatus] = useState('FETCHING'); // 'LIVE' | 'FIXTURE' | 'SYNTHETIC' | 'UNAVAILABLE'

  const [activeVariable, setActiveVariable] = useState('sea_surface_temperature');
  const [activeColormap, setActiveColormap] = useState('THERMAL');
  const [activeDepthMeters, setActiveDepthMeters] = useState(5);
  const [activeTimeStep, setActiveTimeStep] = useState(0);
  const [isPlayingTimeline, setIsPlayingTimeline] = useState(false);
  const [activeRegion, setActiveRegion] = useState('ARABIAN_SEA');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [probedCoordinate, setProbedCoordinate] = useState(null);

  // Multi-Platform Observation Filter: 'ALL' | 'ARGO' | 'GLIDER' | 'CTD' | 'BGC'
  const [selectedPlatformType, setSelectedPlatformType] = useState('ALL');

  // Color Scale Customization
  const [colorScaleSettings, setColorScaleSettings] = useState({
    min: null,
    max: null,
    scaleType: 'linear',
    reversed: false,
    opacity: 0.85,
  });
  const [colorbarModalOpen, setColorbarModalOpen] = useState(false);

  // Particle Flow Controls
  const [particleBudget, setParticleBudget] = useState('MEDIUM');
  const [flowSpeed, setFlowSpeed] = useState(1.0);

  // Subsurface 3D Exploration Controls
  const [isXRayMode, setIsXRayMode] = useState(false);
  const [subsurfaceMode, setSubsurfaceMode] = useState('HORIZONTAL_SLICE'); // 'HORIZONTAL_SLICE' | 'VERTICAL_TRANSECT' | 'ISOSURFACE_3D'
  const [verticalExaggeration, setVerticalExaggeration] = useState(20);
  const [activeIsovalue, setActiveIsovalue] = useState(20); // 20°C Isotherm default
  const [selectedTransectId, setSelectedTransectId] = useState('arabian_sea_basin');

  // Active Layer Toggles
  const [layers, setLayers] = useState({
    scalarField: true,
    currentVectors: false,
    particleFlow: true,
    argoFloats: true,
    ctdStations: true,
    gliders: true,
    depthSlices: false,
  });

  const toggleLayer = (layerKey) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  /**
   * Ingests real ocean model grids, velocity vectors, Argo floats, gliders, CTD casts, and BGC profiles.
   */
  /**
   * Fetches the model scalar grid for the current variable and depth.
   * Called on initial load AND whenever variable or depth changes.
   */
  const fetchModelGrid = useCallback(async (variable, depthMeters) => {
    // Map UI variable IDs to ERDDAP variable names
    const erddapVarName = variable === 'salinity' ? 'salinity' : 'temperature';
    const urlVar = erddapVarName === 'salinity' ? 'Salinity' : 'Temperature';
    try {
      const url = `/api/ocean/model/slice?minLat=5&maxLat=20&minLon=60&maxLon=80&stride=1&depth=${depthMeters}&variable=${urlVar}`;
      const modelRes = await fetch(url);
      if (modelRes.ok) {
        const modelJson = await modelRes.json();
        const canonicalGrid = normalizeOceanModelGrid(modelJson, {
          sourceMode: modelJson.sourceMode || SourceMode.LIVE,
          dataState: DataState.MODELED,
        });
        globalOceanGridStore.setGrid(canonicalGrid);
      }
    } catch (_err) {
      console.warn('[AppContext] Model grid fetch failed for', variable, depthMeters);
    }
  }, []);

  const loadRealScientificData = useCallback(async (variable = 'sea_surface_temperature', depthMeters = 5) => {
    try {
      setSourceStatus('FETCHING');

      // 1. Fetch Real Ocean Model Grid Slice (variable + depth aware)
      await fetchModelGrid(variable, depthMeters);

      // 2. Fetch Real Ocean Current Velocity Slice (u, v from ANDRO)
      const currentRes = await fetch('/api/ocean/current/slice?minLat=5&maxLat=20&minLon=60&maxLon=80&stride=2&depth=5');
      if (currentRes.ok) {
        const currentJson = await currentRes.json();
        const canonicalVector = normalizeOceanCurrentGrid(currentJson, {
          sourceMode: currentJson.sourceMode || SourceMode.LIVE,
        });
        globalOceanGridStore.setGrid(canonicalVector);
      }

      // 3. Fetch Real In-Situ Argo Profiles
      const argoRes = await fetch('/api/ocean/argo/profiles?minLat=5&maxLat=20&minLon=60&maxLon=80&maxProfiles=10');
      if (argoRes.ok) {
        const argoJson = await argoRes.json();
        const profiles = argoJson.profiles || [];
        for (const p of profiles) {
          const canonicalProf = normalizeArgoProfile(p, {
            sourceMode: argoJson.sourceMode || SourceMode.LIVE,
          });
          globalOceanProfileStore.addProfile(canonicalProf);
        }
      }

      // 4. Fetch Real Autonomous Glider Mission
      try {
        const gliderRes = await fetch('/api/ocean/glider/missions');
        if (gliderRes.ok) {
          const gliderJson = await gliderRes.json();
          const { profiles } = normalizeGliderMission(gliderJson);
          for (const prof of profiles) {
            globalOceanProfileStore.addProfile(prof);
          }
        }
      } catch (_gErr) {
        console.warn('[AppContext] Glider fetch error, skipping.');
      }

      // 5. Fetch Real CTD Cruise Stations
      try {
        const ctdRes = await fetch('/api/ocean/ctd/stations');
        if (ctdRes.ok) {
          const ctdJson = await ctdRes.json();
          for (const stn of ctdJson.stations || []) {
            const canonicalCTD = normalizeCTDCast({
              ...stn,
              cruiseName: ctdJson.cruiseName,
              vesselName: ctdJson.vesselName,
              source: ctdJson.source,
            });
            globalOceanProfileStore.addProfile(canonicalCTD);
          }
        }
      } catch (_cErr) {
        console.warn('[AppContext] CTD fetch error, skipping.');
      }

      // 6. Fetch Real BGC Profiles
      try {
        const bgcRes = await fetch('/api/ocean/bgc/profiles');
        if (bgcRes.ok) {
          const bgcJson = await bgcRes.json();
          for (const prof of bgcJson.profiles || []) {
            const canonicalBGC = normalizeBGCProfile(prof);
            globalOceanProfileStore.addProfile(canonicalBGC);
          }
        }
      } catch (_bErr) {
        console.warn('[AppContext] BGC fetch error, skipping.');
      }

      // Select initial profile target
      const allProfiles = globalOceanProfileStore.getAll();
      if (allProfiles.length > 0) {
        setSelectedProfile(allProfiles[0]);
      }

      setSourceStatus('LIVE');
    } catch (_err) {
      console.warn('[AppContext] Real data fetch failed, using offline scientific fixture.');
      seedSyntheticDemonstrationData();
      setSourceStatus('SYNTHETIC');
    }
  }, [fetchModelGrid]);

  // Initialize Data Feed on Mount or Mode Change
  useEffect(() => {
    if (dataMode === 'REAL_SCIENTIFIC') {
      loadRealScientificData(activeVariable, activeDepthMeters);
    } else {
      seedSyntheticDemonstrationData();
      setSourceStatus('SYNTHETIC');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataMode]);

  // Re-fetch model grid when variable or depth changes (after initial load)
  const isFirstMount = React.useRef(true);
  useEffect(() => {
    // Skip on first mount — the main loadRealScientificData call handles it
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (dataMode !== 'REAL_SCIENTIFIC') return;
    // Chlorophyll is not available from current ERDDAP endpoints; skip re-fetch
    if (activeVariable === 'chlorophyll_a') {
      setSourceStatus('UNAVAILABLE');
      return;
    }
    // Current velocity uses the vector grid, not scalar — but still needs to trigger
    // GlobeViewer re-render to show vector/particle layers
    if (activeVariable === 'ocean_current_velocity') {
      setSourceStatus('LIVE');
      return;
    }
    setSourceStatus('FETCHING');
    fetchModelGrid(activeVariable, activeDepthMeters).then(() => {
      // Bump sourceStatus to trigger GlobeViewer useEffect re-run
      setSourceStatus('LIVE');
    });
  }, [activeVariable, activeDepthMeters, dataMode, fetchModelGrid]);

  // Timeline Step Timer
  useEffect(() => {
    if (!isPlayingTimeline) return;
    const timer = setInterval(() => {
      setActiveTimeStep((prev) => (prev + 1) % 4);
    }, 2500);
    return () => clearInterval(timer);
  }, [isPlayingTimeline]);

  // Dynamic Color Scale Manager instance
  const colorScaleManager = new ColorScaleManager({
    variableId: activeVariable,
    colormapId: activeColormap,
    min: colorScaleSettings.min,
    max: colorScaleSettings.max,
    scaleType: colorScaleSettings.scaleType,
    reversed: colorScaleSettings.reversed,
    opacity: colorScaleSettings.opacity,
  });

  return (
    <AppContext.Provider
      value={{
        presentationMode,
        setPresentationMode,
        dataMode,
        setDataMode,
        sourceStatus,
        activeVariable,
        setActiveVariable,
        activeColormap,
        setActiveColormap,
        activeDepthMeters,
        setActiveDepthMeters,
        activeTimeStep,
        setActiveTimeStep,
        isPlayingTimeline,
        setIsPlayingTimeline,
        activeRegion,
        setActiveRegion,
        selectedProfile,
        setSelectedProfile,
        probedCoordinate,
        setProbedCoordinate,
        selectedPlatformType,
        setSelectedPlatformType,
        colorScaleSettings,
        setColorScaleSettings,
        colorScaleManager,
        colorbarModalOpen,
        setColorbarModalOpen,
        particleBudget,
        setParticleBudget,
        flowSpeed,
        setFlowSpeed,
        isXRayMode,
      setIsXRayMode,
      subsurfaceMode,
        setSubsurfaceMode,
        verticalExaggeration,
        setVerticalExaggeration,
        activeIsovalue,
        setActiveIsovalue,
        selectedTransectId,
        setSelectedTransectId,
        layers,
        toggleLayer,
        loadRealScientificData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useOceanView() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useOceanView must be used within an AppProvider');
  return ctx;
}

/**
 * Seeds synthetic demonstration data when in SYNTHETIC mode.
 */
function seedSyntheticDemonstrationData() {
  const lats = [5, 10, 15, 20];
  const lons = [60, 65, 70, 75, 80];
  const depths = [0, 5, 50, 100, 500, 1000];

  const totalCells = lats.length * lons.length * depths.length;
  const sstBuffer = new Float32Array(totalCells);

  for (let i = 0; i < totalCells; i++) {
    sstBuffer[i] = 27.5 + (i % 10) * 0.1;
  }

  const sstGrid = createCanonicalGridScalar({
    id: 'demo:mom6:sst:t0',
    source: 'SYNTHETIC_DEMO_OCEAN',
    sourceMode: SourceMode.SYNTHETIC_DEMO,
    variable: 'sea_surface_temperature',
    unit: '°C',
    dataState: DataState.MODELED,
    timestamp: '2026-08-27T00:00:00Z',
    dimensions: { latCount: lats.length, lonCount: lons.length, depthCount: depths.length },
    latitudes: lats,
    longitudes: lons,
    depths,
    data: sstBuffer,
  });

  globalOceanGridStore.setGrid(sstGrid);

  const demoProfile = createCanonicalProfile({
    id: 'demo:argo:2900771',
    source: 'SYNTHETIC_DEMO_ARGO',
    sourceMode: SourceMode.SYNTHETIC_DEMO,
    platformId: 'Argo Float #2900771 (SYNTHETIC)',
    platformType: 'ARGO_FLOAT',
    location: { lat: 14.5, lon: 66.8 },
    depths: [5, 25, 50, 100, 250, 500, 1000],
    variables: {
      temperature: [28.4, 28.1, 25.4, 21.2, 14.5, 10.1, 6.2],
      salinity: [36.2, 36.2, 36.4, 35.8, 35.2, 35.0, 34.8],
    },
    units: { temperature: '°C', salinity: 'PSU' },
    dataState: DataState.OBSERVED,
    observedAt: '2026-08-27T00:00:00Z',
    quality: { qualityFlags: [1, 1, 1, 1, 1, 1, 1] },
  });

  globalOceanProfileStore.addProfile(demoProfile);
}
