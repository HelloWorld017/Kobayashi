module.exports = {
	mount: {
		assets: { url: '/', static: true },
		src: { url: '/dist' },
	},

	alias: {
		'@': './src'
	},

	plugins: [
		'./build/plugins/snowpack-plugin-shader',
	],

	routes: [],

	optimize: {},

	packageOptions: {},

	devOptions: {},

	buildOptions: {}
};
