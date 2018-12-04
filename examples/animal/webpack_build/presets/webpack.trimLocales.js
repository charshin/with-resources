const webpack = require('webpack');

const DEFAULT_LOCALES = [];

module.exports = ({ locales = DEFAULT_LOCALES }) => ({
  plugins: [
    new webpack.ContextReplacementPlugin(
      /moment[/\\]locale$/,
      new RegExp(`\\/(${[].concat(...[locales]).join('|')})$`),
    ),
  ],
});
