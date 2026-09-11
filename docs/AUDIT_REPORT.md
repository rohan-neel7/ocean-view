# OceanView (SIH26067) — Engineering Audit Report

**Date:** September 2026
**Focus:** Systematic Inspection and Polishing (Phase 1)

## Executive Summary
This document outlines the findings of a comprehensive codebase audit of the OceanView application. The application is structurally sound, passing all 185 tests, and correctly implements the core CesiumJS / React architecture. However, the audit revealed several critical state management issues, performance bottlenecks, and UI inconsistencies that must be addressed to bring the product to a stable, scientifically credible state.

The issues are categorized by priority (P0 to P3).

---

## P0 — Critical State & Architecture Bugs
*Issues that cause severe performance degradation, memory leaks, or incorrect data presentation.*

### 1. `ColorScaleManager` Instantiation Cascade (`AppContext.jsx:435`)
**Issue:** `new ColorScaleManager(...)` is instantiated directly inside the render body of the `OceanViewProvider`. 
**Impact:** Because a new object reference is created on every render cycle of the global context, all consuming components receive a new reference. This breaks memoization across the entire visualization tree, causing severe cascade rerenders even when unrelated state changes.
**Fix Required:** Wrap the instantiation in a `useMemo` block keyed strictly on the variables that define the color scale.

### 2. Stale Closure on `loadRealScientificData` (`AppContext.jsx:263-266`)
**Issue:** An ESLint suppression hides a stale closure in a `useEffect`. The effect captures the `scientificSelection` state at mount time. When the data mode changes, the fetch triggers using the outdated `scientificSelection` rather than the current region/variable.
**Impact:** Users changing regions or variables and then toggling data modes will see incorrect data loaded.
**Fix Required:** Utilize a mutable `useRef` to hold the latest `scientificSelection` for the effect to read from, or correctly manage the dependency array.

### 3. Swallowed Fetch Errors (`AppContext.jsx`)
**Issue:** In `fetchCurrentVectors`, `fetchGlider`, `fetchCTD`, and `fetchBGC`, errors are caught (`catch (err)`) but completely ignored and never logged.
**Impact:** If a network request fails or an adapter throws an error, it fails silently. This makes field debugging virtually impossible.
**Fix Required:** Prefix unused errors with `_err` if intentionally ignored (to satisfy linting), but more importantly, log these to the console (e.g., `console.error`) or surface them to a telemetry service.

### 4. Timer Race Condition in Analysis Feedback (`AppContext.jsx:349`)
**Issue:** The `setTimeout` used to clear the analysis feedback banner after 4.5 seconds does not clear previous timeouts.
**Impact:** If a user clicks the globe twice quickly, the first timeout will fire and prematurely clear the feedback for the *second* click. 
**Fix Required:** Store the timeout ID in a `useRef` and call `clearTimeout` before setting a new one.

### 5. Invalid React Hook Dependencies (`GlobeViewer.jsx:328, 346`)
**Issue:** The `useEffect` hooks for vectors and particles list `sourceStatuses.current` as a dependency. `sourceStatuses` is a ref, and React does not track mutations to `.current`.
**Impact:** The effects may fail to re-run when the source data finishes loading, resulting in stale or missing visualizations on the globe.
**Fix Required:** Extract the needed string statuses into standard React state, or use a proper pub/sub pattern if refs are strictly required for Cesium lifecycle bridging.

---

## P1 — High Priority Logic & UI Bugs
*Issues that degrade UX, cause unnecessary network/CPU load, or present broken controls.*

### 1. 10Hz Camera Polling (`ScientificTelemetryHUD.jsx:34`)
**Issue:** The telemetry HUD uses a `setInterval` to read the Cesium camera position every 100ms (10 times a second).
**Impact:** This keeps the CPU awake and triggers React state updates continuously, even when the user is not interacting with the globe. This violates the 0% idle GPU/CPU utilization invariant.
**Fix Required:** Replace polling with an event listener on Cesium's `viewer.camera.changed` event.

### 2. Broken Filter Controls (`ObservationExplorer.jsx:80-96`)
**Issue:** The Region and Depth `<select>` dropdowns in the observation explorer have no `onChange` handlers.
**Impact:** The user can interact with the dropdowns, but they do absolutely nothing. This breaks the rule against faking functionality.
**Fix Required:** Either implement the filtering logic or explicitly disable/label them as "PLANNED".

### 3. Stale Colorbar Modal State (`ColorbarEditorModal.jsx:27-31`)
**Issue:** The modal initializes its local state (`minVal`, `maxVal`, etc.) using `useState` seeded from global settings on mount. If the modal is closed and reopened, it retains its stale local state instead of picking up any new global changes.
**Impact:** The UI becomes desynchronized from the actual scientific state.
**Fix Required:** Sync local state with global state via a `useEffect` watching the `colorbarModalOpen` flag, or use a `key` on the modal component to force unmount/remount.

### 4. Overly Broad Fetch Triggers (`AppContext.jsx:283`)
**Issue:** `fetchCurrentVectors` is triggered whenever `layers.currentVectors` OR `layers.particleFlow` changes. 
**Impact:** Toggling the visibility of particles triggers a full network re-fetch of the vector data, which is wasteful and slow.
**Fix Required:** Refactor the dependency array so fetching only happens when the underlying data selection changes, not when visibility toggles.

### 5. `setAnalysisLocation` Stale Closure (`AppContext.jsx:337-411`)
**Issue:** The callback captures an old version of `scientificSelection`.
**Impact:** Clicking the globe to probe a point after changing variables fetches data for the old variable.
**Fix Required:** Use a ref for `scientificSelection`.

---

## P2 — Medium Priority Cleanup
*Dead code, unused variables, and fragile layout structures.*

1. **Dead Imports & Destructuring:** 
   - `HeaderBar.jsx`: `setDataMode` is unused.
   - `InspectorDock.jsx`: `presentationMode` is unused.
   - `ColorbarEditorModal.jsx`: `activeColormap` / `setActiveColormap` are unused.
   - `ScientificTelemetryHUD.jsx`: `activeVariable` is unused.
   - `ObservationExplorer.jsx`: Unused `useState` import.
   - `BGCAdapter.js`, `CTDAdapter.js`, `GliderAdapter.js`: Unused `createProvenance` imports.
2. **Missing Metadata Display:** `ProfileInspector.jsx` destructures `quality` and `provenance` but fails to render them, hiding valuable scientific context.
3. **Always-Visible Info Banner:** `LayerPanel.jsx` shows a warning about the 0-5m surface offset permanently, even when the user is probing deep ocean data where it is irrelevant.
4. **Fragile CSS/Layouts:** `OceanBasinQuickJumps.jsx` has a hardcoded `left: '308px'`, and `App.jsx` has hardcoded top offsets for banners. These will break if the sidebar width or header height changes.
5. **Depth Slider Label Logic:** `DepthSlider.jsx` checks `activeDepthMeters === 0` to display "SURFACE", but the first level is often 5m. The label logic fails.

---

## P3 — Low Priority Polish

1. **Duplicate Imports:** `GlobeToolRail.jsx` imports `RotateCw` twice.
2. **Hemisphere Labels:** `ObservationExplorer.jsx` hardcodes `°N` and `°E`, meaning a profile in the southern hemisphere (e.g., -15 lat) incorrectly displays as `-15°N` instead of `15°S`.
3. **Telemetry Edge Case:** At exactly 1000m altitude, the `ScientificTelemetryHUD` may display poorly formatted strings.
4. **Scratch Files:** A `scratch_logs.mjs` file exists in the repository root and should be deleted.
