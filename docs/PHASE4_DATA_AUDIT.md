# OceanView Phase 4 — Subsurface Ocean Data Availability Audit Report
## SIH26067 / INCOIS 3D Ocean Data Visualization System

**Audit Date**: 2026-08-27  
**Auditor**: Antigravity Core Agent  
**Environment**: Browser-Native & Node.js Scientific Subsurface Pipeline  

---

## 1. Verified Real Subsurface Datasets

### A. SeaDataNet Global Ocean 4D Climatology & Reanalysis (`SDC_GLO_CLIM_TS_V2_2`)

- **Provider**: SeaDataNet / Coriolis Ocean Dataset for Reanalysis / Ifremer
- **Endpoint**: `https://erddap.ifremer.fr/erddap/griddap/SDC_GLO_CLIM_TS_V2_2`
- **Protocol**: OPeNDAP DAP2 / ERDDAP Griddap (REST JSON & Binary NetCDF)
- **Temporal Classification**: `REANALYSIS` / `CLIMATOLOGY`
- **Variables Available**:
  - `Temperature`: Sea water in-situ temperature ($^\circ\text{C}$, ITS-90)
  - `Salinity`: Practical salinity ($\text{PSU}$)
  - `Temperature_RelativeError`, `Salinity_RelativeError`: Error analysis fields
- **Vertical Coordinate**:
  - **Native Coordinate**: Depth in meters ($z \in [5.0\text{m}, 1900.0\text{m}]$)
  - **Level Structure**: 36 non-uniform standard oceanographic levels ($5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400, 425, 450, 475, 500, \dots, 1900\text{m}$)
- **Horizontal Resolution**: $0.25^\circ \times 0.25^\circ$
- **Fill Value**: `NaN` / `-9999.0` (Landmasses and shallow seafloor)
- **Status**: ✅ **ACTIVE & VERIFIED**

---

### B. Coriolis Argo Global Data Assembly Centre (`ArgoFloats`)

- **Provider**: International Argo Programme / Coriolis GDAC
- **Endpoint**: `https://erddap.ifremer.fr/erddap/tabledap/ArgoFloats`
- **Protocol**: ERDDAP Tabledap (REST JSON & NetCDF Table)
- **Temporal Classification**: `OBSERVED` (In-situ physical sensor casts)
- **Variables Available**:
  - `pres`: Hydrostatic pressure ($\text{dbar}$, native vertical coordinate)
  - `temp`: In-situ sea water temperature ($^\circ\text{C}$, ITS-90)
  - `psal`: Practical salinity ($\text{PSU}$)
  - `temp_qc`, `psal_qc`: Quality control flags ($1 = \text{Good}, 2 = \text{Probably Good}, 3 = \text{Bad}$)
- **Vertical Coordinate**:
  - **Native Coordinate**: Hydrostatic pressure $P$ in decibars ($\text{dbar}$)
  - **Derived Depth**: Geometric depth in meters $z(\text{m})$ computed via Saunders 1981 / UNESCO 1983 algorithm with latitude gravity correction.
  - **Lineage**: Native pressure preserved; derived depth stamped `DataState.DERIVED`.
- **Status**: ✅ **ACTIVE & VERIFIED**

---

### C. Scripps / Coriolis ANDRO Deep Velocity Climatology (`ANDRO`)

- **Provider**: Scripps Institution of Oceanography / Ifremer
- **Endpoint**: `https://erddap.ifremer.fr/erddap/griddap/ANDRO`
- **Protocol**: ERDDAP Griddap
- **Temporal Classification**: `CLIMATOLOGY`
- **Variables Available**: `mean_u`, `mean_v` ($\text{cm/s} \rightarrow \text{m/s}$)
- **Vertical Coverage**: Surface ($0-5\text{m}$) and Deep drift parking depth ($\sim 1000\text{m}$).
- **Status**: ✅ **ACTIVE & VERIFIED**

---

## 2. Variables Currently Unavailable / Deferred (Honesty Disclosure)

| Proposed Variable | Status | Scientific Reason & Handling |
| :--- | :---: | :--- |
| **Dissolved Oxygen ($O_2$)** | ⏳ **DEFERRED** | Not present in basic physical Argo CTD or SDC V2 climatology; requires Biogeochemical-Argo (BGC-Argo) sensor package. Marked `UNAVAILABLE`. |
| **Chlorophyll-a / Fluorescence** | ⏳ **DEFERRED** | Requires optical sensor fluorometer data from BGC-Argo floats. Marked `UNAVAILABLE`. |
| **High-Resolution Bathymetry** | ⏳ **DEFERRED** | No verified GEBCO / SRTM30+ tile server connected in workspace. Marked `BATHYMETRY UNAVAILABLE`; subsurface views use neutral ocean basin depths without synthetic terrain fabrication. |
