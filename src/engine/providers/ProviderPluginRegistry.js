/**
 * OceanView — Extensible Provider Plugin Registry
 * Enables dynamic registration of third-party ocean observation feeds, adapters, and custom platforms (Moorings, HF Radar, ADCP).
 */

import { VALID_DATA_STATES } from '../contracts/intelligenceContract.js';

export class ProviderPluginRegistry {
  constructor() {
    this.plugins = new Map();
  }

  /**
   * Registers a new data provider plugin.
   *
   * @param {object} pluginDef
   * @param {string} pluginDef.id - Unique plugin identifier
   * @param {string} pluginDef.name - Human-readable provider name
   * @param {string} pluginDef.platformType - Platform category (e.g. 'HF_RADAR', 'MOORED_BUOY', 'ADCP')
   * @param {Function} pluginDef.adapter - Function converting raw feed to Canonical domain model
   * @param {string[]} pluginDef.supportedVariables - Array of variable IDs provided
   * @returns {boolean} Registration success
   */
  registerPlugin(pluginDef) {
    if (!pluginDef || typeof pluginDef !== 'object') {
      throw new Error('registerPlugin requires a valid plugin definition object');
    }
    if (!pluginDef.id || typeof pluginDef.id !== 'string') {
      throw new Error('Plugin requires a string id');
    }
    if (typeof pluginDef.adapter !== 'function') {
      throw new Error(`Plugin '${pluginDef.id}' must provide an adapter function`);
    }

    this.plugins.set(pluginDef.id, {
      ...pluginDef,
      registeredAt: new Date().toISOString(),
      status: 'ACTIVE',
    });

    return true;
  }

  /**
   * Unregisters a provider plugin.
   */
  unregisterPlugin(pluginId) {
    return this.plugins.delete(pluginId);
  }

  /**
   * Ingests data through a registered plugin adapter.
   */
  ingest(pluginId, rawData) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Provider plugin '${pluginId}' is not registered`);
    }

    const canonicalResult = plugin.adapter(rawData);
    if (!canonicalResult || typeof canonicalResult !== 'object') {
      throw new Error(`Plugin '${pluginId}' adapter returned invalid canonical result`);
    }

    return canonicalResult;
  }

  getPlugin(pluginId) {
    return this.plugins.get(pluginId) || null;
  }

  getAllPlugins() {
    return Array.from(this.plugins.values());
  }
}

export const globalPluginRegistry = new ProviderPluginRegistry();
