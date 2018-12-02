const path = require('path');
const webpack = require('webpack');

const DEFAULT_TIMEZONES_FILEPATH = path.resolve(
  __dirname,
  '../../node_modules/moment-timezone/data/packed/latest.json',
);

module.exports = ({ timezonesFilepath = DEFAULT_TIMEZONES_FILEPATH }) => ({
  plugins: [
    new webpack.NormalModuleReplacementPlugin(
      /moment-timezone\/data\/packed\/latest\.json/,
      timezonesFilepath,
    ),
  ],
});
