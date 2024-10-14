const path = require('path');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const BundleTracker = require('webpack-bundle-tracker');

module.exports = (env, argv) => {
  const port = process.env.FRONTEND_PORT;
  const isDev = argv.mode === 'development';
  const static = path.resolve(__dirname, 'static');
  const nodeModulesDir = path.resolve(__dirname, "node_modules");
  const localhostOutput = {
    path: path.resolve(static, 'bundles'),
    publicPath: `http://0.0.0.0:${port}/frontend/bundles/`,
    filename: "[name].js",
  };
  const productionOutput = {
    path: path.resolve(static, 'bundles'),
    publicPath: `http://0.0.0.0:${port}/frontend/bundles/`,
    filename: "[name]-[chunkhash].js",
  };

  return {
    context: __dirname,
    mode: isDev ? "development" : "production",
    entry: {
      app: path.resolve(static, 'js/main.js'),
    },
    output: isDev ? localhostOutput : productionOutput,
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
        directory: static,
      },
      compress: true,
      host: "0.0.0.0",
      port: port,
      hot: true,
      historyApiFallback: true,
      headers: { 'Access-Control-Allow-Origin': '*' },
    },
  };
};
