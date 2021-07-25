import Maidragon from '../';

const canvas = document.querySelector('canvas');
if (!canvas) {
	throw new Error('No canvas exists!');
}

Maidragon(canvas);
