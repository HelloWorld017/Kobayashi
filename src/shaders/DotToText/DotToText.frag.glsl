#version 300 es

precision highp float;

// character texture
uniform sampler2D character;

// dot-related
uniform vec3 dotColor;
uniform float dotSize;
uniform float dotScaleX;

// text-related
uniform float textScaleX;
uniform float textScaleY;

// mix-related
uniform float mixTransition;
uniform float mixThreshold;

uniform float smoothing;

// texture coordinate (0 ~ 1)
in vec2 textureCoord;
out vec4 fragColor;

void main() {
	// get the color of the dot, using the distance from the center
	float dotDistance = distance(
		vec2(
			(textureCoord.x * dotScaleX + 1.0) * 0.5,
			(textureCoord.y             + 1.0) * 0.5
		),
		vec2(0.5, 0.5)
	) * 2.0f;

	vec4 dotTexture = vec4(dotColor, smoothstep(dotDistance - smoothing, dotDistance + smoothing, dotSize));

	// get the color of the text at the position
	vec4 textTexture = texture(
		character,
		vec2(
			(textureCoord.x * textScaleX + 1.0) * 0.5,
			(textureCoord.y * textScaleY + 1.0) * 0.5
		)
	);

	// mix two textures
	vec4 mixedTexture = mix(dotTexture, textTexture, mixTransition);

	// use step function for the gooey effect
	fragColor = vec4(
		mixedTexture.rgb,
		smoothstep(mixThreshold - smoothing, mixThreshold + smoothing, mixedTexture.a)
	);
}
