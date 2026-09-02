# Phase 8.2 — Scientific Visualization Readability Audit

## Executive Summary
This audit evaluates the perceptual readability, display density, and multi-layer visual composition of OceanView's scientific rendering pipeline, identifying visual overload bottlenecks and establishing adaptive policies.

---

## 1. Renderer Capabilities & Visual Limitations Audit

| Renderer | Module | Input Data | Geographic Reference & Physical Depth | Rendering Method | Current Resolution & Sampling | Visual Readability Limitations |
|---|---|---|---|---|---|---|
| **Scalar Field** | `ScalarFieldLayer.js` | `CanonicalGridScalar` | Bounding Box, Surface ($+50\text{m}$) or Subsurface ($-z\text{m}$) | `Entity` + `RectangleGraphics` with 2D dynamic canvas texture | Nearest-neighbor texture scaling (`scale = 512 / max(dim)`) | Exposes coarse rectangular grid blocks; lacks smooth bilinear display interpolation; can visually overpower vector and particle overlays. |
| **Vector Field** | `VectorFieldLayer.js` | `CanonicalGridVector` | Point coordinates $(lat, lon)$, Surface ($+8\text{m}$) | `CustomDataSource` with polyline entities (`depthFailMaterial`) | Fixed stride decimation (`density = 1`); all cells rendered | At global camera altitudes ($>5,000\text{ km}$), 88+ vector arrows cluster into an unreadable wall of glyphs; scale is fixed regardless of camera height. |
| **Particle Flow** | `ParticleCurrentLayer.js` | `CanonicalGridVector` | Domain Bounding Box, Surface ($+5\text{m}$) | `Entity` + `RectangleGraphics` with live canvas texture (`CallbackProperty`) | Budget tiers: 1.5k, 4k, 8k particles | Particle count is fixed regardless of camera zoom; at global view, 4k particles create excessive visual density; at local view, may disperse too thinly. |
| **In-Situ Profiles** | `ProfileLayer.js` | `CanonicalProfile[]` | Point coordinates $(lat, lon)$, Surface ($+5\text{m}$) | `CustomDataSource` point entities with clustering | Clustered at $40\text{px}$ radius; up to 1,000 points | Selected profile is not visually distinguished from unselected points on the globe; platform colors needed harmonization. |

---

## 2. Multi-Layer Visual Competition & Opacity Hierarchy

When Scalar, Vectors, and Particles are simultaneously enabled:
1. **Uncalibrated Opacity**: The scalar raster field operates at default $85\%$ opacity, which drowns out the vector shafts and particle streaks.
2. **Readability Hierarchy**:
   - **Contextual Background**: Scalar Field Grid (attenuated when vectors are enabled)
   - **Primary Analytical Focus**: Velocity Vector Glyphs (crisp, adaptive density)
   - **Secondary Dynamics**: Particle Flow Streamlines (subtle, transparent trails)
   - **Foreground Anchors**: In-Situ Profile Markers & Selected Platform (high contrast, highlighted)

---

## 3. Core Architectural Fixes

1. **Shared Scientific Render Policy (`scientificRenderPolicy.js`)**:
   - Computes deterministic display parameters based on camera altitude tiers:
     - `GLOBAL` ($> 6,000\text{ km}$): Vector stride 2–3, glyph scale $1.8\times$, particle budget attenuated $50\%$, scalar presentation factor $0.70$.
     - `REGIONAL` ($1,500\text{ km} - 6,000\text{ km}$): Vector stride 1–2, glyph scale $1.4\times$, standard particle budget, scalar presentation factor $0.85$.
     - `LOCAL` ($< 1,500\text{ km}$): Vector stride 1 (full resolution), glyph scale $1.0\times$, full particle budget, selected profile emphasized.
2. **Smooth Bilinear Scalar Interpolation**:
   - High-quality canvas rendering with `ctx.imageSmoothingEnabled = true` and bilinear gradient interpolation across valid ocean cells, preserving exact nodata/landmask boundaries without leaking.
3. **Adaptive Vector Scaling & Percentile Clamping**:
   - Vector lengths bounded between $0.14^\circ$ and $1.40^\circ$ geographic length, preventing speed outliers from skewing the field.
4. **Transparent Particle Compositing**:
   - `destination-out` trail decay ensures $100\%$ background transparency over all basemaps and 3D tiles.
