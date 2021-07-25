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

// output from the vertex shader (-1 ~ 1)
varying vec2 position;

void main() {
	// get the color of the dot, using the distance from the center
	float dotDistance = length(vec2(position.x / dotScaleX, position.y));
	vec4 dotTexture = vec4(dotColor, step(dotSize, dotDistance));
	
	// get the color of the text at the position
	vec4 textTexture = texture2D(character, vec2(position.x / textScaleX, position.y / textScaleY));
	
	// mix two textures, use step function for the gooey effect
	vec4 mixedTexture = mix(textTexture, dotTexture, mixTransition);
	gl_FragColor = vec4(mixedTexture.rgb, step(mixThreshold, mixedTexture.a));
}
