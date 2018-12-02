const WebpackBundleAnalyzer = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = ({ openAnalyzer = true }) => ({
  plugins: [new WebpackBundleAnalyzer({ openAnalyzer })],
});
