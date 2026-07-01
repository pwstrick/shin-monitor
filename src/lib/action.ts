/*
 * @Author: strick
 * @LastEditors: strick
 * @Date: 2023-01-12 14:24:20
 * @LastEditTime: 2026-06-30 16:03:41
 * @Description: 用户行为监控
 * @FilePath: /web/shin-monitor/src/lib/action.ts
 */
import { TypeShinParams, NavigatorNetworkInformation, TypeNetwork, TypeAjaxRequest, TypeAjaxDesc, TypeAjaxFilterRequest } from '../typings';
import { rounded, CONSTANT, removeQuote, kb, getNowTimestamp } from '../utils';
import Http from './http';
// history.pushState 和 pushState.replaceState 两个函数类型
type TypeStateEvent = (data: any, unused: string, url?: string | URL | null) => void;
// 事件检测的函数类型
type TypeDetect = (e: Event) => boolean;
class ActionMonitor {
  private params: TypeShinParams;  // 内部私有变量
  private http: Http;
  private refer: string; // 上一页地址
  public constructor(params: TypeShinParams) {
    this.params = params;
    this.http = new Http(params);
    this.refer = location.href;
  }
  /**
   * 递归的将数字四舍五入小数点后两位
   */
  private handleNumber(obj: any): any {
    const type = typeof obj;
    // 若 obj 是 null，则 typeof null 也是 object
    if (type === 'object' && obj !== null) {
      for (const key in obj) {
        // 读取属性状态
        const des = Object.getOwnPropertyDescriptor(obj, key);
        // 当key是只读属性时，就不能直接赋值了
        if(des && des.writable) {
          obj[key] = this.handleNumber(obj[key]);
        }
      }
    }
    if (type === 'number') {
      return rounded(obj, 2);
    }
    return obj;
  }
  /**
   * 在将数据整理好后，发送到后台
   */
  private handleAction(type: string, data: any): void {
    this.http.send({ category: type, data: this.handleNumber(data) });
  }
  /**
   * 全局监听打印
   * 重置 console.log 的动作
   */
  public injectConsole(): void {
    const paramConsole = this.params.console;
    const isOpen = paramConsole && paramConsole.isOpen;
    const isFilterLogFunc = paramConsole && paramConsole.isFilterLogFunc;
    const levels: ('log' | 'error')[] = ['log', 'error'];
    isOpen && levels.forEach((level): void => {
      const _oldConsole = console[level];
      console[level] = (...params): void => {
        _oldConsole.apply(this, params); // 执行原先的 console 方法
        const replaceParams = [];
        // 对 Error 实例做特殊处理
        for(const value of params) {
          // 不能使用 typeof 读取实例类型
          if(Object.prototype.toString.call(value) === '[object Error]') {
            const errorObj: Record<string, any> = {};
            // 遍历错误实例的属性
            Object.getOwnPropertyNames(value).forEach((prop): void => {
              errorObj[prop] = value[prop];
            });
            replaceParams.push(errorObj);
            continue;
          }
          replaceParams.push(value);
        }
        const seen: object[] = [];
        // 避免循环引用
        const desc = JSON.stringify(replaceParams, (key, value): any => {
          // 对普通对象的一般处理
          if (typeof value === 'object' && value !== null) {
            if (seen.indexOf(value) >= 0) {
              return undefined;
            }
            seen.push(value);
          }
          return value;
        });
        // 过滤无意义的打印信息
        if(isFilterLogFunc && isFilterLogFunc(desc)) {
          return;
        }
        this.handleAction(CONSTANT.ACTION_PRINT, {
          type: level,
          desc,
        });
      };
    });
  }
  /**
   * 发送路由信息
   */
  private sendRouterInfo(): void {
    const href = location.href;
    this.handleAction(CONSTANT.ACTION_REDIRECT, {
      refer: this.refer,
      current: href,
    });
    this.refer = href;
  }
  /**
   * 监听路由跳转
   */
  public injectRouter(): void {
    /**
     * 全局监听跳转
     * 点击后退、前进按钮或者调用 history.back()、history.forward()、history.go() 方法才会触发 popstate 事件
     * 点击 <a href=/xx/yy#anchor>hash</a> 按钮也会触发 popstate 事件
     */
    const _onPopState = window.onpopstate;
    window.onpopstate = (args: PopStateEvent): void => {
      this.sendRouterInfo();
      _onPopState && _onPopState.call(window, args);
    };
    /**
     * 监听 pushState() 和 replaceState() 两个方法
     */
    type HistoryMethod = 'pushState' | 'replaceState';
    const bindEventListener = (type: HistoryMethod): TypeStateEvent => {
      const historyEvent: TypeStateEvent = history[type];
      return (...args): void => {
        // 触发 history 的原始事件，apply 的第一个参数若不是 history，就会报错
        const newEvent = historyEvent.apply(history, args);
        this.sendRouterInfo();
        return newEvent;
      };
    };
    history.pushState = bindEventListener('pushState');
    history.replaceState = bindEventListener('replaceState');
  }
  /**
   * 网络状态
   * https://github.com/daniellmb/downlinkMax
   * http://stackoverflow.com/questions/5529718/how-to-detect-internet-speed-in-javascript
   */
  private network(): TypeNetwork {
    const navigator = window.navigator as NavigatorNetworkInformation;
    // 2.2--4.3安卓机才可使用
    const connection = navigator.connection;
    const effectiveType = connection && connection.effectiveType;
    if (effectiveType) {
      return { bandwidth: 0, type: effectiveType.toUpperCase() };
    }
    const types = 'Unknown Ethernet WIFI 2G 3G 4G'.split(' ');
    const info = { bandwidth: 0, type: '' };
    if (connection && connection.type) {
      info.type = types[connection.type];
    }
    return info;
  }
  /**
   * 全局监听事件
   */
  private handleEvent(eventType: string, detect: TypeDetect): (e: Event) => void {
    return (e: Event): void => {
      if (!detect(e)) {
        return;
      }
      this.handleAction(CONSTANT.ACTION_EVENT, {
        type: eventType,
        desc: removeQuote((e.target as HTMLElement).outerHTML), // 去除双引号
      });
    };
  }
  /**
   * 监听点击事件
   * window.onclick 支持 IE9+，若要支持 IE8 浏览器，可以改成 document.onclick
   */
  public injectEvent(): void {
    window.addEventListener('click', this.handleEvent('click', (e: Event): boolean =>{
      const node = e.target as HTMLElement;
      const nodeName = node.nodeName.toLowerCase();
      // 若是 body 元素，则不记录
      if(nodeName === 'body') {
        return false;
      }
      const isFilterClickFunc = this.params.event && this.params.event.isFilterClickFunc;
      // 过滤不需要记录点击事件的元素
      if(isFilterClickFunc && isFilterClickFunc(node)) return false;
      return true;
    }), false);
  }
  /**
   * 监听 Ajax
   * https://github.com/HubSpot/pace
   */
  public injectAjax(): void {
    const isFilterSendFunc = this.params.ajax && this.params.ajax.isFilterSendFunc;
    const _XMLHttpRequest = (window as any).XMLHttpRequest; // 保存原生的XMLHttpRequest
    // 覆盖XMLHttpRequest
    (window as any).XMLHttpRequest = (): XMLHttpRequest => {
      const req = new _XMLHttpRequest();  // 调用原生的XMLHttpRequest
      monitorXHR(req);                  // 埋入我们的间谍
      return req;
    };
    const monitorXHR = (req: TypeAjaxRequest ): void => {
      const ajax: Partial<TypeAjaxDesc> = {};
      req.ajax = ajax as TypeAjaxDesc;
      const self = this;
      let start: number;    //开始时间
      req.addEventListener('readystatechange', function (): void {
        if (this.readyState == 4) {
          const { responseType } = req;
          // 只上报文本和JSON格式的响应数据
          if (responseType && (responseType != 'text' && responseType != 'json')) {
            return;
          }
          let responseText: string; //响应内容
          let response: any; // 响应内容（对象或字符串）
          try {
            if(responseType === 'text') {
              responseText = req.responseText;  // 响应类型是 text，就读取 responseText 属性
              response = req.responseText;
            }else {
              responseText = JSON.stringify(req.response);  // 响应类型是 json，就读取 response 属性
              response = req.response;
            }
          }catch(e) {
            responseText = '';
            response = {};
          }
          const end = getNowTimestamp();    // 结束时间
          ajax.status = req.status;     // 状态码
          // 请求成功
          if ((req.status >= 200 && req.status < 300) || req.status == 304) {
            ajax.endBytes = `${kb(responseText.length * 2)}KB`; // KB
          } else {
            // 请求失败
            ajax.endBytes = 0;
          }
          // 为监控的响应头添加 req-id 字段，为了与云端的接口日志进行关联
          let reqId: string|undefined;
          // 避免出现 Refused to get unsafe header "req-id" 的错误
          if(req.getAllResponseHeaders().indexOf('req-id') >= 0)
            reqId = req.getResponseHeader('req-id') || undefined;
          if(reqId) {
            ajax.header ? (ajax.header['req-id'] = reqId) : (ajax.header = { 'req-id':reqId });
          }
          ajax.interval = `${rounded(end - start, 2)}ms`; // 单位毫秒
          ajax.network = self.network();
          // 只记录6000个字符以内的响应限制，以便让 MySQL 表中的 message 字段能成功存储
          responseText.length <= 6000 && (ajax.response = response);
          // 过滤无意义的通信
          if (isFilterSendFunc && isFilterSendFunc(req)) { 
            return;
          }
          self.handleAction(CONSTANT.ACTION_AJAX, req.ajax); 
        }
      }, false);

      // “间谍”又对open方法埋入了间谍
      const _open = req.open;
      req.open = function (type: string, url: string): void {
        ajax.type = type; // 埋点
        ajax.url = url; // 埋点
        // @ts-ignore
        // 忽略 Argument of type 'IArguments' is not assignable to parameter of type '[method: string, url: string | URL, async: boolean, username?: string | null | undefined, password?: string | null | undefined]'.
        return _open.apply(req, arguments); 
      };
      // 设置请求首部
      const _setRequestHeader = req.setRequestHeader;
      req.setRequestHeader = function (header, value): void {
        // JWT 跨域认证解决方案会在头中增加 Authorization 字段 
        if(header === 'Authorization') {  // 通过 Authorization 可以反查登录账号
          ajax.header = {
            [header]: value
          };
        }
        // @ts-ignore
        return _setRequestHeader.apply(req, arguments);
      };
      // 发送请求
      const _send = req.send;
      req.send = function (data?: string): void {
        start = getNowTimestamp(); // 埋点
        if (data) {
          ajax.startBytes = `${kb(JSON.stringify(data).length * 2)}KB`;
          ajax.data = data; // 传递的参数
        }
        // @ts-ignore
        return _send.apply(req, arguments);
      };
    };
  }
  /**
   * 监听 Fetch 请求
   * 1. 必须使用 response.clone() 读取响应，否则会消费业务代码的响应流。
   * 2. 必须排除监控系统自己的上报地址，否则会产生循环请求。
   * 3. Fetch 没有 XMLHttpRequest 实例，过滤函数只能兼容 status 和 ajax 属性。
   */
  public injectFetch(): void {
    // 保存原始 fetch，后续所有请求仍通过原始方法发送
    const nativeFetch = window.fetch;
    // 某些旧浏览器可能不存在 fetch
    if (!nativeFetch) {
      return;
    }
    const isFilterSendFunc = this.params.ajax && this.params.ajax.isFilterSendFunc;
    /**
     * 将相对地址、绝对地址和 //example.com 形式的地址统一为绝对地址，
     * 用于判断当前请求是不是监控系统自己的上报请求。
     */
    const normalizeUrl = (url: string): string => {
      try {
        // 第二个参数用于解析相对路径和 //example.com 形式的地址
        return new URL(url, window.location.href).href;
      } catch (e) {
        return url;
      }
    };
    /**
     * 向 ajax 对象中写入请求体。
     * fetch 的 body 可能是 string、URLSearchParams、FormData、Blob 等类型。
     * 这里只记录能够安全转换成字符串的类型，避免修改原始请求体。
     */
    const MAX_REQUEST_CHARS = 6000;
    const setRequestBody = (ajax: Partial<TypeAjaxDesc>, body: any): void => {
      let data = '';
      if (typeof body === 'string') {
        data = body;
      } else if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) {
        data = body.toString();
      }
      // 超过指定长度时，就不要赋值
      if (!data || data.length > MAX_REQUEST_CHARS) return;
      ajax.data = data;
      // 与 injectAjax() 保持相同的大小计算方式
      ajax.startBytes = `${kb(JSON.stringify(data).length * 2)}KB`;
    };

    /**
     * 覆盖 window.fetch
     * 使用普通函数或箭头函数都可以；这里使用箭头函数，
     * 以便方法内部继续访问当前 ActionMonitor 实例。
     */
    window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      /**
       * fetch 支持两种调用形式：
       * fetch('/api/user', options)
       * fetch(new Request('/api/user', options))
       */
      const isRequestObject = typeof Request !== 'undefined' && input instanceof Request;
      const request = isRequestObject ? input as Request : null;
      const url = request ? request.url : String(input);
      // init 中的 method 优先级高于 Request 对象中的 method
      const type = (init && init.method || request && request.method || 'GET').toUpperCase();
      const ajax: Partial<TypeAjaxDesc> = {
        type,
        url,
        network: this.network(),
      };
      /**
       * 监控系统使用 fetch 上报数据。
       * 如果不排除 src 和 psrc，会出现：
       * 业务请求 -> 监控上报 -> 再次监控 -> 再次上报……
       */
      const currentUrl = normalizeUrl(url);
      const monitorUrl = normalizeUrl(this.params.src);
      const performanceUrl = normalizeUrl(this.params.psrc);

      const isMonitorRequest = currentUrl === monitorUrl || currentUrl === performanceUrl;
      // 忽略后续的监控上报
      if (isMonitorRequest) {
        return nativeFetch.call(window, input, init);
      }
      /**
       * 读取 Authorization 请求头。
       * init.headers 存在时优先使用 init.headers，
       * 否则读取 Request 对象中的 headers。
       */
      try {
        const headers = new Headers(init && init.headers || request && request.headers || undefined);
        const authorization = headers.get('Authorization');
        if (authorization) {
          ajax.header = {
            Authorization: authorization,
          };
        }
      } catch(e) {
        // 非标准 headers 不影响原始 fetch 请求
      }
      /**
       * 只采集 fetch(url, init) 中能够安全读取的请求体。
       * 不读取 Request 对象的 body，避免 clone().text()
       * 完整加载文件、FormData 或流式请求体。
       */
      if (init && init.body !== undefined && init.body !== null) {
        setRequestBody(ajax, init.body);
      }
      const start = getNowTimestamp();
      /**
       * 执行原始 fetch。
       * fetch 只有发生网络错误、CORS 错误或请求被中止时才会 reject。
       * HTTP 404、500 等状态仍会进入成功回调。
       */
      return nativeFetch.call(window, input, init).then(
        (response: Response): Response => {
          ajax.status = response.status;
          /**
           * 完成数据整理并发送监控数据。
           */
          const sendAjax = (responseText: string): void => {
            const end = getNowTimestamp();
            ajax.interval = `${rounded(end - start, 2)}ms`;
            const isSuccess = (response.status >= 200 && response.status < 300) || response.status === 304;
            const responseBytes = contentLength > 0 ? contentLength : responseText.length * 2;
            ajax.endBytes = isSuccess ? `${kb(responseBytes)}KB` : 0;
            /**
             * 跨域请求只有服务端通过 Access-Control-Expose-Headers
             * 暴露 req-id 后，前端才能读取这个响应头。
             */
            const reqId = response.headers.get('req-id');
            if (reqId) {
              if (ajax.header) {
                ajax.header['req-id'] = reqId;
              } else {
                ajax.header = {
                  'req-id': reqId,
                };
              }
            }
            // 与 injectAjax() 保持一致，只保存 6000 字符以内的响应
            if (responseText.length <= 6000) {
              ajax.response = responseText;
            }
            /**
             * Fetch 没有 XMLHttpRequest 实例。
             * 为了兼容现有 isFilterSendFunc，构造一个包含 status 和 ajax 属性的请求描述对象。
             * 当前项目中的过滤函数只使用了：req.status 和 req.ajax.url
             */
            const filterRequest: TypeAjaxFilterRequest = {
              status: response.status,
              ajax,
            };
            if (isFilterSendFunc && isFilterSendFunc(filterRequest)) {
              return;
            }
            this.handleAction(
              CONSTANT.ACTION_AJAX,
              ajax,
            );
          };
          // 最大读取 12KB，约等于原来 6000 个字符 × 2
          const MAX_RESPONSE_BYTES = 12 * 1024;
          const contentType = (response.headers.get('content-type') || '').toLowerCase();
          const contentLength = Number(response.headers.get('content-length') || 0);
          // 只读取文本、JSON、XML、JavaScript
          const isTextResponse =
            contentType.indexOf('text/') === 0 ||
            contentType.indexOf('json') >= 0 ||
            contentType.indexOf('xml') >= 0 ||
            contentType.indexOf('javascript') >= 0;

          // Content-Length 缺失时也不读取，避免未知大小的响应占用内存
          const canReadResponse = isTextResponse && contentLength > 0 && contentLength <= MAX_RESPONSE_BYTES;
          // 不读取响应体，只上报状态码、耗时等基础信息
          if (!canReadResponse) {
            sendAjax('');
            return response;
          }
          /**
           * 必须 clone 响应。
           * Response 的 body 是只能读取一次的流，如果直接调用
           * response.text()，业务代码之后便无法继续调用 json() 或 text()。
           */
          try {
            response.clone().text().then(
              (responseText: string): void => {
                sendAjax(responseText);
              },
              (): void => {
              // 响应体无法读取时仍然上报状态码和耗时
                sendAjax('');
              },
            );
          } catch (e) {
            // opaque response 或特殊 Response 可能无法 clone
            sendAjax('');
          }
          /**
           * 立即返回原响应。
           * 监控读取 clone 响应的过程不会阻塞业务代码。
           */
          return response;
        },
        /**
         * Fetch 网络失败处理。
         *
         * 网络失败没有 HTTP 状态码，约定使用 status=0。
         * 上报完成后必须重新抛出异常，保持原 fetch 的 reject 行为。
         */
        (error: any): never => {
          ajax.status = 0;
          ajax.endBytes = 0;
          ajax.interval = `${rounded(getNowTimestamp() - start, 2)}ms`;
          ajax.response = {
            message: (error && error.message ? error.message : String(error)),
          };
          const filterRequest: TypeAjaxFilterRequest = {
            status: 0,
            ajax,
          };

          if (!isFilterSendFunc || !isFilterSendFunc(filterRequest)) {
            this.handleAction(
              CONSTANT.ACTION_AJAX,
              ajax,
            );
          }
          // 不能吞掉异常，否则会改变业务 fetch 的行为
          throw error;
        },
      );
    };
  }
}
export default ActionMonitor;