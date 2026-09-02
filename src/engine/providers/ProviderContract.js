/**
 * OceanView — Immutable Provider Contract Definition & Validation
 *
 * Security: Definitions NEVER contain actual secret values.
 * Only secretRef (a reference name like 'INCOIS_API_KEY') is allowed.
 */

import { ProviderTier, ProviderRole, RuntimeState, AuthType, CoverageType } from './providerTypes.js';

function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  for (const val of Object.values(obj)) {
    if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  }
  return obj;
}

function looksLikeSecret(value) {
  if (typeof value !== 'string') return false;
  if (value.length > 60 && /^[A-Za-z0-9+/=_-]+$/.test(value)) return true;
  if (/^(AIza|sk-|pk_|rk_|Bearer\s)/i.test(value)) return true;
  return false;
}

export function validateProviderDefinition(def) {
  const errors = [];
  if (!def || typeof def !== 'object') {
    return { valid: false, errors: ['Provider definition must be a non-null object'] };
  }

  if (!def.id || typeof def.id !== 'string') errors.push('Provider id must be a string');
  if (!def.name || typeof def.name !== 'string') errors.push('Provider name must be a string');
  if (!def.organization || typeof def.organization !== 'string') errors.push('Provider organization must be a string');
  if (!Object.values(ProviderTier).includes(def.tier)) {
    errors.push(`Invalid provider tier: "${def.tier}"`);
  }
  if (!Object.values(RuntimeState).includes(def.runtimeState)) {
    errors.push(`Invalid runtimeState: "${def.runtimeState}"`);
  }
  if (!Array.isArray(def.roles) || def.roles.length === 0) {
    errors.push('Provider roles must be a non-empty array');
  }

  // Security: Check for raw credentials in definition
  for (const [k, v] of Object.entries(def)) {
    if (looksLikeSecret(v)) {
      errors.push(`SECURITY VIOLATION: Property "${k}" looks like an exposed secret token. Use secretRef.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Creates and deep-freezes an immutable Provider Definition.
 */
export function createProviderDefinition({
  id,
  name,
  organization,
  tier = ProviderTier.TIER_A,
  roles = [ProviderRole.OCEAN_MODEL],
  dataTypes = ['SST'],
  coverage = CoverageType.GLOBAL,
  runtimeState = RuntimeState.PLANNED,
  connected = false,
  endpoint = null,
  auth = { type: AuthType.NONE, secretRef: null },
  runtimeConfig = { pollingIntervalMs: 300000, enabled: true },
  verification = null,
}) {
  const def = {
    id,
    name,
    organization,
    tier,
    roles: Object.freeze([...roles]),
    dataTypes: Object.freeze([...dataTypes]),
    coverage,
    runtimeState,
    connected,
    endpoint,
    auth: Object.freeze({ ...auth }),
    runtimeConfig: { ...runtimeConfig },
    verification: verification ? Object.freeze({ ...verification }) : null,
  };

  const { valid, errors } = validateProviderDefinition(def);
  if (!valid) {
    throw new Error(`Provider definition validation failed for "${id}": ${errors.join('; ')}`);
  }

  return deepFreeze(def);
}
