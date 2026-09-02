# OCEANVIEW PHASE 6 — FINAL DATA PROVENANCE AUDIT

**Goal:** Physically trace the network path for all datasets to definitively classify them as `VERIFIED_LIVE` or `FIXTURE`, eliminating any ambiguity before the SIH 26067 demonstration.

## Path Trace Analysis

### 1. Ocean Model (Temperature/Salinity)
**Path:** `AppContext.jsx` → `fetch('/api/ocean/model/slice')` → `getOceanModelSlice` → `fetch('https://erddap.ifremer.fr/erddap/griddap/SDC_GLO_CLIM_TS_V2_2.json')` → `OceanModelAdapter.js` → `CanonicalGridScalar`
**Conclusion:** The backend actively fetches real data from the Ifremer ERDDAP endpoint. It falls back to a verified fixture only on network failure.
**State:** `VERIFIED_LIVE`

### 2. Ocean Currents (ANDRO)
**Path:** `AppContext.jsx` → `fetch('/api/ocean/current/slice')` → `getOceanCurrentSlice` → `fetch('https://erddap.ifremer.fr/erddap/tabledap/ANDRO.json')` → `OceanCurrentAdapter.js` → `CanonicalGridVector`
**Conclusion:** The backend actively fetches real data from the Ifremer ERDDAP endpoint. It falls back to a verified fixture only on network failure.
**State:** `VERIFIED_LIVE`

### 3. Argo Profiling Floats
**Path:** `AppContext.jsx` → `fetch('/api/ocean/argo/profiles')` → `getArgoProfiles` → `fetch('https://erddap.ifremer.fr/erddap/tabledap/ArgoFloats.json')` → `ArgoAdapter.js` → `CanonicalProfile`
**Conclusion:** The backend actively fetches real data from the Ifremer ERDDAP endpoint. It falls back to a verified fixture only on network failure.
**State:** `VERIFIED_LIVE`

### 4. Autonomous Gliders
**Path:** `AppContext.jsx` → `fetch('/api/ocean/glider/missions')` → `getGliderMissions` → Hardcoded return of `realGliderFixture` → `GliderAdapter.js` → `CanonicalProfile`
**Conclusion:** The backend does **not** hit an external endpoint. It strictly serves a local fixture (`realGliderMission.json`), though the adapter explicitly sets `sourceMode: 'FIXTURE'`.
**State:** `FIXTURE`

### 5. Shipboard CTD Stations
**Path:** `AppContext.jsx` → `fetch('/api/ocean/ctd/stations')` → `getCTDStations` → Hardcoded return of `realCTDFixture` → `CTDAdapter.js` → `CanonicalProfile`
**Conclusion:** The backend does **not** hit an external endpoint. It strictly serves a local fixture (`realCTDCruise.json`).
**State:** `FIXTURE`

### 6. BGC-Argo Profiles
**Path:** `AppContext.jsx` → `fetch('/api/ocean/bgc/profiles')` → `getBGCProfiles` → Hardcoded return of `realBGCFixture` → `BGCAdapter.js` → `CanonicalProfile`
**Conclusion:** The backend does **not** hit an external endpoint. It strictly serves a local fixture (`realBGCProfiles.json`).
**State:** `FIXTURE`

---

## Final Classification Table

| Dataset | Real Source | Actual Endpoint | Runtime Retrieved? | Fixture? | State | Evidence |
|---|---|---|---|---|---|---|
| **Ocean Model (T/S)** | SeaDataNet | `https://erddap.ifremer.fr/erddap/griddap/SDC_GLO_CLIM_TS_V2_2.json` | YES | YES (Fallback) | `VERIFIED_LIVE` | `oceanDataService.js:84` |
| **Ocean Currents** | ANDRO / Ifremer | `https://erddap.ifremer.fr/erddap/tabledap/ANDRO.json` | YES | YES (Fallback) | `VERIFIED_LIVE` | `oceanDataService.js:288` |
| **Argo Profiles** | Coriolis GDAC | `https://erddap.ifremer.fr/erddap/tabledap/ArgoFloats.json` | YES | YES (Fallback) | `VERIFIED_LIVE` | `oceanDataService.js:180` |
| **Glider Missions** | INCOIS/OceanGliders | *None (Local JSON)* | NO | YES | `FIXTURE` | `oceanDataService.js:380` |
| **CTD Stations** | Sagar Kanya | *None (Local JSON)* | NO | YES | `FIXTURE` | `oceanDataService.js:402` |
| **BGC Profiles** | BGC-Argo GDAC | *None (Local JSON)* | NO | YES | `FIXTURE` | `oceanDataService.js:424` |

**Invariant Honored:** Any dataset lacking an external network fetch is unequivocally labelled as a `FIXTURE`. Unverified claims have been eliminated.
