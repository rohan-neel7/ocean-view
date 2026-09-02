# Phase 8.2A — Scientific Coordinate & Render-Offset Integrity

## Executive Summary
This document defines the strict separation between scientific physical ocean depth ($z \ge 0\text{m}$) and Cesium ellipsoidal render altitudes ($h$), establishing deterministic coordinate transformations across all visual renderers.

---

## 1. Physical Depth vs Display Offset Separation

| Property | Scientific Meaning | Unit / Scale | Render System Usage | Mutability |
|---|---|---|---|---|
| **`physicalDepthMeters`** | Ground-truth vertical distance below ocean surface | Meters ($z \ge 0$, down is positive) | Used in dataset querying, vertical interpolation, and scientific metadata | **Immutable**; never modified for display |
| **`displayOffsetMeters`** | Visual altitude translation above/below WGS84 ellipsoid | Meters ($h$, up is positive) | Used strictly in WebGL vertex positions to avoid z-fighting against terrain | **Ephemeral**; never exposed as scientific depth |

---

## 2. Bounded Surface Display Offsets

Surface ocean observations and modeled fields ($z \le 5.0\text{m}$) are rendered with bounded positive display offsets above the WGS84 reference ellipsoid to prevent depth z-fighting against terrain and 3D basemap tiles:

- `RENDERING_ONLY_SURFACE_OFFSET_METERS`: $+5.0\text{m}$ (Scalar rectangle entities, Particle canvas)
- `RENDERING_ONLY_VECTOR_OFFSET_METERS`: $+8.0\text{m}$ (Vector polyline shafts and arrowheads)
- `RENDERING_ONLY_PROFILE_OFFSET_METERS`: $+5.0\text{m}$ (Unselected in-situ profile pins)
- `RENDERING_ONLY_SELECTED_PROFILE_OFFSET_METERS`: $+12.0\text{m}$ (Selected profile highlight pin)

**Scientific Rule**: These display offsets are strictly rendering aids. A surface layer rendered at $+5.0\text{m}$ altitude represents scientific depth $z = 0\text{m}$ or $z = 5\text{m}$, never an atmospheric elevation.

---

## 3. Subsurface Coordinate Transformation

- **Convention Classification**: `APPROXIMATE SUBSURFACE POSITIONING`
- **Transformation Formula**:
  $$\text{Cesium Altitude } h = -z \times E$$
  where $z$ is positive downward physical ocean depth in meters, and $E \ge 1.0$ is the visual vertical exaggeration factor.
- **Physical Assumptions**:
  - The mean sea surface is approximated by the WGS84 Reference Ellipsoid ($h = 0$).
  - Regional geoid undulations ($N < 100\text{m}$) and dynamic ocean topography ($\eta < 2\text{m}$) are omitted in global visual projections.

---

## 4. Multi-Layer Coordinate Integrity Verification

| Renderer | Physical Depth $z$ | Render Altitude $h$ | Geographic Extent | Metadata Integrity |
|---|---|---|---|---|
| **Scalar Layer** | $5.0\text{m}$ (Surface) | $+5.0\text{m}$ | Exact source `bbox` | `physicalDepthMeters = 5`, `displayOffsetMeters = +5` |
| **Scalar Layer** | $50.0\text{m}$ (Subsurface) | $-50.0\text{m}$ | Exact source `bbox` | `physicalDepthMeters = 50`, `displayOffsetMeters = -50` |
| **Scalar Layer** | $250.0\text{m}$ (Subsurface) | $-250.0\text{m}$ | Exact source `bbox` | `physicalDepthMeters = 250`, `displayOffsetMeters = -250` |
| **Scalar Layer** | $700.0\text{m}$ (Subsurface) | $-700.0\text{m}$ | Exact source `bbox` | `physicalDepthMeters = 700`, `displayOffsetMeters = -700` |
| **Vector Layer** | $5.0\text{m}$ (Surface) | $+8.0\text{m}$ | Exact cell $(lat, lon)$ | `vectorData.depthMeters = 5`, `displayOffsetMeters = +8` |
| **Vector Layer** | $500.0\text{m}$ (Subsurface) | $-500.0\text{m}$ | Exact cell $(lat, lon)$ | `vectorData.depthMeters = 500`, `displayOffsetMeters = -500` |
| **Profile Layer** | $0.0\text{m}$ (Unselected) | $+5.0\text{m}$ | Exact float $(lat, lon)$ | `profileData.location = {lat, lon}` |
| **Profile Layer** | $0.0\text{m}$ (Selected) | $+12.0\text{m}$ | Exact float $(lat, lon)$ | `profileData.location = {lat, lon}` |
| **Vertical Transect** | $z_0 \dots z_k$ | $-z \times E$ | Geodesic transect path | Exact station depths $z_0 \dots z_k$ preserved in matrix |
| **Isosurface** | $z_0 \dots z_k$ | $-z \times E$ | Exact 3D voxel grid | Exact depth levels preserved in matrix |
