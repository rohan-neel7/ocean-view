/**
 * OceanView — High-Performance Scientific Ocean Grid Store
 * Manages 2D, 3D, and 4D time-indexed gridded scalar and vector fields.
 *
 * Core Invariants:
 *   - Grid data is preserved in contiguous Float32Array typed buffers.
 *   - NEVER explodes grid cells into individual CanonicalEvent objects.
 *   - Bounded memory lifecycle with LRU eviction of oldest time frames.
 *   - Multidimensional querying across Variable × Time × Depth × Space.
 */

export class OceanGridStore {
  /**
   * @param {object} [options={}]
   * @param {number} [options.maxMemoryMb=256] - Maximum RAM allocation for grid arrays
   * @param {number} [options.maxFields=50] - Maximum grid fields retained in memory
   */
  constructor(options = {}) {
    this.maxMemoryMb = options.maxMemoryMb || 256;
    this.maxFields = options.maxFields || 50;

    // Primary store: Map<fieldId, CanonicalGridScalar | CanonicalGridVector>
    this.fields = new Map();

    // Secondary indices: variable -> Map<timestamp, fieldId>
    this.timeIndex = new Map();

    this.currentMemoryBytes = 0;
    this.metrics = {
      totalIngested: 0,
      evictedCount: 0,
      queriesCount: 0,
    };
  }

  /**
   * Ingests a CanonicalGridScalar or CanonicalGridVector into the store.
   *
   * @param {object} gridField - CanonicalGridScalar or CanonicalGridVector
   * @returns {{ success: boolean, fieldId: string, memoryBytes: number }}
   */
  setGrid(gridField) {
    if (!gridField || !gridField.id || !gridField.variable) {
      throw new Error('OceanGridStore.setGrid requires a valid CanonicalGrid object with id and variable');
    }

    const fieldId = gridField.id;
    const variable = gridField.variable;
    const timestamp = gridField.timestamp || new Date().toISOString();
    const memBytes = gridField.stats?.memorySizeBytes || (gridField.data?.byteLength || 0);

    // If updating an existing field, adjust memory balance
    if (this.fields.has(fieldId)) {
      const oldField = this.fields.get(fieldId);
      this.currentMemoryBytes -= (oldField.stats?.memorySizeBytes || 0);
    }

    // Enforce memory & capacity bounds before insertion
    this.enforceCapacity(memBytes);

    this.fields.set(fieldId, gridField);
    this.currentMemoryBytes += memBytes;
    this.metrics.totalIngested++;

    // Update temporal index
    if (!this.timeIndex.has(variable)) {
      this.timeIndex.set(variable, new Map());
    }
    this.timeIndex.get(variable).set(timestamp, fieldId);

    return {
      success: true,
      fieldId,
      memoryBytes: this.currentMemoryBytes,
    };
  }

  /**
   * Retrieves a grid field by ID.
   * @param {string} fieldId
   * @returns {object|null}
   */
  getGrid(fieldId) {
    this.metrics.queriesCount++;
    return this.fields.get(fieldId) || null;
  }

  /**
   * Removes a grid field by ID and releases tracked memory.
   * @param {string} fieldId
   * @returns {boolean}
   */
  removeGrid(fieldId) {
    if (!this.fields.has(fieldId)) return false;
    const field = this.fields.get(fieldId);
    const mem = field.stats?.memorySizeBytes || (field.data?.byteLength || 0);
    this.currentMemoryBytes = Math.max(0, this.currentMemoryBytes - mem);

    const varMap = this.timeIndex.get(field.variable);
    if (varMap && field.timestamp) {
      varMap.delete(field.timestamp);
    }
    this.fields.delete(fieldId);
    return true;
  }

  /**
   * Removes all grid fields for a given variable name and updates memory counters.
   * @param {string} variable
   */
  removeGridByVariable(variable) {
    if (!variable) return;
    const toDelete = [];
    for (const [id, field] of this.fields.entries()) {
      if (field.variable === variable) {
        toDelete.push(id);
      }
    }
    for (const id of toDelete) {
      this.removeGrid(id);
    }
    this.timeIndex.delete(variable);
  }

  /**
   * Returns all stored grid fields.
   * @returns {Array<object>}
   */
  getAll() {
    return Array.from(this.fields.values());
  }

  /**
   * Retrieves the grid field for a given variable at a specific timestamp (or closest available).
   *
   * @param {string} variable - e.g. 'sea_surface_temperature'
   * @param {string} [targetTimestamp] - ISO timestamp
   * @returns {object|null}
   */
  getGridByTime(variable, targetTimestamp = null) {
    this.metrics.queriesCount++;
    const varIndex = this.timeIndex.get(variable);
    if (!varIndex || varIndex.size === 0) return null;

    if (!targetTimestamp) {
      // Return latest available timestamp
      const timestamps = Array.from(varIndex.keys()).sort();
      const latestTs = timestamps[timestamps.length - 1];
      return this.getGrid(varIndex.get(latestTs));
    }

    // Find closest timestamp
    const targetEpoch = new Date(targetTimestamp).getTime();
    let closestTs = null;
    let minDelta = Infinity;

    for (const ts of varIndex.keys()) {
      const delta = Math.abs(new Date(ts).getTime() - targetEpoch);
      if (delta < minDelta) {
        minDelta = delta;
        closestTs = ts;
      }
    }

    return closestTs ? this.getGrid(varIndex.get(closestTs)) : null;
  }

  /**
   * Returns list of all available timestamps for a given variable.
   * @param {string} variable
   * @returns {Array<string>}
   */
  getAvailableTimeSteps(variable) {
    const varIndex = this.timeIndex.get(variable);
    if (!varIndex) return [];
    return Array.from(varIndex.keys()).sort();
  }

  /**
   * Returns list of all registered ocean variables.
   * @returns {Array<string>}
   */
  getAvailableVariables() {
    return Array.from(this.timeIndex.keys());
  }

  /**
   * Enforces bounded memory limits via LRU eviction of oldest fields.
   * @private
   */
  enforceCapacity(incomingBytes) {
    const maxBytes = this.maxMemoryMb * 1024 * 1024;

    while (
      (this.currentMemoryBytes + incomingBytes > maxBytes || this.fields.size >= this.maxFields) &&
      this.fields.size > 0
    ) {
      // Evict the first inserted key (FIFO/LRU behavior)
      const oldestKey = this.fields.keys().next().value;
      const evictedField = this.fields.get(oldestKey);
      if (evictedField) {
        const mem = evictedField.stats?.memorySizeBytes || (evictedField.data?.byteLength || 0);
        this.currentMemoryBytes -= mem;

        // Clean temporal index
        const varMap = this.timeIndex.get(evictedField.variable);
        if (varMap && evictedField.timestamp) {
          varMap.delete(evictedField.timestamp);
        }

        this.fields.delete(oldestKey);
        this.metrics.evictedCount++;
      }
    }
  }

  /**
   * Returns snapshot metrics of the store.
   */
  getStats() {
    return {
      fieldCount: this.fields.size,
      variables: this.getAvailableVariables(),
      memoryMb: Number((this.currentMemoryBytes / (1024 * 1024)).toFixed(2)),
      maxMemoryMb: this.maxMemoryMb,
      metrics: { ...this.metrics },
    };
  }

  /**
   * Clears the store.
   */
  clear() {
    this.fields.clear();
    this.timeIndex.clear();
    this.currentMemoryBytes = 0;
  }
}
