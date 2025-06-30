const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin'); // Importe o plugin

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
    historyApiFallback: true, // Para SPA, útil em dev server
    allowedHosts: 'all', // Permite acesso de localhost ou outros hosts na rede
    proxy: [
      { // Seu proxy Python
        context: ['/nfse-proxy'],
        target: 'http://localhost:5000',
        pathRewrite: { '^/nfse-proxy': '/nfse-proxy' },
        secure: false, // Não usar HTTPS no proxy local
        changeOrigin: true, // Necessário para CORS
      },
      // Se for tentar direto para a prefeitura (CORS no navegador será bloqueado sem CORS headers)
      // {
      //   context: ['/webservice'],
      //   target: 'https://serem-hml.joaopessoa.pb.gov.br',
      //   pathRewrite: { '^/webservice': '/notafiscal-abrasfv203-ws/NotaFiscalSoap' },
      //   secure: true,
      //   changeOrigin: true,
      //   headers: {
      //     'SOAPAction': '""'
      //   },
      // },
    ],
  },
  plugins: [ // Adicione a seção de plugins
    new HtmlWebpackPlugin({
      template: './index.html', // Caminho para o seu index.html existente
      filename: 'index.html', // Nome do arquivo de saída no diretório dist
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