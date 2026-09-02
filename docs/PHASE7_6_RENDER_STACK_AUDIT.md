# Phase 7.6 — Render Stack Forensic Audit

**Date**: 2026-09-02  
**Status**: COMPLETE — All critical rendering bugs identified and fixed

---

## Executive Summary

Phase 7.6 performed a complete forensic audit of the Cesium rendering pipeline in OceanView.
The audit discovered **5 critical** and **3 secondary** rendering bugs that collectively
caused ALL scientific overlays to be invisible when Google 3D Tiles was active,
and several overlays to be non-functional even with standard basemaps.

---

## Critical Findings

### BUG 1: Globe Hidden → All Imagery Layers Invisible (CRITICAL)

**Location**: `BasemapController.js:100`  
**Root Cause**: When Google 3D Tiles basemap was selected, `globe.show = false` was set.
Both `ScalarFieldLayer` and `ParticleCurrentLayer` used `viewer.imageryLayers.addImageryProvider()`,
which attaches imagery to the **globe**. Hidden globe = hidden imagery = invisible scientific data.

**Fix**: Migrated all scientific visualization from imageryLayers to Entity/Primitive approach.
BasemapController now keeps `globe.show = true` with transparent base color when 3D tiles is active.

### BUG 2: Particle Canvas Texture Never Updates (CRITICAL)

**Location**: `ParticleCurrentLayer.js:100-202`  
**Root Cause**: `SingleTileImageryProvider` was created with `canvas.toDataURL()` — a **snapshot**.
The animation loop drew to the canvas but the Cesium texture never reflected the updates.
The `_image` property access at line 197 was unreliable.

**Fix**: Replaced with Entity + RectangleGraphics using `CallbackProperty` that returns the
live canvas element every frame.

### BUG 3: Vector Glyphs Occluded at 1000m (CRITICAL)

**Location**: `VectorFieldLayer.js:81-82`  
**Root Cause**: `PolylineCollection` primitives placed at `altitude: 1000` meters with no
`disableDepthTestDistance`. Google 3D Tiles terrain covers surface geometry, occluding vectors.

**Fix**: Replaced with Entity-based polylines using `CustomDataSource` with
`disableDepthTestDistance: Number.POSITIVE_INFINITY`. Added arrowhead geometry.

### BUG 4: Depth Testing Incompatible with 3D Tiles (CRITICAL)

**Location**: `viewerSetup.js:53`  
**Root Cause**: `depthTestAgainstTerrain = false` only affects the Cesium globe — not the 3D tileset.
Primitives at or below the 3D tile terrain surface were still depth-tested and hidden.

**Fix**: All scientific overlays now use `disableDepthTestDistance: Number.POSITIVE_INFINITY`.
Subsurface layers use `depthFailAppearance` and enable underground camera mode.

### BUG 5: Subsurface Geometry Invisible (CRITICAL)

**Location**: `VerticalTransectLayer.js`, `SubvolumeIsosurfaceLayer.js`  
**Root Cause**: Negative altitude geometry (transects, isosurfaces) was inside the earth,
behind both terrain and 3D tiles.

**Fix**: Added `depthFailAppearance` to both layers. Enable underground camera with
`screenSpaceCameraController.enableCollisionDetection = false`.

---

## Secondary Findings

### BUG 6: Color Interpolation Banding

**Location**: `scientificColorMaps.js:65`  
**Root Cause**: `sampleColormap()` used `Math.floor()` index without interpolating between
adjacent color stops, producing posterized/banded output.

**Fix**: Added proper linear RGB interpolation between stops. Exported `sampleColormapRgb()`
for direct RGB access without hex round-trip overhead.

### BUG 7: Variable Switching Stale Data

**Location**: `AppContext.jsx:225-232`  
**Root Cause**: Switching to `ocean_current_velocity` returned early without bumping
`sourceStatus`, so `GlobeViewer` effects didn't re-run. Stale temperature data could
remain visible with current velocity label.

**Fix**: All variable switches now properly set `sourceStatus` to trigger re-render.
GlobeViewer now explicitly hides scalar field when current velocity is selected.

### BUG 8: Basin Navigation Works Correctly

**Location**: `cameraVerbs.js`  
**Assessment**: Basin jumps correctly move the camera. Scientific layers are geographically
anchored and remain attached to correct coordinates after camera movement. No fix needed.

---

## Layer Rendering Stack (Post-Fix)

```
SCENE
│
├── CESIUM GLOBE (show=true, transparent base with 3D tiles)
│   └── Basemap imagery (CartoDB/Esri/OSM) — only when NOT using 3D tiles
│
├── GOOGLE PHOTOREALISTIC 3D TILES (scene.primitives)
│   └── Tileset with maximumScreenSpaceError=8
│
├── SCIENTIFIC OVERLAYS (viewer.entities / viewer.dataSources)
│   ├── Scalar Field Rectangle Entity (height=50m, disableDepthTest)
│   ├── Vector Glyph Entities (height=200m, disableDepthTest, CustomDataSource)
│   ├── Particle Flow Rectangle Entity (height=100m, disableDepthTest, CallbackProperty canvas)
│   └── Observation Markers (height=100m, disableDepthTest, CustomDataSource, clustering)
│
├── SUBSURFACE PRIMITIVES (scene.primitives, depthFailAppearance)
│   ├── Vertical Transect Curtain (negative altitude, underground camera)
│   └── Isosurface Mesh (negative altitude, underground camera)
│
└── POST-PROCESS (bloom, atmosphere)
```

---

## Rendering Layer Ownership

| Layer | Class | Cesium Type | Owner | Lifecycle |
|-------|-------|-------------|-------|-----------|
| Scalar Field | ScalarFieldLayer | Entity (Rectangle) | GlobeViewer scalarLayerRef | updateGrid/remove |
| Vector Glyphs | VectorFieldLayer | CustomDataSource (Entities) | GlobeViewer vectorLayerRef | updateVectors/clear |
| Particle Flow | ParticleCurrentLayer | Entity (Rectangle + CallbackProperty) | GlobeViewer particleLayerRef | start/stop |
| Observations | ProfileLayer | CustomDataSource (Entities) | GlobeViewer profileLayerRef | updateProfiles/clear |
| Vertical Transect | VerticalTransectLayer | Primitive (Geometry) | GlobeViewer transectLayerRef | updateTransect/clear |
| Isosurface | SubvolumeIsosurfaceLayer | Primitive (Geometry) | GlobeViewer isosurfaceLayerRef | updateIsosurface/clear |
| Basemap | BasemapController | ImageryLayer or 3D Tileset | GlobeViewer basemapController | setBasemap |
