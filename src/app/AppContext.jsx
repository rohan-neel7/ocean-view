/**
 * OceanView — Application Context & Real Scientific State Provider
 * Manages real scientific dataset feeds, velocity fields, multi-platform observations,
 * variable selection, depth slicing, customizable color scales, and dual presentation modes.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  globalOceanGridStore,
  globalOceanProfileStore,
  createCanonicalGridScalar,
  createCanonicalProfile,
  DataState,
  SourceMode,
  DATASET_CAPABILITIES,
  SDC_TIME_STEPS
} from '../engine/index.js';
import { OCEAN_REGIONS } from '../engine/rendering/cameraVerbs.js';
import { normalizeArgoProfile } from '../adapters/ArgoAdapter.js';
import { normalizeGliderMission } from '../adapters/GliderAdapter.js';
import { normalizeCTDCast } from '../adapters/CTDAdapter.js';
import { normalizeBGCProfile } from '../adapters/BGCAdapter.js';
import { normalizeOceanModelGrid } from '../adapters/OceanModelAdapter.js';
import { normalizeOceanCurrentGrid } from '../adapters/OceanCurrentAdapter.js';
import { ColorScaleManager } from '../visualization/color/ColorScaleManager.js';
import {
  createAnalysisLocation,
  isOceanLocation,
  getAnalysisBounds,
  findNearbyObservations,
  sampleAnalysisLocation,
  AnalysisLocationSource,
  AnalysisStatus,
} from '../engine/ocean/analysisLocation.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [presentationMode, setPresentationMode] = useState('OPERATIONAL');
  const [dataMode, setDataMode] = useState('REAL_SCIENTIFIC');
  
  // Unified Scientific Selection
  const [scientificSelection, setScientificSelection] = useState({
    variable: 'sea_surface_temperature',
    depthMeters: 5,
    timeValue: '2010-01-16T00:00:00Z',
    bounds: OCEAN_REGIONS['ARABIAN_SEA'].dataBounds,
    regionKey: 'ARABIAN_SEA',
    location: null // { lat, lon }
  });

  // Granular Source Status
  const [sourceStatuses, setSourceStatuses] = useState({
    model: 'IDLE',
    current: 'IDLE',
    argo: 'IDLE',
    glider: 'IDLE',
    ctd: 'IDLE',
    bgc: 'IDLE'
  });

  const [activeColormap, setActiveColormap] = useState('THERMAL');
  const [isPlayingTimeline, setIsPlayingTimeline] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);

  // Multi-Platform Observation Filter
  const [selectedPlatformType, setSelectedPlatformType] = useState('ALL');

  // Color Scale Customization
  const [colorScaleSettings, setColorScaleSettings] = useState({
    min: null, max: null, scaleType: 'linear', reversed: false, opacity: 0.85,
  });
  const [colorbarModalOpen, setColorbarModalOpen] = useState(false);

  // Spatial Investigation Workspace
  const [analysisLocation, setAnalysisLocationState] = useState(null);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [analysisFeedback, setAnalysisFeedback] = useState(null);
  const analysisGenRef = useRef(0);

  // Particle Flow Controls
  const [particleBudget, setParticleBudget] = useState('MEDIUM');
  const [flowSpeed, setFlowSpeed] = useState(1.0);

  // Subsurface 3D Exploration Controls
  const [isXRayMode, setIsXRayMode] = useState(false);
  const [subsurfaceMode, setSubsurfaceMode] = useState('HORIZONTAL_SLICE');
  const [verticalExaggeration, setVerticalExaggeration] = useState(20);
  const [activeIsovalue, setActiveIsovalue] = useState(20);
  const [selectedTransectId, setSelectedTransectId] = useState('arabian_sea_basin');

  // Active Layer Toggles
  const [layers, setLayers] = useState({
    scalarField: true,
    currentVectors: true,
    particleFlow: true,
    argoFloats: true,
    ctdStations: true,
    gliders: true,
    depthSlices: false,
  });

  const toggleLayer = useCallback((layerKey) => setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] })), []);

  // Helper to fetch the model scalar grid using unified selection
  const fetchModelGrid = useCallback(async (selection) => {
    const caps = DATASET_CAPABILITIES[selection.variable];
    if (!caps || !caps.available || caps.kind !== 'SCALAR') {
      globalOceanGridStore.removeGridByVariable(selection.variable); // Clear stale
      return;
    }
    
    setSourceStatuses(prev => ({ ...prev, model: 'LOADING' }));
    
    const erddapVarName = selection.variable === 'salinity' ? 'salinity' : 'temperature';
    const urlVar = erddapVarName === 'salinity' ? 'Salinity' : 'Temperature';
    const { minLat, maxLat, minLon, maxLon } = selection.bounds;
    
    try {
      const url = `/api/ocean/model/slice?minLat=${minLat}&maxLat=${maxLat}&minLon=${minLon}&maxLon=${maxLon}&stride=1&depth=${selection.depthMeters}&time=${selection.timeValue}&variable=${urlVar}`;
      const modelRes = await fetch(url);
      if (modelRes.ok) {
        const modelJson = await modelRes.json();
        const canonicalGrid = normalizeOceanModelGrid(modelJson, {
          sourceMode: modelJson.sourceMode || SourceMode.LIVE,
          dataState: DataState.MODELED,
        });
        globalOceanGridStore.removeGridByVariable(selection.variable); // Clear stale
        globalOceanGridStore.setGrid(canonicalGrid);
        setSourceStatuses(prev => ({ ...prev, model: modelJson.sourceMode === 'FIXTURE' ? 'FIXTURE' : 'READY' }));
      } else {
        setSourceStatuses(prev => ({ ...prev, model: 'ERROR' }));
      }
    } catch (_err) {
      console.warn('[AppContext] Model grid fetch failed');
      setSourceStatuses(prev => ({ ...prev, model: 'ERROR' }));
    }
  }, []);

  // Fetch Vectors (ANDRO)
  const fetchCurrentVectors = useCallback(async (selection) => {
    const { minLat, maxLat, minLon, maxLon } = selection.bounds;
    setSourceStatuses(prev => ({ ...prev, current: 'LOADING' }));
    
    try {
      const currentRes = await fetch(`/api/ocean/current/slice?minLat=${minLat}&maxLat=${maxLat}&minLon=${minLon}&maxLon=${maxLon}&stride=2&depth=${selection.depthMeters}`);
      if (currentRes.ok) {
        const currentJson = await currentRes.json();
        const canonicalVector = normalizeOceanCurrentGrid(currentJson, {
          sourceMode: currentJson.sourceMode || SourceMode.LIVE,
        });
        globalOceanGridStore.removeGridByVariable('ocean_current_velocity');
        globalOceanGridStore.setGrid(canonicalVector);
        setSourceStatuses(prev => ({ ...prev, current: currentJson.sourceMode === 'FIXTURE' ? 'FIXTURE' : 'READY' }));
      } else {
        setSourceStatuses(prev => ({ ...prev, current: 'ERROR' }));
      }
    } catch (err) {
      setSourceStatuses(prev => ({ ...prev, current: 'ERROR' }));
    }
  }, []);

  // Fetch Argo
  const fetchArgo = useCallback(async (selection) => {
    const { minLat, maxLat, minLon, maxLon } = selection.bounds;
    setSourceStatuses(prev => ({ ...prev, argo: 'LOADING' }));
    try {
      const argoRes = await fetch(`/api/ocean/argo/profiles?minLat=${minLat}&maxLat=${maxLat}&minLon=${minLon}&maxLon=${maxLon}&maxProfiles=10`);
      if (argoRes.ok) {
        const argoJson = await argoRes.json();
        const profiles = argoJson.profiles || [];
        for (const p of profiles) {
          const canonicalProf = normalizeArgoProfile(p, { sourceMode: argoJson.sourceMode || SourceMode.LIVE });
          globalOceanProfileStore.addProfile(canonicalProf);
        }
        setSourceStatuses(prev => ({ ...prev, argo: argoJson.sourceMode === 'FIXTURE' ? 'FIXTURE' : 'READY' }));
      } else {
        setSourceStatuses(prev => ({ ...prev, argo: 'ERROR' }));
      }
    } catch (err) {
      setSourceStatuses(prev => ({ ...prev, argo: 'ERROR' }));
    }
  }, []);
  
  const fetchGlider = useCallback(async () => {
    setSourceStatuses(prev => ({ ...prev, glider: 'LOADING' }));
    try {
      const gliderRes = await fetch('/api/ocean/glider/missions');
      if (gliderRes.ok) {
        const gliderJson = await gliderRes.json();
        const { profiles } = normalizeGliderMission(gliderJson);
        profiles.forEach(prof => globalOceanProfileStore.addProfile(prof));
        setSourceStatuses(prev => ({ ...prev, glider: gliderJson.sourceMode === 'FIXTURE' ? 'FIXTURE' : 'READY' }));
      } else {
        setSourceStatuses(prev => ({ ...prev, glider: 'ERROR' }));
      }
    } catch (err) {
      setSourceStatuses(prev => ({ ...prev, glider: 'ERROR' }));
    }
  }, []);
  
  const fetchCTD = useCallback(async () => {
    setSourceStatuses(prev => ({ ...prev, ctd: 'LOADING' }));
    try {
      const ctdRes = await fetch('/api/ocean/ctd/stations');
      if (ctdRes.ok) {
        const ctdJson = await ctdRes.json();
        for (const stn of ctdJson.stations || []) {
          const canonicalCTD = normalizeCTDCast({
            ...stn, cruiseName: ctdJson.cruiseName, vesselName: ctdJson.vesselName, source: ctdJson.source,
          });
          globalOceanProfileStore.addProfile(canonicalCTD);
        }
        setSourceStatuses(prev => ({ ...prev, ctd: ctdJson.sourceMode === 'FIXTURE' ? 'FIXTURE' : 'READY' }));
      } else {
        setSourceStatuses(prev => ({ ...prev, ctd: 'ERROR' }));
      }
    } catch (err) {
      setSourceStatuses(prev => ({ ...prev, ctd: 'ERROR' }));
    }
  }, []);
  
  const fetchBGC = useCallback(async () => {
    setSourceStatuses(prev => ({ ...prev, bgc: 'LOADING' }));
    try {
      const bgcRes = await fetch('/api/ocean/bgc/profiles');
      if (bgcRes.ok) {
        const bgcJson = await bgcRes.json();
        for (const prof of bgcJson.profiles || []) {
          const canonicalBGC = normalizeBGCProfile(prof);
          globalOceanProfileStore.addProfile(canonicalBGC);
        }
        setSourceStatuses(prev => ({ ...prev, bgc: bgcJson.sourceMode === 'FIXTURE' ? 'FIXTURE' : 'READY' }));
      } else {
        setSourceStatuses(prev => ({ ...prev, bgc: 'ERROR' }));
      }
    } catch (err) {
      setSourceStatuses(prev => ({ ...prev, bgc: 'ERROR' }));
    }
  }, []);

  const loadRealScientificData = useCallback(async (selection) => {
    if (dataMode !== 'REAL_SCIENTIFIC') {
      seedSyntheticDemonstrationData();
      setSourceStatuses({ model: 'SYNTHETIC', current: 'SYNTHETIC', argo: 'SYNTHETIC', glider: 'SYNTHETIC', ctd: 'SYNTHETIC', bgc: 'SYNTHETIC' });
      return;
    }
    
    // Clear old data when changing bounds
    globalOceanGridStore.clear();
    globalOceanProfileStore.clear();
    
    // Fire all fetches
    fetchModelGrid(selection);
    fetchCurrentVectors(selection);
    fetchArgo(selection);
    fetchGlider();
    fetchCTD();
    fetchBGC();
  }, [dataMode, fetchModelGrid, fetchCurrentVectors, fetchArgo, fetchGlider, fetchCTD, fetchBGC]);

  // Handle dataMode toggles or initial mount
  useEffect(() => {
    loadRealScientificData(scientificSelection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataMode]);
  
  // Track selection changes and refetch as necessary
  const prevSelection = useRef(scientificSelection);
  useEffect(() => {
    if (dataMode !== 'REAL_SCIENTIFIC') return;
    const curr = scientificSelection;
    const prev = prevSelection.current;
    
    // If spatial bounds, depth, variable, or time value changed, refetch relevant subsets
    if (curr.bounds !== prev.bounds || curr.timeValue !== prev.timeValue || curr.depthMeters !== prev.depthMeters || curr.variable !== prev.variable) {
       // Clear scalar fields if variable changed so stale map doesn't show
       if (curr.variable !== prev.variable || curr.depthMeters !== prev.depthMeters) {
         globalOceanGridStore.removeGridByVariable(prev.variable);
       }
       // Fetch relevant grids
       fetchModelGrid(curr);
       if (curr.variable === 'ocean_current_velocity' || curr.depthMeters !== prev.depthMeters || curr.bounds !== prev.bounds || layers.currentVectors || layers.particleFlow) {
         fetchCurrentVectors(curr);
       }
       if (curr.bounds !== prev.bounds) {
         fetchArgo(curr); // re-fetch profiles in new bounds
       }
    }
    prevSelection.current = curr;
  }, [scientificSelection, dataMode, fetchModelGrid, fetchCurrentVectors, fetchArgo, layers.currentVectors, layers.particleFlow]);

  // If current layers are enabled but grid is missing, ensure fetch
  useEffect(() => {
    if (dataMode !== 'REAL_SCIENTIFIC') return;
    if (layers.currentVectors || layers.particleFlow) {
      const all = globalOceanGridStore.getAll();
      const hasVector = all.some(g => g.kind === 'CANONICAL_GRID_VECTOR');
      if (!hasVector) {
        fetchCurrentVectors(scientificSelection);
      }
    }
  }, [layers.currentVectors, layers.particleFlow, dataMode, scientificSelection, fetchCurrentVectors]);

  // Timeline Step Timer
  useEffect(() => {
    if (!isPlayingTimeline) return;
    const timer = setInterval(() => {
      setScientificSelection((prev) => {
        const caps = DATASET_CAPABILITIES[prev.variable];
        if (!caps || !caps.supportedTimes || caps.supportedTimes.length === 0) return prev;
        const currentIndex = caps.supportedTimes.findIndex(t => t.value === prev.timeValue);
        const nextIndex = (currentIndex + 1) % caps.supportedTimes.length;
        return { ...prev, timeValue: caps.supportedTimes[nextIndex].value };
      });
    }, 2500);
    return () => clearInterval(timer);
  }, [isPlayingTimeline]);

  // Derived state helpers for UI
  const activeVariable = scientificSelection.variable;
  const activeDepthMeters = scientificSelection.depthMeters;
  const activeRegion = scientificSelection.regionKey;
  
  // For backward compatibility with TimelineControl which might still use index:
  const caps = DATASET_CAPABILITIES[scientificSelection.variable];
  const activeTimeStep = caps && caps.supportedTimes ? caps.supportedTimes.findIndex(t => t.value === scientificSelection.timeValue) : 0;
  
  const setActiveVariable = useCallback((v) => {
    setScientificSelection(s => ({ ...s, variable: v }));
    if (v === 'ocean_current_velocity') {
      setLayers(l => ({ ...l, currentVectors: true }));
    }
  }, []);
  const setActiveDepthMeters = useCallback((d) => setScientificSelection(s => ({ ...s, depthMeters: d })), []);
  const setActiveRegion = useCallback((rKey) => setScientificSelection(s => ({ ...s, regionKey: rKey, bounds: OCEAN_REGIONS[rKey].dataBounds })), []);
  const setAnalysisLocation = useCallback(async (locInput) => {
    if (!locInput) return;
    const lat = typeof locInput.latitude === 'number' ? locInput.latitude : locInput.lat;
    const lon = typeof locInput.longitude === 'number' ? locInput.longitude : locInput.lon;
    if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) return;

    const analysisGen = ++analysisGenRef.current;

    // Ocean vs Land verification
    const oceanCheck = isOceanLocation(lat, lon);
    if (!oceanCheck.isOcean) {
      setAnalysisFeedback({ type: 'warning', message: oceanCheck.reason || 'Selected point is on land. Please click an ocean region to investigate oceanographic data.' });
      setTimeout(() => setAnalysisFeedback(null), 4500);
      return;
    }

    const bounds = getAnalysisBounds({ latitude: lat, longitude: lon, radiusDeg: 3.0 });
    const newLoc = createAnalysisLocation({
      latitude: lat,
      longitude: lon,
      source: locInput.source || AnalysisLocationSource.CLICK,
      bounds,
      status: AnalysisStatus.ANALYZING,
    });

    setAnalysisLocationState(newLoc);
    setAnalysisFeedback(null);
    setScientificSelection(s => ({ ...s, location: { lat, lon }, bounds }));

    // Keep up to 5 unique recent locations in memory
    setAnalysisHistory(prev => {
      const filtered = prev.filter(item =>
        Math.abs(item.latitude - newLoc.latitude) > 0.05 || Math.abs(item.longitude - newLoc.longitude) > 0.05
      );
      return [newLoc, ...filtered].slice(0, 5);
    });

    // Check if current grid in OceanGridStore covers this location
    const allGrids = globalOceanGridStore.getAll();
    const scalarGrid = allGrids.find(g => g.kind === 'CANONICAL_GRID_SCALAR' && g.variable === scientificSelection.variable);

    const isCoveredByScalar = scalarGrid && scalarGrid.coordinates?.bbox &&
      newLoc.latitude >= scalarGrid.coordinates.bbox.minLat &&
      newLoc.latitude <= scalarGrid.coordinates.bbox.maxLat &&
      newLoc.longitude >= scalarGrid.coordinates.bbox.minLon &&
      newLoc.longitude <= scalarGrid.coordinates.bbox.maxLon;

    if (isCoveredByScalar) {
      if (analysisGenRef.current === analysisGen) {
        setAnalysisLocationState(loc => (loc && loc.selectedAt === newLoc.selectedAt ? { ...loc, status: AnalysisStatus.READY } : loc));
      }
      return;
    }

    // If not covered, trigger bounded fetch with request cancellation
    try {
      const selectionForLocation = {
        ...scientificSelection,
        bounds,
      };

      await Promise.all([
        fetchModelGrid(selectionForLocation),
        fetchCurrentVectors(selectionForLocation),
        fetchArgo(selectionForLocation),
      ]);

      if (analysisGenRef.current !== analysisGen) return;

      setAnalysisLocationState(loc => (loc && loc.selectedAt === newLoc.selectedAt ? { ...loc, status: AnalysisStatus.READY } : loc));
    } catch (_err) {
      if (analysisGenRef.current !== analysisGen) return;
      setAnalysisLocationState(loc => (loc && loc.selectedAt === newLoc.selectedAt ? { ...loc, status: AnalysisStatus.PARTIAL } : loc));
    }
  }, [scientificSelection, fetchModelGrid, fetchCurrentVectors, fetchArgo]);

  const clearAnalysis = useCallback(() => {
    setAnalysisLocationState(null);
    setAnalysisFeedback(null);
  }, []);

  const sampleModelValues = useCallback(() => {
    if (!analysisLocation) return null;
    return sampleAnalysisLocation(analysisLocation, globalOceanGridStore, scientificSelection.depthMeters);
  }, [analysisLocation, scientificSelection.depthMeters]);

  const getNearbyObservations = useCallback((radiusKm = 500) => {
    if (!analysisLocation) return { nearbyProfiles: [], nearest: null, counts: { argo: 0, glider: 0, ctd: 0, bgc: 0, total: 0 } };
    return findNearbyObservations(analysisLocation, globalOceanProfileStore.getAll(), radiusKm);
  }, [analysisLocation]);

  const setProbedCoordinate = useCallback((loc) => {
    if (!loc) return;
    const lat = typeof loc.latitude === 'number' ? loc.latitude : loc.lat;
    const lon = typeof loc.longitude === 'number' ? loc.longitude : loc.lon;
    setAnalysisLocation({ latitude: lat, longitude: lon, source: loc.source || AnalysisLocationSource.CLICK });
  }, [setAnalysisLocation]);

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
        presentationMode, setPresentationMode,
        dataMode, setDataMode,
        scientificSelection, setScientificSelection,
        sourceStatuses, setSourceStatuses,
        activeVariable, setActiveVariable,
        activeColormap, setActiveColormap,
        activeDepthMeters, setActiveDepthMeters,
        activeTimeStep, 
        isPlayingTimeline, setIsPlayingTimeline,
        activeRegion, setActiveRegion,
        selectedProfile, setSelectedProfile,
        probedCoordinate: scientificSelection.location, setProbedCoordinate,
        analysisLocation, setAnalysisLocation,
        analysisHistory,
        analysisFeedback, setAnalysisFeedback,
        clearAnalysis,
        sampleModelValues,
        getNearbyObservations,
        selectedPlatformType, setSelectedPlatformType,
        colorScaleSettings, setColorScaleSettings,
        colorScaleManager,
        colorbarModalOpen, setColorbarModalOpen,
        particleBudget, setParticleBudget,
        flowSpeed, setFlowSpeed,
        isXRayMode, setIsXRayMode,
        subsurfaceMode, setSubsurfaceMode,
        verticalExaggeration, setVerticalExaggeration,
        activeIsovalue, setActiveIsovalue,
        selectedTransectId, setSelectedTransectId,
        layers, toggleLayer,
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
