# Phase 8.3 — Spatial Scientific Investigation Audit

## Executive Summary
This audit investigates the current state of spatial interaction, click raycasting, coordinate probing, location search, and data contextualization in OceanView, answering the 10 fundamental spatial investigation questions.

---

## 1. Spatial Interaction Audit Checklist

### 1. What happens when the user clicks the globe?
In `src/components/globe/interaction.js`, a `Cesium.ScreenSpaceEventHandler` captures `LEFT_CLICK`.
- First, it calls `viewer.scene.pick(movement.position)`. If an entity with `profileData` or `vectorData` is hit, it selects that profile or vector.
- Otherwise, it casts a ray via `viewer.camera.getPickRay(movement.position)` and calls `viewer.scene.globe.pick(ray, viewer.scene)`.
- It converts the Cartesian point to WGS84 Cartographic coordinates and calls `onCoordinateProbe({ lat, lon })`.

### 2. Is Cartographic picking implemented?
**Yes.** Cartographic conversion (`Cesium.Cartographic.fromCartesian`) is implemented and extracts latitude and longitude in degrees.

### 3. Where is the coordinate stored?
Currently, it is stored in `scientificSelection.location` via `setProbedCoordinate` in `AppContext.jsx`.
**Limitation**: It is conflated with `scientificSelection`, lacking a formal analysis location object with provenance, source, bounds, and dataset status.

### 4. Does it trigger a scientific request?
**Partially.** `setProbedCoordinate` updates `scientificSelection.bounds = ±2°`. If `activeRegion` does not cover it, or if bounds change, an effect triggers `fetchModelGrid`. However, it lacks request cancellation, cache verification, or multi-variable coordination.

### 5. Is the request bounded?
It used a hardcoded naive `±2°` box without taking into account dataset resolution, dateline wrap-around, latitude limits, or server request size constraints.

### 6. Does the renderer update?
Yes, when a new grid is fetched into `OceanGridStore`, the scalar/vector layers update. However, there was no dedicated visual marker for the analysis point itself on the globe.

### 7. Can the user search?
A basic `LocationSearch.jsx` existed, but it only accepted strict `"Lat, Lon"` strings and lacked support for cardinal coordinates (`15.2N 68.4E`), DMS degree notation, or known scientific regions.

### 8. Does search move the camera?
Yes, `LocationSearch.jsx` called `globalCameraController.spiralIn({ lat, lon }, 800000)`.

### 9. Does search update scientific context?
It only set `probedCoordinate` without performing cache-aware context fetching or discovering nearby in-situ observations.

### 10. Can the user distinguish camera movement from scientific selection?
**No.** Camera movements, region selections, and probed coordinates were loosely coupled, risking state collisions and disorientation when inspecting observations.

---

## 2. Identified Deficiencies & Solutions

| Area | Current State | Phase 8.3 Target State |
|---|---|---|
| **Location State** | Ad-hoc `probedCoordinate` | Formal `AnalysisLocation` model with source, bounds, timestamp, and status |
| **Ocean vs Land** | Any click sets coordinate | Geographic ocean-bounding check warns user when clicking on landmasses |
| **Marker** | No dedicated 3D marker on globe | Crisp, geographically anchored cyan target pin + ring at `+15m` elevation |
| **Search Engine** | Basic regex for comma-separated numbers | Multi-format parser (decimal, cardinal N/S/E/W, DMS) + known ocean region lookup |
| **Observation Discovery** | Disconnected list of all profiles | Spatial radius filtering & distance sorting around the analysis point |
| **Model Sampling** | Requires full grid visual inspection | Direct numerical sampling of Temperature, Salinity, and Current at analysis point |
| **Comparison** | Manual profile clicking | Direct 1-click "Compare with Nearest Observation" in analysis card |
| **Request Race Conditions** | Rapid clicks cause out-of-order responses | Generation stamping (`_investigationGen`) ensures newest location always wins |
