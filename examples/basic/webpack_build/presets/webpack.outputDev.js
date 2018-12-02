const WriteFilePlugin = require('write-file-webpack-plugin');

module.exports = () => ({
  plugins: [new WriteFilePlugin()],
});
