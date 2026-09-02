# PHASE 5 — SCIENTIFIC VERIFICATION & ACCEPTANCE TESTING
## INCOIS 3D Ocean Data Visualization System (SIH26067)

---

## 1. Acceptance Criteria Verification

| Domain | Acceptance Requirement | Test Suite & Validation Evidence | Status |
|---|---|---|---|
| **P0 Visual Quality** | Crisp, sharp globe, neutral lighting, MSAA 4x, bloom OFF by default, no world-space error text overlays. | `docs/PHASE5_GLOBE_VISUAL_AUDIT.md`, `viewerSetup.js`, `OceanBloomEffect.js` | **VERIFIED** |
| **Glider Data** | Autonomous underwater glider mission trajectory and vertical dive yo-yos. | `GliderAdapter.js`, `tests/ocean/phase5Interoperability.test.js` | **VERIFIED** |
| **CTD Data** | Shipboard CTD rosette casts with dissolved oxygen and pressure levels. | `CTDAdapter.js`, `tests/ocean/phase5Interoperability.test.js` | **VERIFIED** |
| **BGC Data** | Truthful BGC parameters (Chlorophyll-a & Oxygen); unmeasured channels stamped UNAVAILABLE. | `BGCAdapter.js`, `tests/ocean/phase5Interoperability.test.js` | **VERIFIED** |
| **Variable Registry** | Data-driven canonical variable catalog with units, ranges, colormaps, and modes. | `VariableRegistry.js`, `tests/ocean/phase5Interoperability.test.js` | **VERIFIED** |
| **Color Scale System** | Dynamic min/max range, linear/log scaling, opacity control, and colormap reversal. | `ColorScaleManager.js`, `ColorbarEditorModal.jsx` | **VERIFIED** |
| **CF-NetCDF** | Standards compliance inspection against CF-1.8 attributes. | `CFMetadataValidator.js`, `tests/ocean/phase5Interoperability.test.js` | **VERIFIED** |
| **OGC WMS / WCS** | Bounded request URL construction for GetCapabilities, GetMap, and GetCoverage. | `OGCWMSClient.js`, `OGCWCSClient.js` | **VERIFIED** |
| **Delimited ASCII** | Safe CSV/TSV table parsing with coordinate bounds checking and missing sentinel filters. | `AsciiTableParser.js`, `tests/ocean/phase5Interoperability.test.js` | **VERIFIED** |
| **Plugin Extensibility**| Dynamic registration and ingestion of third-party ocean sensor platforms. | `ProviderPluginRegistry.js`, `tests/ocean/phase5Interoperability.test.js` | **VERIFIED** |
| **Operational / Outreach** | Dual presentation mode switcher for dense scientific analysis vs guided public outreach. | `HeaderBar.jsx`, `ProfileInspector.jsx`, `AppContext.jsx` | **VERIFIED** |
