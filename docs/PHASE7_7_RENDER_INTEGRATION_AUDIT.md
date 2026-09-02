# Phase 7.7 — Render Integration Audit

**Date**: 2026-09-02  
**Status**: AUDIT COMPLETE (Includes Phase 7.7 Patch Review)

## Patch Log
- **Issue 1 & 2 (Depth Occlusion)**: `disableDepthTestDistance` violates the physical depth requirement because it forces vectors/markers to render through solid terrain. Occlusion will now be physically honest. If underwater elements need to be selectable from the surface, an explicit, user-toggleable "X-Ray Mode" will be introduced.
- **Issue 3 (3D Tiles Classification Spike)**: Added as a Phase 0 go/no-go gate below.
- **Issue 4 (Test Coverage)**: Automated tests expanded to explicitly cover depth-occlusion toggle state, regression of the classification fallback, and FPS budgeting.

## 3D Tiles Classification Spike (Phase 0 Gate)
A `GroundPrimitive` with `classificationType: BOTH` was injected to test draping over Google Photorealistic 3D Tiles (Mumbai region).
**Verdict: DEGRADED / FAIL (Unverified)**
Due to known classification failures on translucent or complex 3D Tiles and inability to confirm perfect edge draping, we are executing the explicit fallback plan for Surface layers.
**Fallback Strategy**: Surface scientific fields (0-5m) will use a **small, fixed, documented approximate offset (+5m)** to clear the ellipsoid and shallow water tiles, paired with a clear UI indicator ("Approximate Surface Render"). This is explicitly NOT a floating 50m hack; it is a documented 5m micro-offset.

| Function | State | Data | Renderer | Cesium Object | Visible | Correct Position | Status |
|---|---|---|---|---|---|---|---|
| **Scalar (Temperature)** | UI updates `activeVariable` in AppContext | Fetches from `oceanDataService` | Grid passed to `ScalarFieldLayer.updateGrid` | Rectangle Entity created | Yes, if data is local | **NO**. Hardcoded +50m altitude. Fake depth. | ❌ FAILED |
| **Scalar (Depth Change)** | UI updates `activeDepthMeters` | Hardcoded `fetchModelGrid` ignores region bounds. | Grid passed to renderer | Rectangle Entity updated | Yes | **NO**. Still drawn at +50m regardless of `activeDepthMeters` being 700m. | ❌ FAILED |
| **Vector Glyphs** | UI toggles `currentVectors` | Fetches `realCurrentSliceArabianSea.json` | Vectors passed to `VectorFieldLayer.updateVectors` | Polyline CustomDataSource | Yes | **NO**. Fixed at 200m altitude. | ❌ FAILED |
| **Particle Flow** | UI toggles `particleFlow` | Uses current vectors | Passed to `ParticleCurrentLayer.start` | Rectangle Entity with callback canvas | Yes | **NO**. Fixed at 100m altitude. | ❌ FAILED |
| **Argo Profile** | UI toggles `argoFloats` | Fetches Argo fixture data | Passed to `ProfileLayer.updateProfiles` | Billboard CustomDataSource | Yes | **NO**. Fixed at 100m altitude. | ❌ FAILED |
| **Glider Mission** | UI toggles `gliders` | Fetches glider fixture data | Passed to `ProfileLayer` | Billboard CustomDataSource | Yes | **NO**. Uses Argo marker rendering. | ❌ FAILED |
| **CTD Cruise** | UI toggles `ctdStations` | Fetches CTD fixture data | Passed to `ProfileLayer` | Billboard CustomDataSource | Yes | **NO**. Uses Argo marker rendering. | ❌ FAILED |
| **Chlorophyll-a** | Unavailable in UI | ERDDAP search verified no active live gridded layer. | N/A | N/A | N/A | N/A | ✅ CORRECTLY UNAVAILABLE |
| **Region / Basin Jump** | UI triggers camera flyTo | **NO**. Data fetch bounds are hardcoded to Arabian Sea. | Grid remains Arabian Sea | Entity remains Arabian Sea | Yes, but data stays behind | **NO**. Data does not update to match region. | ❌ FAILED |

## Deep Dive Findings

### 1. The Altitude "Cheat"
All layers currently use arbitrary vertical offsets (`height: 50.0`, `100.0`, `200.0`) and `disableDepthTestDistance: Number.POSITIVE_INFINITY` to ensure they render over Google 3D Tiles. This directly violates the physical positioning rule. A 700m temperature field is rendering at +50m altitude in the air.

### 2. Bounding Box Hardcoding
When the user clicks "Bay of Bengal", the camera moves, but `oceanDataService.js` and `fetchModelGrid` are hardcoded to `minLat=5&maxLat=20&minLon=60&maxLon=80` (Arabian Sea). The data does not follow the user.

### 3. Rendering Interpolation vs Blurring
`ScalarFieldLayer.js` sets `ctx.imageSmoothingEnabled = false`. Changing this to `true` will invoke the browser's hardware bilinear interpolation (not strictly bicubic). We must rely on `imageSmoothingQuality = "high"` and verify the visual output to ensure coastal boundaries (NaN/invalid masks) don't bleed into valid ocean cells.

### 4. Classification & GroundPrimitives vs 3D Tiles
`ScalarFieldLayer` attempts to set `classificationType: Cesium.ClassificationType.BOTH` on the Rectangle Entity. However, because it also defines a `height` property, Cesium treats it as a floating 3D volume, and the classification fails silently. 
If we remove `height`, the Rectangle uses `GroundPrimitive` under the hood. However, classification on Google Photorealistic 3D Tiles has known edge-case failures (e.g., translucent geometry). This requires explicit testing in the implementation phase. If classification fails, we must fall back to explicit PolygonOffset via custom Primitive rendering.

### 5. Race Conditions
`AppContext.jsx` currently issues unbounded asynchronous `fetch()` calls. If a user rapidly clicks "Arabian Sea" then "Bay of Bengal", the Arabian Sea fetch might resolve second and overwrite the Bay of Bengal state. An `AbortController` must be wired into the data layer.

## Actionable Correction Path
1. **Dynamic Bounding Boxes**: Map each Basin in `cameraVerbs.js` to a strict geospatial BBox.
2. **AbortController**: Wire into `fetchModelGrid` and `loadRealScientificData`.
3. **Physical Depth**: Remove all altitude cheats. 
   - Surface layers (0-5m) will attempt classification/GroundPrimitive clamping, or explicit Custom Primitives with polygon offset.
   - Subsurface layers will render at true `-depthMeters` and rely on `depthFailAppearance` or subsurface viewing modes to be visible.
4. **Render Order**: Utilize Cesium's primitive insertion order for stacking (e.g., drawing Particles after Scalars) rather than vertical altitude lifting.
