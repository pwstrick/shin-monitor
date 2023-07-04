/*
 * @Author: strick
 * @LastEditors: strick
 * @Date: 2023-01-12 18:18:45
 * @LastEditTime: 2023-07-04 14:41:07
 * @Description: 通信
 * @FilePath: /web/shin-monitor/src/lib/http.ts
 */
import { TypeShinParams, TypeSendBody, TypeSendParams, 
  TypeSendResource, TypeCaculateTiming } from '../typings';
import { rounded, randomNum } from '../utils';

type ParamsCallback = (data: TypeSendParams, body: TypeSendBody) => void;

class Http {
  private params: TypeShinParams;  // 内部私有变量
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
   * 组装监控变量
   * https://github.com/appsignal/appsignal-frontend-monitoring
   */
  public paramify(obj: TypeSendParams): string {
    obj.author = this.params.author;
    obj.token = this.params.token;
    obj.subdir = this.params.subdir;
    obj.identity = this.getIdentity();
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
    // 静态资源列表
    const resources = performance.getEntriesByType('resource');
    const newResources: TypeSendResource[] = [];
    resources && resources.forEach((value: PerformanceResourceTiming): void => {
      // 过滤 fetch 请求
      if(value.initiatorType === 'fetch') return;
      // 只存储 1 分钟内的资源
      if(value.startTime > 60000) return;
      newResources.push({
        name: value.name,
        duration: rounded(value.duration),
        startTime: rounded(value.startTime),
      });
    });
    obj.resource = newResources;
    return JSON.stringify(obj);
  }
  /**
   * 发送性能数据
   */
  public sendPerformance(data: TypeCaculateTiming): void {
    // 如果传了数据就使用该数据，否则读取性能参数，并格式化为字符串
    const str = this.paramifyPerformance(data);
    const rate = randomNum(10, 1); // 选取1~10之间的整数
    if (this.params.rate >= rate && this.params.pkey) {
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
}
export default Http;