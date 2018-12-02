const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');

const DEFAULT_OUTPUT_PATH = path.resolve(__dirname, '../../build');

module.exports = ({ output: { path: outputPath = DEFAULT_OUTPUT_PATH } = {} }) => ({
  plugins: [new CleanWebpackPlugin([outputPath], { root: path.resolve(outputPath, '..') })],
});
