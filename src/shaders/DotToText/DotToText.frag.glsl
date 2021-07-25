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

// texture coordinate (-1 ~ 1)
in vec2 textureCoord;
out vec4 fragColor;

void main() {
	// get the color of the dot, using the distance from the center
	float dotDistance = length(vec2(textureCoord.x / dotScaleX, textureCoord.y));
	vec4 dotTexture = vec4(dotColor, step(dotSize, dotDistance));

	// get the color of the text at the position
	vec4 textTexture = texture(character, vec2(textureCoord.x / textScaleX, textureCoord.y / textScaleY));

	// mix two textures, use step function for the gooey effect
	vec4 mixedTexture = mix(textTexture, dotTexture, mixTransition);
	fragColor = vec4(mixedTexture.rgb, step(mixThreshold, mixedTexture.a));
}
