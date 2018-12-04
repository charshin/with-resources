const path = require('path');
const webpackMerge = require('webpack-merge');
const { applyPresets } = require('..');

const DEFAULT_OUTPUT_PATH = path.resolve(__dirname, '../../build');

module.exports = ({
  mode = 'production',
  output: { path: outputPath = DEFAULT_OUTPUT_PATH, ...restOutput } = {},
  ...restEnv
} = {}) => webpackMerge(
  {
    mode,
    output: {
      path: outputPath,
      publicPath: '/',
    },
    module: {
      rules: [
        {
          test: /\.jsx?$/,
          use: ['babel-loader'],
          exclude: /node_modules/,
        },
        {
          test: /\.(png|jpe?g|gif|svg)$/,
          use: [
            {
              loader: 'url-loader',
              options: {
                limit: 8192,
              },
            },
          ],
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: '[name].[hash:8].[ext]',
              },
            },
          ],
        },
      ],
    },
  },
  applyPresets({
    ...restEnv,
    mode,
    output: { ...restOutput, path: outputPath },
    presets: ['showProgress'],
  }),
);
