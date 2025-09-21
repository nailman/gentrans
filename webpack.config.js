const path = require('path');

module.exports = {
  mode: 'development', // 'production' にすると最適化される
  entry: {
    background: './src/background.ts',
    content: './src/content.ts',
    options: './src/options.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  devtool: 'cheap-module-source-map', // デバッグしやすくするための設定
};
