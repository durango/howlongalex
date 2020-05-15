import path from 'path'
import CaseSensitivePathsPlugin from 'case-sensitive-paths-webpack-plugin'
import CopyWebpackPlugin from 'copy-webpack-plugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import isWsl from 'is-wsl'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import OptimizeCSSAssetsPlugin from 'optimize-css-assets-webpack-plugin'
import PostCssNormalize from 'postcss-normalize'
import PostCssPresetEnv from 'postcss-preset-env'
import PostCssSafeParser from 'postcss-safe-parser'
import InlineChunkHtmlPlugin from 'react-dev-utils/InlineChunkHtmlPlugin'
import ModuleScopePlugin from 'react-dev-utils/ModuleScopePlugin'
import TerserPlugin from 'terser-webpack-plugin'
import webpack from 'webpack'
import { name, version } from './package.json'

import 'webpack-dev-server'

// Source maps are resource heavy and can cause out of memory issue for large source files.
const shouldUseSourceMap = process.env.GENERATE_SOURCEMAP !== 'false'
// Some apps do not need the benefits of saving a web request, so not inlining the chunk
// makes for a smoother build process.
const shouldInlineRuntimeChunk = process.env.INLINE_RUNTIME_CHUNK !== 'false'

const DEFAULT_PORT = parseInt(process.env.PORT || '3000', 10)
const HOST = process.env.HOST || '0.0.0.0'

const rootDirectory = path.resolve(__dirname)
const sourceDirectoryName = 'app'
const runtimePrefix = 'runtime~'
const sourceDirectory = path.join(rootDirectory, sourceDirectoryName)
const buildDestination = path.join(rootDirectory, 'dist')

const proxy = {}

const webpackEnv = process.env.NODE_ENV ?? 'development'
const isEnvDevelopment = webpackEnv === 'development'
const isEnvProduction = webpackEnv === 'production'

const getStyleLoaders = (cssOptions: webpack.NewLoader['options'], preProcessor?: string): webpack.Loader[] => {
	return [
		isEnvDevelopment && 'style-loader',
		isEnvProduction && {
			loader: MiniCssExtractPlugin.loader,
			options: {},
		},
		{
			loader: 'css-loader',
			options: cssOptions,
		},
		{
			// Options for PostCSS as we reference these options twice
			// Adds vendor prefixing based on your specified browser support in
			// package.json
			loader: 'postcss-loader',
			options: {
				// Necessary for external CSS imports to work
				// https://github.com/facebook/create-react-app/issues/2677
				ident: 'postcss',
				plugins: () => [
					PostCssPresetEnv({
						autoprefixer: {
							flexbox: 'no-2009',
						},
						stage: 3,
					}),
					PostCssNormalize(),
				],
				sourceMap: isEnvProduction && shouldUseSourceMap,
			},
		},
		preProcessor && {
			loader: preProcessor,
			options: {
				sourceMap: isEnvProduction && shouldUseSourceMap,
			},
		},
	].filter(Boolean) as webpack.Loader[]
}

const config: webpack.Configuration = {
	mode: isEnvProduction ? 'production' : isEnvDevelopment ? 'development' : 'none',
	// Stop compilation early in production
	bail: isEnvProduction,
	devtool: isEnvProduction
		? shouldUseSourceMap
			? 'source-map'
			: false
		: isEnvDevelopment
			? 'cheap-module-source-map'
			: false,
	// These are the "entry points" to our application.
	// This means they will be the "root" imports that are included in JS bundle.
	entry: () => {
		if (isEnvDevelopment) {
			return ['react-hot-loader/patch', 'main']
		}
		return ['polyfills', 'main']
	},
	output: {
		// The build folder.
		path: isEnvProduction ? buildDestination : undefined,
		// Add /* filename */ comments to generated require()s in the output.
		pathinfo: isEnvDevelopment,
		// There will be one main bundle, and one file per asynchronous chunk.
		// In development, it does not produce real files.
		filename: isEnvProduction
			? 'static/js/[name].[hash:8].js'
			: isEnvDevelopment
				? 'static/js/[name].js'
				: undefined,
		// TODO: remove this when upgrading to webpack 5
		futureEmitAssets: true,
		// There are also additional JS chunk files if you use code splitting.
		chunkFilename: isEnvProduction
			? 'static/js/[name].[hash:8].js'
			: isEnvDevelopment
				? 'static/js/[name].js'
				: undefined,
		publicPath: '/',
		// Point sourcemap entries to original disk location (format as URL on Windows)
		devtoolModuleFilenameTemplate: isEnvProduction
			? info => path.relative(sourceDirectory, info.absoluteResourcePath).replace(/\\/g, '/')
			: isEnvDevelopment
				? info => path.resolve(info.absoluteResourcePath).replace(/\\/g, '/')
				: undefined,
	},
	optimization: {
		minimize: isEnvProduction,
		minimizer: [
			// This is only used in production mode
			new TerserPlugin({
				terserOptions: {
					parse: {
						// we want terser to parse ecma 8 code. However, we don't want it
						// to apply any minfication steps that turns valid ecma 5 code
						// into invalid ecma 5 code. This is why the 'compress' and 'output'
						// sections only apply transformations that are ecma 5 safe
						// https://github.com/facebook/create-react-app/pull/4234
						ecma: 8,
					},
					compress: {
						ecma: 5,
						warnings: false,
						// Disabled because of an issue with Uglify breaking seemingly valid code:
						// https://github.com/facebook/create-react-app/issues/2376
						// Pending further investigation:
						// https://github.com/mishoo/UglifyJS2/issues/2011
						comparisons: false,
						// Disabled because of an issue with Terser breaking valid code:
						// https://github.com/facebook/create-react-app/issues/5250
						// Pending futher investigation:
						// https://github.com/terser-js/terser/issues/120
						inline: 2,
					},
					mangle: {
						safari10: true,
					},
					output: {
						ecma: 5,
						comments: false,
						// Turned on because emoji and regex is not minified properly using default
						// https://github.com/facebook/create-react-app/issues/2488
						ascii_only: true,
					},
				},
				// Use multi-process parallel running to improve the build speed
				// Default number of concurrent runs: os.cpus().length - 1
				// Disabled on WSL (Windows Subsystem for Linux) due to an issue with Terser
				// https://github.com/webpack-contrib/terser-webpack-plugin/issues/21
				parallel: !isWsl,
				// Enable file caching
				cache: true,
				sourceMap: shouldUseSourceMap,
			}),
			// This is only used in production mode
			new OptimizeCSSAssetsPlugin({
				cssProcessorOptions: {
					parser: PostCssSafeParser,
					map: shouldUseSourceMap
						? {
							// `inline: false` forces the sourcemap to be output into a
							// separate file
							inline: false,
							// `annotation: true` appends the sourceMappingURL to the end of
							// the css file, helping the browser find the sourcemap
							annotation: true,
						  }
						: false,
				},
			}),
		],
		// Automatically split vendor and commons
		// https://twitter.com/wSokra/status/969633336732905474
		// https://medium.com/webpack/webpack-4-code-splitting-chunk-graph-and-the-splitchunks-optimization-be739a861366
		splitChunks: {
			chunks: 'all',
			name: 'vendors',
		},
		// Keep the runtime chunk separated to enable long term caching
		// https://twitter.com/wSokra/status/969679223278505985
		runtimeChunk: {
			name: x => `${runtimePrefix}${x.name}`,
		},
	},
	resolve: {
		modules: [sourceDirectoryName, 'node_modules'],
		extensions: ['.tsx', '.ts', '.mjs', '.js'],
		alias: isEnvDevelopment
			? {
				'react-dom': '@hot-loader/react-dom',
			  }
			: {},
		plugins: [
			// Prevents users from importing files from outside of src/ (or node_modules/).
			// This often causes confusion because we only process files within src/ with babel.
			// To fix this, we prevent you from importing files out of src/ -- if you'd like to,
			// please link the files into your node_modules/ and let module-resolution kick in.
			// Make sure your source files are compiled, as they will not be processed in any way.
			new ModuleScopePlugin(sourceDirectory, [path.join(rootDirectory, 'package.json')]),
		],
	},
	devServer: {
		host: HOST,
		port: DEFAULT_PORT,
		hot: true,
		compress: true,
		historyApiFallback: true,
		clientLogLevel: 'none',
		contentBase: path.join(__dirname, 'public'),
		disableHostCheck: !proxy || process.env.DANGEROUSLY_DISABLE_HOST_CHECK === 'true',
		stats: {
			colors: true,
		},
	},
	// performance: {
	// 	hints: 'warning',
	// 	maxAssetSize: 200000, // 0.2 mb
	// 	maxEntrypointSize: 400000, // 0.4 mb
	// 	assetFilter: assetFilename => assetFilename.endsWith('.css') || assetFilename.endsWith('.js'),
	// },
	module: {
		strictExportPresence: true,
		rules: [
			// Disable require.ensure as it's not a standard language feature.
			{ parser: { requireEnsure: false } },
			{
				// "oneOf" will traverse all following loaders until one will
				// match the requirements. When no loader matches it will fall
				// back to the "file" loader at the end of the loader list.
				oneOf: [
					// "url" loader works like "file" loader except that it embeds assets
					// smaller than specified limit in bytes as data URLs to avoid requests.
					// A missing `test` is equivalent to a match.
					{
						test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
						loader: 'url-loader',
						options: {
							limit: 10000,
							name: 'static/media/[name].[hash:8].[ext]',
						},
					},
					{
						test: /\.(js|mjs|jsx|ts|tsx)$/,
						include: sourceDirectory,
						loader: 'babel-loader',
						options: {
							babelrc: false,
							sourceMaps: process.env.SOURCE_MAPS || process.env.DEV_TOOL ? true : false,
							presets: [
								[
									'@babel/preset-env',
									{
										targets: {
											browsers: ['last 2 versions', 'ie >= 10'],
										},
									},
								],
								'@babel/preset-typescript',
								'@babel/preset-react',
							],

							plugins: [
								'@babel/plugin-transform-runtime',
								[
									'babel-plugin-named-asset-import',
									{
										loaderMap: {
											svg: {
												ReactComponent: '@svgr/webpack?-svgo,+ref![path]',
											},
										},
									},
								],
								[
									'emotion',
									{
										// sourceMap is on by default but source maps are dead code eliminated in production
										sourceMap: shouldUseSourceMap,
										autoLabel: isEnvDevelopment,
										labelFormat: '[local]',
										cssPropOptimization: true,
									},
								],
								['@babel/plugin-proposal-decorators', { legacy: true }],
								['@babel/plugin-proposal-class-properties', { loose: true }],
								'@babel/plugin-proposal-numeric-separator',
								'@babel/plugin-syntax-dynamic-import',
								'react-hot-loader/babel',
							],

							cacheDirectory: true,
							cacheCompression: isEnvProduction,
							compact: isEnvProduction,
						},
					},
					// Process any JS outside of the app with Babel.
					// Unlike the application JS, we only compile the standard ES features.
					{
						test: /\.(js|mjs)$/,
						exclude: /@babel(?:\/|\\{1,2})runtime/,
						loader: 'babel-loader',
						options: {
							babelrc: false,
							configFile: false,
							compact: false,
							// presets: [['babel-preset-react-app/dependencies', { helpers: true }]],
							cacheDirectory: true,
							cacheCompression: isEnvProduction,

							// If an error happens in a package, it's possible to be
							// because it was compiled. Thus, we don't want the browser
							// debugger to show the original code. Instead, the code
							// being evaluated would be much more helpful.
							sourceMaps: false,
						},
					},
					// "postcss" loader applies autoprefixer to our CSS.
					// "css" loader resolves paths in CSS and adds assets as dependencies.
					// "style" loader turns CSS into JS modules that inject <style> tags.
					// In production, we use MiniCSSExtractPlugin to extract that CSS
					// to a file, but in development "style" loader enables hot editing
					// of CSS.
					// By default we support CSS Modules with the extension .module.css
					{
						test: /\.css$/,
						exclude: /\.module\.css$/,
						use: getStyleLoaders({
							importLoaders: 1,
							sourceMap: isEnvProduction && shouldUseSourceMap,
						}),
						// Don't consider CSS imports dead code even if the
						// containing package claims to have no side effects.
						// Remove this when webpack adds a warning or an error for this.
						// See https://github.com/webpack/webpack/issues/6571
						sideEffects: true,
					},
					// Adds support for CSS Modules (https://github.com/css-modules/css-modules)
					// using the extension .module.css
					{
						test: /\.module\.css$/,
						use: getStyleLoaders({
							importLoaders: 1,
							sourceMap: isEnvProduction && shouldUseSourceMap,
							modules: true,
						}),
					},
					// Opt-in support for SASS (using .scss or .sass extensions).
					// By default we support SASS Modules with the
					// extensions .module.scss or .module.sass
					{
						test: /\.(scss|sass)$/,
						exclude: /\.module\.(scss|sass)$/,
						use: getStyleLoaders(
							{
								importLoaders: 2,
								sourceMap: isEnvProduction && shouldUseSourceMap,
							},
							'sass-loader'
						),
						// Don't consider CSS imports dead code even if the
						// containing package claims to have no side effects.
						// Remove this when webpack adds a warning or an error for this.
						// See https://github.com/webpack/webpack/issues/6571
						sideEffects: true,
					},
					// Adds support for CSS Modules, but using SASS
					// using the extension .module.scss or .module.sass
					{
						test: /\.module\.(scss|sass)$/,
						use: getStyleLoaders(
							{
								importLoaders: 2,
								sourceMap: isEnvProduction && shouldUseSourceMap,
								modules: true,
							},
							'sass-loader'
						),
					},
					{
						test: /\.html$/i,
						use: {
							loader: 'html-loader',
							options: {
								attributes: false,
								minimize: isEnvProduction
									? {
										conservativeCollapse: false,
									  }
									: false,
								//attrs: ['img:src', 'source:src', 'video:poster', 'link:href'],
							},
						},
					},

					// "file" loader makes sure those assets get served by WebpackDevServer.
					// When you `import` an asset, you get its (virtual) filename.
					// In production, they would get copied to the `build` folder.
					// This loader doesn't use a "test" so it will catch all modules
					// that fall through the other loaders.
					{
						loader: 'file-loader',
						// Exclude `js` files to keep "css" loader working as it injects
						// its runtime that would otherwise be processed through "file" loader.
						// Also exclude `html` and `json` extensions so they get processed
						// by webpacks internal loaders.
						exclude: [/\.(mjs|jsx?|tsx?)$/, /\.html$/, /\.json$/],
						options: {
							name: 'static/media/[name].[hash:8].[ext]',
						},
					},
					// ** STOP ** Are you adding a new loader?
					// Make sure to add the new loader(s) before the "file" loader.
				],
			},
		],
	},
	plugins: [
		new webpack.BannerPlugin({
			banner: `ALEX/OS v${version} (c) ${new Date().getFullYear()}`,
			entryOnly: true,
		}),

		// Generates an `index.html` file with the <script> injected.
		new HtmlWebpackPlugin({
			inject: true,

			template: './index.html',
			...(isEnvProduction
				? {
					minify: {
						removeComments: true,
						collapseWhitespace: true,
						removeRedundantAttributes: true,
						useShortDoctype: true,
						removeEmptyAttributes: true,
						removeStyleLinkTypeAttributes: true,
						keepClosingSlash: true,
						minifyJS: true,
						minifyCSS: true,
						minifyURLs: true,
					},
				  }
				: null),
		}),
		// Inlines the webpack runtime script. This script is too small to warrant
		// a network request.
		isEnvProduction &&
			shouldInlineRuntimeChunk &&
			new InlineChunkHtmlPlugin(HtmlWebpackPlugin, [new RegExp(`${runtimePrefix}.+[.]js$`)]),
		isEnvDevelopment && new CaseSensitivePathsPlugin(),
		isEnvProduction &&
			new MiniCssExtractPlugin({
				// Options similar to the same options in webpackOptions.output
				// both options are optional
				filename: 'static/css/[name].[hash:8].css',
				chunkFilename: 'static/css/[name].[hash:8].css',
			}),
		new webpack.DefinePlugin({
			BUILD_VERSION: JSON.stringify(version),
			PACKAGE_NAME: JSON.stringify(name),
		}),
		new CopyWebpackPlugin(['./*.txt', 'CNAME']),
		new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
	].filter(Boolean) as webpack.Plugin[],
	// Some libraries import Node modules but don't use them in the browser.
	// Tell Webpack to provide empty mocks for them so importing them works.
	node: {
		module: 'empty',
		dgram: 'empty',
		dns: 'mock',
		fs: 'empty',
		http2: 'empty',
		net: 'empty',
		tls: 'empty',
		child_process: 'empty',
	},
}

// eslint-disable-next-line import/no-default-export
export default config
