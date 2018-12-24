const path = require('path');
const webpack = require('webpack');
const webpackMerge = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { loadEnvironment, applyPresets } = require('./webpack_build');

const DEFAULT_ENV = {
  mode: 'production',
  output: { path: path.resolve(__dirname, 'build') },
};

module.exports = ({ presets = [], staticContents = [], ...env } = DEFAULT_ENV) => {
  const finalEnv = webpackMerge(DEFAULT_ENV, env, {
    presets: [].concat(...[presets]),
    staticContents: [].concat(...[staticContents]),
  });
  return webpackMerge(
    {},
    loadEnvironment(finalEnv),
    applyPresets(finalEnv),
    /* App-specific webpack config */
    {
      devServer: {
        host: '0.0.0.0',
        port: 7000,
      },
      module: {
        rules: [
          {
            test: /\.jsx?$/,
            use: ['babel-loader'],
            exclude: /node_modules/,
          },
        ],
      },
      plugins: [
        new HtmlWebpackPlugin({
          title: 'Animal Lover',
          template: path.resolve(__dirname, 'public/index.html'),
        }),
        new webpack.EnvironmentPlugin({
          HOOK: false,
        }),
        new webpack.ContextReplacementPlugin(/getters/, path.resolve(__dirname, 'src/data/getters')),
      ],
    },
  );
};
