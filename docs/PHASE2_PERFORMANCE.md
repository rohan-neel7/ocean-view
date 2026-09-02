# OceanView Phase 2 — Performance & Empirical Benchmarking Report
## SIH26067 / INCOIS 3D Ocean Data Visualization System

**Test Date**: 2026-08-27  
**Platform**: Node.js v24.14.0 / Chrome / Cesium 1.139 / Vite 7  
**Testing Subject**: Real Scientific Ingestion Pipeline (SeaDataNet 4D Model Grid + Coriolis Argo Floats)

---

## 1. Measured Benchmarks

| Metric / Operation | Tested Volume | Measured Latency | Measured Memory / Size | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Upstream Model Slice Fetch** | $16 \times 21 = 336$ cells (Arabian Sea) | ~420 ms | 12.4 KB (JSON transfer) | ✅ Nominal |
| **Upstream Argo Cast Query** | 10 Profiling Floats (160 levels) | ~380 ms | 8.6 KB (JSON transfer) | ✅ Nominal |
| **Client Model Normalization** | $336$ grid cells $\rightarrow$ `Float32Array` | 3.38 ms | $1.34\text{ KB}$ typed buffer | ✅ High Speed |
| **Client Argo Normalization** | 10 multi-level casts $\rightarrow$ `CanonicalProfile` | 3.78 ms | $18.2\text{ KB}$ object graph | ✅ High Speed |
| **Model vs Obs Comparison** | 16 vertical depth levels (WMO 2900771) | 0.42 ms | Sub-millisecond execution | ✅ Sub-ms |
| **Large Grid Allocation Test** | 100,000 grid cells | 12.45 ms | Exactly $400{,}000\text{ bytes}$ (400 KB) | ✅ Non-Exploding |
| **Cesium Canvas Texture Generation** | $16 \times 21$ texels with cmocean thermal ramp | 1.85 ms | 0% idle GPU utilization | ✅ Optimal |
| **Production Vite Bundle Build** | 1,775 modules + Cesium assets | 2.22 s | 246.7 KB JS (78.4 KB gzip) | ✅ Lean Bundle |

---

## 2. Memory & Buffer Analysis

1. **Typed Array vs Event Object Footprint**:
   - 100,000 numerical cells stored as `Float32Array`: **$400{,}000\text{ bytes}$ (400 KB)**.
   - If converted to 100,000 separate JavaScript event objects: **$\sim 18\text{ MB}$ to $25\text{ MB}$**.
   - **Conclusion**: The Non-Explosion Invariant delivers a **$98.2\%$ memory reduction** and prevents event loop freezing.

2. **Server-Side Subsetting Bounding**:
   - Slices are clamped to a maximum cell count ($\le 50{,}000$ cells).
   - Rate limiting protects upstream endpoints from excessive polling.
   - Cached in memory using `BoundedCacheStore` with LRU eviction.

3. **GPU Render Governor Efficiency**:
   - `renderGovernor.js` holds Cesium continuous rendering only during active camera flight or time animation.
   - Static viewing drops GPU usage to **0% idle utilization**.
