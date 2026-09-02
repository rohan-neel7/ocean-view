/**
 * OceanView — Cesium WebGL & Viewer Lifecycle Tracker
 * Instruments viewer creations, destructions, canvases, contexts, and active animation holds.
 *
 * Invariant:
 *   - Application maintains exactly ONE authoritative Cesium Viewer in steady state.
 *   - Steady State: created: 1, destroyed: 0, active: 1.
 *   - Unmounted State: created: N, destroyed: N, active: 0.
 */

class CesiumLifecycleTracker {
  constructor() {
    this.viewersCreated = 0;
    this.viewersDestroyed = 0;
    this.canvasesCreated = 0;
    this.canvasesDestroyed = 0;
    this.activeViewerInstances = new Set();
    this.creationStackTraces = [];
  }

  /**
   * Tracks creation of a Cesium.Viewer instance.
   * @param {object} viewer - Cesium.Viewer instance
   */
  trackViewerCreated(viewer) {
    this.viewersCreated++;
    if (viewer) {
      this.activeViewerInstances.add(viewer);
    }
    this.canvasesCreated++;
    if (typeof window !== 'undefined') {
      window.__CESIUM_LIFECYCLE_STATS__ = this.getStats();
    }
  }

  /**
   * Tracks destruction of a Cesium.Viewer instance.
   * @param {object} viewer - Cesium.Viewer instance
   */
  trackViewerDestroyed(viewer) {
    this.viewersDestroyed++;
    if (viewer) {
      this.activeViewerInstances.delete(viewer);
    }
    this.canvasesDestroyed++;
    if (typeof window !== 'undefined') {
      window.__CESIUM_LIFECYCLE_STATS__ = this.getStats();
    }
  }

  /**
   * Returns current lifecycle statistics.
   */
  getStats() {
    let domCanvases = 0;
    let webglContextsEstimate = 0;

    if (typeof document !== 'undefined') {
      const cesiumCanvases = document.querySelectorAll('.cesium-widget canvas');
      domCanvases = cesiumCanvases.length;
      webglContextsEstimate = domCanvases;
    }

    return {
      viewersCreated: this.viewersCreated,
      viewersDestroyed: this.viewersDestroyed,
      activeViewers: Math.max(0, this.viewersCreated - this.viewersDestroyed),
      canvasesCreated: this.canvasesCreated,
      canvasesDestroyed: this.canvasesDestroyed,
      domCanvases,
      webglContextsEstimate,
    };
  }

  /**
   * Resets tracker counters (useful for unit test isolation).
   */
  reset() {
    this.viewersCreated = 0;
    this.viewersDestroyed = 0;
    this.canvasesCreated = 0;
    this.canvasesDestroyed = 0;
    this.activeViewerInstances.clear();
    this.creationStackTraces = [];
    if (typeof window !== 'undefined') {
      window.__CESIUM_LIFECYCLE_STATS__ = this.getStats();
    }
  }
}

export const globalLifecycleTracker = new CesiumLifecycleTracker();

if (typeof window !== 'undefined') {
  window.__CESIUM_LIFECYCLE__ = globalLifecycleTracker;
  window.__CESIUM_LIFECYCLE_STATS__ = globalLifecycleTracker.getStats();
}
