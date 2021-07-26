const fs = require('fs');

const defaultOptions = {
	shaderSuffix: '.glsl'
};

module.exports = (_snowpackConfig, pluginOptions) => {
	const options = { ...defaultOptions, pluginOptions };

	return {
		name: 'snowpack-plugin-shader',

		resolve: {
			input: [ options.shaderSuffix ],
			output: [ '.js' ]
		},

		async load({ filePath }) {
			const shaderContent = await fs.promises.readFile(filePath, 'utf8');

			const exportName =
				  filePath.includes('.frag.glsl') ? 'FragmentShader'
				: filePath.includes('.vert.glsl') ? 'VertexShader'
				: 'Shader';

			return `export const ${exportName} = \n` +
				shaderContent
					.split('\n')
					.map(shaderLine => `\t${JSON.stringify(shaderLine + '\n')}`)
					.map((line, index, lines) => (index === lines.length - 1) ? `${line};` : `${line} +`)
					.join('\n');
		}
	};
};
