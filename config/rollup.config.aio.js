/*
 * @Author: strick
 * @LastEditors: strick
 * @Date: 2023-01-12 10:17:17
 * @LastEditTime: 2023-01-13 23:19:36
 * @Description: rollup.config.js
 * @FilePath: /web/shin-monitor/config/rollup.config.aio.js
 */
// umd
var nodeResolve = require('rollup-plugin-node-resolve');
var commonjs = require('rollup-plugin-commonjs');
var uglify = require('rollup-plugin-uglify');

var common = require('./rollup.js');
var prod = process.env.NODE_ENV === 'production';

module.exports = {
  input: 'src/index.ts',
  output: {
    file: prod ? 'dist/shin.min.js' : 'dist/shin.aio.js',
    format: 'umd',
    // When export and export default are not used at the same time, set legacy to true.
    // legacy: true,
    name: common.name,
    banner: common.banner,
  },
  plugins: [
    nodeResolve({
      main: true,
      extensions: ['.ts', '.js']
    }),
    commonjs({
      include: 'node_modules/**',
    }),
    common.getCompiler(),
    (prod && uglify())
  ]
};