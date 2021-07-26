import { EyeCatchText } from './constants/EyeCatchText';
import { Renderer } from './render';

const Maidragon = (canvas: HTMLCanvasElement, character?: string) => {
	const renderer = new Renderer(canvas);
	renderer.initialize();
	renderer.updateCharacter(character ?? EyeCatchText[Math.floor(Math.random() * EyeCatchText.length)]);
	renderer.callback = (isFinished) => {
		if (isFinished) {
			renderer.stop();
			renderer.free();
		}
	};

	renderer.start();
};

export default Maidragon;
export { Maidragon };
export * from './constants/EyeCatchText';
export * from './render';
