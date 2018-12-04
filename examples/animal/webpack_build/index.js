/* eslint-disable */
const webpackMerge = require('webpack-merge');

const DEFAULT_MODE = 'production';
const DEFAULT_PRESETS = [];

const loadEnvironment = env => {
  const finalEnv = webpackMerge({ mode: DEFAULT_MODE }, env);
  return webpackMerge(
    {},
    require('./environments/webpack.common')(finalEnv),
    require(`./environments/webpack.${finalEnv.mode}`)(finalEnv),
  );
};

const applyPresets = env => {
  const finalEnv = webpackMerge({ presets: DEFAULT_PRESETS }, env);
  return webpackMerge(
    {},
    ...[]
      .concat(...[finalEnv.presets])
      .map(preset => require(`./presets/webpack.${preset}`)(finalEnv)),
  );
};

module.exports = { loadEnvironment, applyPresets };
