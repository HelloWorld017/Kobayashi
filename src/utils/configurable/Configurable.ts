import { merge } from '@/utils/merge'
import type { DeepPartial } from '@/types';

export const Configurable =
	<ConfigurableType extends Record<string, unknown>>(defaultConfiguration: ConfigurableType) => {
		class ConfigurableClass {
			static config: ConfigurableType = defaultConfiguration;
			static setConfig(newConfig: DeepPartial<ConfigurableType>) {
				ConfigurableClass.config = merge(ConfigurableClass.config, newConfig);
			}
		}
		
		return ConfigurableClass;
	};
