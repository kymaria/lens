import { appName, buildDir, htmlTemplate, isDevelopment, isProduction, publicPath, rendererDir, sassCommonVars, webpackDevServerPort } from "./src/common/vars";
import path from "path";
import webpack from "webpack";
import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import TerserPlugin from "terser-webpack-plugin";
import ForkTsCheckerPlugin from "fork-ts-checker-webpack-plugin";
import ReactRefreshWebpackPlugin from "@pmmmwh/react-refresh-webpack-plugin";
import * as vars from "./src/common/vars";
import { devDependencies } from "./package.json";

export default [
  webpackLensRenderer
];

export function webpackLensRenderer({ showVars = true } = {}): webpack.Configuration {
  if (showVars) {
    console.info("WEBPACK:renderer", vars);
  }

  return {
    target: "electron-renderer",
    devtool: isProduction ? "source-map" : "eval-source-map",
    // ignore because there is no @types/webpack-dev-server for v4 yet
    // @ts-ignore
    devServer: {
      static: buildDir,
      port: webpackDevServerPort,
      host: "localhost",
      firewall: false,
      headers: { "Access-Control-Allow-Origin": "*" },
      transportMode: "sockjs"
    },
    name: "lens-app",
    mode: isProduction ? "production" : "development",
    cache: isDevelopment ? {
      type: "filesystem",
      buildDependencies: {
        // Add your config as buildDependency to get cache invalidation on config change
        config: [__filename]
      }
    } : false,
    entry: {
      [appName]: path.resolve(rendererDir, "bootstrap.tsx"),
    },
    output: {
      libraryTarget: "global",
      globalObject: "this",
      publicPath,
      path: buildDir,
      filename: "[name].js",
    },
    ignoreWarnings: [
      /Critical dependency: the request of a dependency is an expression/,
      /export '.*' was not found in/
    ],
    resolve: {
      extensions: [
        ".js", ".jsx", ".json",
        ".ts", ".tsx",
      ],
      // the alias is to avoid webpack warning
      // "require.extensions is not supported by webpack. Use a loader instead."
      // from ./src/extensions/cluster-feature.ts
      // the trick is from <https://github.com/handlebars-lang/handlebars.js/issues/953#issuecomment-239874313>
      alias: {
        "handlebars": "handlebars/dist/handlebars.js"
      }
    },
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          extractComments: {
            condition: "some",
            banner: [
              `Lens - The Kubernetes IDE. Copyright ${new Date().getFullYear()} by Mirantis, Inc. All rights reserved.`
            ].join("\n")
          }
        })
      ],
      // Automatically split vendor and commons in development
      // (for faster re-compiling)
      // https://medium.com/webpack/webpack-4-code-splitting-chunk-graph-and-the-splitchunks-optimization-be739a861366
      // @ts-ignore
      splitChunks: isDevelopment ? {
        // chunks can be shared even between async and non-async chunks
        chunks: "all",
        name: `${appName}.renderer.chucks`
      }: false,
      runtimeChunk: isDevelopment ? {
        name: `${appName}.renderer.chucks.runtime`,
      }: false,
    },

    module: {
      rules: [
        {
          test: /\.node$/,
          use: "node-loader"
        },
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: [
            {
              loader: "babel-loader",
              options: {
                presets: [
                  ["@babel/preset-env", {
                    // ling-ui
                    modules: "commonjs",
                    // only transpile if necessary
                    // https://github.com/electron-userland/electron-webpack/blob/ebbf9150b1549fbe7b5e97e9a972e547108eba50/packages/electron-webpack/src/configurators/js.ts#L50
                    targets: {
                      electron: `${devDependencies.electron.replace("^", "")}`,
                    }
                  }],
                ],
                plugins: [
                  isDevelopment && require.resolve("react-refresh/babel"),
                ].filter(Boolean),
              }
            },
            {
              loader: "ts-loader", // ForkTsCheckerPlugin does type-checking
              options: {
                transpileOnly: true,
                compilerOptions: {
                  // localization support
                  // https://lingui.js.org/guides/typescript.html
                  jsx: "preserve",
                  target: "es2016",
                  module: "esnext",
                },
              }
            }
          }
        },
        {
          test: /\.(jpg|png|svg|map|ico)$/,
          use: {
            loader: "file-loader",
            options: {
              name: "images/[name]-[hash:6].[ext]",
              esModule: false, // handle media imports in <template>, e.g <img src="../assets/logo.svg"> (vue/react?)
            }
          }
        },
        {
          test: /\.(ttf|eot|woff2?)$/,
          use: {
            loader: "url-loader",
            options: {
              name: "fonts/[name].[ext]"
            }
          }
        },
        {
          test: /\.s?css$/,
          use: [
            // https://webpack.js.org/plugins/mini-css-extract-plugin/
            isDevelopment ? "style-loader" : MiniCssExtractPlugin.loader,
            {
              loader: "css-loader",
              options: {
                sourceMap: isDevelopment
              },
            },
            {
              loader: "sass-loader",
              options: {
                sourceMap: isDevelopment,
                prependData: `@import "${path.basename(sassCommonVars)}";`,
                sassOptions: {
                  includePaths: [
                    path.dirname(sassCommonVars)
                  ]
                },
              }
            },
          ]
        }
      ]
    },

    plugins: [
      new ForkTsCheckerPlugin(),

      // todo: fix remain warnings about circular dependencies
      // new CircularDependencyPlugin({
      //   cwd: __dirname,
      //   exclude: /node_modules/,
      //   allowAsyncCycles: true,
      //   failOnError: false,
      // }),

      // todo: check if this actually works in mode=production files
      // new webpack.DllReferencePlugin({
      //   context: process.cwd(),
      //   manifest: manifestPath,
      //   sourceType: libraryTarget,
      // }),

      new HtmlWebpackPlugin({
        filename: `${appName}.html`,
        template: htmlTemplate,
        inject: true,
      }),

      new MiniCssExtractPlugin({
        filename: "[name].css",
      }),

      new webpack.ProgressPlugin({ percentBy: "entries" }),

      isDevelopment && new webpack.HotModuleReplacementPlugin(),
      isDevelopment && new ReactRefreshWebpackPlugin(),

    ].filter(Boolean),
    // only output when errors or new compilation happen
    stats: "minimal"
  };
}
