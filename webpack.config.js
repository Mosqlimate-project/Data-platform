const path = require('path');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const BundleTracker = require('webpack-bundle-tracker');

module.exports = (env, argv) => {
  const isDev = argv.mode === 'development';
  const staticDir = path.resolve(__dirname, 'static');
  
  return {
    entry: {
      app: './src/index.js',
    },
    output: {
      path: path.resolve(staticDir, 'webpack_bundles'),
      filename: isDev ? '[name].js' : '[name].[contenthash].js',
      publicPath: '/static/webpack_bundles/',
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: 'babel-loader',
        },
        {
          test: /\.(sa|sc|c)ss$/,
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader',
            'sass-loader',
          ],
        },
        {
          test: /\.(png|jpe?g|gif|svg)$/,
          type: 'asset/resource',
          generator: {
            filename: 'images/[name].[hash][ext]',
          },
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          type: 'asset/resource',
          generator: {
            filename: 'fonts/[name].[hash][ext]',
          },
        },
      ],
    },
    plugins: [
      new CleanWebpackPlugin(),
      new MiniCssExtractPlugin({
        filename: isDev ? '[name].css' : '[name].[contenthash].css',
      }),
      new BundleTracker({
        path: __dirname,
        filename: 'webpack-stats.json',
      }),
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify(argv.mode),
        },
      }),
    ],
    resolve: {
      extensions: ['.js', '.jsx'],
    },
    optimization: {
      splitChunks: {
        chunks: 'all',
      },
    },
    devtool: isDev ? 'inline-source-map' : false,
    devServer: {
      static: {
        directory: staticDir,
      },
      compress: true,
      port: 3000,
      hot: true,
      headers: { 'Access-Control-Allow-Origin': '*' },
    },
  };
};
