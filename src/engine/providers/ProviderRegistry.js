/**
 * OceanView — Scientific Provider Registry
 * Authoritative in-memory catalog of ocean data providers.
 */

export class ProviderRegistry {
  constructor() {
    this.providers = new Map();
  }

  /**
   * Registers an immutable provider definition.
   */
  register(providerDef) {
    if (!providerDef || !providerDef.id) {
      throw new Error('ProviderRegistry requires a valid provider definition with an id');
    }
    if (this.providers.has(providerDef.id)) {
      throw new Error(`Provider "${providerDef.id}" is already registered`);
    }
    this.providers.set(providerDef.id, providerDef);
    return this;
  }

  get(id) {
    return this.providers.get(id) || null;
  }

  has(id) {
    return this.providers.has(id);
  }

  getAll() {
    return Array.from(this.providers.values());
  }

  getByRole(role) {
    return this.getAll().filter((p) => p.roles?.includes(role));
  }

  getByTier(tier) {
    return this.getAll().filter((p) => p.tier === tier);
  }

  getByRuntimeState(state) {
    return this.getAll().filter((p) => p.runtimeState === state);
  }

  getConnected() {
    return this.getAll().filter((p) => p.connected === true);
  }

  getPlanned() {
    return this.getAll().filter((p) => p.connected === false);
  }

  snapshot() {
    return {
      total: this.providers.size,
      connected: this.getConnected().length,
      planned: this.getPlanned().length,
      providers: this.getAll().map((p) => ({
        id: p.id,
        name: p.name,
        tier: p.tier,
        runtimeState: p.runtimeState,
        connected: p.connected,
      })),
    };
  }

  clear() {
    this.providers.clear();
  }
}
