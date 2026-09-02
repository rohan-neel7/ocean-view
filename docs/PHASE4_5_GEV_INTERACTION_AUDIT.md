# PHASE 4.5 — FORENSIC GEV GLOBE-CONTROL AUDIT
## SIH26067 / INCOIS 3D Ocean Data Visualization System

**Reference Repositories (READ-ONLY):**
- `C:\Users\Rohan Neel\Documents\Antigravity\sih\gods-eye-view-main\gods-eye-view-main`
- `C:\Users\Rohan Neel\Documents\Antigravity\sih\Worldview\worldview`

**Target Destination:**
- `C:\Users\Rohan Neel\Documents\Antigravity\sih\ocean-view`

---

## 1. Forensic Control Inventory & Architectural Mapping

| Control / Capability | GEV File Source | GEV Implementation Details | OceanView Equivalent / Target | Strategy (Direct reuse / Adapt / Rebuild) |
|---|---|---|---|---|
| **Zoom In / Zoom Out** | `src/cameraVerbs.js`, `src/ui.js` | Exponential altitude scaling with quadratic easing (`carto.height * factor`), clamped between $10\text{ km}$ and $15{,}000\text{ km}$. | `zoomCamera(viewer, factor, duration)` in `cameraVerbs.js` | **Adapt**: Scientific ocean altitude bounds ($10\text{ km} \dots 15{,}000\text{ km}$), preserve depth section coordinates. |
| **Home / Recenter View** | `src/camera.js`, `src/locations.js` | Smooth cubic flight (`flyTo`) targeting regional focal points. | `flyToOceanRegion(viewer, regionKey)` | **Adapt**: Scientific presets for Indian Ocean Basin, Arabian Sea, Bay of Bengal, Equatorial Jet, Lakshadweep. |
| **Compass / Heading** | `src/hud.js`, `src/ui.js` | Live camera heading tracker with rotation matrix; click snaps to True North ($0^\circ$). | `GlobeOrientationControl.jsx` | **Adapt**: Glassmorphism rotating North/South compass rose dial with smooth cubic reset. |
| **Pitch / Tilt Control** | `src/cameraVerbs.js` | Nudges camera pitch between $-89^\circ$ (nadir) and $-10^\circ$ (horizon glance). | `nudgePitch(viewer, deltaDeg)` | **Adapt**: Supports 3D oblique tilt ($-42^\circ$) optimal for subsurface transects & isosurface volumes. |
| **Cinematic 3D Orbit** | `src/orbit.js` | Frame-independent 3D rotation via `viewer.scene.preRender`, integrated with `holdContinuousRender('camera-orbit')`. | `OrbitController.js` | **Adapt**: Single active loop, RenderGovernor holds, preserves scientific focal point. |
| **Camera View Presets** | `src/camera.js`, `src/locations.js` | Dictionary of preset Cartesian3 targets + HPR orientations with smooth cubic easing. | `OCEAN_REGIONS` & `globeViewState.js` | **Rebuild**: Data-driven scientific ocean regions with lat/lon/alt/pitch metadata. |
| **View Modes** | `src/cameraVerbs.js` | Orbital vs Oblique vs Surface vs Nadir presets. | `GlobeViewModes.jsx` | **Adapt**: Scientific modes (Orbital Basin, 3D Oblique Curtain, Surface Glancer, Canonical Reset). |
| **Fullscreen Toggle** | `src/ui.js` | `document.documentElement.requestFullscreen()` with `fullscreenchange` event listener. | `GlobeToolRail.jsx` / `GlobeViewer.jsx` | **Adapt**: Seamless fullscreen with Escape key listener and layout stability at $1366\times768$ and $1920\times1080$. |
| **Camera Telemetry** | `src/hud.js` | 4Hz throttled Cartographic sampling of Lat, Lon, Alt, Heading, Pitch, and FPS. | `GlobeTelemetry.jsx` | **Adapt**: Scientific monospace telemetry readout without military/crisis tokens. |
| **Navigation Authority / Flight Interruption** | `src/navigationPolicy.js` | Generation stamp system where subsequent flight requests immediately cancel active transitions. | `CentralizedCameraController.js` | **Adapt**: Single authoritative camera lifecycle, flight cancellation, zero viewer recreation. |
| **Keyboard Navigation Shortcuts** | `src/ui.js`, `src/firstRunExperience.js` | Keydown listeners (`H`, `N`, `+`, `-`, `F`, `O`) with input guard (skipping active input elements). | `globeNavigation.js` | **Rebuild**: OceanView keyboard shortcut listener with help tooltip overlay. |
| **Render Governor Integration** | `src/renderGovernor.js` | Continuous render holds during flights/orbits, returning to 0% idle GPU on completion. | `renderGovernor.js` | **Direct reuse / Adapt**: Verified 0% idle GPU utilization in OceanView. |
| **Scope Mask / Vignette** | `src/scopeMask.js` | Corner brackets and CSS radial gradient vignette overlay. | `ScopeMask.jsx` | **Adapt**: Subtle command-center corner brackets without dominating the map. |
| **Scientific State Preservation** | `worldview/src/state/` | Complete decoupling of camera perspective from physical dataset variables, depths, and timestamps. | `AppContext.jsx` | **Rebuild / Preserve**: Invariant that camera navigation never resets depth ($Z$), active variable, colormap, or time step. |

---

## 2. Key Architecture Invariants for OceanView

1. **One Authoritative Camera Controller**: All camera verbs (`flyTo`, `orbit`, `zoom`, `nudge`, `resetNorth`) route strictly through `CentralizedCameraController.js`.
2. **Cancellation & Flight Safety**: Rapid consecutive clicks cancel previous animations cleanly without camera jitter, stale targets, or viewer recreation.
3. **Decoupled Scientific Context**: Changing camera orientation or flying across basins never mutates depth ($Z$), active physical variables, or time step.
4. **Render Governor Discipline**: The Cesium rendering loop drops to 0% idle GPU when the camera is static.
5. **Restrained, Uncluttered UI**: Globe controls organized logically into compact rails (Top: Region presets; Right: Camera tool rail & Compass; Bottom: Depth & Time; Bottom-Right: Telemetry).
