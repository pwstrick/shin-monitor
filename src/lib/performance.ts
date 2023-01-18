/*
 * @Author: strick
 * @LastEditors: strick
 * @Date: 2023-01-12 18:18:45
 * @LastEditTime: 2023-01-18 18:23:27
 * @Description: 性能监控
 * @FilePath: /web/shin-monitor/src/lib/performance.ts
 */
import { TypeShinParams,TypePerformanceTiming, TypeTiming, TypeLCP,
  TypePerformanceEntry, TypeCaculateTiming, TypeFMP} from '../typings';
import { removeQuote, rounded, getNowTimestamp } from '../utils';
import FMP from './fmp';
import Http from './http';

class PerformanceMonitor {
  private lcp: TypeLCP;            // 最大内容可见的对象，time：时间 ms，url：参照的资源地址
  private fid: number;             // 用户第一次与页面交互（例如当他们单击链接、点按按钮等操作）直到浏览器对交互作出响应的时间
  private fmp: TypeFMP;            // 首屏最有意义的对象
  private fmpObj: FMP;
  private http: Http;
  private isNeedHideEvent: boolean;     // 控制隐藏事件只触发一次
  public constructor(params: TypeShinParams) {
    this.fmpObj = new FMP();
    this.http = new Http(params);
    this.isNeedHideEvent = true;
    this.lcp = {
      time: 0,    // 时间
      url: '',    // 资源地址
      element: '' // 参照的元素
    };
    this.fmp = {
      time: 0,
      element: ''
    };
    this.fid = 0;
  }
  /**
   * 从 performance.timing 读取的性能参数，有些值是 0
   * @param timing 
   */
  private setTimingDefaultValue(timing: any): void {
    if(timing.redirectStart === 0) timing.redirectStart = timing.navigationStart;
    if(timing.redirectEnd === 0) timing.redirectEnd = timing.navigationStart;
    if(timing.loadEventStart === 0) timing.loadEventStart = timing.domComplete;
    if(timing.loadEventEnd === 0) timing.loadEventEnd = timing.loadEventStart;
  }
  /**
   * 读取 timing 对象，兼容新版和旧版
   */
  private getTiming(): TypeTiming {
    const timing = (performance.getEntriesByType('navigation')[0] || performance.timing) as TypePerformanceTiming;
    let now = 0;
    if (!timing) {
      return { now: now };
    }
    let navigationStart: number;
    if (timing.startTime === undefined) {
      navigationStart = timing.navigationStart;
      const cloneTiming: TypePerformanceTiming = {} as any;
      // 不能直接将 timing 传递进去，因为 timing 的属性都是只读的
      for(const key in timing) {
        cloneTiming[key] = timing[key];
      }
      // 消除为 0 的性能参数
      this.setTimingDefaultValue(cloneTiming);
      /**
       * 之所以老版本的用 Date，是为了防止出现负数
       * 当 performance.now 是最新版本时，数值的位数要比 timing 中的少很多
       */
      now = new Date().getTime() - navigationStart;
      return { timing: cloneTiming, navigationStart, now: rounded(now)};
    } 
    navigationStart = timing.startTime;
    now = getNowTimestamp() - navigationStart;
    return { timing, navigationStart, now: rounded(now) };
  }
  /**
   * 判断当前宿主环境是否支持 PerformanceObserver
   * 并且支持某个特定的类型
   */
  private checkSupportPerformanceObserver(type: string): boolean {
    if(!(window as any).PerformanceObserver) return false;
    const types = (PerformanceObserver as any).supportedEntryTypes;
    // 浏览器兼容判断，不存在或没有关键字
    if(!types || types.indexOf(type) === -1) {
      return false;
    }
    return true;
  }
  /**
   * 浏览器 LCP 计算
   * LCP（Largest Contentful Paint）最大内容在可视区域内变得可见的时间
   * https://developer.mozilla.org/en-US/docs/Web/API/LargestContentfulPaint
   */
  public observerLCP(): void {
    const lcpType = 'largest-contentful-paint';
    const isSupport = this.checkSupportPerformanceObserver(lcpType);
    // 浏览器兼容判断
    if(!isSupport) {
      return;
    }
    const po = new PerformanceObserver((entryList): void=> {
      const entries = entryList.getEntries();
      const lastEntry = (entries as any)[entries.length - 1] as TypePerformanceEntry;
      this.lcp = {
        time: rounded(lastEntry.renderTime || lastEntry.loadTime),                  // 时间取整
        url: lastEntry.url,                                                         // 资源地址
        element: lastEntry.element ? removeQuote(lastEntry.element.outerHTML) : ''  // 参照的元素
      };
    });
    // buffered 为 true 表示调用 observe() 之前的也算进来
    po.observe({ type: lcpType, buffered: true } as any);
    // po.observe({ entryTypes: [lcpType] });
    /**
     * 当有按键或点击（包括滚动）时，就停止 LCP 的采样
     * once 参数是指事件被调用一次后就会被移除
     */
    ['keydown', 'click'].forEach((type): void => {
      window.addEventListener(type, (): void => {
        // 断开此观察者的连接
        po.disconnect();
      }, { once: true, capture: true });
    });
  }
  /**
   * 浏览器 FID 计算
   * FID（First Input Delay）用户第一次与页面交互到浏览器对交互作出响应的时间
   * https://developer.mozilla.org/en-US/docs/Glossary/First_input_delay
   */
  public observerFID(): void {
    var fidType = 'first-input';
    var isSupport = this.checkSupportPerformanceObserver(fidType);
    // 浏览器兼容判断
    if(!isSupport) {
      return;
    }
    const po = new PerformanceObserver((entryList, obs): void => {
      const entries = entryList.getEntries();
      const firstInput = (entries as any)[0] as TypePerformanceEntry;
      // 测量第一个输入事件的延迟
      this.fid = rounded(firstInput.processingStart - firstInput.startTime);
      /**
       * 测量第一个输入事件的持续时间
       * 仅在处理程序中同步完成重要事件处理工作时使用
       */
      // const firstInputDuration = firstInput.duration;
      // 获取本次事件目标的一些信息，比如id。
      // const targetId = firstInput.target ? firstInput.target.id : 'unknown-target';
      // 处理第一个输入延迟，也许还有它的持续时间
      // 断开此观察者的连接，因为回调仅触发一次
      obs.disconnect();
    });
    po.observe({ type: fidType, buffered: true } as any);
    // po.observe({ entryTypes: [fidType] });
  }
  /**
   * 请求时间统计
   * https://github.com/addyosmani/timing.js
   */
  private getTimes(): null | TypeCaculateTiming {
    // 出于对浏览器兼容性的考虑，仍然引入即将淘汰的 performance.timing
    const currentTiming = this.getTiming();
    const timing = currentTiming.timing;
    const api: TypeCaculateTiming = {} as any; // 时间单位 ms
    if (!timing) {
      return null;
    }
    const navigationStart = currentTiming.navigationStart;
    // api.navigationStart = navigationStart;

    /**
     * http://javascript.ruanyifeng.com/bom/performance.html
     * 页面加载总时间，有可能为0，未触发load事件
     * 这几乎代表了用户等待页面可用的时间
     * loadEventEnd（加载结束）-navigationStart（导航开始）
     */
    api.loadTime = timing.loadEventEnd - navigationStart;

    /**
     * Unload事件耗时
     */
    api.unloadEventTime = timing.unloadEventEnd - timing.unloadEventStart;

    /**
     * 执行 onload 回调函数的时间
     * 是否太多不必要的操作都放到 onload 回调函数里执行了，考虑过延迟加载、按需加载的策略么？
     */
    api.loadEventTime = timing.loadEventEnd - timing.loadEventStart;

    /**
     * 首次可交互时间
     * 2023-01-18 fetchStart 替换成 navigationStart，因为 domInteractive 有可能是 0，而 fetchStart 不是
     * 这样得到的 interactiveTime 将是负数
     */
    api.interactiveTime = timing.domInteractive - navigationStart;

    /**
     * 用户可操作时间（DOM Ready时间）
     * 在初始HTML文档已完全加载和解析时触发（无需等待图像和iframe完成加载）
     * 紧跟在DOMInteractive之后。
     * https://www.dareboost.com/en/doc/website-speed-test/metrics/dom-content-loaded-dcl
     * 2023-01-18 fetchStart 替换成 navigationStart，理由 interactiveTime 相同
     */
    api.domReadyTime = timing.domContentLoadedEventEnd - navigationStart;

    /**
     * 白屏时间
     * FP（First Paint）首次渲染的时间
     * 2023-01-18 将 fetch 替换成 navigationStart，为了能更准确的计算出真实的白屏时间
     */
    var paint = performance.getEntriesByType('paint');
    if (paint && timing.entryType && paint[0]) {
      api.firstPaint = paint[0].startTime - navigationStart;
      api.firstPaintStart = paint[0].startTime;   // 记录白屏时间点
    } else {
      api.firstPaint = timing.responseEnd - navigationStart;
    }

    /**
     * FCP（First Contentful Paint）首次有实际内容渲染的时间
     * 2023-01-18 fetchStart 替换成 navigationStart，理由和 FP 相同
     */
    if (paint && timing.entryType && paint[1]) {
      api.firstContentfulPaint = paint[1].startTime - navigationStart;
      api.firstContentfulPaintStart = paint[1].startTime;   // 记录 FCP 时间点
    } else {
      api.firstContentfulPaint = 0;
    }

    /**
     * 解析DOM树结构的时间
     * DOM中的所有脚本，包括具有async属性的脚本，都已执行。加载DOM中定义的所有页面静态资源（图像、iframe等）
     * loadEventStart紧跟在domComplete之后。在大多数情况下，这2个指标是相等的。
     * 在加载事件开始之前可能引入的唯一额外延迟将由onReadyStateChange的处理引起。
     * https://www.dareboost.com/en/doc/website-speed-test/metrics/dom-complete
     */
    api.parseDomTime = timing.domComplete - timing.domInteractive;

    /**
     * 请求完毕至DOM加载耗时
     * 在加载DOM并执行网页的阻塞脚本时触发
     * 在这个阶段，具有defer属性的脚本还没有执行，某些样式表加载可能仍在处理并阻止页面呈现
     * https://www.dareboost.com/en/doc/website-speed-test/metrics/dom-interactive
     */
    api.initDomTreeTime = timing.domInteractive - timing.responseEnd;

    /**
     * 准备新页面耗时
     */
    api.readyStart = timing.fetchStart - navigationStart;

    /**
     * 重定向次数（新）
     */
    api.redirectCount = timing.redirectCount || 0;

    /**
     * 传输内容压缩百分比（新）
     */
    api.compression = (1 - timing.encodedBodySize / timing.decodedBodySize) * 100 || 0;

    /**
     * 重定向的时间
     * 拒绝重定向，例如 https://pwstrick.com/ 就不该写成 http://pwstrick.com
     */
    api.redirectTime = timing.redirectEnd - timing.redirectStart;

    /**
     * DNS缓存耗时
     */
    api.appcacheTime = timing.domainLookupStart - timing.fetchStart;

    /**
     * DNS查询耗时
     * DNS 预加载做了么？页面内是不是使用了太多不同的域名导致域名查询的时间太长？
     * 可使用 HTML5 Prefetch 预查询 DNS，参考：http://segmentfault.com/a/1190000000633364
     */
    api.lookupDomainTime = timing.domainLookupEnd - timing.domainLookupStart;

    /**
     * SSL连接耗时
     */
    var sslTime = timing.secureConnectionStart;
    api.connectSslTime = sslTime > 0 ? timing.connectEnd - sslTime : 0;

    /**
     * TCP连接耗时
     */
    api.connectTime = timing.connectEnd - timing.connectStart;

    /**
     * 内容加载完成的时间
     * 页面内容经过 gzip 压缩了么，静态资源 css/js 等压缩了么？
     */
    api.requestTime = timing.responseEnd - timing.requestStart;

    /**
     * 请求文档
     * 开始请求文档到开始接收文档之间的耗时
     */
    api.requestDocumentTime = timing.responseStart - timing.requestStart;

    /**
     * 接收文档（内容传输耗时）
     * 开始接收文档到文档接收完成
     */
    api.responseDocumentTime = timing.responseEnd - timing.responseStart;

    /**
     * 读取页面第一个字节的时间，包含重定向时间
     * TTFB 即 Time To First Byte 的意思
     * 维基百科：https://en.wikipedia.org/wiki/Time_To_First_Byte
     */
    api.TTFB = timing.responseStart - timing.redirectStart;

    /**
    * 仅用来记录当前 performance.now() 获取到的时间格式
    * 用于追溯计算
    */
    api.now = getNowTimestamp();

    // 全部取整
    for (const keyName in api) {
      api[keyName] = rounded(api[keyName]);
    }
    
    // 读取FMP信息
    const fmp = this.fmpObj.getFMP();
    const fmpTime = rounded(fmp.ts - navigationStart);
    this.fmp = {
      // ts 是通过 performance.now() 得到的，若 navigationStart 是从 performance.timing 获取的（13 位的数字），那么就会出现负数
      time: fmpTime > 0 ? fmpTime : rounded(fmp.ts), 
      element: fmp.element ? removeQuote((fmp.element as Element).outerHTML) : ''
    };

    /**
     * 浏览器读取到的性能参数，用于排查，并保留两位小数
     */
    api.timing = {} as any;
    for (const key in timing) {
      const timingValue = timing[key];
      const type = typeof timingValue;
      if (type === 'function') { continue; }
      api.timing[key] = timingValue;
      if (type === 'number') { api.timing[key] = rounded(timingValue, 2); }
    }
    // 取 FMP、LCP 和用户可操作时间中的最大值
    api.firstScreen = Math.max.call(undefined, this.fmp.time, this.lcp.time, api.domReadyTime);
    api.timing.lcp = this.lcp;  //记录LCP对象
    api.timing.fmp = this.fmp;  //记录FMP对象
    api.timing.fid = this.fid;  //记录FID对象
    return api;
  }
  /**
   * 注册 laod 和页面隐藏事件
   */
  public registerLoadAndHideEvent(): void {
    /**
     * 在 load 事件中，上报性能参数
     * 该事件不可取消，也不会冒泡
     */
    window.addEventListener('load', (): void => {
      const data = this.getTimes();
      // 加定时器是避免在上报性能参数时，loadEventEnd 为 0，因为事件还没执行完毕
      setTimeout((): void => {
        if(data) {
          this.http.sendPerformance(data);
          this.isNeedHideEvent = false;
        }
      }, 0);
    });
    /**
     * iOS 设备不支持 beforeunload 事件，需要使用 pagehide 事件
     * 在页面卸载之前，推送性能信息
     */
    const isIOS = !!navigator.userAgent.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/);
    const eventName = isIOS ? 'pagehide' : 'beforeunload';
    window.addEventListener(eventName, (): void => {
      const data = this.getTimes();
      if(this.isNeedHideEvent && data) {
        this.http.sendPerformance(data);
        this.isNeedHideEvent = false;
      }
    }, false);
  }
}

export default PerformanceMonitor;