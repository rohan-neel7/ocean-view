/**
 * OceanView — Layer State Registry
 * Central registry tracking the lifecycle state of every scientific visualization layer.
 *
 * Prevents "state=true but renderer=false" bugs by providing a single source of truth
 * for layer diagnostics. Used by the debug overlay and integration tests.
 *
 * Contract for every layer:
 * {
 *   layerId,
 *   enabled,
 *   dataState,     // 'NO_DATA' | 'LOADING' | 'LOADED' | 'ERROR'
 *   source,        // data source identifier
 *   variable,      // scientific variable name
 *   depth,         // current depth in meters
 *   time,          // timestamp of data
 *   primitiveCount, // number of Cesium primitives/entities
 *   visible,       // whether the primitive is actually visible
 *   lastUpdated,   // ISO timestamp of last update
 * }
 */

class _LayerStateRegistry {
  constructor() {
    this._layers = new Map();
    this._listeners = new Set();
  }

  /**
   * Register or update a layer's state.
   * @param {string} layerId
   * @param {object} state
   */
  update(layerId, state) {
    const current = this._layers.get(layerId) || {};
    const updated = {
      ...current,
      ...state,
      layerId,
      lastUpdated: new Date().toISOString(),
    };
    this._layers.set(layerId, updated);
    this._notifyListeners();
  }

  /**
   * Remove a layer from the registry.
   * @param {string} layerId
   */
  remove(layerId) {
    this._layers.delete(layerId);
    this._notifyListeners();
  }

  /**
   * Get state for a specific layer.
   * @param {string} layerId
   * @returns {object|null}
   */
  get(layerId) {
    return this._layers.get(layerId) || null;
  }

  /**
   * Get all layer states.
   * @returns {object[]}
   */
  getAll() {
    return Array.from(this._layers.values());
  }

  /**
   * Subscribe to state changes.
   * @param {Function} listener
   * @returns {Function} unsubscribe
   */
  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  /**
   * @private
   */
  _notifyListeners() {
    for (const listener of this._listeners) {
      try {
        listener(this.getAll());
      } catch (_) {
        // Don't let listener errors break the registry
      }
    }
  }

  /**
   * Detect anomalies: layers that are enabled but have no primitive.
   * @returns {object[]} Array of anomalous layer states
   */
  detectAnomalies() {
    const anomalies = [];
    for (const layer of this._layers.values()) {
      if (layer.enabled && !layer.visible) {
        anomalies.push({
          ...layer,
          anomaly: 'ENABLED_BUT_NOT_VISIBLE',
          description: `Layer ${layer.layerId} is enabled but has no visible primitive`,
        });
      }
      if (layer.enabled && layer.dataState === 'NO_DATA') {
        anomalies.push({
          ...layer,
          anomaly: 'ENABLED_WITHOUT_DATA',
          description: `Layer ${layer.layerId} is enabled but has no data loaded`,
        });
      }
    }
    return anomalies;
  }
}

export const globalLayerStateRegistry = new _LayerStateRegistry();
