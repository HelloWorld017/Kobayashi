import { cubicBezier } from '@/utils/easing';
import { makeShader } from '@/utils/render';

import { DotToTextFragment } from '@/shaders/DotToText.shader';
import { Configurable } from '@/utils/configurable';
import type { CubicBezierEasing, Position } from '@/types';

type EasingFunction = ReturnType<typeof cubicBezier>;

type EntityAnimations = 'dotCollapse' | 'textExpand' | 'dotToText';
export type EntityData = {
	character: string;
	position: Position;
};

export type EntityConfiguration = {
	duration: {
		[K in EntityAnimations]: number;
	}
	easing: {
		[K in EntityAnimations]: CubicBezierEasing;
	}
	font: string;
	size: number;
	dotSize: number;
	color: [ number, number, number ];
	mixThreshold: number;
};

const DefaultConfiguration: EntityConfiguration = {
	duration: {
		dotCollapse: 125,
		textExpand: 125,
		dotToText: 125
	},
	easing: {
		dotCollapse: [ 0.8, 1.5, 0.8, 1.0 ],
		textExpand:  [ 0.8, 1.5, 0.8, 1.0 ],
		dotToText:   [ 0.8, 1.5, 0.8, 1.0 ]
	},
	font: 'Inter',
	size: 144,
	dotSize: 32,
	color: [ 18, 16, 14 ],
	mixThreshold: 0.1
};

class Entity extends Configurable(DefaultConfiguration) {
	data: EntityData;
	timingFunction: {
		[K in EntityAnimations]: EasingFunction
	};
	characterTexture?: WebGLTexture;
	
	constructor(data: EntityData) {
		super();
		
		this.data = data;
		this.timingFunction = {
			dotCollapse: cubicBezier(
				Entity.config.easing.dotCollapse,
				Entity.config.duration.dotCollapse,
				0
			),
			
			textExpand: cubicBezier(
				Entity.config.easing.textExpand,
				Entity.config.duration.textExpand,
				Entity.config.duration.dotCollapse
			),
			
			dotToText: cubicBezier(
				Entity.config.easing.dotToText,
				Entity.config.duration.dotToText,
				(
					Entity.config.duration.dotCollapse
					+ Entity.config.duration.textExpand
					- Entity.config.duration.dotToText
				) / 2
			)
		};
	}
	
	initialize(gl: WebGLRenderingContext) {
		const characterRenderer = document.createElement('canvas');
		characterRenderer.width = Entity.config.size;
		characterRenderer.height = Entity.config.size;
		
		const characterContext = characterRenderer.getContext('2d');
		characterContext?.fillText(this.data.character, Entity.config.size / 2, Entity.config.size / 2);
		
		const characterRendered = characterContext?.getImageData(0, 0, Entity.config.size, Entity.config.size);
		if (!characterRendered)
			throw new Error('Failed to render the character!');
		
		const characterTexture = gl.createTexture();
		if (!characterTexture)
			throw new Error('Failed to create the buffer!');
		
		gl.bindTexture(gl.TEXTURE_2D, characterTexture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, characterRenderer);
		
		this.characterTexture = characterTexture;
	}
	
	renderAnimation(gl: WebGLRenderingContext, tick: number): void {
		if (!this.characterTexture)
			throw new Error('Non-initialized entity!');
		
		if (tick < 0)
			return;
		
		gl.useProgram(Entity.glProgram);
		
		// Assign textures
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.characterTexture);
		gl.uniform1i(Entity.glAttribs.character, 0);
		
		// Assign dot-related uniforms
		const dotScaleX = this.timingFunction.dotCollapse(tick);
		gl.uniform3f(Entity.glAttribs.dot.color, ...Entity.config.color);
		gl.uniform1f(Entity.glAttribs.dot.size, Entity.config.dotSize);
		gl.uniform1f(Entity.glAttribs.dot.scaleX, dotScaleX);
		
		// Assign text-related uniforms
		const textScaleX = this.timingFunction.textExpand(tick);
		const textScaleY = this.timingFunction.textExpand(tick);
		gl.uniform1f(Entity.glAttribs.text.scaleX, textScaleX);
		gl.uniform1f(Entity.glAttribs.text.scaleY, textScaleY);
		
		// Assign mix-related uniforms
		const mixTransition = this.timingFunction.dotToText(tick);
		gl.uniform1f(Entity.glAttribs.mix.threshold, Entity.config.mixThreshold);
		gl.uniform1f(Entity.glAttribs.mix.transition, mixTransition);
	}
	
	
	static glProgram: WebGLProgram;
	static glAttribs: {
		character: number;
		
		dot: {
			color: number;
			size: number;
			scaleX: number;
		},
		
		text: {
			scaleX: number;
			scaleY: number;
		}
		
		mix: {
			transition: number;
			threshold: number;
		}
	};
	
	static initializeEntity(gl: WebGLRenderingContext) {
		const entityProgram = gl.createProgram();
		if (!entityProgram)
			throw new Error('Failed to create the program!');
		
		const entityFragmentShader = makeShader(gl, gl.FRAGMENT_SHADER, DotToTextFragment);
		
		gl.attachShader(entityProgram, entityFragmentShader);
		gl.linkProgram(entityProgram);
		
		Entity.glProgram = entityProgram;
		Entity.glAttribs = {
			character: gl.getAttribLocation(entityProgram, 'character'),
			
			dot: {
				color: gl.getAttribLocation(entityProgram, 'dotColor'),
				size:  gl.getAttribLocation(entityProgram, 'dotSize'),
				scaleX: gl.getAttribLocation(entityProgram, 'dotScaleX'),
			},
			
			text: {
				scaleX: gl.getAttribLocation(entityProgram, 'textScaleX'),
				scaleY: gl.getAttribLocation(entityProgram, 'textScaleY')
			},
			
			mix: {
				transition: gl.getAttribLocation(entityProgram, 'mixTransition'),
				threshold: gl.getAttribLocation(entityProgram, 'mixThreshold')
			}
		};
	}
}

export { Entity };
