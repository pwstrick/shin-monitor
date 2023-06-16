/*
 * @Author: strick
 * @LastEditors: strick
 * @Date: 2023-01-12 14:24:20
 * @LastEditTime: 2023-06-16 16:08:42
 * @Description: 用户行为监控
 * @FilePath: /web/shin-monitor/src/lib/action.ts
 */
import { TypeShinParams, NavigatorNetworkInformation, TypeNetwork, TypeAjaxRequest } from '../typings';
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
    if (type === 'object' && type !== null) {
      for (const key in obj) {
        // 当key是只读属性时，就不能直接赋值了
        obj[key] = this.handleNumber(obj[key]);
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
    const { isOpen, isFilterLogFunc } = this.params.console;
    isOpen && ['log'].forEach((level): void => {
      const _oldConsole = console[level];
      console[level] = (...params): void => {
        _oldConsole.apply(this, params); // 执行原先的 console 方法
        const seen = [];
        // 避免循环引用
        const desc = JSON.stringify(params, (key, value): boolean | string | number => {
          if (typeof value === 'object' && value !== null) {
            if (seen.indexOf(value) >= 0) {
              return;
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
          desc: desc,
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
      _onPopState && _onPopState.apply(this, args);
    };
    /**
     * 监听 pushState() 和 replaceState() 两个方法
     */
    const bindEventListener = (type: string): TypeStateEvent => {
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
      const { isFilterClickFunc } = this.params.event;
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
    const { isFilterSendFunc } = this.params.ajax;
    const _XMLHttpRequest = (window as any).XMLHttpRequest; // 保存原生的XMLHttpRequest
    // 覆盖XMLHttpRequest
    (window as any).XMLHttpRequest = (): XMLHttpRequest => {
      const req = new _XMLHttpRequest();  // 调用原生的XMLHttpRequest
      monitorXHR(req);                  // 埋入我们的间谍
      return req;
    };
    const monitorXHR = (req: TypeAjaxRequest ): void => {
      req.ajax = {} as any;
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
          req.ajax.status = req.status;     // 状态码
          // 请求成功
          if ((req.status >= 200 && req.status < 300) || req.status == 304) {
            req.ajax.endBytes = `${kb(responseText.length * 2)}KB`; // KB
          } else {
            // 请求失败
            req.ajax.endBytes = 0;
          }
          // 为监控的响应头添加 req-id 字段，为了与云端的接口日志进行关联
          const reqId = req.getResponseHeader('req-id');
          if(reqId) {
            req.ajax.header ? (req.ajax.header['req-id'] = reqId) : (req.ajax.header = { 'req-id':reqId });
          }
          req.ajax.interval = `${rounded(end - start, 2)}ms`; // 单位毫秒
          req.ajax.network = self.network();
          // 只记录6000个字符以内的响应限制，以便让 MySQL 表中的 message 字段能成功存储
          responseText.length <= 6000 && (req.ajax.response = response);
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
        req.ajax.type = type; // 埋点
        req.ajax.url = url; // 埋点
        return _open.apply(req, arguments);
      };
      // 设置请求首部
      const _setRequestHeader = req.setRequestHeader;
      req.setRequestHeader = function (header, value): void {
        // JWT 跨域认证解决方案会在头中增加 Authorization 字段 
        if(header === 'Authorization') {  // 通过 Authorization 可以反查登录账号
          req.ajax.header = {
            [header]: value
          };
        }
        return _setRequestHeader.apply(req, arguments);
      };
      // 发送请求
      const _send = req.send;
      req.send = function (data?: string): void {
        start = getNowTimestamp(); // 埋点
        if (data) {
          req.ajax.startBytes = `${kb(JSON.stringify(data).length * 2)}KB`;
          req.ajax.data = data; // 传递的参数
        }
        return _send.apply(req, arguments);
      };
    };
  }
}
export default ActionMonitor;