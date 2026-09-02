# OCEANVIEW SIH26067 DEMONSTRATION SCENARIO

**Objective:** Showcase the core value proposition of OceanView: integrating 3D numerical models with real in-situ observations in a single deterministic environment, highlighting data provenance and scientific comparison.

## Execution Sequence

### 1. Initial State & Region Verification
* **Action:** Launch application. Verify `Operational` mode is selected in the top right.
* **Action:** Ensure the region dropdown in the header is set to `Arabian Sea`.
* **Expected Result:** The globe flies smoothly to the Arabian Sea. The data badge shows `LIVE SCIENTIFIC FEED (ERDDAP / GDAC)` or `VERIFIED ARGO / SEADATANET FIXTURE`.

### 2. Variable & Depth Slice (The "What" and "Where")
* **Action:** In the left panel, select `Temperature (SST)`.
* **Action:** Use the depth slider to select `250 m`.
* **Expected Result:** The horizontal slice renders the 250m temperature field. The colorbar updates to show `THERMAL (AUTO)`, units `°C`, and source `SeaDataNet`.

### 3. Enabling Ocean Currents
* **Action:** Open the `Active Ocean Layers` panel.
* **Action:** Toggle `Velocity Vector Glyphs` and `Particle Flow Streamlines`.
* **Expected Result:** ANDRO climatology vectors and particles begin animating over the temperature field.
* **Insight:** Explain that we are visualizing real SeaDataNet thermal structure overlaid with Ifremer/ANDRO kinematic flow.

### 4. In-Situ Observation Selection
* **Action:** In the `Active Ocean Layers`, ensure `Argo Profiling Floats` is toggled ON.
* **Action:** In the `In-Situ Assets` explorer, select the `ARGO` filter.
* **Action:** Click a specific Argo float (e.g., WMO 2900771) near the center of the Arabian Sea.
* **Expected Result:** The `Profile Inspector` panel opens on the right.

### 5. Model vs Observation Intercomparison
* **Action:** Observe the `Profile Inspector`.
* **Expected Result:** 
    * The exact data provenance is visible (`Coriolis GDAC`, `DataState.OBSERVED`).
    * The statistical intercomparison (`RMSE`, `MAE`, `MEAN BIAS`) is calculated instantly.
    * The `Deterministic Insight` reads (for example): "Observed profile is generally warmer/higher than model...".
    * The alignment metadata shows spatial and temporal distance, and interpolation methods.
* **Insight:** Emphasize that the system dynamically aligns the unstructured Argo cast with the structured model grid without fabricating missing data.

### 6. Vertical Transect & 3D Exploration
* **Action:** In the bottom left, switch the Subsurface Exploration mode from `Horizontal Slice` to `Vertical Transect`.
* **Expected Result:** The globe renders a vertical curtain slicing through the Arabian Sea, revealing the subsurface thermocline down to 2000m.

### 7. Time & Depth Dynamics
* **Action:** Press `Play` on the bottom timeline control.
* **Expected Result:** The model steps forward in time, and the transect/slice updates smoothly.
* **Action:** Adjust the `Depth` slider while the transect is visible.
* **Expected Result:** The reference plane moves, showing volumetric awareness.

### 8. Outreach Mode Toggle
* **Action:** Switch to `Outreach` mode in the top header.
* **Expected Result:** The dense statistical metrics vanish. In their place, an educational card explains the concept of "Temperature" and the "Thermocline" in plain language.
* **Insight:** Demonstrate how the same dataset serves both advanced INCOIS scientists and public educational outreach.

## Failure Resilience (Adversarial Check)
* If the live ERDDAP network fails during the demo, the application will silently fall back to verified fixtures. The UI will explicitly change the badge to `FIXTURE` and provenance to `SourceMode.FIXTURE`, guaranteeing we never present cached data as live. Missing parameters (e.g., Oxygen on a core Argo) will render as `—` (null), never zero.
