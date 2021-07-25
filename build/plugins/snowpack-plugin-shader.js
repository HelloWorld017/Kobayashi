const fs = require('fs');
const path = require('path');

const defaultOptions = {
	shaderSuffix: '.shader',
	exports: [
		{ exportName: '{name}Fragment', suffix: '.frag.glsl' },
		{ exportName: '{name}Vertex', suffix: '.vert.glsl' }
	]
};

module.exports = (_snowpackConfig, pluginOptions) => {
	const options = { ...defaultOptions, pluginOptions };
	
	return {
		name: 'snowpack-pluggin-shader',
		
		resolve: {
			input: [ options.shaderSuffix ],
			output: [ '.js' ]
		},
		
		async load({ filePath }) {
			const shaderDirname = path.dirname(filePath);
			const shaderBasename = path.basename(filePath, options.shaderSuffix);
			const shaderExports = await Promise.all(options.exports.map(
				async ({ exportName: exportTemplate, suffix })  => {
					try {
						const shaderContent = await fs.promises.readFile(
							path.join(shaderDirname, `${shaderBasename}.${suffix}`),
							'utf8'
						);
						
						const exportName = exportTemplate.replace('{name}', shaderBasename);
						
						return `export const ${exportName} = \n` +
							shaderContent
								.split('\n')
								.map(shaderLine => `\t${JSON.stringify(shaderLine)}`)
								.map((line, index, lines) => (index === lines.length - 1) ? `${line};` : `${line} +`);
					} catch {}
					
					return null;
				}
			));
			
			return shaderExports.filter(_ => _).join('\n');
		}
	};
};
