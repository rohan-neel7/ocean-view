# Phase 8.1 — Current Velocity Visualization & Data Pipeline Audit

## Executive Summary
This document provides an end-to-end audit of the Current Velocity data pipeline in OceanView, tracing user interaction through state management, backend data services, ingestion adapters, canonical vector storage, and Cesium rendering layers.

---

## 1. End-to-End Pipeline Trace

```
User Click: "Current Velocity" (VariableSelector.jsx / LayerPanel.jsx)
  │
  ▼
AppContext.jsx (State Mutation)
  • activeVariable = 'ocean_current_velocity'
  • layers.currentVectors = true / layers.particleFlow = true
  • Triggers fetchCurrentVectors(selection)
  │
  ▼
HTTP GET /api/ocean/current/slice?minLat=...&maxLat=...&minLon=...&maxLon=...&stride=...&depth=...
  │
  ▼
server/oceanDataService.js (Backend Service)
  • Checks oceanDataCache
  • Attempts Live ERDDAP fetch from Ifremer tabledap/ANDRO.json
  • Fallback to verified real ANDRO climatology fixture (realCurrentSliceArabianSea.json / multi-region)
  • Returns standardized JSON payload { datasetId: 'ANDRO', temporalState: 'CLIMATOLOGY', uData, vData, latitudes, longitudes, ... }
  │
  ▼
src/adapters/OceanCurrentAdapter.js (Ingestion & Normalization)
  • normalizeOceanCurrentGrid(payload)
  • Converts cm/s to SI m/s (factor 0.01) if necessary
  • Validates Float32Array bounds and rejects invalid/NaN coordinates
  • Preserves fillValue (-9999.0) for landmask cells (Missing ≠ Zero)
  • Sets temporalState = 'CLIMATOLOGY', dataState = 'MODELED', provenance
  │
  ▼
src/engine/ocean/CanonicalGridVector.js (Canonical Entity)
  • createCanonicalGridVector()
  • Stores contiguous Float32Array uData and vData
  • Computes precomputed stats: minSpeed, maxSpeed, validCellCount
  • Provides getVector(latIdx, lonIdx, depthIdx) returning { u, v, speed, headingDeg }
  │
  ▼
src/engine/ocean/OceanGridStore.js (In-Memory Store)
  • globalOceanGridStore.removeGridByVariable('ocean_current_velocity')
  • globalOceanGridStore.setGrid(canonicalVector)
  │
  ▼
src/components/globe/GlobeViewer.jsx (Rendering Coordination)
  • React effect detects sourceStatuses.current / layers.currentVectors / activeDepthMeters
  • Retrieves vectorGrid from globalOceanGridStore
  │
  ├──► src/visualization/vector/VectorFieldLayer.js
  │      • Computes geographic arrow shafts and head polylines
  │      • Colors by cmocean 'speed' palette
  │      • Adds CustomDataSource entities with depthFailMaterial to guarantee visibility
  │      • Triggers governorRequestRender()
  │
  └──► src/visualization/vector/ParticleCurrentLayer.js
         • Samples (u, v) bilinearly across canvas texture
         • Advects particles on transparent canvas
         • Holds continuous render during animation
```

---

## 2. Root Causes of Missing / Occluded Current Visualization

1. **Uncalled Fetch Trigger on Variable Switch**:
   - In `AppContext.jsx`, the variable-change effect only called `fetchCurrentVectors` if `bounds` or `depthMeters` changed. Switching the variable directly from SST to Current Velocity did not trigger a refetch of vector data.
2. **Default Layer Inactivity**:
   - `layers.currentVectors` was set to `false` by default, leaving vector glyphs dormant upon variable selection.
3. **Cesium Depth Occlusion for Polylines**:
   - `VectorFieldLayer.js` created polyline entities at 5m surface altitude with `depthFailMaterial: undefined` (unless `isXRayMode` was true). From orbital/regional camera distances (altitude ~5,000,000m), Cesium's logarithmic depth buffer occluded the surface polylines against the globe ellipsoid. Setting `depthFailMaterial: color` ensures the arrows remain crisp and visible regardless of camera distance or terrain.
4. **Decimation & Scale Calibration**:
   - The vector scale was fixed and lacked a visual scale indicator (`VECTOR SCALE: 0.25 m/s ──►`) to inform scientific interpretation.

---

## 3. Data Source Truthfulness (ANDRO)

- **Dataset**: ANDRO (Argo New Displacements Rannou and Ollitrault)
- **Provider**: Scripps Institution of Oceanography / Ifremer
- **Semantic Classification**: `CLIMATOLOGY` (Deep parking and surface drift velocity climatology from global Argo floats).
- **Supported Depths**: 0m, 5m, 10m, 20m, 50m, 100m, 500m, 1000m.
- **Direction Convention**: Standard oceanographic flow bearing (degrees clockwise from True North: $0^\circ$=N, $90^\circ$=E, $180^\circ$=S, $270^\circ$=W).
- **Units**: $\text{m/s}$ (standardized from upstream $\text{cm/s}$).
