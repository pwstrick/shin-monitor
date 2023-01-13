/*
 * @Author: strick
 * @LastEditors: strick
 * @Date: 2023-01-12 18:18:45
 * @LastEditTime: 2023-01-13 16:10:33
 * @Description: 通信
 * @FilePath: /web/shin-monitor/src/lib/http.ts
 */
import { TypeShinParams, TypeSendBody, TypeSendParams } from '../typings';

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
    obj.token = this.params.token;
    obj.subdir = this.params.subdir;
    obj.identity = this.getIdentity();
    // return encodeURIComponent(JSON.stringify(obj));
    return JSON.stringify(obj);
  }
  /**
   * 推送监控信息
   * 改成POST请求
   */
  public send(data: TypeSendParams, callback?: ParamsCallback): void {
    // var ts = new Date().getTime().toString();
    // var img = new Image(0, 0);
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
}
export default Http;