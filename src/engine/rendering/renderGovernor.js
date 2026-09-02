/**
 * OceanView — Cesium Render Governor (Adapted from God's Eye View)
 *
 * Invariant: 0% idle GPU usage.
 * Only renders frames on camera motion, layer updates, timeline changes, or active animations.
 */

let activeViewer = null;
const activeHolds = new Set();
let isExplicitHold = false;
let cameraListeners = [];

export function installRenderGovernor(viewer) {
  if (!viewer || !viewer.scene) return;
  activeViewer = viewer;

  // Set Cesium to explicit request-render mode
  viewer.scene.requestRenderMode = true;
  viewer.scene.maximumRenderTimeChange = Infinity;

  // Clean up any old camera listeners if re-installing
  removeCameraListeners();

  // Listen to camera movements
  if (viewer.camera) {
    const onCameraChanged = () => governorRequestRender();
    const onMoveStart = () => holdContinuousRender('cameraMove');
    const onMoveEnd = () => releaseContinuousRender('cameraMove');

    viewer.camera.changed?.addEventListener(onCameraChanged);
    viewer.camera.moveStart?.addEventListener(onMoveStart);
    viewer.camera.moveEnd?.addEventListener(onMoveEnd);

    cameraListeners = [
      () => viewer.camera.changed?.removeEventListener(onCameraChanged),
      () => viewer.camera.moveStart?.removeEventListener(onMoveStart),
      () => viewer.camera.moveEnd?.removeEventListener(onMoveEnd),
    ];
  }
}

function removeCameraListeners() {
  for (const cleanup of cameraListeners) {
    try {
      cleanup();
    } catch (_e) {
      // Ignored
    }
  }
  cameraListeners = [];
}

export function governorRequestRender() {
  if (activeViewer && activeViewer.scene && !activeViewer.isDestroyed?.()) {
    activeViewer.scene.requestRender();
  }
}

export function holdContinuousRender(reason = 'animation') {
  activeHolds.add(reason);
  if (activeViewer && activeViewer.scene && !activeViewer.isDestroyed?.()) {
    if (!isExplicitHold) {
      activeViewer.scene.requestRenderMode = false;
      isExplicitHold = true;
    }
  }
}

export function releaseContinuousRender(reason = 'animation') {
  activeHolds.delete(reason);
  if (activeHolds.size === 0 && activeViewer && activeViewer.scene && !activeViewer.isDestroyed?.()) {
    activeViewer.scene.requestRenderMode = true;
    isExplicitHold = false;
    activeViewer.scene.requestRender();
  }
}

export function getGovernorStats() {
  return {
    holdsCount: activeHolds.size,
    activeHolds: Array.from(activeHolds),
    isExplicitHold,
    isViewerAttached: !!activeViewer && !activeViewer.isDestroyed?.(),
  };
}

export function teardownRenderGovernor() {
  removeCameraListeners();
  activeViewer = null;
  activeHolds.clear();
  isExplicitHold = false;
}
