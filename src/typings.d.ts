/*
 * @Author: strick
 * @LastEditors: strick
 * @Date: 2023-01-12 18:03:08
 * @LastEditTime: 2023-01-13 22:43:45
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
  refer: string;
  record: TypeRecord;
  crash: TypeCrashPrams;
  console: TypeConsole;
  event: TypeEvent;
  src: string;
  psrc: string;
  pkey: string;
  subdir: string;
  rate: number;
  version: string;
  identity: TypeIdentity;
  error: TypeError;
  token?: string;
  ajax: TypeAjax;
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
interface TypeResourceDesc {
  url: string;
  src: string;
}
// 错误信息
export interface TypeErrorData {
  type: string;
  desc: string | TypeCrashDesc | TypeRuntimeDesc | TypeResourceDesc | TypeAjaxDesc;
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
  type?: string;
  url?: string;
  status?: number;
  data?: string;
  startBytes?: string;
  endBytes?: string | number;
  header?: {
    'req-id'?: string;
    Authorization?: string;
  };
  interval?: string;
  network?: TypeNetwork;
  response?: any;
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
  data: TypeErrorData | TypeAjaxData;
}