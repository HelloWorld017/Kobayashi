import type { CubicBezierEasing } from '@/types';

export const cubicBezier = ([p1, p2, p3, p4]: CubicBezierEasing, scale: number = 1, offset: number = 0) =>
	(t: number) => {
		const tn = (t - offset) / scale;
		return (
			              (1 - tn) ** 3 * p1 +
			3 * tn      * (1 - tn) ** 2 * p2 +
			3 * tn ** 2 * (1 - tn)      * p3 +
			    tn ** 3                 * p4
		);
	};
