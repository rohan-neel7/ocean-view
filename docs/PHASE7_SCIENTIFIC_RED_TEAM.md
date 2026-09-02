# OCEANVIEW — PHASE 7 SCIENTIFIC & ALIGNMENT RED TEAM REPORT

## Objective
Act as an oceanographic reviewer to audit all derived physics, spatial coordinate math, and the model-vs-observation comparison logic. Identify any scientifically exaggerated claims or inappropriate interpolations.

## 1. Derived Subsurface Ocean Physics (Correctness)

| Calculation | Formula/Source | Inputs | Assumptions | Scientific Risk |
|---|---|---|---|---|
| Potential Density (Sigma-T) | UNESCO 1983 | Temperature, Salinity | Assumes sea surface pressure (0 dbar) reference. | **P3 (Minor):** True density requires pressure. Sigma-T is widely accepted for shallow waters but less accurate below 1000m compared to TEOS-10. |
| Mixed Layer Depth (MLD) | de Boyer Montégut 2004 | Temperature | Threshold criterion: $\Delta T = 0.2^\circ C$ from 10m reference. | **None.** Standard, robust algorithm. |
| Sound Speed | Mackenzie 1981 | Temp, Salinity, Depth | Valid ranges: T (0-30°C), S (25-40 PSU), D (0-8000m). | **None.** |

## 2. Model / Observation Alignment (Red Team)

### Audit of `ModelObservationComparator.js`
- **Spatial Collocation:** Uses Nearest Neighbor interpolation to find the closest grid node to the Argo cast. 
  - *Risk:* If the grid is low resolution (e.g., 0.25°), the nearest node could be ~15km away. The UI now transparently reports this distance (`maxSpatialDistanceKm`).
- **Vertical Interpolation:** Uses Nearest Neighbor depth matching. 
  - *Risk:* **P2 (Important Polish):** An Argo float samples at continuous pressures. A model grid has fixed Z-levels. Nearest Neighbor causes "stair-stepping" error. A better scientific approach would be 1D linear vertical interpolation of the model to the exact Argo depths. However, for a demo, Nearest Neighbor is computationally fast and the UI transparently admits "Vertical Interpolation: Nearest Neighbor". 
- **Temporal Alignment:** Compares the single model timestamp against the Argo observation time.
  - *Risk:* ERDDAP slices are often daily means. An Argo float surfaces at a specific hour. Comparing a snapshot to a daily mean introduces diurnal bias (especially for SST).
- **Metric Validity (RMSE / MBE):** 
  - *Risk:* **P1 (Major Weakness):** Calculating RMSE on a *single* Argo cast does not "validate the model". It only describes the local error at one point in space/time. 
  - *Mitigation:* We must ensure the UI does not say "Model Accuracy: 95%". The `ProfileInspector` correctly says "Statistical Intercomparison", which is mathematically honest.

## 3. Current Vectors
- **Convention:** Uses standard Oceanographic U (Eastward) and V (Northward) components.
- **Speed:** Calculated via Euclidean magnitude ($\sqrt{U^2 + V^2}$).
- **Risk:** The ANDRO dataset is a *climatology* (historical mean), whereas the temperature field is a specific daily snapshot. Overlaying climatological currents on snapshot temperatures is visually compelling but scientifically incongruous for real-time forecasting. The UI marks it as `CLIMATOLOGY`.

## Conclusion
The mathematics are sound, and missing values are never zero-filled. The primary scientific risk is over-claiming the meaning of a single-profile RMSE, and using nearest-neighbor depth interpolation rather than vertical splines. Because the UI explicitly states the interpolation method and spatial distance, the product is scientifically defensible against a judge's interrogation.
