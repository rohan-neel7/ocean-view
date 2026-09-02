/**
 * OceanView — Scientific Data Fabric Orchestrator
 *
 * Dual-Route Ingestion Bus:
 *   - Discrete Route: CanonicalObservation, CanonicalProfile, CanonicalTrajectory -> OceanProfileStore
 *   - Gridded Route: CanonicalGridScalar, CanonicalGridVector -> OceanGridStore
 *
 * Invariant: Never forces multidimensional numerical grid arrays into event objects.
 */

export class DataFabric {
  /**
   * @param {object} options
   * @param {import('./ProviderRegistry.js').ProviderRegistry} options.providerRegistry
   * @param {import('./providerHealth.js').ProviderHealthTracker} options.healthTracker
   * @param {import('../ocean/OceanGridStore.js').OceanGridStore} options.gridStore
   * @param {import('../ocean/OceanProfileStore.js').OceanProfileStore} options.profileStore
   */
  constructor({ providerRegistry, healthTracker, gridStore, profileStore }) {
    this.providerRegistry = providerRegistry;
    this.healthTracker = healthTracker;
    this.gridStore = gridStore;
    this.profileStore = profileStore;

    this.subscribers = new Set();
    this.metrics = {
      gridsIngested: 0,
      profilesIngested: 0,
      observationsIngested: 0,
      rejectedCount: 0,
    };
  }

  /**
   * Ingests a scientific payload (Grid or Profile/Observation) from a registered provider.
   *
   * @param {string} providerId
   * @param {object} payload - CanonicalGridScalar | CanonicalGridVector | CanonicalProfile | CanonicalObservation
   * @returns {{ success: boolean, route: string, id: string }}
   */
  ingest(providerId, payload) {
    const providerDef = this.providerRegistry.get(providerId);
    if (!providerDef) {
      this.metrics.rejectedCount++;
      throw new Error(`DataFabric: Ingestion rejected. Unregistered provider: "${providerId}"`);
    }

    if (!providerDef.connected) {
      this.metrics.rejectedCount++;
      throw new Error(`DataFabric: Planned provider "${providerId}" cannot ingest live data`);
    }

    if (!payload || !payload.kind) {
      this.metrics.rejectedCount++;
      throw new Error('DataFabric: Payload must have a valid scientific "kind"');
    }

    let route = 'UNKNOWN';
    const id = payload.id;

    // ── 1. Gridded Route ──
    if (payload.kind === 'CANONICAL_GRID_SCALAR' || payload.kind === 'CANONICAL_GRID_VECTOR') {
      this.gridStore.setGrid(payload);
      this.metrics.gridsIngested++;
      route = 'GRID_ROUTE';
    }
    // ── 2. Profile Route ──
    else if (payload.kind === 'CANONICAL_PROFILE') {
      this.profileStore.addProfile(payload);
      this.metrics.profilesIngested++;
      route = 'PROFILE_ROUTE';
    }
    // ── 3. Discrete Observation Route ──
    else if (payload.kind === 'CANONICAL_OBSERVATION') {
      this.metrics.observationsIngested++;
      route = 'OBSERVATION_ROUTE';
    } else {
      this.metrics.rejectedCount++;
      throw new Error(`DataFabric: Unrecognized scientific payload kind "${payload.kind}"`);
    }

    this.healthTracker.recordSuccess(providerId);
    this.notifySubscribers({ providerId, route, id, kind: payload.kind });

    return { success: true, route, id };
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers(event) {
    for (const sub of this.subscribers) {
      try {
        sub(event);
      } catch (err) {
        console.error('[DataFabric] Subscriber error:', err);
      }
    }
  }

  getMetrics() {
    return { ...this.metrics };
  }
}
