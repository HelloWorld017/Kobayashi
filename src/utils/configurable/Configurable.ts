import { merge } from '@/utils/merge'
import type { DeepPartial } from '@/types';

export const Configurable =
	<ConfigurableType extends Record<string, unknown>>(defaultConfiguration: ConfigurableType) => {
		class ConfigurableClass {
			config: ConfigurableType = defaultConfiguration;
			constructor(baseConfig: DeepPartial<ConfigurableType> = {}) {
				this.setConfig(baseConfig);
			}

			setConfig(newConfig: DeepPartial<ConfigurableType>) {
				this.config = merge(this.config, newConfig);
			}
		}

		return ConfigurableClass;
	};
