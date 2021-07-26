import { colorToCssColor, colorToFloat } from '@/utils/color';
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
	size: number;
	font: string;
	fontSize: number;
	fontWeight: number;
	dotSize: number;
	smoothing: number;
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
	size: 144,
	font: 'Inter',
	fontSize: 144,
	fontWeight: 700,
	dotSize: 32,
	smoothing: 1,
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
	vertexBuffer?: WebGLBuffer;

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

	initialize(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement) {
		const characterTexture = gl.createTexture();
		if (!characterTexture)
			throw new Error('Failed to create the buffer!');

		this.characterTexture = characterTexture;
		this.updateCharacter(gl);

		const vertexArray = gl.createVertexArray();
		if (!vertexArray)
			throw new Error('Failed to create the vertex array!');

		this.vertexArray = vertexArray;

		const vertexBuffer = gl.createBuffer();
		if (!vertexBuffer)
			throw new Error('Failed to create the vertex buffer!');

		this.vertexBuffer = vertexBuffer;

		this.updateSize(gl, canvas);
	}

	free(gl: WebGL2RenderingContext) {
		if (this.vertexArray) {
			gl.deleteVertexArray(this.vertexArray);
		}

		if (this.vertexBuffer) {
			gl.deleteBuffer(this.vertexBuffer);
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
		if (!characterContext)
			throw new Error('Failed to get texture context!');

		characterContext.clearRect(0, 0, characterRenderer.width, characterRenderer.height);
		characterContext.fillStyle = colorToCssColor(this.config.color);
		characterContext.font = ''          +
			/* this.config.fontWeight          + */
			`${this.config.fontSize}px`     +
			JSON.stringify(this.config.font);

		characterContext.textAlign = 'center';
		characterContext.textBaseline = 'middle';
		characterContext.fillText(this.data.character, this.config.size / 2, this.config.size / 2);

		gl.bindTexture(gl.TEXTURE_2D, this.characterTexture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, characterRenderer);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}

	updateSize(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement) {
		if (!this.vertexArray || !this.vertexBuffer)
			return;

		const vertices = new Float32Array([
			-1,  1,
			-1, -1,
			 1, -1,
			-1,  1,
			 1, -1,
			 1,  1
		]);

		const entityX = (2 * this.data.position.x) / canvas.width  - 1;
		const entityY = (2 * this.data.position.y) / canvas.height - 1;
		const sizeX = this.config.size / canvas.width;
		const sizeY = this.config.size / canvas.height;

		const vertexData = new Float32Array(vertices.length * 2);
		for (let i = 0; i < vertices.length; i += 2) {
			vertexData[2 * i]     = entityX + vertices[i]     * sizeX; // planeCoordX
			vertexData[2 * i + 1] = entityY + vertices[i + 1] * sizeY; // planeCoordY
			vertexData[2 * i + 2] =   vertices[i    ];         // textureCoordX
			vertexData[2 * i + 3] = - vertices[i + 1];         // textureCoordY
		}

		gl.bindVertexArray(this.vertexArray);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, vertexData.buffer, gl.STATIC_DRAW);

		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
		gl.enableVertexAttribArray(0);

		gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
		gl.enableVertexAttribArray(1);

		gl.bindVertexArray(null);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	}

	render(gl: WebGL2RenderingContext, tick: number) {
		if (!this.characterTexture || !this.vertexArray)
			throw new Error('Non-initialized entity!');

		const innerTick = Math.max(0, Math.min(tick, this.animationDuration));

		gl.useProgram(Entity.glProgram);

		// Assign textures
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.characterTexture);
		gl.uniform1i(Entity.glAttribs.character, 0);

		// Assign dot-related uniforms
		const dotScaleX = this.timingFunction.dotCollapse(innerTick);
		gl.uniform3f(Entity.glAttribs.dot.color, ...colorToFloat(this.config.color));
		gl.uniform1f(Entity.glAttribs.dot.size, this.config.dotSize / this.config.size);
		gl.uniform1f(Entity.glAttribs.dot.scaleX, dotScaleX);

		// Assign text-related uniforms
		const textScaleX = this.timingFunction.textExpand(innerTick);
		const textScaleY = this.timingFunction.textExpand(innerTick);
		gl.uniform1f(Entity.glAttribs.text.scaleX, textScaleX);
		gl.uniform1f(Entity.glAttribs.text.scaleY, textScaleY);

		// Assign mix-related uniforms
		const mixTransition = Math.max(0, Math.min(1, this.timingFunction.dotToText(innerTick)));
		gl.uniform1f(Entity.glAttribs.mix.threshold, this.config.mixThreshold);
		gl.uniform1f(Entity.glAttribs.mix.transition, mixTransition);

		gl.uniform1f(Entity.glAttribs.smoothing, this.config.smoothing / this.config.size);

		gl.bindVertexArray(this.vertexArray);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
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

		smoothing: WebGLUniformLocation;
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
			},

			smoothing: gl.getUniformLocation(entityProgram, 'smoothing')!
		};
	}
}

export { Entity };
