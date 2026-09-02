/**
 * OceanView — Deterministic Temporal Freshness Engine
 * Evaluates observation age against physical occurrence, preserving staleness.
 */

export const FreshnessStatus = Object.freeze({
  LIVE: 'LIVE',         // Current observation within sensor threshold
  RECENT: 'RECENT',     // Within acceptable analysis window
  STALE: 'STALE',       // Exceeds nominal sensor update window
  EXPIRED: 'EXPIRED',   // Far beyond operational validity
  UNKNOWN: 'UNKNOWN',   // Missing or unparseable timestamp
});

/**
 * Computes deterministic freshness metadata for an ocean observation.
 *
 * @param {string|number|Date} observedAt - Timestamp of physical phenomenon
 * @param {string|number|Date} [receivedAt] - Timestamp when OceanView received the data
 * @param {number} [maxAgeMs=86400000] - Base freshness threshold in ms (default 24h for ocean datasets)
 * @param {number} [now=Date.now()] - Current epoch timestamp for deterministic evaluation
 * @returns {{ observedAt: string|null, receivedAt: string, maxAgeMs: number, ageMs: number|null, status: string }}
 */
export function computeFreshness(observedAt, receivedAt = null, maxAgeMs = 86400000, now = Date.now()) {
  const normReceivedAt = receivedAt ? new Date(receivedAt).toISOString() : new Date(now).toISOString();

  if (!observedAt) {
    return {
      observedAt: null,
      receivedAt: normReceivedAt,
      maxAgeMs,
      ageMs: null,
      status: FreshnessStatus.UNKNOWN,
    };
  }

  const observedEpoch = new Date(observedAt).getTime();
  if (isNaN(observedEpoch)) {
    return {
      observedAt: String(observedAt),
      receivedAt: normReceivedAt,
      maxAgeMs,
      ageMs: null,
      status: FreshnessStatus.UNKNOWN,
    };
  }

  const ageMs = Math.max(0, now - observedEpoch);
  let status = FreshnessStatus.LIVE;

  if (ageMs > maxAgeMs * 5) {
    status = FreshnessStatus.EXPIRED;
  } else if (ageMs > maxAgeMs * 2) {
    status = FreshnessStatus.STALE;
  } else if (ageMs > maxAgeMs) {
    status = FreshnessStatus.RECENT;
  } else {
    status = FreshnessStatus.LIVE;
  }

  return {
    observedAt: new Date(observedEpoch).toISOString(),
    receivedAt: normReceivedAt,
    maxAgeMs,
    ageMs,
    status,
  };
}
