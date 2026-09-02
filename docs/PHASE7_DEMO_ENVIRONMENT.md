# OCEANVIEW — PHASE 7 OFFLINE & DEMO ENVIRONMENT

## Objective
Classify every demo dependency and design a legitimate fallback strategy assuming the SIH venue internet is unreliable. 

## Dependency Classification

| Dependency | Classification | Fallback Mechanism |
|---|---|---|
| SeaDataNet Model Grid | OPTIONAL LIVE | 6-sec timeout → `realModelSliceArabianSea.json` fixture. |
| ANDRO Ocean Currents | OPTIONAL LIVE | 6-sec timeout → `realCurrentSliceArabianSea.json` fixture. |
| Argo Profiling Floats | OPTIONAL LIVE | 6-sec timeout → `realArgoArabianSea.json` fixture. |
| Glider / CTD / BGC | UNAVAILABLE WITHOUT NETWORK | Mapped directly to static fixtures by design. |
| Cesium Base Imagery | REQUIRED LIVE | No local basemap cache currently implemented. A total internet outage will result in a black globe unless browser cache holds the tiles. |
| Cesium Terrain | REQUIRED LIVE | Requires `assets.ion.cesium.com`. |

## Offline Fallback Strategy
If the network is completely down:
1. OceanView's Node server will safely time out and serve numerical fixtures.
2. The UI will explicitly badge all data as `FIXTURE`.
3. **P1 Vulnerability:** The globe itself (Map tiles) will fail to load if not cached. 

## Mitigation for Demo
The presenter should ensure the application is opened and the Arabian Sea region is cached in the browser *before* presenting. Alternatively, INCOIS could host a local GeoServer with a low-res Blue Marble basemap, but that is out of scope for the current build.

The demo is scientifically robust and will not crash, even if the basemap fails.
