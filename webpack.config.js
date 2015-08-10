module.exports = {
  entry: ["./js/main.js"],
  output: {
    path: './build', // This is where images AND js will go
    filename: 'bundle.js'
  },
  module: {
    loaders: [
      { test: /\.js$/, loader: 'babel' },
      { test: /\.less$/, loader: 'style!css?localIdentName=[path][name]---[local]---[hash:base64:5]!less' }, // use ! to chain loaders
      { test: /\.css$/, loader: 'style!css?localIdentName=[path][name]---[local]---[hash:base64:5]' },
      { test: /\.(png|jpg)$/, loader: 'url?limit=8192' } // inline base64 URLs for <=8k images, direct URLs for the rest
    ]
  },
  resolve: {
    extensions: ['', '.js', '.json']
  }
};