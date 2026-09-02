# PHASE 5 — SCIENTIFIC DATA INTEROPERABILITY & STANDARDS
## INCOIS 3D Ocean Data Visualization System (SIH26067)

---

## 1. Climate & Forecast (CF) Metadata Validation
- **Engine Module**: [`src/engine/ocean/CFMetadataValidator.js`](file:///C:/Users/Rohan%20Neel/Documents/Antigravity/sih/ocean-view/src/engine/ocean/CFMetadataValidator.js)
- **Standard**: CF-1.8 Conventions
- **Audit Rules**:
  - Coordinate identification (`latitude`, `longitude`, `time`, `depth`) and unit checks.
  - Authoritative `standard_name` validation (e.g. `sea_water_temperature`, `sea_water_practical_salinity`, `mass_concentration_of_chlorophyll_a_in_sea_water`).
  - Explicit declaration of `_FillValue` or `missing_value`.
- **Classification Output**: Returns `VALID` ($\ge 80\%$), `PARTIAL` ($\ge 40\%$), or `INVALID` with itemized diagnostics.

---

## 2. OGC Web Map Service (WMS) & Web Coverage Service (WCS)
- **WMS 1.3.0 Client**: [`src/engine/interoperability/OGCWMSClient.js`](file:///C:/Users/Rohan%20Neel/Documents/Antigravity/sih/ocean-view/src/engine/interoperability/OGCWMSClient.js)
  - Constructs bounded `GetMap` requests with CRS:84 / EPSG:4326 bounding boxes, depth elevation, ISO-8601 timestamps, and transparent PNG overlays.
- **WCS 2.0.1 Client**: [`src/engine/interoperability/OGCWCSClient.js`](file:///C:/Users/Rohan%20Neel/Documents/Antigravity/sih/ocean-view/src/engine/interoperability/OGCWCSClient.js)
  - Constructs multi-dimensional `GetCoverage` slice requests with Long/Lat/Elevation/Time subsetting for NetCDF binary arrays.
- **Security Invariant**: No arbitrary browser proxying; all external service URLs route strictly through validated server endpoints.

---

## 3. Delimited ASCII / CSV Table Ingestion
- **Parser Module**: [`src/engine/ocean/AsciiTableParser.js`](file:///C:/Users/Rohan%20Neel/Documents/Antigravity/sih/ocean-view/src/engine/ocean/AsciiTableParser.js)
- **Capabilities**:
  - Auto-detects delimiters (`,` , `\t`, whitespace).
  - Normalizes coordinate headers (`latitude`/`lat`, `longitude`/`lon`).
  - Drops unphysical coordinates (e.g. Lat $>90^\circ$, Lon $>180^\circ$).
  - Sanitizes missing sentinels (`-999`, `-9999`, `NaN`, `NA`, empty strings) to `null`.

---

## 4. Extensible Provider Plugin Architecture
- **Registry Module**: [`src/engine/providers/ProviderPluginRegistry.js`](file:///C:/Users/Rohan%20Neel/Documents/Antigravity/sih/ocean-view/src/engine/providers/ProviderPluginRegistry.js)
- **Extension Pattern**:
  $$\text{Provider Plugin} \longrightarrow \text{Adapter Function} \longrightarrow \text{Canonical Domain Model} \longrightarrow \text{Store} \longrightarrow \text{Visualizer}$$
- Allows registering third-party platforms (HF Radar, Moored Buoys, ADCP, Satellite Altimetry) without modifying core globe or UI components.
