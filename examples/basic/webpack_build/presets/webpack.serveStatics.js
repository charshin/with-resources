const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const DEFAULT_STATIC_CONTENTS = [path.resolve(__dirname, '../../public')];

module.exports = ({ staticContents = DEFAULT_STATIC_CONTENTS }) => ({
  plugins: [new CopyWebpackPlugin([].concat(...[staticContents]))],
});
