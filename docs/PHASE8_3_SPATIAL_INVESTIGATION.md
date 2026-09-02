# Phase 8.3 — Spatial Scientific Investigation Workspace Specification

## Executive Overview
Phase 8.3 transforms OceanView from a passive global visualizer into an interactive, operational **Spatial Scientific Investigation Workspace**.
Scientists can click anywhere on the ocean surface or search precise coordinates/basins to establish an authoritative **Analysis Location**, sample co-located numerical model fields, discover nearby in-situ observational assets (Argo, Glider, CTD, BGC), and trigger instant model-observation comparative analytics.

---

## 1. Architectural Principles & State Separation

### Distinct State Taxonomy
OceanView enforces strict architectural separation between four independent state concepts:

```
+-----------------------------------------------------------------------------+
|                          OCEANVIEW APPLICATION STATE                         |
+-----------------------------------------------------------------------------+
|                                                                             |
|  1. cameraState            Position, orientation, range, pitch, heading     |
|                            Controlled by CentralizedCameraController        |
|                                                                             |
|  2. scientificSelection    Active variable, physical depth, time step       |
|                            Global dataset state                             |
|                                                                             |
|  3. analysisLocation       Geographic target { lat, lon, bounds, source }   |
|                            Anchored spatial probe & query window            |
|                                                                             |
|  4. selectedObservation    Specific in-situ profile cast (Argo/CTD/Glider)  |
|                            Detailed sensor telemetry & vertical levels      |
+-----------------------------------------------------------------------------+
```

### Critical Rules
1. **Camera vs Science Independence**: Panning, orbiting, zooming, or switching regional camera presets **never** alters or clears the `analysisLocation`.
2. **Observation vs Location Independence**: Clicking an observation pin selects that platform and focuses the camera on it without destroying the active `analysisLocation`.
3. **No Fake Science**: If a model grid slice does not cover the analysis point or if a point lies in a masked land cell, values are reported as `Unavailable` / `null` rather than zero or synthetic estimates.
4. **Ocean vs Land Rejection**: Clicking or searching continental landmasses is actively blocked with feedback rather than initiating pointless oceanographic queries.

---

## 2. Investigation Engine (`analysisLocation.js`)

### Canonical Analysis Location Model
```typescript
interface AnalysisLocation {
  latitude: number;         // Degrees [-90, 90]
  longitude: number;        // Degrees [-180, 180]
  formatted: string;        // e.g. "15.20°N, 68.40°E"
  source: 'CLICK' | 'SEARCH' | 'REGION_PRESET' | 'OBSERVATION' | 'HISTORY';
  bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  status: 'IDLE' | 'ANALYZING' | 'READY' | 'PARTIAL' | 'UNAVAILABLE';
  datasetCoverage: Record<string, boolean>;
  selectedAt: string;       // ISO Timestamp
}
```

### Multi-Format Coordinate Parser
Supports three coordinate notations and handles spacing, cardinal suffixes, and symbols:
1. **Decimal Coordinates**: `"15.2, 68.4"`, `"15.2 68.4"`, `"-12.5, -45.2"`
2. **Cardinal Notation**: `"15.2N 68.4E"`, `"15.2 N, 68.4 E"`, `"12.4S, 45.1W"`, `"68.4E, 15.2N"`
3. **DMS (Degrees Minutes Seconds)**: `"15°12'N 68°24'E"`, `"15°12'30\"N 68°24'15\"E"`
4. **Known Marine Basins & Sectors**: Automatic autocomplete lookup for Arabian Sea, Bay of Bengal, Equatorial Indian Ocean, Lakshadweep Sea, Maldives, Somali Current, Andaman Sea, etc.

### Bounded Query Extent Derivation
Given an analysis point $(\phi, \lambda)$, a symmetrical half-width window $\delta = 3.0^\circ$ is computed:
$$\text{minLat} = \max(-90, \phi - \delta), \quad \text{maxLat} = \min(90, \phi + \delta)$$
$$\text{minLon} = \max(-180, \lambda - \delta), \quad \text{maxLon} = \min(180, \lambda + \delta)$$

---

## 3. Direct In-Situ Model Sampling

The active numerical model grids in `OceanGridStore` are bilinearly sampled at $(\phi, \lambda)$ for the active depth $z$:

### Bilinear Scalar Sampling (`sampleScalarGridBilinear`)
Given cell corners $(r_0, c_0), (r_1, c_0), (r_0, c_1), (r_1, c_1)$:
$$u = \frac{\lambda - \lambda_{c_0}}{\lambda_{c_1} - \lambda_{c_0}}, \quad v = \frac{\phi - \phi_{r_0}}{\phi_{r_1} - \phi_{r_0}}$$
$$f(\phi, \lambda) = (1-u)(1-v)v_{00} + u(1-v)v_{01} + (1-u)vv_{10} + uvv_{11}$$

### Land-Mask & Missing Value Preservation
If all corners are masked by land, `null` is returned. If along a coastline where partial data exists, nearest valid ocean node is sampled to prevent artificial edge extrapolation across coastlines.

### Sampled Fields:
- **Sea Water Temperature**: SDC SeaDataNet Climatology [MODELED] in °C
- **Practical Salinity**: SDC SeaDataNet Climatology [MODELED] in PSU
- **Ocean Current Velocity**: ANDRO Deep Velocity [CLIMATOLOGY] in m/s with true heading (0°–360°) and vector decomposition $(u, v)$.

---

## 4. In-Situ Observation Discovery & Radius Filtering

### Great-Circle Geodesic Distance
Uses the spherical Haversine formula:
$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos\phi_1\cos\phi_2\sin^2\left(\frac{\Delta\lambda}{2}\right)$$
$$d = 2 R \operatorname{atan2}(\sqrt{a}, \sqrt{1-a}), \quad R = 6371.0\text{ km}$$

### Discovery Features:
1. **Search Radius**: Filters all active profiles in `OceanProfileStore` to $\le 500\text{ km}$.
2. **Ascending Distance Sorting**: Nearest platform is always positioned at index 0.
3. **Platform Breakdown**: Live counts categorized by platform type (Argo, Glider, CTD, BGC).
4. **Nearest Observation Card**:
   - Platform ID & Type
   - Geodesic distance (e.g. `18.4 km away`)
   - Vertical depth level count
   - **"Compare with Nearest Observation"** action button.

---

## 5. 1-Click Model ↔ Observation Comparison Workflow

Clicking "Compare with Nearest Observation":
1. Sets `selectedProfile = nearest.profile`.
2. Triggers the existing `ModelObservationComparator` against active 4D model slice.
3. Opens `ProfileInspector` with dual-mode scientific evaluation (MAE, RMSE, MBE deltas).
4. Displays the persistent **"Back to Point"** navigation control, enabling scientists to seamlessly return camera focus to their origin analysis point after reviewing profile soundings.

---

## 6. Globe Visual Marker Specification

Rendered via a dedicated Cesium `CustomDataSource` (`AnalysisLocationMarker`):
- **Center Point**: Diameter $11\text{px}$, cyan fill (`#06b6d4`), solid white outline ($2\text{px}$), `disableDepthTestDistance: Infinity`.
- **Target Ring**: Geodesic ellipse with semi-major/minor axis $30\text{ km}$, semi-transparent cyan fill (`alpha: 0.2`), cyan stroke outline ($2\text{px}$).
- **Elevation**: Render altitude strictly set to $+15\text{m}$ to guarantee visibility above bathymetric surfaces and 3D terrain without depth fighting.
- **Lifecycle**: Updates in-place on same Cesium viewer instance; removed instantly when analysis is cleared.
