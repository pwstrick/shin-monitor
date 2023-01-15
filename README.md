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

<img src="https://github.com/pwstrick/shin-monitor/raw/main/demo/img/1.png" />

<img src="https://github.com/pwstrick/shin-monitor/raw/main/demo/img/2.png" />

<img src="https://github.com/pwstrick/shin-monitor/raw/main/demo/img/3.png" />

<img src="https://github.com/pwstrick/shin-monitor/raw/main/demo/img/4.png" />

<img src="https://github.com/pwstrick/shin-monitor/raw/main/demo/img/5.png" />

## :open_file_folder: 目录介绍

```
├── dist            编译代码
├── config          配置目录
├── demo            示例目录
├── doc             项目文档
├── src             源码目录
├── test            单元测试
├── CHANGELOG.md    变更日志
└── TODO.md         计划功能
```

#### 1）dist

dist 是运行编译命令后的输出代码，不会提交到版本中。
```bash
$ npm run build
```

本项目使用的模块打包工具是 [rollup](https://rollupjs.org/guide/en/)，而不是 [webpack](https://webpack.js.org/)。

rollup 的配置文件存在于 config 目录中。

#### 2）config

在 config 目录中，有多个配置文件，支持 CommonJS、ESM 和 UMD 模块规范。
```js
const shin = require('shin-monitor');
import shin from 'shin-monitor';
```

推荐的引入方式是 UMD，不过在实际使用中，可以将 index.umd.js 上传至自己公司的静态资源服务器中。
```html
<script src="node_modules/shin-monitor/dist/index.umd.js"></script>
```

在上传后，可以改名，例如叫 shin.js。

注意，shin.js 需要放置在最顶部，但是在 [flexible.js](https://github.com/beipiaoyu2011/flexible) 这些移动端屏幕适配脚本之后。
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <script src="//pwstrick.com/js/xx.flexible.js"></script>
  <script src="//pwstrick.com/js/shin.js"></script>
</head>
</html>
```
#### 3）demo

在 demo 目录中，保存着多个使用示例，但是若要访问，推荐安装 [http-server](https://github.com/http-party/http-server)。

运行命令后，就能在本地搭建服务器，输入 http://localhost:8080/demo/xxx.html 就能访问示例了。
```bash
$ http-server ./shin-monitor/
```

像监控通信，是必须要有服务器的，否则将无法访问。

#### 4）test

在 test 目录中，保存着单元测试代码，运行命令后，就能开启。
```bash
$ npm run test
```

不过目前的测试用例还不够完善。测试框架使用的是 [mocha.js](https://mochajs.org/)，断言使用的是 [expect.js](https://github.com/Automattic/expect.js)。

## :rocket: 使用指南

在正确引入 shin-monitor 之后，就需要调用 setParams() 方法，将必要的参数传入后，就可以开始监控了。
```js
shin.setParams({
  token: "pwstrick",
  src: "//pwstrick.com/ma.gif",
  psrc: "//pwstrick.com/pe.gif"
});
```

其中上述三个参数是必传的，src 和 psrc 分别是后台监控数据采集和性能参数采集的接口地址，token 用于项目标识。



## :bookmark_tabs: 文档
[API](./doc/api.md)

## :kissing_heart: 源码修改
在将代码下载下来后，首次运行需要先安装依赖。
```bash
$ npm install
```

一键打包生成 4 个脚本，3 种规范和 1 个 UMD 的压缩版本。
```bash
$ npm run build
```

还有个 build-custom 命令，可以基于 shin-monitor 生成自定义逻辑的 UMD 脚本。
```bash
$ npm run build-custom
```

不过运行上述命令之前，要先在 src 目录中创建 index-custom.ts，那些自定义逻辑可以在该文件中编辑。

注意，此文件已被版本忽略。

## :gear: 更新日志
[CHANGELOG.md](./CHANGELOG.md)

## :airplane: 计划列表
[TODO.md](./TODO.md)