module.exports = () => ({
  optimization: {
    splitChunks: {
      cacheGroups: {
        /* NOTE: must be named 'vendors' to overwrite the default one */
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  },
});
