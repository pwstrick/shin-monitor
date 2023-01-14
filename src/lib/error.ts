/*
 * @Author: strick
 * @LastEditors: strick
 * @Date: 2023-01-12 14:21:36
 * @LastEditTime: 2023-01-14 19:08:26
 * @Description: 监控各类错误
 * @FilePath: /web/shin-monitor/src/lib/error.ts
 */
import { TypeShinParams, TypeSendBody, TypeAjaxDesc, 
  TypeErrorData, TypeWhiteScreen, TypeWhiteHTMLNode, TypeSendParams } from '../typings';
import { removeQuote, CONSTANT } from '../utils';
import Http from './http';

declare const rrweb: any;
// 媒体和图片包含的属性
interface MediaImage {
  sizes?: string;
  src: string;
  type?: string;
}
// 事件目标的属性
type TypeEventTarget = HTMLElement & HTMLHyperlinkElementUtils & MediaImage;

class ErrorMonitor {
  private params: TypeShinParams;       // 内部私有变量
  private recordEventsMatrix: any[];    // 保存录像信息
  private http: Http;
  public constructor(params: TypeShinParams) {
    this.params = params;
    this.recordEventsMatrix = [[]];
    this.http = new Http(params);
  }
  /**
   * 注册 error 事件，监控脚本异常
   * https://github.com/BetterJS/badjs-report
   */
  public registerErrorEvent(): void {
    const { isFilterErrorFunc } = this.params.error;
    window.addEventListener('error', (event: ErrorEvent): void => {
      const errorTarget = event.target as (Window | TypeEventTarget);
      // 过滤掉与业务无关或无意义的错误
      if (isFilterErrorFunc && isFilterErrorFunc(event)) {
        return;
      }
      // 过滤 target 为 window 的异常
      if (
        errorTarget !== window
          && (errorTarget as TypeEventTarget).nodeName
          && CONSTANT.LOAD_ERROR_TYPE[(errorTarget as TypeEventTarget).nodeName.toUpperCase()]
      ) {
        this.handleError(this.formatLoadError(errorTarget as TypeEventTarget));
      } else {
        // 过滤无效错误
        event.message && this.handleError(
          this.formatRuntimerError(
            event.message,
            event.filename,
            event.lineno,
            event.colno,
            // event.error,
          ),
        );
      }
    }, true); // 捕获
  }
  /**
   * 注册 unhandledrejection 事件，监控未处理的Promise错误
   * 当 Promise 被 reject 且没有 reject 处理器时触发
   */
  public registerUnhandledrejectionEvent(): void {
    const { isFilterPromiseFunc } = this.params.error;
    window.addEventListener('unhandledrejection',(event: PromiseRejectionEvent): void => {
      // 处理响应数据，只抽取重要信息
      const { response } = event.reason;
      // 若无响应，则不监控
      if (!response || !response.request) {
        return;
      }
      const desc: TypeAjaxDesc = response.request.ajax;
      desc.status = event.reason.status || response.status;
      // 过滤掉与业务无关或无意义的错误
      if(isFilterPromiseFunc && isFilterPromiseFunc(desc)) {
        return;
      }
      this.handleError({
        type: CONSTANT.ERROR_PROMISE,
        desc,
        // stack: event.reason && (event.reason.stack || "no stack")
      });
    }, true);
  }
  /**
   * 录制用户行为
   */
  public recordPage(): void {
    const { isOpen, src } = this.params.record;
    if (!isOpen) { return; }
    const script = document.createElement('script');
    script.src = src;
    // 开始监控页面行为
    script.onload = (): void => {
      rrweb.record({
        emit: (event: any, isCheckout: boolean): void => {
          // isCheckout 是一个标识，告诉你重新制作了快照
          if (isCheckout) {
            // 最多保留 3 段行为记录
            const deleteCount = this.recordEventsMatrix.length - 2;
            deleteCount > 0 && this.recordEventsMatrix.splice(0, deleteCount);
            this.recordEventsMatrix.push([]);
          }
          const lastEvents = this.recordEventsMatrix[this.recordEventsMatrix.length - 1];
          lastEvents.push(event);
        },
        checkoutEveryNms: 10 * 1000, // 每 10 秒重新制作快照
      });
    };
    document.head.append(script);
  }
  /**
   * 读取最近 20 秒的行为记录
   */
  private getRecentRecord(): string {
    const len = this.recordEventsMatrix.length;
    if(len === 0) return '';
    let events: any[];
    if(len >= 2) {
      events = this.recordEventsMatrix[len - 2].concat(this.recordEventsMatrix[len - 1]);
    }else {
      events = this.recordEventsMatrix[len - 1];
    }
    return JSON.stringify(events);
  }
  /**
   * 奔溃时的参数设置
   */
  private handleCrashParams(data: TypeSendParams, body: TypeSendBody): void {
    // 当前是一条错误日志，并且描述的是奔溃
    if(data.category === CONSTANT.ACTION_ERROR && data.data.type === CONSTANT.ERROR_CRASH) {
      // 读取行为记录
      const record = this.getRecentRecord();
      // 只有当有内容时，才发送行为记录
      record.length > 0 && (body.r = record);
    }
  }
  /**
   * 白屏计算规则
   */
  private isWhiteScreen(): TypeWhiteScreen {
    const visibles = [];
    const nodes = [];       //遍历到的节点的关键信息，用于查明白屏原因
    // 深度优先遍历子元素
    const dfs = (node: HTMLElement): void => {
      const tagName = node.tagName.toLowerCase();
      const rect = node.getBoundingClientRect();
      // 选取节点的属性作记录
      const attrs: TypeWhiteHTMLNode = {
        id: node.id,
        tag: tagName,
        className: node.className,
        display: node.style.display,
        height: rect.height
      };
      const src = (node as HTMLImageElement).src;
      if(src) {
        attrs.src = src;    // 记录图像的地址
      }
      const href =(node as HTMLAnchorElement).href;
      if(href) {
        attrs.href = href; // 记录链接的地址
      }
      nodes.push(attrs);
      // 若已找到一个有高度的元素，则结束搜索
      if(visibles.length > 0) return;
      // 若元素隐藏，则结束搜索
      if (node.style.display === 'none') return;
      // 若元素有高度并且不是 body 元素，则结束搜索
      if(rect.height > 0 && tagName !== 'body') {
        visibles.push(node);
        return;
      }
      node.children && [].slice.call(node.children).forEach((child: HTMLElement): void => {
        const tagName = child.tagName.toLowerCase();
        // 过滤脚本和样式元素
        if(tagName === 'script' || tagName === 'link') return;
        dfs(child);
      });
    };
    dfs(document.body);
    return {
      visibles: visibles,
      nodes: nodes
    };
  }
  /**
   * 上报错误
   * @param errorLog 
   */
  private handleError(errorLog: TypeErrorData): void {
    // 推送版本号
    this.params.version && (errorLog.version = this.params.version);
    this.http.send({
      category: CONSTANT.ACTION_ERROR,
      data: errorLog
    }, this.handleCrashParams.bind(this));
  }
  /**
   * 监控页面奔溃情况
   */
  public monitorCrash(): void {
    const { isOpen, validateFunc } = this.params.crash;
    if (!isOpen) { return; }
    const HEARTBEAT_INTERVAL = 5 * 1000; // 每五秒发一次心跳
    const crashHeartbeat = (): void => {
      // 是否自定义了规则
      if(validateFunc) {
        const result = validateFunc();
        // 符合自定义的奔溃规则
        if (result && !result.success) {
          this.handleError({
            type: CONSTANT.ERROR_CRASH,
            desc: {
              prompt: result.prompt,
              url: location.href,
            },
          });
          // 关闭定时器
          clearInterval(timer);
        }
      } else {  
        // 兜底白屏算法，可根据自身业务定义
        const whiteObj = this.isWhiteScreen();
        if(whiteObj.visibles.length > 0) {
          return;
        }
        // 查询第一个div
        const currentDiv = document.querySelector('div');
        // 增加 html 字段是为了验证是否出现了误报
        this.handleError({
          type: CONSTANT.ERROR_CRASH,
          desc: {
            prompt: '页面没有高度',
            url: location.href,
            html: currentDiv ? removeQuote(currentDiv.innerHTML) : '',
            fontSize: document.documentElement.style.fontSize,  // 根节点的字体大小
            nodes: whiteObj.nodes
          },
        });
        clearInterval(timer);
      }
    };
    const timer = setInterval(crashHeartbeat, HEARTBEAT_INTERVAL);
    crashHeartbeat();     // 立即执行一次
    // 5分钟后自动取消定时器
    setTimeout((): void => {
      // 关闭定时器
      clearInterval(timer);
    }, 1000 * 300);
  }
  /**
   * 生成 load 错误日志
   * 需要加载资源的元素
   * @param  {Object} errorTarget
   */
  private formatLoadError(errorTarget: TypeEventTarget): TypeErrorData {
    return {
      type: CONSTANT.LOAD_ERROR_TYPE[errorTarget.nodeName.toUpperCase()],
      desc: {
        url: errorTarget.baseURI,
        src: errorTarget.src || errorTarget.href
      }
      // stack: "no stack"
    };
  }
  /**
   * 生成 runtime 错误日志
   * @param {String}  message      错误信息
   * @param {String}  filename     出错文件的URL
   * @param {Long}    lineno       出错代码的行号
   * @param {Long}    colno        出错代码的列号
   * @param {Object}  error        错误信息Object
   * https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Error
   */
  private formatRuntimerError(message: string, filename: string, lineno: number, colno: number): TypeErrorData {
    return {
      type: CONSTANT.ERROR_RUNTIME,
      lineno,
      colno,
      desc: {
        prompt: (message + ' at ' + filename + ':' + lineno + ':' + colno),
        url: location.href
      },
      // stack: error && (error.stack ? error.stack : "no stack") // IE <9, has no error stack
    };
  }
  /**
   * 处理 React 错误（对外）
   */
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
  /**
   * Vue.js 错误劫持（对外）
   */
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
  /**
   * 在 load 事件中，监控奔溃
   * 该事件不可取消，也不会冒泡
   */
  public registerLoadEvent(): void {
    window.addEventListener('load', (): void => {
      /**
       * 监控页面奔溃情况
       * 原先是在 DOMContentLoaded 事件内触发，经测试发现，当因为脚本错误出现白屏时，两个事件的触发时机会很接近
       * 在线上监控时发现会有一些误报，HTML是有内容的，那很可能是 DOMContentLoaded 触发时，页面内容还没渲染好
       */
      setTimeout((): void => {
        this.monitorCrash();
      }, 1000);
    });
  }
}

export default ErrorMonitor;