import { Configurable } from './utils/configurable';
import { Entity, EntityConfiguration } from './Entity';
import type { Color, DeepPartial } from './types';

export type RendererConfiguration = {
	backgroundColor: Color,
	chars: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10,
	spacing: number,
	interval: number,
	letter: DeepPartial<EntityConfiguration>
};

const DefaultConfiguration: RendererConfiguration = {
	backgroundColor: [ 253, 233, 62 ],
	chars: 5,
	spacing: 160,
	interval: 500,
	letter: {}
}

class Renderer extends Configurable(DefaultConfiguration) {
	gl: WebGL2RenderingContext;
	entities: Entity[];
	lastUpdate: number;
	tick: number;
	rafId?: number;
	renderBound: () => void;
	callback?: (isFinished: boolean) => void;

	constructor(canvas: HTMLCanvasElement, config: DeepPartial<RendererConfiguration> = {}) {
		super(config);

		const renderContext = canvas.getContext('webgl2');
		if (!renderContext)
			throw new Error('Failed to create the render context!');

		this.gl = renderContext;
		this.entities = Array
			.from({ length: this.config.chars })
			.map<Entity>((_, index, { length }) => new Entity({
				character: '',
				position: {
					x: window.innerWidth  / 2 - (index - (length - 1) / 2) * this.config.spacing,
					y: window.innerHeight / 2
				}
			}, this.config.letter));

		this.tick = 0;
		this.lastUpdate = 0;
		this.renderBound = this.render.bind(this);

		Entity.initializeEntity(this.gl);
	}

	initialize() {
		this.entities.forEach(entity => entity.initialize(this.gl));
		this.lastUpdate = Date.now();
	}

	start() {
		this.rafId = requestAnimationFrame(this.renderBound);
	}

	stop() {
		if (this.rafId)
			cancelAnimationFrame(this.rafId);
	}

	render() {
		const now = Date.now();
		this.tick += now - this.lastUpdate;
		this.gl.clearColor(...this.config.backgroundColor, 1);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);

		// Cannot use every, as it should not be short-circuited
		const isFinished = this.entities.reduce<boolean>(
			(prevIsFinished, entity, index) => {
				const currIsFinished = entity.render(this.gl, this.tick - index * this.config.interval);
				return prevIsFinished && currIsFinished;
			},
			true
		);

		this.lastUpdate = now;
		this.rafId = requestAnimationFrame(this.renderBound);

		this.callback?.(isFinished);
		return isFinished;
	}

	setTick(tick: number) {
		this.tick = tick;
	}

	updateCharacter(characters: string) {
		characters
			.slice(0, this.config.chars)
			.split('')
			.forEach((character, index) => {
				this.entities[index].data.character = character;
				this.entities[index].updateCharacter(this.gl);
			});
	}

	updateSize() {
		this.entities.forEach(entity => entity.updateSize(this.gl));
	}

	free() {
		this.entities.forEach(entity => entity.free(this.gl));
	}
}

export { Renderer };
