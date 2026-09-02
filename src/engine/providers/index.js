import { ProviderRegistry } from './ProviderRegistry.js';
import { ProviderHealthTracker } from './providerHealth.js';
import { DataFabric } from './DataFabric.js';
import { CURRENT_PROVIDERS } from './definitions/current.js';
import { OceanGridStore } from '../ocean/OceanGridStore.js';
import { OceanProfileStore } from '../ocean/OceanProfileStore.js';

export * from './providerTypes.js';
export * from './ProviderContract.js';
export * from './ProviderRegistry.js';
export * from './providerHealth.js';
export * from './retryPolicy.js';
export * from './DataFabric.js';

// Global Singleton Instances
export const globalProviderRegistry = new ProviderRegistry();
for (const p of CURRENT_PROVIDERS) {
  globalProviderRegistry.register(p);
}

export const globalProviderHealthTracker = new ProviderHealthTracker();
export const globalOceanGridStore = new OceanGridStore();
export const globalOceanProfileStore = new OceanProfileStore();

export const globalDataFabric = new DataFabric({
  providerRegistry: globalProviderRegistry,
  healthTracker: globalProviderHealthTracker,
  gridStore: globalOceanGridStore,
  profileStore: globalOceanProfileStore,
});
