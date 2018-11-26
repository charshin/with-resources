const es = process.env.BABEL_ENV === 'es';

module.exports = {
  presets: [
    ['@babel/env', { modules: false }],
    '@babel/preset-react',
  ],
  plugins: [
    ['@babel/proposal-decorators', { legacy: true }],
    ['@babel/proposal-object-rest-spread'],
    !es && ['@babel/transform-modules-commonjs'],
    ['@babel/transform-runtime', { useESModules: es }],
  ].filter(Boolean),
}
