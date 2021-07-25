import { EyeCatchText } from './constants/EyeCatchText';
import { Renderer } from './render';

const Maidragon = (canvas: HTMLCanvasElement, character?: string) => {
	const renderer = new Renderer(canvas);
	renderer.initialize();
	renderer.updateCharacter(character ?? EyeCatchText[Math.floor(Math.random() * EyeCatchText.length)]);
	renderer.callback = () => {
		renderer.stop();
		renderer.free();
	}

	renderer.start();
};

export default Maidragon;
export * from './constants/EyeCatchText';
export * from './render';
