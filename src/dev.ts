import Maidragon from './';

const canvas = document.querySelector('canvas');
if (!canvas) {
	throw new Error('No canvas exists!');
}

canvas.width  = window.innerWidth;
canvas.height = window.innerHeight;

Maidragon(canvas);
