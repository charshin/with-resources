const path = require('path');
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
      plugins: [
        new HtmlWebpackPlugin({
          title: 'Webpack React Starter Kit',
          template: path.resolve(__dirname, 'public/index.html'),
        }),
      ],
    },
  );
};
