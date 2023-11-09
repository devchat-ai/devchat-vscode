//@ts-check
"use strict";

const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const webpack = require("webpack");

const webviewConfig = {
  name: "webview",
  target: "web",
  mode: "production",
  entry: "./src/index.tsx",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "main.js",
    publicPath: "/",
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".json"],
    alias: {
      "@": path.resolve(__dirname, "src/"),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "babel-loader",
            options: {
              presets: [
                "@babel/preset-env",
                "@babel/preset-react",
                "@babel/preset-typescript",
              ],
            },
          },
          {
            loader: "ts-loader",
          },
        ],
      },
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "babel-loader",
            options: {
              presets: [["@babel/preset-env", "@babel/preset-react"]],
            },
          },
        ],
      },
      {
        test: /\.css$/i,
        use: [
          {
            loader: "style-loader",
          },
          {
            loader: "css-loader",
            options: {
              modules: {
                localIdentName: "[name]__[local]___[hash:base64:5]",
              },
            },
          },
        ],
        include: /views/,
      },
      {
        test: /\.json$/i,
        use: "json-loader",
        type: "asset/source",
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/, // 匹配文件类型
        type: "asset/inline",
      },
    ],
  },
  devtool: false,
  infrastructureLogging: {
    level: "log",
  },
  plugins: [
    // generate an HTML file that includes the extension's JavaScript file
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "src", "main.html"),
      filename: "main.html",
      chunks: ["main"],
    }),
    new CleanWebpackPlugin(),
    new webpack.ProgressPlugin(),
    new webpack.DefinePlugin({
      "process.env.platform": "idea",
    }),
  ],
};

module.exports = webviewConfig;
