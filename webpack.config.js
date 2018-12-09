/**
 * Webpack client-side config file
 */
const path = require( 'path' );
const webpack = require( 'webpack' );
const ExtractTextPlugin = require( 'extract-text-webpack-plugin' );
const isProd = ( process.env.NODE_ENV === 'production' );

// dev server and globals styles
const serverHost = 'localhost';
const serverPort = 8000;
const serverRoot = path.join( __dirname, '/' );
const appEntry   = './src/app.js';
const bundleDir  = './public/bundles/';

// get loader config based on env
const cssLoaders = () => {
  let use = [ 'style-loader', 'css-loader', 'postcss-loader', 'sass-loader' ];
  let fallback = isProd ? use.shift() : '';
  return isProd ? ExtractTextPlugin.extract( { use, fallback } ) : use;
}

// webpack config
module.exports = {
  watch: true,
  devtool: '#eval-source-map',
  entry: {
    app: appEntry,
  },
  output: {
    path: serverRoot,
    filename: path.join( bundleDir, '[name].min.js' ),
  },
  module: {
    rules: [
      {
        test: /\.(jpe?g|png|gif|svg|map|css|eot|woff|woff2|ttf)$/,
        loader: 'ignore-loader',
      },
      {
        test: /\.scss$/,
        exclude: /node_modules/,
        use: cssLoaders(),
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
      }
    ]
  },
  plugins: [
    new ExtractTextPlugin( path.join( bundleDir, '[name].min.css' ) )
  ],
  devServer: {
    host: serverHost,
    port: serverPort,
    contentBase: serverRoot,
    clientLogLevel: 'info',
    hot: true,
    inline: true,
    quiet: false,
    noInfo: false,
    compress: false,
  },
  performance: {
    hints: false
  }
}

if ( isProd ) {
  module.exports.plugins = (module.exports.plugins || []).concat([
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"production"'
      }
    }),
    new webpack.optimize.UglifyJsPlugin({
      sourceMap: true,
      compress: {
        warnings: false
      }
    }),
    new webpack.LoaderOptionsPlugin({
      minimize: true
    })
  ])
}
