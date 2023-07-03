/*
 * @Author: strick
 * @LastEditors: strick
 * @Date: 2023-01-12 18:03:08
 * @LastEditTime: 2023-07-03 15:22:17
 * @Description: 自定义的声明文件
 * @FilePath: /web/shin-monitor/src/typings.d.ts
 */

// 弥补 Navigator 没有 connection 对象
export interface NavigatorNetworkInformation {
  readonly connection?: any;
}
// 弥补 XMLHttpRequest 没有的参数
export type TypeAjaxRequest = XMLHttpRequest & {
  ajax?: TypeAjaxDesc;
};
// 自定义奔溃回调函数的返回值
export interface TypeCrashResult {
  success: boolean;
  prompt: string;
}
// 奔溃参数
export interface TypeCrashPrams {
  isOpen: boolean;
  validateFunc: () => TypeCrashResult | null; 
}
// 录像参数
export interface TypeRecord {
  isOpen: boolean;
  src: string;
}
// 错误参数
export interface TypeError {
  isFilterErrorFunc: (event: ErrorEvent) => boolean | null; 
  isFilterPromiseFunc: (desc: TypeAjaxDesc) => boolean | null; 
}
// 打印参数
export interface TypeConsole {
  isOpen: boolean;
  isFilterLogFunc: (desc: string) => boolean | null; 
}
// 身份信息参数 
export interface TypeIdentity {
  value: string;
  getFunc: (params: TypeShinParams) => void| null;
}
// 事件参数
export interface TypeEvent {
  isFilterClickFunc: (element: HTMLElement) => boolean | null; 
}
// Ajax参数
export interface TypeAjax {
  isFilterSendFunc: (req: TypeAjaxRequest) => boolean | null; 
}
// 监控系统所有的参数
export interface TypeShinParams {
  record?: TypeRecord;
  crash?: TypeCrashPrams;
  console?: TypeConsole;
  event?: TypeEvent;
  src: string;
  psrc: string;
  pkey?: string;
  subdir?: string;
  rate?: number;
  version?: string;
  identity?: TypeIdentity;
  error?: TypeError;
  token?: string;
  ajax?: TypeAjax;
  author?: string;
}
// 发送到后台格式化后的参数属性
export interface TypeSendBody {
  m: string;
  r?: string;
}
// 出现白屏时的辅助信息
export interface TypeWhiteHTMLNode {
  id: string;
  tag: string;
  className: string;
  display: string;
  height: number|string;
  src?: string;
  href?: string;
}
// 白屏函数的返回值
export interface TypeWhiteScreen {
  visibles: TypeWhiteHTMLNode[];
  nodes: TypeWhiteHTMLNode[];
}
// 奔溃错误的描述信息
interface TypeCrashDesc {
  prompt: string;
  url: string;
  fontSize: string;
  html: string;
  nodes: TypeWhiteHTMLNode[];
  timestamp: number;
}
// 脚本错误的描述信息
interface TypeRuntimeDesc {
  prompt: string;
  url: string;
}
// 资源错误的描述错误
export interface TypeResourceDesc {
  url: string;
  src: string;
  message?: string;
}
// 错误信息
export interface TypeErrorData {
  type: string;
  desc: string | TypeCrashDesc | TypeRuntimeDesc | TypeResourceDesc | TypeAjaxDesc;
  referer?: string; // 来源地址，即当前页面地址
  version?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
}
// 网络参数
export interface TypeNetwork {
  bandwidth: number;
  type: string;
}
// 通信中的描述数据
export interface TypeAjaxDesc {
  type: string;
  url: string;
  status: number;
  data?: string;
  startBytes: string;
  endBytes: string | number;
  header?: {
    'req-id'?: string;
    Authorization?: string;
  };
  interval: string;
  network: TypeNetwork;
  response: any;
}
// 通信数据
export interface TypeAjaxData {
  type: string;
  desc: TypeAjaxDesc;
}
// 发送到后台的原始参数信息
export interface TypeSendParams {
  category: string;
  token?: string;
  subdir?: string;
  identity?: string;
  referer?: string;
  author?: string;
  data: TypeErrorData | TypeAjaxData;
}
/*************************************************************************
 * 性能类型
 *************************************************************************/
// 浏览器提供的性能参数，加一个旧属性
export type TypePerformanceTiming = PerformanceNavigationTiming & { 
  navigationStart?: number;
  lcp?: TypeLCP;
  fid?: number;
  fmp?: TypeFMP;
};
// 做了兼容处理后得到的参数属性集合
export interface TypeTiming {
  timing?: TypePerformanceTiming;
  navigationStart?: number;
  now: number;
}
// LCP 对象
export interface TypeLCP {
  time: number;
  url: string;
  element: string;
}
// FMP 对象
export interface TypeFMP {
  time: number;
  element: string;
}
// LCP 和 FID 中的参数集合
export interface TypePerformanceEntry {
  duration: number;
  element: Element;
  entryType: string;
  id: string;
  loadTime: number;
  name: string;
  renderTime: number;
  size: number;
  startTime: number;
  url: string;
  processingStart?: number;
}
// 计算后的性能参数
export interface TypeCaculateTiming {
  loadTime: number;
  unloadEventTime: number;
  loadEventTime: number;
  interactiveTime: number;
  domReadyTime: number;
  firstPaint: number;
  firstPaintStart: number;
  firstContentfulPaint: number;
  firstContentfulPaintStart: number;
  parseDomTime: number;
  initDomTreeTime: number;
  readyStart: number;
  redirectCount: number;
  compression: number;
  redirectTime: number;
  appcacheTime: number;
  lookupDomainTime: number;
  connectSslTime: number;
  connectTime: number;
  requestTime: number;
  requestDocumentTime: number;
  responseDocumentTime: number;
  TTFB: number;
  now: number;
  firstScreen: number;
  timing: TypePerformanceTiming;
  maxDOMTreeDepth: number;
  maxChildrenCount: number;
  totalElementCount: number;
  // 发送到性能参数信息
  token?: string;
  pkey?: string;
  identity?: string;
  referer?: string;
  resource: TypeSendResource[];
  record?: string;
}
// 发送的原始资源信息
export interface TypeSendResource {
  name: string;
  duration: number;
  startTime: number;
}
// DOM 相关数据
export interface TypeDOMCount {
  maxDOMTreeDepth: number;
  maxChildrenCount: number;
  totalElementCount: number;
}