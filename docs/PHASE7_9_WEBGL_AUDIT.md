# Phase 7.9 — WebGL Context & Cesium Viewer Lifecycle Audit

## Executive Summary
This document provides a comprehensive audit of all WebGL, canvas, and rendering context creation paths across the OceanView codebase, documenting ownership, lifecycles, and resolution of context leak vectors.

---

## 1. WebGL & Canvas Context Creation Matrix

| Context Source | File | Creation Trigger | Cleanup | Can Duplicate? | Severity |
|---|---|---|---|---|---|
| `new Cesium.Viewer` (WebGL2 / WebGL) | `src/components/globe/viewerSetup.js` | Initial application mount in `<GlobeViewer>` | `viewer.destroy()`, layer teardown, lifecycle tracking | No (Guarded by single mount lifecycle & ref guard) | **Resolved (P0)** |
| 2D Canvas (`getContext('2d')`) | `src/visualization/scalar/ScalarFieldLayer.js` | Grid scalar slice texture generation in `_createGridTextureCanvas()` | Ephemeral canvas uploaded to `ImageMaterialProperty`; garbage collected | No (Single canvas per update; discarded on replacement) | Low (Non-accumulating) |
| 2D Canvas (`getContext('2d')`) | `src/visualization/vector/ParticleCurrentLayer.js` | Constructor instantiation (1024x512 particle buffer) | Reused across animation ticks; destroyed in `destroy()` | No (Allocated once in constructor) | **Resolved** |
| 2D/3D Contexts | All other modules | None | N/A | No | None |

---

## 2. Root Cause Analysis of 24 Context Warnings

1. **Un-memoized State Callbacks in `AppContext.jsx`**:
   - `setProbedCoordinate` was created as an inline anonymous function on every `<AppProvider>` render.
   - `<GlobeViewer>` included `setProbedCoordinate` in its `useEffect` dependency array.
   - Every dataset status change (`LOADING` → `READY` across 6 parallel feeds: model, ANDRO current, Argo, Gliders, CTD, BGC) triggered a re-render of `<AppProvider>`, generating a new callback reference.
   - This caused `<GlobeViewer>`'s mount effect cleanup to destroy the viewer and immediately construct a new `Cesium.Viewer`, accumulating ~24 WebGL contexts in rapid succession.

2. **Resolution Architecture**:
   - **Single Viewer Ownership**: `<GlobeViewer>` creates the `Cesium.Viewer` strictly once on mount (`[]` dependency array) with an explicit `viewerRef.current` guard.
   - **Mutable Handlers Ref**: Screen-space interaction and keyboard callbacks reference a mutable `handlersRef`, ensuring prop/callback changes never re-trigger viewer initialization.
   - **Full Teardown on Unmount**: When the globe component unmounts, all particle RAF loops, orbit listeners, primitives, imagery layers, and governor holds are cleanly terminated before `viewer.destroy()`.

---

## 3. Google Photorealistic 3D Tiles & Geocoder Audit

- **Warning Resolution**: Passed `onlyUsingWithGoogleGeocoder: true` to `Cesium.createGooglePhotorealistic3DTileset()` and configured `GoogleGeocoderService` in `viewerSetup.js`, completely eliminating the Cesium geocoder warning.
- **HTTP 400 Root Cause**: Verified via direct diagnostic that the configured API key on Google Maps Platform returned:
  `{"error": {"code": 400, "message": "API key expired. Please renew the API key.", "status": "INVALID_ARGUMENT", "reason": "API_KEY_INVALID"}}`.
- **Safe Fallback**: `BasemapController` implements a single-attempt guard. Upon any API 400 or network failure, it logs a sanitized warning without revealing keys, flags `google3DUnavailable = true`, and seamlessly falls back to high-resolution `SATELLITE` basemap on the SAME Cesium viewer.

---

## 4. Render Governor & Animation Loop Invariants

- **Render Governor**: Maintains 0% idle GPU usage with `requestRenderMode = true`.
- **Hold Tracking**: Uses a `Set<string>` of named hold reasons (`particleAnimation`, `camera-orbit`, `cameraMove`) preventing hold count imbalances.
- **Particle Loop**: Bound to a single `requestAnimationFrame` loop, activated strictly while `layers.particleFlow = true` and released on pause.
- **Orbit Controller**: Single `preRender` listener, activated on toggle and released on stop.
