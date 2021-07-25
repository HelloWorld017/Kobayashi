import { cubicBezier } from '@/utils/easing';
import { makeShader } from '@/utils/render';

import { Configurable } from '@/utils/configurable';
import { DotToTextFragment, DotToTextVertex } from '@/shaders/DotToText';
import type { Color, CubicBezierEasing, DeepPartial, Position } from '@/types';

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
	color: Color;
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
	vertexArray?: WebGLVertexArrayObject;
	vertexBuffers?: {
		planeCoord: WebGLBuffer;
		textureCoord: WebGLBuffer;
	};

	constructor(data: EntityData, config: DeepPartial<EntityConfiguration> = {}) {
		super(config);

		this.data = data;
		this.timingFunction = {
			dotCollapse: cubicBezier(
				this.config.easing.dotCollapse,
				this.config.duration.dotCollapse,
				0
			),

			textExpand: cubicBezier(
				this.config.easing.textExpand,
				this.config.duration.textExpand,
				this.config.duration.dotCollapse
			),

			dotToText: cubicBezier(
				this.config.easing.dotToText,
				this.config.duration.dotToText,
				(this.animationDuration - this.config.duration.dotToText) / 2
			)
		};
	}

	initialize(gl: WebGL2RenderingContext) {
		const characterTexture = gl.createTexture();
		if (!characterTexture)
			throw new Error('Failed to create the buffer!');

		this.characterTexture = characterTexture;
		this.updateCharacter(gl);

		const vertexArray = gl.createVertexArray();
		if (!vertexArray)
			throw new Error('Failed to create the vertex array!');

		this.vertexArray = vertexArray;

		const planeCoordBuffer = gl.createBuffer();
		const textureCoordBuffer = gl.createBuffer();
		if (!planeCoordBuffer || !textureCoordBuffer)
			throw new Error('Failed to create the vertex buffer!');

		this.vertexBuffers = {
			planeCoord: planeCoordBuffer,
			textureCoord: textureCoordBuffer
		};

		this.updateSize(gl);
	}

	free(gl: WebGL2RenderingContext) {
		if (this.vertexArray) {
			gl.deleteVertexArray(this.vertexArray);
		}

		if (this.vertexBuffers) {
			gl.deleteBuffer(this.vertexBuffers.planeCoord);
			gl.deleteBuffer(this.vertexBuffers.textureCoord);
		}

		if (this.characterTexture) {
			gl.deleteTexture(this.characterTexture);
		}
	}

	updateCharacter(gl: WebGL2RenderingContext) {
		if (!this.characterTexture)
			return;

		const characterRenderer = document.createElement('canvas');
		characterRenderer.width = this.config.size;
		characterRenderer.height = this.config.size;

		const characterContext = characterRenderer.getContext('2d');
		characterContext?.fillText(this.data.character, this.config.size / 2, this.config.size / 2);

		const characterRendered = characterContext?.getImageData(0, 0, this.config.size, this.config.size);
		if (!characterRendered)
			throw new Error('Failed to render the character!');


		gl.bindTexture(gl.TEXTURE_2D, this.characterTexture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, characterRenderer);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}

	updateSize(gl: WebGL2RenderingContext) {
		if (!this.vertexArray || !this.vertexBuffers)
			return;

		const topLeft = {
			x: (2 * this.data.position.x - this.config.size) / window.innerWidth  - 1,
			y: (2 * this.data.position.y + this.config.size) / window.innerHeight - 1,
		};

		const bottomRight = {
			x: (2 * this.data.position.x + this.config.size) / window.innerWidth  - 1,
			y: (2 * this.data.position.y - this.config.size) / window.innerHeight - 1,
		};

		const planeCoord = new Float32Array([
			topLeft.x,     topLeft.y,
			topLeft.x,     bottomRight.y,
			bottomRight.x, bottomRight.y,
			topLeft.x,     topLeft.y,
			bottomRight.x, bottomRight.y,
			bottomRight.x, topLeft.y
		]);

		const textureCoord = new Float32Array([
			-1,  1,
			-1, -1,
			 1, -1,
			-1,  1,
			 1, -1,
			 1,  1
		]);

		gl.bindVertexArray(this.vertexArray);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(0);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffers.planeCoord);
		gl.bufferData(gl.ARRAY_BUFFER, planeCoord.buffer, gl.STATIC_DRAW);

		gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(1);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffers.textureCoord);
		gl.bufferData(gl.ARRAY_BUFFER, textureCoord.buffer, gl.STATIC_DRAW);

		gl.bindVertexArray(null);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	}

	render(gl: WebGL2RenderingContext, tick: number) {
		if (!this.characterTexture || !this.vertexArray)
			throw new Error('Non-initialized entity!');

		if (tick < 0)
			return false;

		gl.useProgram(Entity.glProgram);

		// Assign textures
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.characterTexture);
		gl.uniform1i(Entity.glAttribs.character, 0);

		// Assign dot-related uniforms
		const dotScaleX = this.timingFunction.dotCollapse(tick);
		gl.uniform3f(Entity.glAttribs.dot.color, ...this.config.color);
		gl.uniform1f(Entity.glAttribs.dot.size, this.config.dotSize);
		gl.uniform1f(Entity.glAttribs.dot.scaleX, dotScaleX);

		// Assign text-related uniforms
		const textScaleX = this.timingFunction.textExpand(tick);
		const textScaleY = this.timingFunction.textExpand(tick);
		gl.uniform1f(Entity.glAttribs.text.scaleX, textScaleX);
		gl.uniform1f(Entity.glAttribs.text.scaleY, textScaleY);

		// Assign mix-related uniforms
		const mixTransition = this.timingFunction.dotToText(tick);
		gl.uniform1f(Entity.glAttribs.mix.threshold, this.config.mixThreshold);
		gl.uniform1f(Entity.glAttribs.mix.transition, mixTransition);

		gl.bindVertexArray(this.vertexArray);
		gl.drawArrays(gl.TRIANGLES, 0, 6);

		return tick > this.animationDuration;
	}

	get animationDuration() {
		return this.config.duration.dotCollapse + this.config.duration.textExpand;
	}

	static glProgram: WebGLProgram;
	static glAttribs: {
		character: WebGLUniformLocation;

		dot: {
			color: WebGLUniformLocation;
			size: WebGLUniformLocation;
			scaleX: WebGLUniformLocation;
		},

		text: {
			scaleX: WebGLUniformLocation;
			scaleY: WebGLUniformLocation;
		}

		mix: {
			transition: WebGLUniformLocation;
			threshold: WebGLUniformLocation;
		}
	};

	static initializeEntity(gl: WebGL2RenderingContext) {
		const entityProgram = gl.createProgram();
		if (!entityProgram)
			throw new Error('Failed to create the program!');

		const entityVertexShader   = makeShader(gl, gl.VERTEX_SHADER,   DotToTextVertex);
		const entityFragmentShader = makeShader(gl, gl.FRAGMENT_SHADER, DotToTextFragment);

		gl.attachShader(entityProgram, entityVertexShader);
		gl.attachShader(entityProgram, entityFragmentShader);
		gl.linkProgram(entityProgram);

		Entity.glProgram = entityProgram;
		Entity.glAttribs = {
			character: gl.getUniformLocation(entityProgram, 'character')!,

			dot: {
				color: gl.getUniformLocation(entityProgram, 'dotColor')!,
				size:  gl.getUniformLocation(entityProgram, 'dotSize')!,
				scaleX: gl.getUniformLocation(entityProgram, 'dotScaleX')!,
			},

			text: {
				scaleX: gl.getUniformLocation(entityProgram, 'textScaleX')!,
				scaleY: gl.getUniformLocation(entityProgram, 'textScaleY')!
			},

			mix: {
				transition: gl.getUniformLocation(entityProgram, 'mixTransition')!,
				threshold: gl.getUniformLocation(entityProgram, 'mixThreshold')!
			}
		};
	}
}

export { Entity };
