const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin'); // Importe o plugin
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development', // ou 'production'
  entry: './script.js', // Seu arquivo JavaScript principal
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true, // Limpa o diretório dist antes de cada build
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'), // Servir arquivos da pasta dist
    },
    port: 8080, // Porta para o dev server
    historyApiFallback: true,
    allowedHosts: 'all',
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html', // Caminho para o seu index.html existente
      filename: 'index.html', // Nome do arquivo de saída no diretório dist
    }),
    new CopyPlugin({
      patterns: [{ from: 'style.css', to: 'style.css' }],
    }),
  ],
  // Adicione regras para carregar CSS se você estiver importando no JS
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
};
