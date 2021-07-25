import type { DeepPartial } from '@/types';

const isNonMergable = (something: unknown): boolean => 
	typeof something !== 'object' || Array.isArray(something);

export const merge = <T>(baseObject: T, mergingObject: DeepPartial<T>): T => {
	if (isNonMergable(mergingObject)) {
		return baseObject;
	}
	
	return (Object.keys(mergingObject) as (keyof typeof mergingObject)[])
		.reduce<T>((mergingBaseObject, mergingKey) => {
			const mergingValue = mergingObject[mergingKey];
			if (mergingValue === undefined || isNonMergable(mergingValue)) {
				return { ...mergingBaseObject, [ mergingKey ]: mergingValue };
			}
			
			return { ...mergingBaseObject, [ mergingKey ]: merge(mergingBaseObject[mergingKey], mergingValue) };
		}, baseObject);
}
