# OceanView — Architecture & Scientific Design Manual
## INCOIS 3D Ocean Data Visualization System (SIH26067)

---

## 1. Executive Overview & Independence

**OceanView** is a browser-native 3D Ocean Data Visualization System built specifically for the **Indian National Centre for Ocean Information Services (INCOIS)** under Smart India Hackathon problem statement **SIH26067**.

OceanView is constructed as a **clean, independent application**. It is neither a fork of God's Eye View nor a fork of Worldview.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 OCEANVIEW ARCHITECTURE                                  │
│                                                                                         │
│  [GOD'S EYE VIEW — Reference]               [WORLDVIEW — Reference]                     │
│  • RenderGovernor (0% idle GPU)             • Canonical 10 DataStates                   │
│  • Smooth camera presets (Indian Ocean)     • Strict Physical SI Units                  │
│  • Direct Cesium Primitive Batching         • Triple-timestamp Provenance               │
│                                             • Immutable Provider Registry & Health      │
│                                                                                         │
│  [SUBSURFACE INTELLIGENCE LAYER (PHASE 4 COMPLETE)]                                     │
│  • Dynamic Vertical Coordinate System (VerticalCoordinateSystem.js)                     │
│  • Saunders 1981 Pressure-to-Depth conversion with DERIVED lineage                      │
│  • Geodesic Vertical Section Extraction Engine (VerticalSectionEngine.js)               │
│  • 3D Vertical Transect Curtain Layer (VerticalTransectLayer.js, 1x-50x Exaggeration)   │
│  • Profile Alignment & Vertical Intercomparison Engine (ProfileAlignmentEngine.js)      │
│  • Bounded 3D Isosurface Marching Cubes Engine (IsosurfaceEngine.js)                    │
│  • Derived Subsurface Physics (Potential Density σ_t, Mixed Layer Depth MLD, Sound Speed)│
│  • Subsurface Analysis Workstation UI (SubsurfaceWorkstation.jsx)                       │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Ingested Datasets & Subsurface Capabilities (Phase 4)

1. **SeaDataNet Global Ocean 4D Climatology (`SDC_GLO_CLIM_TS_V2_2`)**: 36 non-uniform vertical depth levels ($5\text{m} \dots 1900\text{m}$) for Temperature and Salinity.
2. **Coriolis Argo Global Data Assembly Centre (`ArgoFloats`)**: In-situ vertical water column profiles ($T, S, P$) with native pressure in $\text{dbar}$ and derived depth in $\text{m}$.
3. **Scripps / Coriolis ANDRO Velocity Atlas (`ANDRO`)**: Gridded velocity climatology ($u, v$).

---

## 3. Data Integrity & Scientific Truthfulness Invariants

1. **No Universal Depth Assumption**: Depth levels are derived dynamically from each dataset's actual metadata.
2. **Native Coordinates Preserved**: Native pressure in $\text{dbar}$ and depth in $\text{m}$ preserved; conversions stamped `DataState.DERIVED`.
3. **Strict Coastline & Land Isolation**: Transects crossing land return `null`, never extrapolating across coastlines.
4. **Temporal Mismatch Guard**: Flags `TEMPORAL_MISMATCH_UNRESOLVED` when timestamps diverge beyond tolerance.
5. **Memory Ceiling Guard**: Isosurface engine strictly rejects subvolumes $> 60{,}000\text{ cells}$.
6. **Clean GPU Lifecycle**: Previous Cesium curtain primitives and isosurface meshes are disposed on mode/transect updates.

---

## 4. SIH26067 Roadmap

- **Phase 1 (Complete)**: Clean architecture, React 19 + Cesium 1.139 setup, Data Contracts, OceanGridStore, OceanProfileStore, Render Governor, UI Shell, and full Test Suite.
- **Phase 2 (Complete)**: Real Scientific Data Ingestion (SeaDataNet 4D Model Grid + Coriolis Argo Floats), Server Subsetting API, End-to-End Intercomparison ($\Delta$, Mean Bias Error, RMSE), and Truthfulness UI Badges.
- **Phase 3 (Complete)**: Scientific Ocean Dynamics (ANDRO Real Current Velocity Ingestion, Directional Vector Glyphs, Particle Current Advection, Temporal Semantics, and Current Inspector HUD).
- **Phase 4 (Complete)**: Subsurface Ocean Intelligence (Dynamic Vertical Coordinates, 3D Vertical Transect Curtains, Profile Alignment & Vertical Intercomparison, Bounded 3D Isosurfaces, and Subsurface Physics Workstation).
