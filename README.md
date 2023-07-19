# [shin-monitor](https://github.com/pwstrick/shin-monitor) [![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/pwstrick/shin-monitor/blob/master/LICENSE) [![npm](https://img.shields.io/badge/npm-1.5.1-orange.svg)](https://www.npmjs.com/package/shin-monitor)

English | [简体中文](./README.zh-CN.md)

## :star: Characteristics

After more than two years of online precipitation, the monitoring code was rewritten in TypeScript, redundant logic was deleted, and it was officially open sourced.

However, the online scene I am in may not cover all situations, so shin-monitor still has a lot of room for improvement in all aspects.

- Collect monitoring data and performance parameters through JavaScript, and send them to the background uniformly, refer to [source code analysis](https://www.kancloud.cn/pwstrick/fe-questions/3116144)
- Exceptions monitored include runtime errors, Promise errors, framework errors, and resource errors
- For white screen errors, the video playback function is added with the help of the [rrweb](https://github.com/rrweb-io/rrweb) library to restore the crime scene
- Monitored behaviors include routing, printing, click events, asynchronous communication, etc.
- Performance parameters include first screen, white screen, LCP, FMP, resource information, etc.
- In my [column](https://www.kancloud.cn/pwstrick/fe-questions/2363166), the iterative process of developing monitoring scripts is recorded in detail

## :smiley: Quick Installation

The usuall installation
```
npm install shin-monitor
```

Or use the CDN provided by [unpkg](https://www.unpkg.com/), shin-monitor is followed by the version number, you can choose your own version, we recommend using the latest version.

If you do not fill in the version number, it will automatically do a 302 jump and jump to the latest version.
```html
<script src="https://unpkg.com/shin-monitor@1.5.1/dist/shin.umd.js"></script>
```

## :open_file_folder: Directory

```
├── dist            compiled code
├── config          configuration directory
├── demo            example directory
├── src             source directory
├── test            unit test
├── CHANGELOG.md    Changelog
└── TODO.md         planning function
```

### 1）dist

dist is the output code after running the compilation command and will not be submitted to the version.
```bash
$ npm run build
```

The module packaging tool used in this project is [rollup](https://rollupjs.org/guide/en/), not [webpack](https://webpack.js.org/).

Configuration files for rollup exist in the config directory.

### 2）config

In the config directory, there are multiple configuration files supporting CommonJS, ESM and UMD module specifications.
```js
const shin = require('shin-monitor');
import shin from 'shin-monitor';
```

The recommended import method is UMD, but in actual use, you can upload index.umd.js to your company's static resource server.
```html
<script src="node_modules/shin-monitor/dist/index.umd.js"></script>
```

After uploading, you can change the name, for example to shin.js.

Note that shin.js needs to be placed at the very top, but after the [flexible.js](https://github.com/beipiaoyu2011/flexible) mobile screen adaptation scripts.
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

In the demo directory, several usage examples are saved, but if you want to access it, it is recommended to install [http-server](https://github.com/http-party/http-server).

After running the command, the server can be built locally.
```bash
$ http-server ./shin-monitor/
```

In the browser address bar, enter http://localhost:8080/demo/xxx.html to access the specified example.

Like monitoring communication, there must be a server, otherwise it will be inaccessible.

### 4）test

In the test directory, the unit test code is saved, and it can be opened after running the command.
```bash
$ npm run test
```

However, the current test cases are not perfect enough. The testing framework uses [mocha.js](https://mochajs.org/) and the assertions use [expect.js](https://github.com/Automattic/expect.js).

## :rocket: Usage

After correctly introducing shin-monitor, you need to call the setParams() method, and after passing in the necessary parameters, you can start monitoring.
```js
shin.setParams({
  token: "pwstrick",
  src: "//pwstrick.com/ma.gif",
  psrc: "//pwstrick.com/pe.gif",
  pkey: "7c891ae43d330f73"
});
```

The above 4 parameters are required to be passed. For the specific functions, please refer to the following description.

### 1）detailed parameters

In order to configure monitoring more flexibly, multiple parameters are provided.

* src：required item, the background receiving address for collecting monitoring data, 
    * the default is //127.0.0.1:3000/ma.gif
* psrc：required item, background receiving address for collecting performance parameters, 
    * the default is //127.0.0.1:3000/pe.gif
* token：required item, project identifier, customizable, used to distinguish different monitoring projects
* pkey：required item, the project key of performance monitoring, there may be multiple different sub-projects under one project, so that the performance of sub-projects can be monitored separately
* subdir：a subdirectory under a project, used to stitch the script address of the source map
* rate：Random sampling rate, used for performance collection, the default value is 5, the range is between 1 and 10, 10 means 100% sending
* version：version, easy to trace the source of the error
* author：page maintainers, so it's easy to track who's making the mistakes
* record：recording configuration
    * isOpen：whether to enable recording, the default is true
    * isSendInPerformance：Whether to send the performance monitoring video to the server, default is false
    * src：rrweb address, 
        * the default is the official CDN address //cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js
* error：wrong configuration
    * isFilterErrorFunc：The script error that needs to be filtered, the default is null, you can set a function, refer to demo/error.html
    * isFilterPromiseFunc：the Promise error that needs to be filtered, the default is null, you can set a function, refer to demo/error.html
```js
shin.setParams({
  error: {
    /**
     * Filter out irrelevant or meaningless errors
     */
    isFilterErrorFunc: (event) =>   // (event: ErrorEvent) => boolean
        event.message === "Script error.", 
    isFilterPromiseFunc: (desc) =>  // (desc: TypeAjaxDesc) => boolean
        desc.status == 401 || desc.url.indexOf("reports/ai/logs") >= 0
  }
});
```
* console: console configuration
    * isOpen: whether to enable it, the default is true, it can be turned off when debugging locally
    * isFilterLogFunc: filter the content to be printed, the default is null, you can set a function, refer to demo/console.html
```js
shin.setParams({
  console: {
    isFilterLogFunc: (desc) =>     // (desc: string) => boolean
        desc && desc.indexOf("Agora-SDK") >= 0
  }
});
```
* crash：page white screen configuration
    * isOpen: whether to monitor page crashes, the default is true
    * validateFunc: judgment condition for custom page white screen, the default is null, you can set a function, refer to demo/crash.html
```js
shin.setParams({
  validateCrash: () => {    // () => TypeCrashResult
    /**
     * When the content in the root tag is empty, 
     * it can be considered that the page has crashed
     * Response value format: {success: true, prompt:'prompt'}
     */
    return {
      success: document.getElementById("root").innerHTML.length > 0,
      prompt: "page blank"
    };
  }
});
```
* event: event configuration
    * isFilterClickFunc: the element to be filtered in the click event, the default is null, a function can be set, refer to demo/event.html
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
* ajax：asynchronous Ajax configuration
    * isFilterSendFunc: the communication that needs to be filtered when sending monitoring logs, the default is null, a function can be set, refer to demo/ajax.html
```js
shin.setParams({
  ajax: {
    isFilterSendFunc: (req) => {    // (req: TypeAjaxRequest) => boolean
      return req.status >= 500 || req.ajax.url === '/user';
    }
  }
});
```
* identity：identity information configuration
    * value: custom identity information field
    * getFunc: custom identity information acquisition function, the default is null, you can set a function, refer to demo/identity.html
```js
shin.setParams({
  ajax: {
    getFunc: (params) => {    // (params: TypeShinParams) => void
      params.identity.value = 'test';
    }
  }
});
```

### 2）special attribute

After calling the setParams() method, reactError() and vueError() will be automatically added to the shin object.

You can create an ErrorBoundary class in the React project and manually call the reactError() method. The source code of reactError() is as follows.
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

If you want to capture errors for Vue, you have to rewrite Vue.config.errorHandler(), whose parameter is the Vue object. The following is the source code of vueError().
```js
public vueError (vue: any): void {
  const _vueConfigErrorHandler = vue.config.errorHandler;
  vue.config.errorHandler =  (err: any, vm: any, info: any): void => {
    this.handleError({
      type: CONSTANT.ERROR_VUE,
      desc: {
        prompt: err.toString(), // describe
        url: location.href
      },
      stack: err.stack,         // the stack
    });
    // console print error
    if (typeof console !== 'undefined' && typeof console.error !== 'undefined') {
      console.error(err);
    }
    // Execute the original error handler
    if (typeof _vueConfigErrorHandler === 'function') {
      _vueConfigErrorHandler.call(err, vm, info);
    }
  };
}
```

### 3）performance parameter

Before submitting to the background, the script will calculate the collected performance parameters, after the calculation, round or keep 1 decimal place, and the unit is milliseconds (ms).

* loadTime：The total time of page loading, it may be 0, and the load event is not triggered
* unloadEventTime：Unload event time-consuming
* loadEventTime：the time to execute the onload callback function
* interactiveTime：the first interactive time
* domReadyTime：user operable time (DOM Ready time)
  * Fires when the initial HTML document has fully loaded and parsed, without waiting for images and iframes to finish loading
* firstPaint：the time of the first rendering, that is, the white screen time (FP)
* firstPaintStart：record FP time point
* firstContentfulPaint：the time when the actual content is rendered for the first time (FCP)
* firstContentfulPaintStart：record the FCP time point
* parseDomTime：time to parse the DOM tree, all scripts in the DOM
  * Scripts, including those with the async attribute, are executed. and loads all page static resources (images, iframes, etc.) defined in the DOM
* initDomTreeTime：time-consuming from the completion of the request to the loading of the DOM, triggered when the DOM is loaded and the blocking script of the web page is executed
* readyStart：the time spent preparing the new page
* redirectCount：the number of redirects
* compression：transmission content compression percentage
* redirectTime：redirection time
  * Reject redirection, for example https://pwstrick.com should not be written as http://pwstrick.com
* appcacheTime：DNS cache time-consuming
* lookupDomainTime：DNS query time-consuming
* connectSslTime：SSL connection time-consuming
* connectTime：TCP connection time-consuming
* requestTime：the time when the content loading is completed
* requestDocumentTime：request a document, the time between starting to request a document and starting to receive a document
* responseDocumentTime：receive the document (content transfer), start receiving the document and complete the time between receiving the document
* TTFB：time to read the first byte of the page, including redirection time
* firstScreen：first screen time, take the maximum value among LCP, FMP and domReadyTime
* maxDOMTreeDepth: the maximum depth of the DOM node
* maxChildrenCount: the maximum number of children of the DOM node
* totalElementCount: the total number of DOM nodes
* timing：original performance parameters
  * Performance parameters obtained through [performance.getEntriesByType('navigation')\[0\]](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming) or [performance.timing](https://developer.mozilla.org/en-US/docs/Web/API/Performance/timing)
  * fid：the time between the user's first interaction with the page and the browser's response to the interaction
  * fmp：the first effective drawing time, that is, the rendering time of the most meaningful content on the first screen
    * time：timestamp
    * element：the most meaningful element as a string
  * lcp：the time at which the largest content becomes visible within the viewable area
    * time：timestamp
    * url：resource address
    * element：the element with the largest content as a string
* resource：a list of [performance parameters](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming) for static resources, only storing resources within 1 minute
  * name：resource name
  * duration：the time spent on resource reception, the difference between responseEnd and startTime
  * startTime：the time to start getting the resource

## :open_book: Source Code Modification
After downloading the code, dependencies need to be installed for the first run.
```bash
$ npm install
```

One-click packaging generates 4 scripts, 3 specifications and a compressed version of UMD.
```bash
$ npm run build
```

There is also a build-custom command, which can generate UMD scripts with custom logic based on shin-monitor.
```bash
$ npm run build-custom
```

But before running the above command, you need to create index-custom.ts in the src directory, and those custom logic can be edited in this file.

Note that this file is ignored by the version.

* [change log](./CHANGELOG.md)
* [plan list](./TODO.md)

## :wrench: Visual Monitoring System

This project only provides the front-end monitoring SDK, the management interface of the monitoring system can refer to [shin-admin](https://github.com/pwstrick/shin-admin), and the background service can refer to [shin-server](https://github.com/pwstrick/shin-server).

Listed below are some sample diagrams of the interface of the monitoring system I made myself.

<img src="https://github.com/pwstrick/shin-monitor/raw/main/demo/img/1.png" />

<img src="https://github.com/pwstrick/shin-monitor/raw/main/demo/img/2.png" />

<img src="https://github.com/pwstrick/shin-monitor/raw/main/demo/img/3.png" />

<img src="https://github.com/pwstrick/shin-monitor/raw/main/demo/img/4.png" />

<img src="https://github.com/pwstrick/shin-monitor/raw/main/demo/img/5.png" />