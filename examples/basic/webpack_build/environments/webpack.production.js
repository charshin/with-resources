const webpack = require('webpack');
const webpackMerge = require('webpack-merge');
const { applyPresets } = require('..');

module.exports = env => webpackMerge(
  {
    output: {
      filename: '[name].[contentHash:8].bundle.js',
      chunkFilename: '[name].[contentHash:8].chunk.js',
    },
    devtool: 'source-map',
    plugins: [new webpack.HashedModuleIdsPlugin()],
  },
  applyPresets({ ...env, presets: ['clean', 'extractCss', 'splitVendors'] }),
);
