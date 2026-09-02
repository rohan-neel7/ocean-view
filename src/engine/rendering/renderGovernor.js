/**
 * OceanView — Cesium Render Governor (Adapted from God's Eye View)
 *
 * Invariant: 0% idle GPU usage.
 * Only renders frames on camera motion, layer updates, timeline changes, or active animations.
 */

let activeViewer = null;
let holdsCount = 0;
let isExplicitHold = false;

export function installRenderGovernor(viewer) {
  if (!viewer || !viewer.scene) return;
  activeViewer = viewer;

  // Set Cesium to explicit request-render mode
  viewer.scene.requestRenderMode = true;
  viewer.scene.maximumRenderTimeChange = Infinity;

  // Listen to camera movements
  viewer.camera.changed.addEventListener(governorRequestRender);
  viewer.camera.moveStart.addEventListener(() => holdContinuousRender('cameraMove'));
  viewer.camera.moveEnd.addEventListener(() => releaseContinuousRender('cameraMove'));
}

export function governorRequestRender() {
  if (activeViewer && activeViewer.scene && !activeViewer.isDestroyed?.()) {
    activeViewer.scene.requestRender();
  }
}

export function holdContinuousRender(_reason = 'animation') {
  holdsCount++;
  if (activeViewer && activeViewer.scene && !activeViewer.isDestroyed?.()) {
    if (!isExplicitHold) {
      activeViewer.scene.requestRenderMode = false;
      isExplicitHold = true;
    }
  }
}

export function releaseContinuousRender(_reason = 'animation') {
  holdsCount = Math.max(0, holdsCount - 1);
  if (holdsCount === 0 && activeViewer && activeViewer.scene && !activeViewer.isDestroyed?.()) {
    activeViewer.scene.requestRenderMode = true;
    isExplicitHold = false;
    activeViewer.scene.requestRender();
  }
}

export function teardownRenderGovernor() {
  activeViewer = null;
  holdsCount = 0;
  isExplicitHold = false;
}
