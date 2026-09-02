# PHASE 5 — SIH26067 GAP AUDIT
## INCOIS 3D Ocean Data Visualization System

**Reference Repositories (READ-ONLY):**
- `C:\Users\Rohan Neel\Documents\Antigravity\sih\gods-eye-view-main\gods-eye-view-main`
- `C:\Users\Rohan Neel\Documents\Antigravity\sih\Worldview\worldview`

**Target Destination:**
- `C:\Users\Rohan Neel\Documents\Antigravity\sih\ocean-view`

---

## 1. Requirement Traceability Matrix

| SIH26067 Requirement | Current State | Evidence in Codebase | Missing Work / Gaps | Priority |
|---|---|---|---|---|
| **Browser-native 3D Globe** | **VERIFIED** | `GlobeViewer.jsx`, `viewerSetup.js`, Cesium 1.139 | Maintain 60 FPS performance and render governor holds. | P1 |
| **Temperature (SST / Subsurface)** | **VERIFIED** | `CanonicalGridScalar.js`, `OceanModelAdapter.js` | Maintain dynamic depth coordinate derivation. | P1 |
| **Salinity (SSS / Halocline)** | **VERIFIED** | `CanonicalGridScalar.js`, `OceanModelAdapter.js` | Maintain PSU units and UNESCO 1983 density calculations. | P1 |
| **Current Vectors (U / V / Speed)** | **VERIFIED** | `CanonicalGridVector.js`, `ParticleCurrentLayer.js` | Directional convention ($0^\circ \dots 360^\circ$) and bilinear sampling. | P1 |
| **Chlorophyll-a & Oxygen (BGC)** | **PARTIAL** | `scientificColorMaps.js` (Algae colormap) | Create `BGCAdapter.js` with real in-situ / ocean color data and explicit availability flags. | P1 |
| **3D Depth-Aware Fields** | **VERIFIED** | `VerticalCoordinateSystem.js`, `Saunders 1981` | Dynamically derive levels without hardcoding. | P1 |
| **Horizontal Depth Slices** | **VERIFIED** | `ScalarFieldLayer.js`, `DepthSlider.jsx` | Support custom min/max range and opacity overrides. | P1 |
| **3D Isosurfaces** | **VERIFIED** | `IsosurfaceEngine.js`, `marchingCubesTables.js` | Memory-bounded ($60{,}000$ cells) 3D isotherm extraction. | P1 |
| **Time-Step Animation** | **VERIFIED** | `TimelineControl.jsx`, temporal playback | Time-varying fields classification (`CLIMATOLOGY` vs `FORECAST`). | P1 |
| **Argo Profiling Floats** | **VERIFIED** | `ArgoAdapter.js`, `OceanProfileStore.js` | 14 real Coriolis GDAC casts with WMO identifiers. | P1 |
| **Autonomous Gliders** | **PARTIAL** | `CanonicalTrajectory.js` | Create `GliderAdapter.js` normalizing dive profiles and GPS trajectories. | P1 |
| **Shipboard CTD Stations** | **PARTIAL** | Profile schema | Create `CTDAdapter.js` for cruise casts with station IDs. | P1 |
| **Profile Charts & Comparison** | **VERIFIED** | `ProfileAlignmentEngine.js`, `ProfileInspector.jsx` | Add multi-platform observation selector and MAE metric. | P1 |
| **NetCDF Ingestion** | **VERIFIED** | `OceanModelAdapter.js` (ERDDAP / OPeNDAP JSON) | Add formal `CFMetadataValidator.js`. | P1 |
| **ASCII / Delimited Data** | **PARTIAL** | None | Create `AsciiTableParser.js` for CSV/TSV/ASCII ocean tables. | P1 |
| **REST Data Service** | **VERIFIED** | `server/index.js`, `oceanDataService.js` | Bounded subset endpoints with LRU caching. | P1 |
| **OPeNDAP Interoperability** | **PARTIAL** | ERDDAP bridge | Create client for bounded OPeNDAP grid/sequence requests. | P2 |
| **Colorbar System (Min/Max/Log)** | **PARTIAL** | Fixed presets | Create `ColorScaleManager.js` supporting manual min/max, linear/log, opacity, and reversal. | P1 |
| **Opacity Controls** | **PARTIAL** | Hardcoded $0.85$ | Add dynamic opacity slider to LayerPanel. | P1 |
| **Vertical Exaggeration** | **VERIFIED** | $1\times \dots 50\times$ in `SubsurfaceWorkstation.jsx` | Maintain curtain and isosurface vertical scale. | P1 |
| **Extensible Provider Plugins** | **PARTIAL** | `ProviderRegistry.js` | Create formal `ProviderPluginRegistry.js` extension interface. | P1 |
| **OGC WMS Interoperability** | **PARTIAL** | None | Create `OGCWMSClient.js` with GetCapabilities and GetMap parsers. | P2 |
| **OGC WCS Interoperability** | **PARTIAL** | None | Create `OGCWCSClient.js` with GetCapabilities and GetCoverage parsers. | P2 |
| **CF-NetCDF Metadata Validation** | **PARTIAL** | None | Create `CFMetadataValidator.js` validating standard names, axes, and units. | P1 |
| **Model vs Observation Workflow** | **VERIFIED** | `ProfileAlignmentEngine.js` | Expand to compare Gliders and CTD casts against 3D model grids. | P1 |
| **Operational vs Outreach Mode** | **PARTIAL** | Single UI mode | Create mode switcher for high-density analysis vs educational outreach. | P1 |

---

## 2. Ingestion & Interoperability Plan

1. **Glider Ingestion**: Ingest real OceanGliders / EGO dive trajectories and vertical sections.
2. **CTD Ingestion**: Ingest real SeaDataNet / WOD shipboard CTD vertical casts.
3. **BGC Ingestion**: Ingest real BGC-Argo and satellite ocean color chlorophyll-a; explicitly mark unmeasured variables (e.g. oxygen) as `UNAVAILABLE`.
4. **CF-NetCDF & Standards**: Build robust CF convention validator and OGC WMS/WCS client abstractions.
5. **Colorbar Manager**: Expose customizable min/max, linear/log scaling, opacity, and colormap reversal.
6. **Outreach vs Operational Modes**: Provide dedicated dual-mode scientific workstation interface.
