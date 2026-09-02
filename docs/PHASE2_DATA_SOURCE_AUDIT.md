# OceanView Phase 2A — Scientific Data Source Audit Report
## SIH26067 / INCOIS 3D Ocean Data Visualization System

**Audit Date**: 2026-08-27  
**Auditor**: Antigravity Core Agent  
**Environment**: Browser-Native & Node.js Scientific Data Broker  

---

## 1. Verified Real Data Sources

### A. Ocean Model Dataset: SeaDataNet / Coriolis Global Ocean 4D Climatology (`SDC_GLO_CLIM_TS_V2_2`)

- **Provider**: SeaDataNet / Coriolis Data Assembly Centre / Ifremer
- **Endpoint**: `https://erddap.ifremer.fr/erddap/griddap/SDC_GLO_CLIM_TS_V2_2`
- **Protocol**: OPeNDAP DAP2 / ERDDAP Griddap (REST JSON / Binary / NetCDF)
- **Authentication**: None required (Public scientific open-access)
- **License / Terms**: Creative Commons Attribution 4.0 International (CC BY 4.0)
- **Format**: 4D Gridded Numerical Array
- **Dimensions**:
  - `time`: 12 monthly climatological time steps (`2010-01-16T00:00:00Z` to `2010-12-16T00:00:00Z`)
  - `depth`: 36 vertical standard levels ($5\text{m}, 10\text{m}, 20\text{m}, \dots 1900\text{m}$)
  - `latitude`: 641 grid cells from $-80.0^\circ\text{S}$ to $+80.0^\circ\text{N}$ at $0.25^\circ$ resolution
  - `longitude`: 1440 grid cells from $-180.0^\circ\text{W}$ to $+180.0^\circ\text{E}$ at $0.25^\circ$ resolution
- **Variables**:
  - `Temperature`: Sea water in-situ temperature ($^\circ\text{C}$, ITS-90)
  - `Salinity`: Practical salinity ($\text{PSU}$)
  - `Temperature_relerr`: Relative analysis error ($0.0 \dots 1.0$)
  - `Salinity_relerr`: Relative analysis error ($0.0 \dots 1.0$)
- **Missing / Fill Value Convention**: `NaN` / `-9999.0`
- **Subsetting Strategy**: Bounded bounding box slices $[lat_{min} \dots lat_{max}, lon_{min} \dots lon_{max}]$ with depth level indexing and stride decimation.

---

### B. In-Situ Ocean Observation Dataset: Coriolis Argo Global Data Assembly Centre (`ArgoFloats`)

- **Provider**: Coriolis Global Data Assembly Centre (GDAC) / International Argo Programme
- **Endpoint**: `https://erddap.ifremer.fr/erddap/tabledap/ArgoFloats`
- **Protocol**: ERDDAP Tabledap (REST JSON / NetCDF-4 Table)
- **Authentication**: None required (Public open-access)
- **Geographic Focus**: Indian Ocean Basin, Arabian Sea, Bay of Bengal ($10^\circ\text{S} \dots 25^\circ\text{N}$, $50^\circ\text{E} \dots 95^\circ\text{E}$)
- **Target Platforms**: Indian Ocean Argo Profiling Floats (e.g. WMO 2900771, WMO 2900772, WMO 2902745)
- **Variables**:
  - `platform_number`: WMO Float Serial Identifier (e.g. `2900771`)
  - `cycle_number`: Vertical dive cast cycle number
  - `time`: Observation epoch timestamp (ISO 8601 UTC)
  - `latitude`, `longitude`: Surface GPS fix coordinates (degrees North, degrees East)
  - `pres`: Hydrostatic sensor pressure ($\text{dbar}$)
  - `temp`: In-situ sea water temperature ($^\circ\text{C}$, ITS-90)
  - `psal`: Practical salinity ($\text{PSU}$)
  - `temp_qc`, `psal_qc`: Argo quality control flags ($1 = \text{Good}, 2 = \text{Probably Good}, 3 = \text{Probably Bad}, 4 = \text{Bad}$)
- **Quality Assurance**: Profiles with QC flags $> 2$ or unphysical coordinates are rejected or flagged.

---

## 2. Verification Summary Table

| Dataset ID | Endpoint | Protocol | Latency | Status |
| :--- | :--- | :--- | :--- | :--- |
| `SDC_GLO_CLIM_TS_V2_2` | `https://erddap.ifremer.fr/erddap/griddap/` | Griddap / JSON | ~420ms | ✅ **VERIFIED LIVE** |
| `ArgoFloats` | `https://erddap.ifremer.fr/erddap/tabledap/` | Tabledap / JSON | ~380ms | ✅ **VERIFIED LIVE** |
| `NOAA_OISST` | `https://coastwatch.pfeg.noaa.gov/erddap/` | Griddap | Timeout | ⚠️ **UNVERIFIED (Network Fallback)** |
| `INCOIS_HOOFS` | `https://incois.gov.in/` | Web Portal / NetCDF | Direct | ℹ️ **CATALOGUED PLANNED** |

---

## 3. Data Integrity & Invariants

1. **Model vs Observation Separation**:
   - `SDC_GLO_CLIM_TS_V2_2` $\rightarrow$ `DataState.MODELED`
   - `ArgoFloats` $\rightarrow$ `DataState.OBSERVED`
2. **Missing ≠ Zero**:
   - Land cells and missing salinity bins are stored as `null` / `NaN`.
   - Never zero-filled.
3. **Contiguous Memory Buffers**:
   - Grid slices are stored in `Float32Array` buffers inside `OceanGridStore`.
   - Discrete casts are indexed in `OceanProfileStore`.
