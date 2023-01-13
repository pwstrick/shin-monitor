/*
 * @Author: strick
 * @LastEditors: strick
 * @Date: 2023-01-12 10:17:17
 * @LastEditTime: 2023-01-12 14:59:46
 * @Description: 
 * @FilePath: /web/shin-monitor/config/rollup.js
 */
var typescript = require('rollup-plugin-typescript2');

var pkg = require('../package.json');

var version = pkg.version;

var banner = 
`/*!
 * ${pkg.name} ${version} (https://github.com/pwstrick/shin-monitor)
 * API https://github.com/pwstrick/shin-monitor/blob/master/doc/api.md
 * Copyright 2017-${(new Date).getFullYear()} pwstrick. All Rights Reserved
 * Licensed under MIT (https://github.com/pwstrick/shin-monitor/blob/master/LICENSE)
 */
`;

function getCompiler(opt) {
  opt = opt || {
    tsconfigOverride: { compilerOptions : { module: 'ES2015' } }
  };

  return typescript(opt);
}

exports.name = 'shin';
exports.banner = banner;
exports.getCompiler = getCompiler;
