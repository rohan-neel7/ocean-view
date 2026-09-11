# Scientific Data Contract

This document outlines the strict engineering flow and data integrity guarantees within the OceanView data layer. 

**Core Goal:** Every number OceanView presents must have a trustworthy meaning, origin, unit, time, and scientific state.

## Architecture Flow

The data layer follows a strict unidirectional flow:

**Provider ↓ Adapter ↓ Canonical Contract ↓ Data Service ↓ Application State ↓ Scientific Analysis ↓ Visualization**

### 1. External Provider
External providers (e.g., IFREMER ERDDAP, SeaDataNet, INCOIS) serve raw netCDF, JSON, or CSV data. 

### 2. Adapters
Adapters (e.g., `ArgoAdapter.js`, `OceanModelAdapter.js`) ingest provider-specific formats and normalize them.
- **Invariant:** Adapters fail explicitly on invalid data rather than silently producing plausible data.
- **Invariant:** Unmeasured parameters (missing values) are explicitly mapped to `null` or `fillValue (-9999.0)`. Missing values are NEVER converted to `0.0`.

### 3. Canonical Scientific Contracts
Adapters output strictly typed models:
- **`CanonicalGridScalar`**: 2D/3D numerical model grids (e.g., Temperature, Salinity).
- **`CanonicalGridVector`**: 2D/3D velocity fields (U and V components).
- **`CanonicalProfile`**: In-situ vertical casts (Argo, CTD).
- **`CanonicalTrajectory`**: Autonomous glider tracks.

These models guarantee the preservation of metadata, ensuring units (e.g., °C, PSU, m/s) and coordinates (Lat/Lon) are validated.

### 4. Data Service (Backend Proxy)
The Express backend (`server/oceanDataService.js`) proxies live data securely and efficiently:
- Enforces strict SSRF protection via an allowlist of trusted `datasetId` parameters.
- Validates temporal bounding logic.
- Implements bounded in-memory caching to prevent duplicate network hits.
- **Fixture / Live Mode:** If a network request fails, the proxy falls back to a verified JSON fixture and explicitly tags the response with `sourceMode: 'FIXTURE'`.

### 5. Application State & Scientific State Integrity
The `AppContext` ingests canonical objects and maintains state visibility. 
Data integrity is strictly upheld through a 10-state lifecycle defined in `intelligenceContract.js` (e.g., `MODELED`, `OBSERVED`, `CLIMATOLOGY`).

### 6. Comparison Engine
The `ProfileAlignmentEngine` and `ModelObservationComparator` quantify differences between models and observations.
- Matches are aligned vertically via Piecewise Linear Splines and horizontally via Nearest Neighbor.
- **Guard:** Temporal and spatial mismatches that exceed tolerances are rejected, returning an `UNRESOLVED` state.

## Provider Matrix Status
For an exhaustive list of integrations, refer to the [SCIENTIFIC_DATA_AUDIT.md](./SCIENTIFIC_DATA_AUDIT.md).
