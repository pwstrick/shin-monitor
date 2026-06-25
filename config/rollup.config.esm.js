/*
 * @Author: strick
 * @LastEditors: strick
 * @Date: 2023-01-12 10:17:17
 * @LastEditTime: 2026-06-25 15:02:11
 * @Description: rollup.config.js
 * @FilePath: /web/shin-monitor/config/rollup.config.esm.js
 */
// ES output
var common = require('./rollup.js');

module.exports = {
  input: 'src/index.ts',
  output: {
    file: 'dist/shin.esm.js',
    format: 'es',
    // When export and export default are not used at the same time, set legacy to true.
    // legacy: true,
    banner: common.banner,
  },
  plugins: [
    common.getCompiler({
      tsconfigOverride: {
        compilerOptions: {
          module: 'ES2015',
          declaration: false
        }
      }
    })
  ]
};
