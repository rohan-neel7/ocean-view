# OCEANVIEW — SECURITY AUDIT (SIH FINAL)

## Architecture Overview
OceanView is a client-heavy, server-light application. The backend (Express) acts purely as a stateless proxy to circumvent CORS restrictions for INCOIS ERDDAP and Coriolis GDAC, and to serve local verified JSON fixtures.

## Threat Model & Mitigations

### 1. Data Integrity & Poisoning
**Risk:** Malicious actors injecting fabricated ocean data.
**Mitigation:** The application strictly connects only to verified, public institutional APIs (INCOIS, Ifremer, SeaDataNet). The proxy server uses hardcoded base URLs and does not accept arbitrary endpoint forwarding. Local fixtures are strictly read-only and version-controlled.

### 2. Cross-Site Scripting (XSS)
**Risk:** Injection of malicious scripts via data fields (e.g., Platform ID).
**Mitigation:** React automatically escapes all string interpolations in the JSX views (`ProfileInspector`, `ObservationExplorer`). We do not use `dangerouslySetInnerHTML`.

### 3. Denial of Service (DoS)
**Risk:** Crashing the client browser via massive payload ingestion.
**Mitigation:**
- **Bounded Rendering:** `ProfileLayer` uses `CustomDataSource` clustering and caps maximum profile rendering at 1000 entities.
- **Volume Bounding:** `IsosurfaceEngine` and `ParticleCurrentLayer` enforce hard limits on marching cube generation and particle budgets (Max 8000).

### 4. API Key Leaks
**Risk:** Exposing third-party API keys (e.g., Mapbox, Cesium ion).
**Mitigation:** We eliminated all dependencies on commercial basemaps. The application uses purely open-source or freely available terrain, meaning there are zero secret keys in the environment.

## Conclusion
OceanView meets all SIH security requirements for a public-facing scientific visualization tool.
