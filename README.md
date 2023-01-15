# [shin-monitor](https://github.com/pwstrick/shin-monitor)
[![](https://img.shields.io/badge/Powered%20by-jslib%20base-brightgreen.svg)](https://github.com/yanhaijing/jslib-base)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/pwstrick/shin-monitor/blob/master/LICENSE)
[![Build Status](https://travis-ci.org/pwstrick/shin-monitor.svg?branch=master)](https://travis-ci.org/pwstrick/shin-monitor)
[![Coveralls](https://img.shields.io/coveralls/pwstrick/shin-monitor.svg)](https://coveralls.io/github/pwstrick/shin-monitor)
[![npm](https://img.shields.io/badge/npm-0.1.0-orange.svg)](https://www.npmjs.com/package/shin-monitor)
[![NPM downloads](http://img.shields.io/npm/dm/shin-monitor.svg?style=flat-square)](http://www.npmtrends.com/shin-monitor)
[![Percentage of issues still open](http://isitmaintained.com/badge/open/pwstrick/shin-monitor.svg)](http://isitmaintained.com/project/pwstrick/shin-monitor "Percentage of issues still open")

## :star: 特性

- 通过 JavaScript 采集监控数据和性能参数，并统一发送到后台
- 监控的异常包括运行时错误、Promise 错误、框架错误和资源错误
- 对于白屏错误，借助 [rrweb](https://github.com/rrweb-io/rrweb) 库增加了录像回放功能，恢复案发现场
- 监控的行为包括路由、打印、点击事件、异步通信等
- 性能参数包括首屏、白屏、LCP、FMP、资源信息等

本项目只给出了前端监控的 SDK，监控系统的管理界面可参考 [shin-admin](https://github.com/pwstrick/shin-admin)，后台服务可参考 [shin-server](https://github.com/pwstrick/shin-server)。

下面列出的是几张我自己制作的监控系统的界面示例图。

<img src="https://github.com/pwstrick/shin-monitor/raw/master/demo/img/1.png" />

<img src="https://github.com/pwstrick/shin-monitor/raw/master/demo/img/2.png" />

<img src="https://github.com/pwstrick/shin-monitor/raw/master/demo/img/3.png" />

<img src="https://github.com/pwstrick/shin-monitor/raw/master/demo/img/4.png" />

## :open_file_folder: 目录介绍

```
├── demo    使用demo
├── dist    编译产出代码
├── doc     项目文档
├── src     源代码目录
├── test    单元测试
├── CHANGELOG.md    变更日志
└── TODO.md         计划功能
```



## :rocket: 使用者指南

通过npm下载安装代码

```bash
$ npm install --save shin-monitor
```

如果你是node环境

```js
var shin = require('shin-monitor');
```

如果你是webpack等环境

```js
import shin from 'shin-monitor';
```

如果你是requirejs环境

```js
requirejs(['node_modules/shin-monitor/dist/index.aio.js'], function (shin) {
    // xxx
})
```

如果你是浏览器环境

```html
<script src="node_modules/shin-monitor/dist/index.aio.js"></script>
```

## :bookmark_tabs: 文档
[API](./doc/api.md)

## :kissing_heart: 贡献者指南
首次运行需要先安装依赖

```bash
$ npm install
```

一键打包生成生产代码

```bash
$ npm run build
```

运行单元测试:

```bash
$ npm test
```

> 注意：浏览器环境需要手动测试，位于`test/browser`

修改 package.json 中的版本号，修改 README.md 中的版本号，修改 CHANGELOG.md，然后发布新版

```bash
$ npm run release
```

将新版本发布到npm

```bash
$ npm publish
```

## :gear: 更新日志
[CHANGELOG.md](./CHANGELOG.md)

## :airplane: 计划列表
[TODO.md](./TODO.md)