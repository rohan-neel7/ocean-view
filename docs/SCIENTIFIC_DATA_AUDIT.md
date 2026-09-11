# SCIENTIFIC DATA AUDIT

**Date:** 2026-09-11
**Target:** OceanView Repository (`rohan-neel7/ocean-view`)
**Scope:** Adapters, Canonical Contracts, Data Services, Missing Value Semantics, Data Validation, Time/Units, Error Handling, Proxy Security.

---

## 1. PROVIDER MATRIX

| Provider / Integration | Adapter | Source Type | Real Network Call? | Fixture Fallback? | Canonical Output | Tested? | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Ocean Model (SDC_GLO_CLIM)** | `OceanModelAdapter.js` | ERDDAP Griddap | Yes (Live IFREMER ERDDAP) | Yes | `CanonicalGridScalar` | Yes | **VERIFIED** |
| **Ocean Current (ANDRO)** | `OceanCurrentAdapter.js` | ERDDAP Tabledap | Yes (Live IFREMER ERDDAP) | Yes | `CanonicalGridVector` | Yes | **VERIFIED** |
| **Argo Profiling Floats** | `ArgoAdapter.js` | ERDDAP Tabledap | Yes (Live IFREMER ERDDAP) | Yes | `CanonicalProfile` | Yes | **VERIFIED** |
| **CTD Stations (Sagar Kanya)** | `CTDAdapter.js` | JSON Fixture | No (Pure Fixture) | N/A | `CanonicalProfile` | No unit tests | **UNVERIFIED** |
| **Autonomous Gliders** | `GliderAdapter.js` | JSON Fixture | No (Pure Fixture) | N/A | `CanonicalTrajectory` + `CanonicalProfile` | No unit tests | **UNVERIFIED** |
| **BGC-Argo** | `BGCAdapter.js` | JSON Fixture | No (Pure Fixture) | N/A | `CanonicalProfile` | No unit tests | **UNVERIFIED** |

---

## 2. CANONICAL CONTRACT AUDIT & SCIENTIFIC INTEGRITY

**Domain Models Evaluated:** `CanonicalProfile`, `CanonicalGridScalar`, `CanonicalGridVector`, `intelligenceContract`.

*   **Missing ≠ Zero:** Passed. All verified adapters (Argo, Ocean Model, Ocean Current) strictly use `null` or `fillValue (-9999.0)`. Adversarial tests (`adversarialPhase2.test.js`, `adversarialPhase3.test.js`) explicitly verify that unmeasured parameters are not converted to `0.0`.
*   **Fixture ≠ Live:** Passed. The backend proxy injects `sourceMode: 'FIXTURE'` if a live network fetch fails. `AppContext.jsx` reads this and sets `sourceStatuses` appropriately. There is no silent masquerading of fixtures as live data.
*   **Modeled ≠ Observed:** Passed. `intelligenceContract.js` has exactly 10 canonical data states (`MODELED`, `OBSERVED`, `CLIMATOLOGY`, etc.).
*   **Data Quality Validation:** Passed. Capping coordinates at limits (-80 to 80 Lat) and avoiding physical impossibilities is explicitly enforced.
*   **Variable Registry:** Mostly Passed. `datasetCapabilities.js` acts as a central registry for variables. However, BGC variables are currently hardcoded in `BGCAdapter.js`.

---

## 3. MODEL ↔ OBSERVATION COMPARISON AUDIT

**Workflow Evaluated:** `ModelObservationComparator.js` & `ProfileAlignmentEngine.js`.

*   **Temporal Matching Guard:** Passed. Returns `TEMPORAL_MISMATCH_UNRESOLVED` if `maxTemporalMismatchDays` is exceeded.
*   **Spatial Out of Bounds:** Passed. Returns `SPATIAL_OUT_OF_BOUNDS`.
*   **Interpolation Strategy:** Uses Piecewise Linear Vertical Spline and Nearest Neighbor/Bilinear.
*   **Status Semantics:** Honest metrics (`validPairs`, `meanBias`, `rmse`) are only calculated on mutually valid non-fill depth levels.

---

## 4. PROXY, CACHING & NETWORK EFFICIENCY

*   **Caching:** Passed. A safe `BoundedCacheStore` limits memory footprint to 200 items. Caches identical bounded slice requests efficiently.
*   **Rate Limiting:** Passed. `express-rate-limit` is actively employed.
*   **SSRF Risk (VULNERABILITY):** Failed. `server/oceanDataService.js` interpolates the `datasetId` directly into the IFREMER ERDDAP URL without an explicit allowlist. This represents an SSRF risk.
*   **Time Validation:** Partial Pass. Uses `new Date(timestamp || Date.now())` which safely handles ISO UTC but doesn't explicitly reject malformed string timestamps.

---

## 5. EXECUTIVE SUMMARY

**P0 (Critical Security):** 1 (SSRF Vulnerability in proxy).
**P1 (Data Correctness):** 0 (Missing ≠ zero and fallback visibility are correctly implemented).
**P2 (Architecture):** 2 (Strict Date parsing needed, BGC registry centralization).

**FIXED:** 0 (Pending Execution).
**REMAINING:** Fix SSRF allowlist, implement strict date validation.
**VERIFIED INTEGRATIONS:** 3
**UNVERIFIED INTEGRATIONS:** 3
**TEST RESULTS:** Existing adversarial tests successfully block physical violations.

*End of Audit.*
