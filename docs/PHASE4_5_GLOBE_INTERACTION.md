# PHASE 4.5 — GLOBE INTERACTION & NAVIGATION SYSTEM MANUAL
## SIH26067 / INCOIS 3D Ocean Data Visualization System

**Reference Repositories (READ ONLY):**
- `C:\Users\Rohan Neel\Documents\Antigravity\sih\gods-eye-view-main\gods-eye-view-main`
- `C:\Users\Rohan Neel\Documents\Antigravity\sih\Worldview\worldview`

**Target Destination:**
- `C:\Users\Rohan Neel\Documents\Antigravity\sih\ocean-view`

---

## 1. Executive Summary

Phase 4.5 bridges the gap between scientific ocean visualization and the fluid, responsive, discoverable globe interaction experience established by **God's Eye View**, while preserving **Worldview's** robust data lifecycle and truthfulness guarantees.

All camera and interaction operations in OceanView now route through a single authoritative system (`CentralizedCameraController`) with generation stamping, flight interruption, and layer-aware framing.

---

## 2. Interactive Globe Controls Inventory

| UI Component | Position | Interaction Affordance | Behavior / Camera Verb |
|---|---|---|---|
| **Orientation Compass** | Upper Right Rail (`GlobeToolRail`) | Rotating dual-needle rose dial | Tracks camera heading azimuth; clicking smoothly snaps heading to **True North** ($0^\circ$). |
| **Zoom Controls** | Right Rail (`GlobeToolRail`) | `[ + ]` / `[ − ]` | Smooth exponential altitude scaling with quadratic deceleration, bounded between $100\text{ km}$ and $15{,}000\text{ km}$. |
| **Pitch Tilt Controls** | Right Rail (`GlobeToolRail`) | `[ ▲ ]` / `[ ▼ ]` | Bounded tilt adjustment between $-89^\circ$ (nadir top-down) and $-10^\circ$ (horizon glance). |
| **Azimuth Rotate** | Right Rail (`GlobeToolRail`) | `[ ↺ ]` / `[ ↻ ]` | Incremental $\pm 30^\circ$ azimuth rotation with smooth damping. |
| **Cinematic 3D Orbit** | Right Rail (`GlobeToolRail`) | `[ 🌀 Orbit ]` (or `O` hotkey) | Starts/stops single-instance continuous 3D rotation at $4.5^\circ/\text{sec}$ integrated with `RenderGovernor`. |
| **Recenter / Home** | Right Rail (`GlobeToolRail`) | `[ ⌂ Home ]` (or `H` hotkey) | Smooth cubic ease flight returning to the canonical Arabian Sea focal perspective. |
| **Fullscreen Mode** | Right Rail (`GlobeToolRail`) | `[ ⛶ Fullscreen ]` (or `F` hotkey) | Native HTML5 Fullscreen API with automatic escape handler. |
| **Shortcuts Reference** | Right Rail (`GlobeToolRail`) | `[ ⌨ Help ]` (or `?` hotkey) | Opens glassmorphism keyboard navigation cheat sheet modal. |
| **Scientific View Modes** | Top Right (`GlobeViewModes`) | Orbital / 3D Oblique / Surface / Reset | Instant angle adjustment tailored for oceanography (45° for vertical transects; 15° for streamlines). |
| **Basin Quick Jumps** | Top Bar (`OceanBasinQuickJumps`) | Arabian / Bay of Bengal / Equatorial / Lakshadweep / Southern Ocean | Smooth cubic regional flights preserving active scientific depth slices and physical variables. |
| **Live Telemetry Chip** | Bottom Right (`GlobeTelemetry`) | Monospace readout | 4Hz live sampling of measured Lat, Lon, Altitude, Heading, Pitch, and 60 FPS health indicator. |

---

## 3. Keyboard Navigation Shortcuts

| Key | Action |
|---|---|
| `H` | Home / Recenter to canonical Arabian Sea focal point |
| `N` | Snap camera heading to True North ($0^\circ$) |
| `+` / `=` | Zoom in (bounded) |
| `-` / `_` | Zoom out (bounded) |
| `O` | Toggle cinematic 3D orbital camera rotation |
| `F` | Toggle fullscreen mode |
| `1` | Orbital ($90^\circ$) top-down planar mapping view |
| `2` | 3D Oblique ($45^\circ$) subsurface curtain view |
| `3` | Surface ($15^\circ$) low grazing angle |
| `4` | Reset camera to standard regional perspective |
| `?` | Toggle keyboard navigation shortcuts modal |
| `Esc` | Close open modals or cancel active camera transition |

---

## 4. Architectural Invariants & Scientific State Preservation

1. **Single Authoritative Controller**: Every camera motion executes strictly through `globalCameraController` (`CentralizedCameraController.js`), preventing competing animation loops or viewer recreation.
2. **Flight Cancellation & Generation Stamping**: Rapid user clicks immediately cancel active flights (`camera.cancelFlight()`) and increment `generation`, discarding stale animation callbacks.
3. **Decoupled Scientific Context**: Navigating across regions or switching view angles never resets the active physical variable (e.g. Temperature / Salinity), depth level ($-250\text{m}$), colormap, or timeline step.
4. **Render Governor Discipline**: When the camera is static, continuous rendering holds are released, dropping Cesium GPU utilization to 0% idle.
