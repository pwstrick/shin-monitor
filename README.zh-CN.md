## :star: 特性

在经过两年多的线上沉淀后，将监控代码重新用 TypeScript 编写，删除冗余逻辑，正式开源。

不过，我所处的线上场景可能无法覆盖到所有的情况，因此 shin-monitor 在各方面还有很大的提升空间。

- 通过 JavaScript 采集监控数据和性能参数，并统一发送到后台，参考[源码分析](https://www.kancloud.cn/pwstrick/fe-questions/3116144)
- 监控的异常包括运行时错误、Promise 错误、框架错误和资源错误
- 对于白屏错误，借助 [rrweb](https://github.com/rrweb-io/rrweb) 库增加了录像回放功能，恢复案发现场
- 监控的行为包括路由、打印、点击事件、异步通信等
- 性能参数包括首屏、白屏、LCP、FMP、资源信息等
- 在我的[专栏](https://www.kancloud.cn/pwstrick/fe-questions/2363166)中，详细记录了监控脚本的研发迭代过程

## :smiley: 快速安装
常规安装
```
npm install shin-monitor
```

或使用 [unpkg](https://www.unpkg.com/) 提供的 CDN，shin-monitor 后跟的是版本号，可自行选择版本，建议使用最新版本。

若不填版本号会自动做 302 跳转，跳转至最新版本。
```html
<script src="https://unpkg.com/shin-monitor@1.0.16/dist/shin.umd.js"></script>
```

## :open_file_folder: 目录介绍

```
├── dist            编译代码
├── config          配置目录
├── demo            示例目录
├── src             源码目录
├── test            单元测试
├── CHANGELOG.md    变更日志
└── TODO.md         计划功能
```

### 1）dist

dist 是运行编译命令后的输出代码，不会提交到版本中。
```bash
$ npm run build
```

本项目使用的模块打包工具是 [rollup](https://rollupjs.org/guide/en/)，而不是 [webpack](https://webpack.js.org/)。

rollup 的配置文件存在于 config 目录中。

### 2）config

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
### 3）demo

在 demo 目录中，保存着多个使用示例，但是若要访问，推荐安装 [http-server](https://github.com/http-party/http-server)。

运行命令后，就能在本地搭建服务器。
```bash
$ http-server ./shin-monitor/
```

在浏览器地址栏中，输入 http://localhost:8080/demo/xxx.html 就能访问指定的示例了。

像监控通信，是必须要有服务器的，否则将无法访问。

### 4）test

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
  psrc: "//pwstrick.com/pe.gif",
  pkey: "7c891ae43d330f73"
});
```

上述 4 个参数是必传的，具体的作用，可以参考下文说明。

### 1）参数详解

为了能更灵活的配置监控，提供了多个参数。

* src：必填项，采集监控数据的后台接收地址，默认是 //127.0.0.1:3000/ma.gif
* psrc：必填项，采集性能参数的后台接收地址，默认是 //127.0.0.1:3000/pe.gif
* token：必填项，项目标识符，可自定义，用于区分监控的不同项目
* pkey：必填项，性能监控的项目 key，一个项目下面可能有多个不同的子项目，这样就能单独监控子项目的性能
* subdir：一个项目下的子目录，用于拼接 source map 的脚本地址 
* rate：随机采样率，用于性能搜集，默认值是 5，范围在 1~10 之间，10 表示百分百发送
* version：版本，便于追查出错源
* author：页面维护人员，便于追踪错源出自谁的手
* record：录像配置
    * isOpen：是否开启录像，默认是 true
    * src：rrweb 地址，默认是官方提供的 CDN 地址 //cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js
* error：错误配置
    * isFilterErrorFunc：需要过滤的脚本错误，默认是 null，可设置一个函数，参考 demo/error.html
    * isFilterPromiseFunc：需要过滤的 Promise 错误，默认是 null，可设置一个函数，参考 demo/error.html
```js
shin.setParams({
  error: {
    /**
     * 过滤掉与业务无关或无意义的错误
     */
    isFilterErrorFunc: (event) =>   // (event: ErrorEvent) => boolean
        event.message === "Script error.", 
    isFilterPromiseFunc: (desc) =>  // (desc: TypeAjaxDesc) => boolean
        desc.status == 401 || desc.url.indexOf("reports/ai/logs") >= 0
  }
});
```
* console: console 配置
    * isOpen: 是否开启，默认是 true，在本地调试时，可以将其关闭
    * isFilterLogFunc: 过滤要打印的内容，默认是 null，可设置一个函数，参考 demo/console.html
```js
shin.setParams({
  console: {
    isFilterLogFunc: (desc) =>     // (desc: string) => boolean
        desc && desc.indexOf("Agora-SDK") >= 0
  }
});
```
* crash：页面白屏配置
    * isOpen: 是否监控页面奔溃，默认是 true
    * validateFunc: 自定义页面白屏的判断条件，默认是 null，可设置一个函数，参考 demo/crash.html
```js
shin.setParams({
  validateCrash: () => {    // () => TypeCrashResult
    /**
     * 当root标签中的内容为空时，可认为页面已奔溃
     * 响应值格式：{success: true, prompt:'提示'}
     */
    return {
      success: document.getElementById("root").innerHTML.length > 0,
      prompt: "页面出现空白"
    };
  }
});
```
* event: 事件配置
    * isFilterClickFunc: 在点击事件中需要过滤的元素，默认是 null，可设置一个函数，参考 demo/event.html
```js
shin.setParams({
  event: {
    isFilterFunc: (node) => {    // (element: HTMLElement) => boolean
      const nodeName = node.nodeName.toLowerCase();
      return nodeName !== 'a' && nodeName !== 'button' && nodeName !== 'li';
    }
  }
});
```
* ajax：异步 Ajax 配置
    * isFilterSendFunc: 在发送监控日志时需要过滤的通信，默认是 null，可设置一个函数，参考 demo/ajax.html
```js
shin.setParams({
  ajax: {
    isFilterSendFunc: (req) => {    // (req: TypeAjaxRequest) => boolean
      return req.status >= 500 || req.ajax.url === '/user';
    }
  }
});
```
* identity：身份信息配置
    * value: 自定义的身份信息字段
    * getFunc: 自定义的身份信息获取函数，默认是 null，可设置一个函数，参考 demo/identity.html
```js
shin.setParams({
  ajax: {
    getFunc: (params) => {    // (params: TypeShinParams) => void
      params.identity.value = 'test';
    }
  }
});
```

### 2）特殊属性

在调用 setParams() 方法后，自动会在 shin 对象中增加 reactError() 和 vueError()。

可在 React 项目中创建一个 ErrorBoundary 类，手动调用 reactError() 方法，下面是 reactError() 的源码。
```js
public reactError(err: any, info: any): void {
  this.handleError({
    type: CONSTANT.ERROR_REACT,
    desc: {
      prompt: err.toString(),
      url: location.href
    },
    stack: info.componentStack,
  });
}
```

如果要对 Vue 进行错误捕获，那么就得重写 Vue.config.errorHandler()，其参数就是 Vue 对象，下面是 vueError() 的源码。
```js
public vueError (vue: any): void {
  const _vueConfigErrorHandler = vue.config.errorHandler;
  vue.config.errorHandler =  (err: any, vm: any, info: any): void => {
    this.handleError({
      type: CONSTANT.ERROR_VUE,
      desc: {
        prompt: err.toString(), // 描述
        url: location.href
      },
      stack: err.stack,         // 堆栈
    });
    // 控制台打印错误
    if (typeof console !== 'undefined' && typeof console.error !== 'undefined') {
      console.error(err);
    }
    // 执行原始的错误处理程序
    if (typeof _vueConfigErrorHandler === 'function') {
      _vueConfigErrorHandler.call(err, vm, info);
    }
  };
}
```

### 3）性能参数

在提交到后台之前，脚本会对搜集到的性能参数进行计算，计算后取整或保留 1 位小数，单位都为毫秒（ms）。

* loadTime：页面加载总时间，有可能为0，未触发load事件
* unloadEventTime：Unload 事件耗时
* loadEventTime：执行 onload 回调函数的时间
* interactiveTime：首次可交互时间
* domReadyTime：用户可操作时间（DOM Ready时间）
  * 在初始 HTML 文档已完全加载和解析时触发，无需等待图像和 iframe 完成加载
* firstPaint：首次渲染的时间，即白屏时间（FP）
* firstPaintStart：记录 FP 时间点
* firstContentfulPaint：首次有实际内容渲染的时间（FCP）
* firstContentfulPaintStart：记录 FCP 时间点
* parseDomTime：解析 DOM 树的时间，DOM 中的所有脚本
  * 包括具有 async 属性的脚本，都已执行。并且加载 DOM 中定义的所有页面静态资源（图像、iframe 等）
* initDomTreeTime：请求完毕至 DOM 加载的耗时，在加载 DOM 并执行网页的阻塞脚本时触发
* readyStart：准备新页面的耗时
* redirectCount：重定向次数
* compression：传输内容压缩百分比
* redirectTime：重定向的时间
  * 拒绝重定向，例如 https://pwstrick.com 就不该写成 http://pwstrick.com
* appcacheTime：DNS 缓存耗时
* lookupDomainTime：DNS 查询耗时
* connectSslTime：SSL 连接耗时
* connectTime：TCP 连接耗时
* requestTime：内容加载完成的时间
* requestDocumentTime：请求文档，开始请求文档到开始接收文档之间的耗时
* responseDocumentTime：接收文档（内容传输），开始接收文档到文档接收完成之间的耗时
* TTFB：读取页面第一个字节的时间，包含重定向时间
* firstScreen：首屏时间，取 LCP、FMP 和 domReadyTime 之间的最大值
* timing：原始性能参数
  * 通过 [performance.getEntriesByType('navigation')\[0\]](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming) 或 [performance.timing](https://developer.mozilla.org/en-US/docs/Web/API/Performance/timing) 得到的性能参数
  * fid：用户第一次与页面交互到浏览器对交互作出响应的时间
  * fmp：首次有效绘制时间，即首屏最有意义的内容的渲染时间
    * time：时间
    * element：字符串形式的最有意义的元素
  * lcp：最大内容在可视区域内变得可见的时间
    * time：时间
    * url：资源地址
    * element：字符串形式的最大内容的元素
* resource：静态资源的[性能参数](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming)列表，只存储 1 分钟内的资源
  * name：资源名称
  * duration：资源接收的耗时，responseEnd 和 startTime 之间的差值
  * startTime：开始获取该资源的时间

## :open_book: 源码修改
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

* [变更日志](./CHANGELOG.md)
* [计划列表](./TODO.md)

## :wrench: 可视化监控系统

本项目只给出了前端监控的 SDK，监控系统的管理界面可参考 [shin-admin](https://github.com/pwstrick/shin-admin)，后台服务可参考 [shin-server](https://github.com/pwstrick/shin-server)。

下面列出的是几张我自己制作的监控系统的界面示例图。

<img src="https://github.com/pwstrick/shin-monitor/raw/main/demo/img/1.png" />

<img src="https://github.com/pwstrick/shin-monitor/raw/main/demo/img/2.png" />

<img src="https://github.com/pwstrick/shin-monitor/raw/main/demo/img/3.png" />

<img src="https://github.com/pwstrick/shin-monitor/raw/main/demo/img/4.png" />

<img src="https://github.com/pwstrick/shin-monitor/raw/main/demo/img/5.png" />