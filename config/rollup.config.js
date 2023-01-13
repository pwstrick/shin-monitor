/*
 * @Author: strick
 * @LastEditors: strick
 * @Date: 2023-01-12 10:17:17
 * @LastEditTime: 2023-01-13 22:18:54
 * @Description: rollup.config.js
 * @FilePath: /web/shin-monitor/config/rollup.config.js
 */
// commonjs
var common = require('./rollup.js');

module.exports = {
  input: 'src/index.ts',
  output: {
    file: 'dist/shin.js',
    format: 'cjs',
    // When export and export default are not used at the same time, set legacy to true.
    // legacy: true,
    banner: common.banner,
  },
  plugins: [
    common.getCompiler({
      tsconfigOverride: { compilerOptions : { declaration: true, module: 'ES2015' } },
      useTsconfigDeclarationDir: true
    })
  ]
};
