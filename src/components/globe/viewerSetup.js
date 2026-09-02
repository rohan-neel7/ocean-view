/**
 * OceanView — Cesium Globe Viewer Setup
 * Initializes a sharp, high-contrast, scientifically calibrated 3D globe with neutral exposure.
 */

import * as Cesium from 'cesium';
import { OCEAN_REGIONS } from '../../engine/rendering/cameraVerbs.js';
import { installRenderGovernor } from '../../engine/rendering/renderGovernor.js';
import { globalLifecycleTracker } from '../../engine/rendering/cesiumLifecycleTracker.js';

export const GOOGLE_MAPS_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_KEY) || null;

export function createOceanGlobeViewer(containerElement) {
  if (!containerElement) {
    throw new Error('createOceanGlobeViewer requires a valid container DOM element');
  }

  // Set default API key globally for Cesium if present
  if (GOOGLE_MAPS_KEY && Cesium.GoogleMaps) {
    Cesium.GoogleMaps.defaultApiKey = GOOGLE_MAPS_KEY;
  }

  // Configure Geocoder service
  let geocoderOption = false;
  if (GOOGLE_MAPS_KEY && typeof Cesium.GoogleGeocoderService === 'function') {
    try {
      geocoderOption = [new Cesium.GoogleGeocoderService({ key: GOOGLE_MAPS_KEY })];
    } catch (_err) {
      geocoderOption = false;
    }
  }

  const viewer = new Cesium.Viewer(containerElement, {
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    geocoder: geocoderOption,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    infoBox: false,
    selectionIndicator: false,
    fullscreenButton: false,
    vrButton: false,
    shouldAnimate: false,
    scene3DOnly: true,
    shadows: false,
    baseLayer: false,
    msaaSamples: 4, // 4x Multisampling for razor-sharp coastlines and borders
    contextOptions: {
      webgl: {
        preserveDrawingBuffer: true,
        antialias: true,
      },
    },
  });

  // Track viewer creation in lifecycle tracker
  globalLifecycleTracker.trackViewerCreated(viewer);

  // Lock target framerate smoothly
  viewer.targetFrameRate = 60;
  viewer.resolutionScale = window.devicePixelRatio || 1.0;

  const scene = viewer.scene;
  const globe = scene.globe;

  // Globe Baseline Shading
  globe.enableLighting = false;
  globe.depthTestAgainstTerrain = false;
  globe.baseColor = Cesium.Color.fromCssColorString('#050b14');
  globe.show = true;

  // Calibrated Atmospheric & Space Lighting (Neutral exposure, no wash-out)
  if (scene.skyAtmosphere) {
    scene.skyAtmosphere.show = true;
    scene.skyAtmosphere.atmosphereLightIntensity = 10.0;
    scene.skyAtmosphere.saturationShift = -0.05;
    scene.skyAtmosphere.brightnessShift = -0.05;
  }

  if (scene.fog) {
    scene.fog.enabled = true;
    scene.fog.density = 0.0001;
  }

  // Disable Post-Process Bloom by default for maximum crispness
  if (scene.postProcessStages?.bloom) {
    scene.postProcessStages.bloom.enabled = false;
  }

  // Initial Camera Viewpoint -> Centered on Arabian Sea / Indian Ocean Basin
  const initView = OCEAN_REGIONS.ARABIAN_SEA || {
    lat: 14.0,
    lon: 66.0,
    alt: 5500000.0,
    heading: 0.0,
    pitch: -88.0,
  };

  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(initView.lon, initView.lat, initView.alt || 5500000.0),
    orientation: {
      heading: Cesium.Math.toRadians(initView.heading || 0.0),
      pitch: Cesium.Math.toRadians(-88.0), // Force orbital pitch on load
      roll: 0.0,
    },
  });

  // Install Render Governor for 0% idle GPU utilization
  installRenderGovernor(viewer);

  return viewer;
}
