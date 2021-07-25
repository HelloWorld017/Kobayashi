export type DeepPartial<T> = { [K in keyof T]?: DeepPartial<T[K]> };
export type Position = { x: number, y: number };
export type Color = [ number, number, number ];
export type CubicBezierEasing = [ number, number, number, number ];
