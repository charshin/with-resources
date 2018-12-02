const webpack = require('webpack');
const webpackMerge = require('webpack-merge');
const { applyPresets } = require('..');

module.exports = env => webpackMerge(
  {
    output: {
      filename: '[name].[hash:8].bundle.js',
      chunkFilename: '[name].[hash:8].chunk.js',
    },
    devtool: 'cheap-module-eval-source-map',
    devServer: {
      hot: true,
      historyApiFallback: true,
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.scss$/,
          use: ['style-loader', 'css-loader', 'sass-loader'],
        },
      ],
    },
    plugins: [new webpack.HotModuleReplacementPlugin(), new webpack.NamedModulesPlugin()],
  },
  applyPresets({ ...env, presets: ['splitVendors'] }),
);
