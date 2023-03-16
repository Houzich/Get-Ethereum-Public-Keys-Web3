const nodeExternals = require("webpack-node-externals")
const path = require("path")

module.exports = (env) => {  
const service = {
  entry: `main.ts`,
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, `./out/${env.service}`)
  }
}

  return {
    entry: service.entry,
    target: "node",
    externals: [nodeExternals()],
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    optimization: {
      minimize: false
    },
    resolve: {
      extensions: [ '.tsx', '.ts', '.js' ],
    },
    output: service.output
  }

};