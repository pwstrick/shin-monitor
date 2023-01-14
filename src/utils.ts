/*
 * @Author: strick
 * @LastEditors: strick
 * @Date: 2023-01-12 11:19:52
 * @LastEditTime: 2023-01-14 18:57:32
 * @Description: 工具函数，与业务解耦
 * @FilePath: /web/shin-monitor/src/utils.ts
 */

export const CONSTANT = {
  // 定义行为类型
  ACTION_ERROR: 'error',
  ACTION_AJAX : 'ajax',
  ACTION_EVENT : 'event',
  ACTION_PRINT : 'console',
  ACTION_REDIRECT : 'redirect',
  // 定义的错误类型码
  ERROR_RUNTIME : 'runtime',
  ERROR_SCRIPT : 'script',
  ERROR_STYLE : 'style',
  ERROR_IMAGE : 'image',
  ERROR_AUDIO : 'audio',
  ERROR_VIDEO : 'video',
  ERROR_PROMISE : 'promise',
  ERROR_VUE : 'vue',
  ERROR_REACT : 'react',
  ERROR_CRASH : 'crash',
  LOAD_ERROR_TYPE : {
    SCRIPT: 'script',
    LINK: 'style',
    IMG: 'image',
    AUDIO: 'audio',
    // VIDEO: 'video', //暂时关闭
  }
};

/**
 * 均匀获得两个数字之间的随机数，两个数值倒过来也能获得指定区间的数字
 * @param max 最大值
 * @param min 最小值
 */
export function randomNum(max: number, min: number): number {
  // 向下取整
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * 四舍五入
 * @param number 数值
 * @param decimal 要舍去的位数
 */
export function rounded(number: number, decimal?: number): number {
  return parseFloat(number.toFixed(decimal));
}
  
/**
 * 计算KB值
 * http://stackoverflow.com/questions/1248302/javascript-object-size
 * @param bytes 字节数
 */
export function kb(bytes: number): number {
  return rounded(bytes / 1024, 2); // 四舍五入 2 位小数
}

/**
 * 去除双引号
 * @param html 
 */
export function removeQuote(html: string): string {
  return html.replace(/"/g, '');
}
/**
 * 得到当前时间戳，单位毫秒
 * Date.now() 会受系统程序执行阻塞的影响
 * performance.now() 的时间是以恒定速率递增的，不受系统时间的影响（系统时间可被人为或软件调整）
 */
export function getNowTimestamp(): number {
  return performance.now();
}