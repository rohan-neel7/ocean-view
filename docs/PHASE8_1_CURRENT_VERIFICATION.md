# Phase 8.1 — Current Velocity Verification & Architecture Reference

## Executive Summary
This document provides complete verification documentation for the OceanView Current Velocity visualization system, detailing the ANDRO scientific dataset specifications, canonical vector representation, Cesium geometry rendering methods, particle advection dynamics, and failure handling.

---

## 1. Data Source & Semantics

- **Data Source**: ANDRO (Argo New Displacements Rannou and Ollitrault)
- **Providers**: Scripps Institution of Oceanography (SIO) / Ifremer / Coriolis GDAC
- **Temporal Semantics**: `CLIMATOLOGY` (Multi-year mean deep parking and surface drift velocity fields derived from global Argo profiling float trajectories).
- **Physical Meaning**: Standard oceanographic velocity $(u, v)$ fields.
- **Truthfulness Classification**: Labeled strictly as `CLIMATOLOGY` / `MODELED`, never described as live forecast.

---

## 2. Variables & Dimensions

| Parameter | Value / Specification |
|---|---|
| **Eastward Component ($u$)** | `mean_u` (m/s, converted from raw cm/s) |
| **Northward Component ($v$)** | `mean_v` (m/s, converted from raw cm/s) |
| **Speed ($|V|$)** | $\sqrt{u^2 + v^2}$ (m/s) |
| **Direction** | Standard oceanographic flow bearing (degrees clockwise from True North: $0^\circ$=N, $90^\circ$=E, $180^\circ$=S, $270^\circ$=W) |
| **Supported Depths** | `[0, 5, 10, 20, 50, 100, 500, 1000]` meters |
| **Supported Times** | Annual Mean Climatology (`2025-01-01T00:00:00Z`) |
| **Spatial Resolution** | $1.5^\circ$ to $2.0^\circ$ geographic grid |
| **Missing Value Sentinel** | `-9999.0` (Missing $\neq$ Zero; landmask cells preserved as null) |

---

## 3. Rendering Pipeline

### A. Vector Field Glyphs (`VectorFieldLayer.js`)
- **Geometry Type**: Cesium `CustomDataSource` entity polylines with `depthFailMaterial: color` and `arcType: Cesium.ArcType.NONE`.
- **Visibility Invariant**: `depthFailMaterial: color` guarantees that vector shafts and arrowheads remain crisp and visible across orbital and regional camera distances (preventing depth-buffer culling against the globe ellipsoid).
- **Glyph Scaling**:
  - Minimum visual length: $0.14^\circ$ (ensures small currents are identifiable).
  - Maximum visual cap: $1.8^\circ$ (prevents large currents from overwhelming the scene).
  - Shaft width: $3.5\text{px}$, Head width: $2.8\text{px}$.
  - Arrowhead wings: drawn at $\theta \pm 150^\circ$ from direction of flow.
- **Color Mapping**: Dynamic interpolation against `cmocean SPEED` palette ($[0.0, 1.0\text{ m/s}]$).
- **Physical Depth**: Surface layers rendered at $+8\text{m}$ ellipsoid offset; subsurface rendered at $-z\text{m}$.

### B. Particle Streamlines (`ParticleCurrentLayer.js`)
- **Simulation**: Bilinear velocity interpolation $\vec{V}(x, y, z)$ on 2D texture buffer with RK1 advection step ($dt = 0.08 \times \text{flowSpeed}$).
- **Transparency**: Uses `destination-out` compositing for trail decay ($8\%$ per frame) over a $100\%$ transparent canvas texture (eliminates black rectangular artifacts).
- **Budget Tiers**:
  - `LOW`: 1,500 particles
  - `MEDIUM`: 4,000 particles
  - `HIGH`: 8,000 particles
- **Controls**: Live flow speed slider ($0.5\times$ to $2.5\times$) and particle budget selector.

---

## 4. Multi-Region & Depth Transitions

- **Region Switching**: Switching between Arabian Sea, Bay of Bengal, Equatorial Indian Ocean, and Southern Ocean initiates region-bounded queries that refresh the vector arrows to match the new domain.
- **Depth Switching**: Selecting valid depths ($0\text{m}, 5\text{m}, 50\text{m}, 500\text{m}, 1000\text{m}$) applies physical depth attenuation factor ($e^{-z / 600}$), accurately reflecting decreasing deep-ocean velocities.
- **Unsupported Depth Handling**: Displays truthful unavailability notifications without fabricating unphysical data.

---

## 5. Failure & Adversarial Handling

1. **Missing U or V**: Handled as null vector (never converted to $0.0\text{ m/s}$).
2. **Layer Toggling**: Clean `clear()` and `stop()` methods prevent entity or RAF loop accumulation.
3. **Variable Switching**: Stale scalar and vector grids are evicted from `OceanGridStore` immediately upon variable transition.
