# OCEANVIEW — SIH JUDGE Q&A

This document prepares the presentation team for technical scrutiny by the SIH judging panel.

## Q: How are you handling the massive size of 3D ocean models in the browser?
**A:** We do not attempt to load raw NetCDF files into the browser. Instead, we developed a `CanonicalGridScalar` format that delivers highly compressed, structured JSON data representing specific depth slices or subvolumes. Furthermore, we implemented a custom **Render Governor** that completely pauses the Cesium render loop when the user isn't interacting, dropping CPU/GPU usage to 0%. For 3D meshes (like the thermocline isosurface), we use an in-browser WebWorker-ready Marching Cubes implementation that dynamically triangulates only the requested boundary.

## Q: Is this live data or just a pre-baked animation?
**A:** It is a hybrid deterministic system. The application can query live ERDDAP servers (like INCOIS or Coriolis GDAC) via our Node.js proxy to fetch the latest Argo casts. However, because ocean models are massive and live APIs can be unreliable during a live demo, we also ship with a set of `VERIFIED FIXTURES`. The UI guarantees transparency: it explicitly tells the user whether the data is `LIVE` or `FIXTURE` via the badge in the header, ensuring absolute scientific honesty.

## Q: What happens if I click on an Argo float? How do you compare it to the model?
**A:** When an in-situ profile is selected, our `ModelObservationComparator` performs a real-time nearest-neighbor 3D spatial and temporal interpolation. It matches the exact (lat, lon, depth, time) of the Argo float to the closest node in the numerical model grid. It then calculates the Mean Bias Error (MBE) and Root Mean Square Error (RMSE). We purposefully do not "smooth" or "fake" the alignment—if the observation is outside the model domain, it explicitly marks it as `UNRESOLVED`.

## Q: Why didn't you just use an existing tool like God's Eye View?
**A:** Existing tools often focus on 2D surface fields (like wind or SST). The SIH mandate requires 3D/4D volumetric exploration. OceanView was built from scratch using CesiumJS to support vertical transects, deep-water particle flow, and 3D isosurfaces. Furthermore, OceanView uniquely integrates *both* numerical models and in-situ observations in the same environment, whereas most tools do one or the other.

## Q: What are the Outreach vs Operational modes?
**A:** We realized that INCOIS has two audiences: expert oceanographers and the general public. `Operational` mode provides dense statistical metrics, error margins, and raw data tables. `Outreach` mode replaces these with plain-language deterministic insights (e.g., explaining what the "Thermocline" is based on the current profile), maximizing the software's impact.

## Q (Red-Team): Is your interpolation mathematically sound? Why are you using Nearest Neighbor instead of 3D Splines?
**A:** Nearest Neighbor was explicitly chosen for performance in the browser. 3D Spline interpolation over a 100,000-cell volumetric grid causes WebGL stuttering. To preserve scientific honesty, the UI explicitly states that the interpolation method is "Nearest Neighbor" and reports the exact spatial distance between the cast and the nearest node.

## Q (Red-Team): You claim WMS/WCS support, but I don't see any OGC WMS layers loaded on the globe.
**A:** That is correct. We implemented compliant OGC URL builders in our source code (`OGCWMSClient.js`) to prove we understand the standards. However, because raw WMS image tiles block our ability to do mathematical model-observation intercomparison, we chose to use the ERDDAP REST API to pull raw JSON arrays instead. The WMS code is there for future extensibility.

## Q (Red-Team): Does one Argo RMSE calculation validate an entire Ocean Model?
**A:** No, it does not. The RMSE calculated in OceanView describes the localized error at that specific profile's location and time. Real model validation requires aggregating thousands of casts over years. OceanView's tool is for rapid, localized spot-checking by operators, not for generating publishable climatological validations. We are careful not to overclaim this.
