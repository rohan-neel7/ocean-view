/**
 * OceanView Server — Memory-Bounded Cache Store
 */

export class BoundedCacheStore {
  constructor({ maxItems = 200 } = {}) {
    this.maxItems = maxItems;
    this.cache = new Map();
  }

  set(key, value, ttlMs = 300000) {
    if (this.cache.size >= this.maxItems) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  clear() {
    this.cache.clear();
  }
}
