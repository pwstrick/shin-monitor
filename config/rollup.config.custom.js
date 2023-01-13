/*
 * @Author: strick
 * @LastEditors: strick
 * @Date: 2023-01-13 23:18:14
 * @LastEditTime: 2023-01-13 23:22:00
 * @Description: rollup.config.custom.js
 * @FilePath: /web/shin-monitor/config/rollup.config.custom.js
 */
// umd
var nodeResolve = require('rollup-plugin-node-resolve');
var commonjs = require('rollup-plugin-commonjs');
var uglify = require('rollup-plugin-uglify');

var common = require('./rollup.js');
var prod = process.env.NODE_ENV === 'production';

module.exports = {
  // 当公司需要配置些内部信息，并且不方便公开时，可以采用此脚本，index-custom 不会被版本提交
  input: 'src/index-custom.ts',
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