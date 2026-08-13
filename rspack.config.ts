import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@rspack/cli';
import { rspack } from '@rspack/core';
import ReactRefreshPlugin from '@rspack/plugin-react-refresh';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV !== 'production';

export default defineConfig({
  entry: './src/main.tsx',
  output: { uniqueName: 'identity_mfe', publicPath: 'auto' },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
    alias: {
      '@municipal/tokens/css': path.resolve(__dirname, '../municipal-design-system/packages/tokens/src/tokens.css'),
      '@municipal/tokens': path.resolve(__dirname, '../municipal-design-system/packages/tokens/src/index.ts'),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: { syntax: 'typescript', tsx: true },
              transform: { react: { runtime: 'automatic', development: isDev, refresh: isDev } },
            },
          },
        },
        type: 'javascript/auto',
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          { loader: 'postcss-loader', options: { postcssOptions: { plugins: ['@tailwindcss/postcss'] } } },
        ],
        type: 'javascript/auto',
      },
    ],
  },
  plugins: [
    new rspack.HtmlRspackPlugin({ template: './index.html' }),
    new rspack.container.ModuleFederationPlugin({
      name: 'identity_mfe',
      filename: 'remoteEntry.js',
      exposes: { './IdentityApp': './src/App.tsx' },
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
      },
    }),
    isDev && new ReactRefreshPlugin(),
  ].filter(Boolean),
  devServer: {
    port: 5030,
    headers: { 'Access-Control-Allow-Origin': '*' },
    proxy: [{ context: ['/core', '/api', '/health'], target: 'http://127.0.0.1:3000', changeOrigin: false }],
  },
});
