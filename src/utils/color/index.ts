import { Color } from "@/types";

export const colorToFloat = (color: Color) =>
	color.map(channel => channel / 255) as Color;

export const colorToCssColor = (color: Color) =>
	`rgb(${color.join(', ')})`;
