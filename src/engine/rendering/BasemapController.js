/**
 * OceanView — Basemap Layer Controller
 * Manages CartoDB Dark Matter, Esri Ocean Bathymetry, Satellite, OpenStreetMap, and Google 3D Tiles.
 *
 * Invariants:
 *   - Strictly operates on a single existing Cesium.Viewer instance. Never creates a new viewer.
 *   - Safe single-attempt Google 3D Tiles loader: on 400/failure, gracefully marks unavailable and falls back to Satellite.
 *   - Scientific data layers (Scalar, Vectors, Profiles, Transects, Isosurfaces) render independently of basemap state.
 */

import * as Cesium from 'cesium';
import { governorRequestRender } from './renderGovernor.js';

export const GOOGLE_MAPS_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_KEY) || null;

if (GOOGLE_MAPS_KEY && Cesium.GoogleMaps) {
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
    this.activeId = 'SATELLITE';
    this.imageryLayer = null;
    this.google3DTileset = null;
    this.google3DUnavailable = false;
    this.google3DAttempted = false;
    this.providers = new Map();

    this.setBasemap('SATELLITE');
  }

  async setBasemap(id) {
    if (!this.viewer || this.viewer.isDestroyed?.()) return;

    // If Google 3D Tiles is requested but known unavailable, gracefully route to Satellite
    if (id === 'GOOGLE_3D_TILES' && this.google3DUnavailable) {
      id = 'SATELLITE';
    }

    const def = BASEMAPS.find((b) => b.id === id) || BASEMAPS[0];
    this.activeId = def.id;

    try {
      if (def.type === 'google_3d') {
        if (!this.google3DTileset && !this.google3DAttempted) {
          this.google3DAttempted = true;
          try {
            if (typeof Cesium.createGooglePhotorealistic3DTileset === 'function') {
              this.google3DTileset = await Cesium.createGooglePhotorealistic3DTileset({
                key: GOOGLE_MAPS_KEY || undefined,
                onlyUsingWithGoogleGeocoder: true,
              });
              this.google3DTileset.maximumScreenSpaceError = 8;
              if (this.viewer && !this.viewer.isDestroyed?.()) {
                this.viewer.scene.primitives.add(this.google3DTileset);
              }
            } else {
              throw new Error('Google Photorealistic 3D Tiles not supported in this Cesium build');
            }
          } catch (_err) {
            this.google3DUnavailable = true;
            console.warn('[BasemapController] Google 3D Tiles unavailable, falling back to Satellite (API key invalid/expired or network restriction)');
            if (this.google3DTileset && this.viewer && !this.viewer.isDestroyed?.()) {
              try {
                this.viewer.scene.primitives.remove(this.google3DTileset);
              } catch (_e) {
                // Ignored
              }
              this.google3DTileset = null;
            }
            if (this.viewer?.scene?.globe) {
              this.viewer.scene.globe.show = true;
            }
            return this.setBasemap('SATELLITE');
          }
        }

        if (this.google3DTileset) {
          this.google3DTileset.show = true;
        }

        // Keep globe visible with transparent base for entity rendering surface
        if (this.viewer.scene?.globe) {
          this.viewer.scene.globe.show = true;
          this.viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#050b14').withAlpha(0.0);
        }

        // Remove 2D imagery layers when 3D tiles are visible
        if (this.imageryLayer) {
          this.viewer.imageryLayers.remove(this.imageryLayer, false);
          this.imageryLayer = null;
        }
      } else {
        // Standard 2D / Satellite basemaps
        if (this.google3DTileset) {
          this.google3DTileset.show = false;
        }
        if (this.viewer.scene?.globe) {
          this.viewer.scene.globe.show = true;
          this.viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#050b14');
        }

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
          this.imageryLayer = null;
        }

        this.imageryLayer = this.viewer.imageryLayers.addImageryProvider(provider, 0);
      }

      governorRequestRender();
    } catch (err) {
      console.warn('[BasemapController] Error setting basemap:', err);
      if (this.viewer && !this.viewer.isDestroyed?.()) {
        if (this.viewer.scene?.globe) {
          this.viewer.scene.globe.show = true;
        }
      }
    }
  }

  getActiveBasemap() {
    return this.activeId;
  }

  isGoogle3DUnavailable() {
    return this.google3DUnavailable;
  }

  destroy() {
    if (this.imageryLayer && this.viewer && !this.viewer.isDestroyed?.()) {
      try {
        this.viewer.imageryLayers.remove(this.imageryLayer, true);
      } catch (_e) {
        // Ignored
      }
      this.imageryLayer = null;
    }
    if (this.google3DTileset && this.viewer && !this.viewer.isDestroyed?.()) {
      try {
        this.viewer.scene.primitives.remove(this.google3DTileset);
      } catch (_e) {
        // Ignored
      }
      this.google3DTileset = null;
    }
    this.providers.clear();
    this.viewer = null;
  }
}
