# PHASE 5 — AUTHORITATIVE OCEAN DATA SOURCES & PROVENANCE
## INCOIS 3D Ocean Data Visualization System (SIH26067)

---

## 1. Verified Real Scientific Data Sources

| Asset / Product | Authoritative Source / Provider | Data Type | Physical Variables | Coverage / Resolution | State Classification |
|---|---|---|---|---|---|
| **SeaDataNet Global Climatology** | SeaDataNet / Coriolis GDAC | 4D Gridded Ocean Model | Temperature ($^\circ\text{C}$), Salinity ($\text{PSU}$) | Global / Indian Ocean ($0.25^\circ$, 36 vertical levels) | `MODELED` |
| **ANDRO Ocean Velocity Atlas** | Scripps Institution of Oceanography / Ifremer | 2D/3D Velocity Vector Field | Eastward ($u$), Northward ($v$), Speed ($|\mathbf{v}|$) | Indian Ocean Basin ($1.0^\circ \times 1.0^\circ$, surface & deep) | `CLIMATOLOGY` |
| **Core Argo Profiling Floats** | International Argo Programme / Coriolis GDAC | In-Situ Vertical Profiles | In-situ Temperature ($^\circ\text{C}$), Salinity ($\text{PSU}$) | Global / Indian Ocean ($0 \dots 2000\text{ m}$) | `OBSERVED` |
| **Autonomous Ocean Gliders** | INCOIS OceanGliders / EGO Mission Archive | 3D Trajectory & Yo-Yo Profiles | Temperature ($^\circ\text{C}$), Salinity ($\text{PSU}$), Density ($\text{kg/m}^3$) | Bay of Bengal ($0 \dots 1000\text{ m}$) | `OBSERVED` |
| **Shipboard CTD Rosette Stations** | ORV Sagar Kanya / NIO / SeaDataNet Cruise Archive | High-Resolution Vertical Casts | Temperature, Salinity, Dissolved $\text{O}_2$ ($\mu\text{mol/kg}$) | Arabian Sea ($0 \dots 2000\text{ m}$) | `OBSERVED` |
| **Biogeochemical Argo (BGC-Argo)** | Global BGC-Argo GDAC / Coriolis | In-Situ Bio-Optical Profiles | Chlorophyll-a ($\text{mg/m}^3$), Dissolved $\text{O}_2$ ($\mu\text{mol/kg}$) | Indian Ocean Basin ($0 \dots 1000\text{ m}$) | `OBSERVED` (Truthful per-channel) |

---

## 2. Strict Truthfulness Invariants
1. **Per-Channel BGC State Auditing**: If an Argo float is equipped with a Fluorometer (measuring chlorophyll-a) but lacks an Optode (for oxygen), oxygen is explicitly classified as `DataState.UNAVAILABLE`, never fabricated or filled with zero.
2. **Missing $\ne$ Zero**: Fill values (`-9999.0`, `NaN`) represent unmeasured or land-masked points and are preserved as `null` with transparent rendering.
3. **No Synthetic Live Claims**: Offline fixtures are explicitly labelled `SourceMode.FIXTURE` in provenance metadata and UI badges.
