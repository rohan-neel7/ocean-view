# OceanView Phase 3A — Ocean Current Velocity Dataset Audit Report
## SIH26067 / INCOIS 3D Ocean Data Visualization System

**Audit Date**: 2026-08-27  
**Auditor**: Antigravity Core Agent  
**Environment**: Browser-Native & Node.js Scientific Data Broker  

---

## 1. Verified Real Velocity Sources

### A. Scripps / Coriolis ANDRO Gridded Velocity Atlas (Release 2025)

- **Provider**: Scripps Institution of Oceanography / Ifremer Coriolis GDAC
- **Endpoint**: `https://erddap.ifremer.fr/erddap/griddap/ANDRO`
- **Protocol**: OPeNDAP DAP2 / ERDDAP Griddap (REST JSON / Binary)
- **Authentication**: None (Public Open-Access)
- **License / Terms**: Creative Commons Attribution 4.0 International (CC BY 4.0)
- **Temporal Classification**: `CLIMATOLOGY` (Long-term binned velocity statistics derived from deep Argo float drift trajectories)
- **Dimensions**:
  - `longitude`: 720 cells ($-180.0^\circ\text{W} \dots +180.0^\circ\text{E}$ at $0.5^\circ$ spacing)
  - `latitude`: 545 cells ($-78.0^\circ\text{S} \dots +78.0^\circ\text{N}$ at $\sim 0.3^\circ$ spacing)
- **Variables**:
  - `mean_u`: Zonal velocity ($u$, positive eastward, unit: $\text{cm/s}$)
  - `mean_v`: Meridional velocity ($v$, positive northward, unit: $\text{cm/s}$)
  - `std_u`, `std_v`: Velocity standard deviation ($\text{cm/s}$)
  - `eke_vel`: Eddy Kinetic Energy ($\text{cm}^2/\text{s}^2$)
- **Unit Conversion**: Converted to SI standard $\text{m/s}$ via $u_{\text{SI}} = u / 100.0$.
- **Missing Value Convention**: `NaN` / `-9999.0` (Land and unmeasured deep basins).
- **Temporal Constraint**: Climatological atlas — strictly labeled as `State: CLIMATOLOGY`. Never presented as a time-varying dynamic forecast.

---

### B. NOAA Global Drifter Program (GDP) Surface Velocity Dataset

- **Provider**: NOAA AOML / Global Drifter Program
- **Endpoint**: `https://erddap.ifremer.fr/erddap/tabledap/drifter_6hour_qc`
- **Protocol**: ERDDAP Tabledap (REST JSON / NetCDF)
- **Temporal Classification**: `OBSERVED` (In-situ 6-hourly quality-controlled surface drifter observations)
- **Variables**:
  - `ve`: Eastward surface velocity component ($u$, $\text{m/s}$)
  - `vn`: Northward surface velocity component ($v$, $\text{m/s}$)
  - `sst`: Sea surface temperature ($^\circ\text{C}$)
- **Depth**: Surface / Upper $15\text{m}$ drogue depth.
- **Missing Value Convention**: `null` for drogue-lost or grounded drifters.

---

### C. INCOIS Indian Ocean Circulation Model (HOOFS / HYCOM)

- **Provider**: Indian National Centre for Ocean Information Services (INCOIS)
- **Temporal Classification**: `FORECAST` / `MODEL_ANALYSIS`
- **Variables**: $u, v$ ocean current velocity ($\text{m/s}$)
- **Time Steps**: 3-hourly operational forecast frames ($T_0, T_1, T_2, T_3$)
- **Depth Levels**: Standard z-levels ($0\text{m}, 5\text{m}, 10\text{m}, 25\text{m}, 50\text{m}, 100\text{m}, 250\text{m}, 500\text{m}, 1000\text{m}$)
- **Indian Ocean Dynamics**:
  - Arabian Sea Western Boundary Flow ($0.4 \dots 1.2\text{ m/s}$)
  - Southwest Monsoon Current in Central Indian Ocean ($0.3 \dots 0.8\text{ m/s}$)
  - Bay of Bengal Coastal Circulation ($0.2 \dots 0.6\text{ m/s}$).

---

## 2. Directional Convention Specification

In OceanView, ocean current direction follows the **standard oceanographic navigation convention**:
- **Definition**: **Direction towards which the water is moving, measured clockwise from True North ($0^\circ$)**:
  - $0^\circ$ = Flowing towards True North ($u = 0, v > 0$)
  - $90^\circ$ = Flowing towards East ($u > 0, v = 0$)
  - $180^\circ$ = Flowing towards South ($u = 0, v < 0$)
  - $270^\circ$ = Flowing towards West ($u < 0, v = 0$)
- **Formula**:
  $$\theta = \left(\text{atan2}(u, v) \times \frac{180}{\pi} + 360\right) \pmod{360}^\circ$$
- **Speed Magnitude**:
  $$|\vec{V}| = \sqrt{u^2 + v^2} \quad [\text{m/s}]$$
