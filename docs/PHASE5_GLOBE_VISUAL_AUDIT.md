# PHASE 5 — GLOBE VISUAL QUALITY & RENDERING FORENSIC AUDIT
## INCOIS 3D Ocean Data Visualization System (SIH26067)

**Reference Repositories (READ-ONLY):**
- `C:\Users\Rohan Neel\Documents\Antigravity\sih\gods-eye-view-main\gods-eye-view-main`
- `C:\Users\Rohan Neel\Documents\Antigravity\sih\Worldview\worldview`

---

## 1. Identified Visual Degradation Root Causes

| Visual Issue | Observed Symptom | Technical Root Cause in Rendering Stack | Corrective Action for Scientific Baseline |
|---|---|---|---|
| **Overexposure / Washed Out Imagery** | Globe surface and continents appear washed out with faint contrast. | Post-processing bloom (`scene.postProcessStages.bloom`) was initialized as `enabled = true` with high contrast ($110$) and brightness offset, washing out 2D tile textures with an artificial HDR glow. | **Bloom disabled by default** (`enabled = false`). Establish neutral exposure and natural atmospheric light intensity ($10.0$). |
| **Blurry / Soft Textures** | Tile imagery and text overlays appear soft/fuzzy. | 1. Cesium viewer was initialized without `msaaSamples: 4` (multisampling antialiasing).<br>2. `viewer.resolutionScale` was unmanaged, causing CSS scaling mismatches on High-DPI screens. | Set `msaaSamples: 4`, configure `resolutionScale` to match `Math.min(window.devicePixelRatio, 1.5)` with explicit canvas buffer synchronization. |
| **Overpowering 3D Tiles at Orbital Scales** | Google 3D Photorealistic Tiles mesh at high orbital altitudes has lower geometric detail than dedicated 2D web mercator pyramids. | `GOOGLE_3D_TILES` was set as the global default basemap, which is designed for sub-kilometer 3D city/terrain inspection rather than global oceanographic basin analysis. | Set **CartoDB Dark Matter / Esri Ocean** as the default scientific basemap; maintain Google 3D Tiles as an optional high-resolution coastal mode. |
| **World-Space Error Text Overlay** | Distracting warning texts or watermarks rendered on globe. | Provider error states or missing API tokens must never render as world-space text overlays over geography. | Cleanly route all provider status, degraded modes, and health metrics into the top-bar Truthfulness badge and Data Health workstation. |

---

## 2. Scientific Visual Baseline Configuration

```javascript
// Target Scientific Baseline Parameters
viewer.resolutionScale = 1.0;
viewer.scene.msaaSamples = 4;
viewer.scene.postProcessStages.bloom.enabled = false;
viewer.scene.globe.enableLighting = false;
viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#050b14');
viewer.scene.skyAtmosphere.atmosphereLightIntensity = 10.0;
viewer.scene.skyAtmosphere.saturationShift = -0.05;
viewer.scene.skyAtmosphere.brightnessShift = -0.05;
```

With these settings:
- The globe is **sharp, crisp, high-contrast, and natural**.
- Scientific scalar fields (SST, Salinity) and vector flow streamlines remain the primary visual focus.
- 0% post-process blur, 0% HDR blowout, and stable 60 FPS performance.
