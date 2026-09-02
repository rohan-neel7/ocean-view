/**
 * OceanView — Exponential Backoff Retry Policy
 */

export class RetryPolicy {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.initialDelayMs = options.initialDelayMs || 1000;
    this.backoffMultiplier = options.backoffMultiplier || 2;
    this.maxDelayMs = options.maxDelayMs || 30000;
  }

  getDelay(attempt) {
    if (attempt <= 0) return 0;
    const delay = this.initialDelayMs * Math.pow(this.backoffMultiplier, attempt - 1);
    return Math.min(delay, this.maxDelayMs);
  }

  shouldRetry(attempt, error = null) {
    if (attempt >= this.maxRetries) return false;
    // Do not retry 401/403 auth failures
    if (error && (error.status === 401 || error.status === 403 || error.name === 'AuthError')) {
      return false;
    }
    return true;
  }
}
