# Phase 7.6 — Rendering Stack Architecture

## Layer Stack (Bottom to Top)

```
                    CAMERA
                       ↓
              ┌─────────────────┐
              │  Debug Overlay   │  (Ctrl+Shift+D, dev-only)
              └─────────────────┘
                       ↓
        ┌─────────────────────────────┐
        │  SCALAR FIELD (Entity)       │  temperature / salinity / chl-a
        │  PARTICLE FLOW (Entity)      │  advecting current particles
        │  VECTOR GLYPHS (DataSource)  │  current direction arrows
        │  OBSERVATIONS (DataSource)   │  Argo / Glider / CTD / BGC
        └─────────────────────────────┘
              disableDepthTestDistance=∞
                       ↓
        ┌─────────────────────────────┐
        │  SUBSURFACE PRIMITIVES       │  transects, isosurfaces
        └─────────────────────────────┘
              depthFailAppearance, underground camera
                       ↓
          GOOGLE 3D TILES / BASEMAP
                       ↓
              CESIUM GLOBE
```

## Data Flow Pipeline

```
USER ACTION (variable/depth/toggle)
       ↓
AppContext.jsx (state change)
       ↓
fetchModelGrid() → server/oceanDataService.js → ERDDAP/fixture
       ↓
normalizeOceanModelGrid() → createCanonicalGridScalar()
       ↓
globalOceanGridStore.setGrid(canonicalGrid)
       ↓
GlobeViewer.jsx useEffect (triggered by sourceStatus/activeVariable)
       ↓
ScalarFieldLayer.updateGrid(grid, colormap, depth, opacity, range)
       ↓
_createGridTextureCanvas() → canvas pixels → Entity RectangleGraphics
       ↓
viewer.entities.add({ rectangle: { material: ImageMaterialProperty } })
       ↓
governorRequestRender() → scene.requestRender()
       ↓
VISIBLE RESULT ON GLOBE
```

## Depth Strategy

| Depth Range | Rendering Approach | Height | Visibility |
|---|---|---|---|
| 0–5m (surface) | Entity Rectangle | +50m | disableDepthTestDistance |
| 5–50m (shallow) | Entity Rectangle | +50m | disableDepthTestDistance |
| 50–700m (subsurface) | Entity Rectangle | +50m (projected at depth's data) | disableDepthTestDistance |
| Transects/Isosurfaces | Primitive | -depth × exaggeration | depthFailAppearance + underground camera |

**Important**: Surface scalar fields are always rendered at a fixed positive height (50m above
ellipsoid) regardless of the selected depth. The depth parameter selects which **data slice**
to visualize, not the rendering altitude. This ensures visibility with any basemap type.

For vertical transects and isosurfaces, the geometry extends below the surface using
`-depth × verticalExaggeration` and is made visible via `depthFailAppearance` and
disabling camera collision detection.

## Google 3D Tiles Integration

The 3D tiles provide photorealistic geographic context while scientific data renders above them:

1. Globe remains visible (`show=true`) with transparent base color when 3D tiles active
2. All scientific overlays use `disableDepthTestDistance: Number.POSITIVE_INFINITY`
3. Overlays render at positive altitude (50–200m) to clear tile terrain geometry
4. Subsurface uses `depthFailAppearance` to render behind/through tiles

## Resource Cleanup

Every layer implements a clean lifecycle:

| Operation | Scalar | Vector | Particle | Profile | Transect | Isosurface |
|---|---|---|---|---|---|---|
| CREATE | updateGrid | updateVectors | start | updateProfiles | updateTransect | updateIsosurface |
| UPDATE | updateGrid (removes first) | updateVectors (clears first) | start (stops first) | updateProfiles (removes all) | updateTransect (clears first) | updateIsosurface (clears first) |
| HIDE | remove() | clear() | stop() | clear() | clear() | clear() |
| DESTROY | remove() | clear() | stop() | destroy() | clear() | clear() |

All layers check `viewer.isDestroyed()` before any Cesium API call.

## Known Limitations

1. **Depth visualization**: Scalar fields at depth > 5m show the correct depth slice data
   but render at surface level. True 3D depth rendering would require clipping the 3D tileset.

2. **Particle texture resolution**: Canvas is 1024×512, which limits visual detail at
   high zoom levels. Could be upgraded to 2048×1024 at the cost of memory.

3. **Vector glyph density**: At high zoom, decimation stride of 2 may produce sparse coverage.
   Could implement view-dependent LOD.

4. **Chlorophyll-a**: No ERDDAP endpoint wired. Control is correctly marked UNAVAILABLE.
