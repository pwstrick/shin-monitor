/*
 * @Author: strick
 * @LastEditors: strick
 * @Date: 2023-01-12 10:17:17
 * @LastEditTime: 2023-01-16 10:52:56
 * @Description: 入口，自动初始化
 * @FilePath: /web/shin-monitor/src/index.ts
 */
import ErrorMonitor from './lib/error';
import ActionMonitor from './lib/action';
import PerformanceMonitor from './lib/performance';

import { TypeShinParams } from './typings';
/**
 * 默认属性
 */
const defaults: TypeShinParams = {
  record: {
    isOpen: true,           // 是否开启录像
    src: '//cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js'   // 录像地址
  },
  error: {
    isFilterErrorFunc: null,        // 需要过滤的代码错误
    isFilterPromiseFunc: null,      // 需要过滤的Promise错误
  },
  console: {
    isOpen: true,              // 默认是开启，在本地调试时，可以将其关闭
    isFilterLogFunc: null,      // 过滤要打印的内容
  },
  crash: {
    isOpen: true,           // 是否监控页面奔溃，默认开启
    validateFunc: null,     // 自定义页面白屏的判断条件，返回值包括 {success: true, prompt:'提示'}
  },
  event: {
    isFilterClickFunc: null,    // 在点击事件中需要过滤的元素
  },
  ajax: {
    isFilterSendFunc: null      // 在发送监控日志时需要过滤的通信
  },
  src: '//127.0.0.1:3000/ma.gif',       // 采集监控数据的后台接收地址
  psrc: '//127.0.0.1:3000/pe.gif',      // 采集性能参数的后台接收地址
  pkey: '',         // 性能监控的项目key
  subdir: '',       // 一个项目下的子目录
  rate: 5,          // 随机采样率，用于性能搜集，范围是 1~10，10 表示百分百发送
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
  // 只重置 params 中的参数
  for(const key in params) {
    combination[key] = params[key];
  }
  // 埋入自定义的身份信息
  const { getFunc } = combination.identity;
  getFunc && getFunc(combination);
  
  // 记录用户行为
  const error = new ErrorMonitor(combination);
  error.registerErrorEvent();                   // 注册 error 事件
  error.registerUnhandledrejectionEvent();      // 注册 unhandledrejection 事件
  error.registerLoadEvent();                    // 注册 load 事件
  error.recordPage();
  shin.reactError = error.reactError.bind(error);   // 对外提供 React 的错误处理
  shin.vueError = error.vueError.bind(error);       // 对外提供 Vue 的错误处理

  // 启动性能监控
  const pe = new PerformanceMonitor(combination);
  pe.observerLCP();      // 监控 LCP
  pe.observerFID();      // 监控 FID
  pe.registerLoadAndHideEvent();    // 注册 load 和页面隐藏事件

  // 为原生对象注入自定义行为
  const action = new ActionMonitor(combination);
  action.injectConsole();   // 监控打印
  action.injectRouter();    // 监听路由
  action.injectEvent();     // 监听事件
  action.injectAjax();      // 监听Ajax
  
  return combination;
}

export default shin;
