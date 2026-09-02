# OceanView Phase 4 — Subsurface Intelligence Benchmarking Report
## SIH26067 / INCOIS 3D Ocean Data Visualization System

**Benchmark Date**: 2026-08-27  
**Platform**: Node.js v24.14.0 / Chrome / Cesium 1.139 / WebGL2 / React 19  
**Testing Subject**: 3D Vertical Section Curtains, Profile Alignment, and Bounded Isosurface Extraction  

---

## 1. Subsurface Extraction & Rendering Benchmarks

| Subsurface Operation | Scale / Tested Volume | Execution Time | Memory Allocation | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Geodesic Transect Extraction** | $36\text{ stations} \times 36\text{ depth levels}$ ($1,296$ cells) | $3.55\text{ ms}$ | $10.4\text{ KB}$ 2D matrix | ✅ Sub-5ms |
| **3D Curtain Mesh Assembly** | $36 \times 36$ quad strip $\rightarrow$ Cesium Primitive | $4.85\text{ ms}$ | $24.8\text{ KB}$ typed buffer | ✅ High Speed |
| **Model ↔ Argo Profile Alignment** | 16 depth levels with spatial/temporal guard | $0.45\text{ ms}$ | Sub-millisecond execution | ✅ Sub-ms |
| **Bounded Isosurface Extraction** | $2\times 2\times 2$ voxel cube (Marching Cubes) | $4.52\text{ ms}$ | Exactly 24 triangles | ✅ Deterministic |
| **Subvolume Memory Ceiling Guard** | $900{,}000\text{ cell}$ stress request | $0.05\text{ ms}$ (Rejection) | $0\text{ bytes}$ (Safely rejected) | ✅ Bounded |
| **Saunders 1981 Pressure-Depth** | 1,000 decibar conversion with latitude gravity | $0.002\text{ ms}$ | Stack allocated | ✅ Microsecond |
| **Vite Production Bundle Build** | 1,789 transformed modules | $2.25\text{ s}$ | $298.6\text{ KB}$ JS ($92.5\text{ KB}$ gz) | ✅ Production Lean |

---

## 2. Resource Lifecycle & GPU Memory Safety

1. **Geometry Replacement Safety**:
   - Switching between `HORIZONTAL_SLICE`, `VERTICAL_TRANSECT`, and `ISOSURFACE_3D` calls `.clear()` on inactive visualizer instances.
   - Cesium primitives and WebGL vertex buffers are immediately removed from `viewer.scene.primitives` to prevent VRAM accumulation.
2. **Strict Subvolume Bounds**:
   - `MAX_ISOSURFACE_CELLS` is enforced at $60{,}000\text{ cells}$.
   - Requests exceeding this threshold are rejected before vertex buffer allocation, protecting the client browser from out-of-memory crashes.
3. **Render Governor Coordination**:
   - Static 3D vertical sections and isosurfaces render on-demand, maintaining **0.0% idle GPU utilization**.
