/*
 * @Author: strick
 * @LastEditors: strick
 * @Date: 2023-01-12 18:18:45
 * @LastEditTime: 2023-12-04 14:46:41
 * @Description: 通信
 * @FilePath: /web/shin-monitor/src/lib/http.ts
 */
import { TypeShinParams, TypeSendBody, TypeSendParams, 
  TypeSendResource, TypeCaculateTiming, TypeBehavior } from '../typings';
import { rounded, randomNum, bin2hex } from '../utils';

type ParamsCallback = (data: TypeSendParams, body: TypeSendBody) => void;

class Http {
  private params: TypeShinParams;   // 内部私有变量
  private rate: number;             // 采样数
  public constructor(params: TypeShinParams) {
    this.params = params;
  }
  /**
   * 身份标识
   */
  private getIdentity(): string {
    const key = 'shin-monitor-identity';
    // 页面级的缓存而非全站缓存
    let identity = sessionStorage.getItem(key);
    if (!identity) {
      // 生成标识
      identity = Number(Math.random().toString().substring(3, 6) + Date.now()).toString(36);
      const { value } = this.params.identity;
      // 与自定义的身份字段合并，自定义字段在前，便于使用 ES 的前缀查询
      value && (identity = value + '-' + identity); 
      sessionStorage.setItem(key, identity);
    }
    return identity;
  }
  /**
   * Canvas 指纹
   * 注意，同型号的手机，其 Canvas 指纹是相同的
   */
  private getFingerprint(): string {
    const key = 'shin-monitor-fingerprint';
    const fingerprint = localStorage.getItem(key);
    if(fingerprint) return fingerprint;
    // 绘制 Canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const txt = 'fingerprint';
    ctx.textBaseline = 'top';
    ctx.font = '16px Arial';
    ctx.fillStyle = '#F60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText(txt, 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText(txt, 4, 17);
    var b64 = canvas.toDataURL().replace('data:image/png;base64,', '');
    // window.atob 用于解码使用 base64 编码的字符串
    const bin = window.atob(b64);
    // 必须调用 slice() 否则无法转换
    const result = bin2hex(bin.slice(-16, -12));
    // 缓存到本地
    localStorage.setItem(key, result);
    return result;
  }
  /**
   * 组装监控变量
   * https://github.com/appsignal/appsignal-frontend-monitoring
   */
  public paramify(obj: TypeSendParams): string {
    obj.author = this.params.author;
    obj.token = this.params.token;
    obj.subdir = this.params.subdir;
    obj.identity = this.getIdentity();
    obj.fingerprint = this.getFingerprint();
    obj.referer = location.href;  // 来源地址，即当前页面地址
    // return encodeURIComponent(JSON.stringify(obj));
    return JSON.stringify(obj);
  }
  /**
   * 推送监控信息
   * 改成POST请求
   */
  public send(data: TypeSendParams, callback?: ParamsCallback): void {
    // const ts = new Date().getTime().toString();
    // const img = new Image(0, 0);
    // img.src = shin.param.src + "?m=" + _paramify(data) + "&ts=" + ts;
    const m = this.paramify(data);
    // 大于8000的长度，就不在上报，废弃掉
    if(m.length >= 8000) {
      return;
    }
    const body: TypeSendBody = { m };
    callback && callback(data, body);   // 自定义的参数处理回调
    // 如果修改headers，就会多一次OPTIONS预检请求
    fetch(this.params.src, {
      method: 'POST',
      // headers: {
      //   'Content-Type': 'application/json',
      // },
      body: JSON.stringify(body),
    });
  }
  /**
   * 组装性能变量
   */
  private paramifyPerformance(obj: TypeCaculateTiming): string {
    obj.token = this.params.token;
    obj.pkey = this.params.pkey;
    obj.identity = this.getIdentity();
    obj.referer = location.href; // 来源地址
    /**
     * 静态资源列表
     * https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming
     */
    const resources = performance.getEntriesByType('resource');
    const newResources: TypeSendResource[] = [];
    let transferPaintSize = 0;
    let transferScreenSize = 0;
    resources && resources.forEach((value: PerformanceResourceTiming): void => {
      const { name, initiatorType, startTime, duration,transferSize } = value;
      // 过滤 fetch 请求
      if(initiatorType === 'fetch') return;
      // 只存储 1 分钟内的资源
      if(startTime > 60000) return;
      newResources.push({
        name: name,
        duration: rounded(duration),
        startTime: rounded(startTime),
        transferSize: transferSize      // 资源的总大小，包括HTTP首部
      });
      // 存储白屏之前请求的资源总大小
      if(startTime <= obj.firstPaint) {
        transferPaintSize += transferSize;
      }
      // 存储首屏之前请求的资源总大小
      if(startTime <= obj.firstScreen) {
        transferScreenSize += transferSize;
      }
    });
    obj.transferPaintSize = transferPaintSize;    // 白屏之前的资源总大小
    obj.transferScreenSize = transferScreenSize;  // 首屏之前的资源总大小
    obj.resource = newResources;
    return JSON.stringify(obj);
  }
  /**
   * 发送性能数据
   */
  public sendPerformance(data: TypeCaculateTiming): void {
    // 如果传了数据就使用该数据，否则读取性能参数，并格式化为字符串
    const str = this.paramifyPerformance(data);
    this.rate = randomNum(10, 1); // 选取1~10之间的整数
    // 命中采样
    if (this.params.rate >= this.rate && this.params.pkey) {
      // 开启了录像得用 fetch 传输
      if(this.params.record.isSendInPerformance) {
        fetch(this.params.psrc, {
          method: 'POST',
          body: str,
        });
        return;
      }
      // 普通性能监控，就只传输 64KB 以内的数据
      navigator.sendBeacon(this.params.psrc, str);
    }
  }
  /**
   * 组装性能变量
   */
  private paramifyBehavior(obj: TypeBehavior): string {
    obj.pkey = this.params.pkey;
    obj.identity = this.getIdentity();
    obj.referer = location.href; // 来源地址
    return JSON.stringify(obj);
  }
  /**
   * 发送用户行为数据
   */
  public sendBehavior(data: TypeBehavior): void {
    // 避免不必要的请求，只有当性能参数发送后，才可以将相应的行为数据发送到服务器中
    if(this.rate && this.params.rate >= this.rate && this.params.pkey) {
      const str = this.paramifyBehavior(data);
      navigator.sendBeacon(this.params.psrc, str);
    }
  }
}
export default Http;