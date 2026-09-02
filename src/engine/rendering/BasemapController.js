/**
 * OceanView — Basemap Layer Controller
 * Manages CartoDB Dark Matter, Esri Ocean Bathymetry, Satellite, OpenStreetMap, and Google 3D Tiles.
 *
 * CRITICAL FIX (Phase 7.6):
 *   Previous implementation set globe.show=false when Google 3D Tiles was active.
 *   This hid all imagery layers, but now we no longer use imagery layers for scientific data.
 *   All scientific visualization uses Entity/Primitive, so globe.show=false is safe.
 *   However, we now keep globe.show=true with a transparent/dark base color when using 3D Tiles,
 *   which provides a fallback rendering surface and avoids edge cases with Entity rectangle rendering.
 */

import * as Cesium from 'cesium';
import { governorRequestRender } from './renderGovernor.js';

export const GOOGLE_MAPS_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_KEY) ||
  'AIzaSyB2KjC17l9IufmvTuV1JCLNTQwnkjP3qHY';

if (Cesium.GoogleMaps) {
  Cesium.GoogleMaps.defaultApiKey = GOOGLE_MAPS_KEY;
}

export const BASEMAPS = [
  {
    id: 'DARK_MATTER',
    name: 'Dark Matter (Crisp)',
    type: 'url',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    credit: '© CARTO, © OpenStreetMap',
  },
  {
    id: 'OCEAN_BASE',
    name: 'Esri Ocean Bathymetry',
    type: 'url',
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
    subdomains: [],
    credit: '© Esri, GEBCO, NOAA',
  },
  {
    id: 'SATELLITE',
    name: 'Satellite Aerial',
    type: 'url',
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    subdomains: [],
    credit: '© Esri, Maxar, Earthstar',
  },
  {
    id: 'OSM',
    name: 'OpenStreetMap',
    type: 'osm',
    url: 'https://tile.openstreetmap.org/',
    credit: '© OpenStreetMap contributors',
  },
  {
    id: 'GOOGLE_3D_TILES',
    name: 'Google 3D Tiles',
    type: 'google_3d',
    credit: '© Google Photorealistic 3D Tiles',
  },
];

export class BasemapController {
  constructor(viewer) {
    this.viewer = viewer;
    this.activeId = 'DARK_MATTER';
    this.imageryLayer = null;
    this.google3DTileset = null;
    this.providers = new Map();

    this.setBasemap('DARK_MATTER');
  }

  async setBasemap(id) {
    if (!this.viewer || this.viewer.isDestroyed?.()) return;

    const def = BASEMAPS.find((b) => b.id === id) || BASEMAPS[0];
    this.activeId = def.id;

    try {
      if (def.type === 'google_3d') {
        if (!this.google3DTileset) {
          try {
            if (typeof Cesium.createGooglePhotorealistic3DTileset === 'function') {
              this.google3DTileset = await Cesium.createGooglePhotorealistic3DTileset({
                key: GOOGLE_MAPS_KEY,
              });
              this.google3DTileset.maximumScreenSpaceError = 8;
              this.viewer.scene.primitives.add(this.google3DTileset);
            } else {
              throw new Error('Google Photorealistic 3D Tiles not supported in this Cesium build');
            }
          } catch (err) {
            console.warn('[BasemapController] Google 3D Tiles unavailable, falling back to Dark Matter:', err);
            if (this.viewer?.scene?.globe) {
              this.viewer.scene.globe.show = true;
            }
            this.setBasemap('DARK_MATTER');
            return;
          }
        }

        if (this.google3DTileset) {
          this.google3DTileset.show = true;
        }

        // PHASE 7.6 FIX: Keep globe visible but with transparent base so that
        // Entity RectangleGraphics still render correctly. The 3D tiles provide
        // the visual geographic context; the globe provides the rendering surface.
        this.viewer.scene.globe.show = true;
        this.viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#050b14').withAlpha(0.0);

        // Remove 2D imagery layers (they would show through 3D tiles gaps)
        if (this.imageryLayer) {
          this.viewer.imageryLayers.remove(this.imageryLayer, false);
          this.imageryLayer = null;
        }
      } else {
        if (this.google3DTileset) {
          this.google3DTileset.show = false;
        }
        this.viewer.scene.globe.show = true;
        this.viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#050b14');

        let provider = this.providers.get(def.id);
        if (!provider) {
          if (def.type === 'osm') {
            provider = new Cesium.OpenStreetMapImageryProvider({
              url: def.url,
              credit: def.credit,
            });
          } else {
            provider = new Cesium.UrlTemplateImageryProvider({
              url: def.url,
              subdomains: def.subdomains || [],
              credit: def.credit,
              maximumLevel: 19,
            });
          }
          this.providers.set(def.id, provider);
        }

        if (this.imageryLayer) {
          this.viewer.imageryLayers.remove(this.imageryLayer, false);
        }

        this.imageryLayer = this.viewer.imageryLayers.addImageryProvider(provider, 0);
      }

      governorRequestRender();
    } catch (err) {
      console.warn('[BasemapController] Error setting basemap:', err);
      if (this.viewer && !this.viewer.isDestroyed?.()) {
        this.viewer.scene.globe.show = true;
      }
    }
  }

  getActiveBasemap() {
    return this.activeId;
  }
}
