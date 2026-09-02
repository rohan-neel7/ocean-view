# OCEANVIEW — PHASE 7 PROVENANCE RED TEAM REPORT

## Objective
Trace every important dataset from UI backwards to external sources to determine whether the presented value actually originates from the claimed provider, or if it is a fixture masquerading as live data.

## Audit Results

### 1. SeaDataNet 4D Model Grid (Temperature & Salinity)
- **UI Claim:** LIVE SCIENTIFIC FEED (if network up) or VERIFIED FIXTURE.
- **Trace:** UI → `ScalarFieldLayer` → `AppContext` → `globalOceanGridStore` → `OceanModelAdapter` → `oceanDataService.getOceanModelSlice` → `https://erddap.ifremer.fr/erddap/griddap/...`
- **Finding:** The endpoint hits a real ERDDAP server. If the timeout (6s) is exceeded, it falls back to a verified JSON fixture and explicitly overrides `sourceMode: 'FIXTURE'`. 
- **Risk:** No deception found. The UI badge accurately reflects the provenance.

### 2. ANDRO Ocean Current Velocity
- **UI Claim:** LIVE or FIXTURE, temporal state CLIMATOLOGY.
- **Trace:** UI → `ParticleCurrentLayer`/`VectorFieldLayer` → `globalOceanGridStore` → `oceanDataService.getOceanCurrentSlice` → `https://erddap.ifremer.fr/erddap/tabledap/ANDRO.json`
- **Finding:** Hits real ERDDAP tabledap endpoint. Values are converted from cm/s to m/s correctly. Fallback sets `sourceMode: 'FIXTURE'`.
- **Risk:** No deception found. Climatology is correctly labeled and not misrepresented as a forecast.

### 3. Core Argo Profiling Floats
- **UI Claim:** LIVE or FIXTURE, data state OBSERVED.
- **Trace:** UI → `ProfileLayer` → `globalOceanProfileStore` → `ArgoAdapter` → `oceanDataService.getArgoProfiles` → `https://erddap.ifremer.fr/erddap/tabledap/ArgoFloats.json`
- **Finding:** Live ERDDAP fetch limits to `maxProfiles`. Parses pressure, temperature, and salinity. Fallback works safely.
- **Risk:** No deception found. Missing values inside profiles are handled as `null`, preventing zero-filling.

### 4. Autonomous Gliders, Shipboard CTD, BGC-Argo
- **UI Claim:** FIXTURE, data state OBSERVED.
- **Trace:** UI → `ProfileLayer` → `globalOceanProfileStore` → Respective Adapters → `oceanDataService.js` (e.g., `getGliderMissions`).
- **Finding:** These three endpoints **DO NOT** have a live ERDDAP fetch implemented. They directly return data from `realGliderFixture`, `realCTDFixture`, and `realBGCFixture`.
- **Mitigation Check:** The `oceanDataService.js` explicitly hardcodes `sourceMode: 'FIXTURE'` for these datasets. The UI correctly renders the `VERIFIED FIXTURE` badge when these are active, so the user is never deceived into thinking they are live.
- **Risk:** P2 Polish. We claim support for Glider/CTD/BGC, but the live fetch is unimplemented. As long as we do not verbally claim live API integration for these three during the demo, this is scientifically safe.

## Conclusion
OceanView successfully enforces a strict truthfulness invariant. No static fixture data can accidentally reach the UI masked as a live feed. The data provenance architecture securely handles timeouts and provides transparent labeling to the end-user.
