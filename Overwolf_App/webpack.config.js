const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const baseConfig = {
  mode: 'development',
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json'],
  },
  externals: {
    bufferutil: 'bufferutil',
    'utf-8-validate': 'utf-8-validate',
  },
};

const mainConfig = {
  ...baseConfig,
  target: 'electron-main',
  entry: {
    index: './src/browser/index.ts',
  },
  output: {
    path: path.join(__dirname, './dist/browser'),
    filename: '[name].js',
  },
};

const preloadConfig = {
  ...baseConfig,
  target: 'electron-preload',
  entry: {
    preload: './src/preload/preload.ts',
  },
  output: {
    path: path.join(__dirname, './dist/preload'),
    filename: '[name].js',
  },
};

const rendererConfig = {
  ...baseConfig,
  target: 'electron-renderer',
  entry: {
    renderer: './src/renderer/renderer.ts',
  },
  output: {
    path: path.join(__dirname, './dist/renderer'),
    filename: '[name].js',
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html',
      filename: 'index.html',
      chunks: ['renderer'],
    }),
    new CopyWebpackPlugin({
      patterns: [
        { 
          from: 'overlay', 
          to: path.join(__dirname, './dist/overlay'),
          noErrorOnMissing: true 
        },
      ],
    }),
  ],
};

module.exports = [mainConfig, preloadConfig, rendererConfig];