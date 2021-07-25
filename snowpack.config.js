module.exports = {
	mount: {
		public: { url: '/assets', static: true },
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
