/*
 * @Author: strick
 * @LastEditors: strick
 * @Date: 2023-01-12 10:17:17
 * @LastEditTime: 2023-01-13 22:38:32
 * @Description: 入口，自动初始化
 * @FilePath: /web/shin-monitor/src/index.ts
 */

import ErrorMonitor from './lib/error';
import ActionMonitor from './lib/action';
import { TypeShinParams } from './typings';
/**
 * 默认属性
 */
const defaults: TypeShinParams = {
//   
//   lcp: {
//     time: 0,    // 时间
//     url: '',    // 资源地址
//     element: '' // 参照的元素
//   },         // 最大内容可见的对象，time：时间 ms，url：参照的资源地址
//   fmp: {
//     time: 0,
//     element: ''
//   },  // 首屏最有意义的对象
//   fid: 0,   // 用户第一次与页面交互（例如当他们单击链接、点按按钮等操作）直到浏览器对交互作出响应的时间
  refer: location.href,     // 上一页地址
  record: {
    isOpen: true,           // 是否打开录像
    src: '//cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js'   // 录像地址
  },
  error: {
    isFilterErrorFunc: null,        // 需要过滤的代码错误
    isFilterPromiseFunc: null,      // 需要过滤的Promise错误
  },
  console: {
    isOpen: false,              // 默认是关闭，在调试时，将不会重写 console.log
    isFilterLogFunc: null,      // 过滤要打印的内容
  },
  crash: {
    isOpen: true,           // 是否监控页面奔溃，默认开启
    validateFunc: null,     // 自定义奔溃规则函数，例如页面白屏判断的条件，返回值包括 {success: true, prompt:'提示'}
  },
  event: {
    isFilterClickFunc: null,    // 在点击事件中需要过滤的元素
  },
  ajax: {
    isFilterSendFunc: null      // 在发送监控日志时需要过滤的通信
  },
  src: '//127.0.0.1:3000/ma.gif',       // 请求发送数据的监控地址
  psrc: '//127.0.0.1:3000/pe.gif',      // 请求发送数据的性能地址
  pkey: '',         // 性能监控的项目key
  subdir: '',       // 一个项目下的子目录
  rate: 5,          // 随机采样率，用于性能搜集
  version: '',      // 版本，便于追查出错源
  identity: {
    value: '',          // 自定义的身份信息字段
    getFunc: null,      // 自定义的身份信息获取函数
  }, 
};
// 外部可以调用的属性
interface TypeShin {
  setParams: (params: TypeShinParams) => TypeShinParams;
  reactError?: (err: any, info: any) => void;
  vueError?: (vue: any) => void;
}
const shin: TypeShin = {
  setParams
};
/**
 * 自定义参数
 * @param params 
 */
function setParams(params: TypeShinParams): TypeShinParams {
  if (!params) {
    return null;
  }
  const combination = defaults;
  // 只重置 param 中的参数
  for(const key in params) {
    combination[key] = params[key];
  }
  // 埋入自定义的身份信息
  const { getFunc } = combination.identity;
  getFunc && getFunc(combination);
  
  // 为原生对象注入自定义行为
  const action = new ActionMonitor(combination);
  action.injectConsole();   // 监控打印
  action.injectRouter();    // 监听路由
  action.injectEvent();     // 监听事件
  action.injectAjax();      // 监听Ajax
  
  // 记录用户行为
  const error = new ErrorMonitor(combination);
  error.registerErrorEvent();                   // 注册 error 事件
  error.registerUnhandledrejectionEvent();      // 注册 unhandledrejection 事件
  error.recordPage();
  shin.reactError = error.reactError.bind(error);   // 对外提供 React 的错误处理
  shin.vueError = error.vueError.bind(error);       // 对外提供 Vue 的错误处理

  /**
   * 在 load 事件中，上报性能参数
   * 该事件不可取消，也不会冒泡
   */
  window.addEventListener('load', (): void => {
    /**
     * 监控页面奔溃情况
     * 原先是在 DOMContentLoaded 事件内触发，经测试发现，当因为脚本错误出现白屏时，两个事件的触发时机会很接近
     * 在线上监控时发现会有一些误报，HTML是有内容的，那很可能是 DOMContentLoaded 触发时，页面内容还没渲染好
     */
    setTimeout((): void => {
      error.monitorCrash(combination.crash);
    }, 1000);
    // 加定时器是避免在上报性能参数时，loadEventEnd 为 0，因为事件还没执行完毕
    // setTimeout((): void => {
    //   sendBeacon();
    // }, 0);
  });
  return combination;
}

export default shin;
