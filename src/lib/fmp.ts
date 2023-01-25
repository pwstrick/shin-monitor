/*
 * @Author: strick
 * @LastEditors: strick
 * @Date: 2023-01-12 10:17:17
 * @LastEditTime: 2023-01-25 13:52:50
 * @Description: FMP的计算
 * @FilePath: /web/shin-monitor/src/lib/fmp.ts
 */
const IGNORE_TAG_SET = ['SCRIPT', 'STYLE', 'META', 'HEAD', 'LINK'];
const TAG_WEIGHT_MAP = {
  SVG: 2,
  IMG: 2,
  CANVAS: 4,
  OBJECT: 4,
  EMBED: 4,
  VIDEO: 4
};
const WW = window.innerWidth;
const WH = window.innerHeight;
const FMP_ATTRIBUTE = '_ts';
interface TypeTree {
  ts: number;
  children: Element[];
}
interface TypeMaxElement {
  ts: number;
  element: Element | string;
}

class FMP { 
  private cacheTrees: TypeTree[];
  private callbackCount: number;
  private observer: MutationObserver;
  public constructor() {
    this.cacheTrees = [];       // 缓存每次更新的DOM元素
    this.callbackCount = 0;     // DOM 变化的计数
    // 开始监控DOM的变化
    this.observer = new MutationObserver((): void => {
      const mutationsList = [];
      // 从 body 元素开始遍历
      document.body && this.doTag(document.body, this.callbackCount++, mutationsList);
      this.cacheTrees.push({
        ts: performance.now(),
        children: mutationsList  
      });
      // console.log("mutationsList", performance.now(), mutationsList);
    });
    this.observer.observe(document, {
      childList: true,    // 监控子元素
      subtree: true   // 监控后代元素
    });
  }
  /**
   * 为 HTML 元素打标记，记录是哪一次的 DOM 更新
   */
  private doTag(target: Element, callbackCount: number, mutationsList: Element[]): void {
    const childrenLen = target.children ? target.children.length : 0;
    // 结束递归
    if(childrenLen === 0)
      return;
    for (let children = target.children, i = childrenLen - 1; i >= 0; i--) {
      const child = children[i];
      const tagName = child.tagName;
      if (child.getAttribute(FMP_ATTRIBUTE) === null && 
            IGNORE_TAG_SET.indexOf(tagName) === -1  // 过滤掉忽略的元素
      ) {
        child.setAttribute(FMP_ATTRIBUTE, callbackCount.toString());
        mutationsList.push(child);  // 记录更新的元素
      }
      // 继续递归
      this.doTag(child, callbackCount, mutationsList);
    }
  }
  /**
   * 是否超出屏幕外
   */
  private isOutScreen(node: Element): boolean {
    const { left, top } = node.getBoundingClientRect();
    return  WH < top || WW < left;
  }
  /**
   * 读取 FMP 信息
   */
  public getFMP(): TypeMaxElement {
    this.observer.disconnect(); // 停止监听
    const maxObj = {
      score: -1,  //最高分
      elements: [],   // 首屏元素
      ts: 0   // DOM变化时的时间戳
    };
      // 遍历DOM数组，并计算它们的得分
    this.cacheTrees.forEach((tree): void => {
      let score = 0;
      // 首屏内的元素
      let firstScreenElements = [];
      tree.children.forEach((node): void => {
        // 只记录元素
        if(node.nodeType !== 1 || IGNORE_TAG_SET.indexOf(node.tagName) >= 0) {
          return;
        }
        const { height } = node.getBoundingClientRect();
        // 过滤高度为 0，在首屏外的元素
        if(height > 0 && !this.isOutScreen(node)) {
          firstScreenElements.push(node);
        }
      });
      // 若首屏中的一个元素是另一个元素的后代，则过滤掉该祖先元素
      firstScreenElements = firstScreenElements.filter((node): boolean => {
        // 只要找到一次包含关系，就过滤掉
        const notFind = !firstScreenElements.some((item ): boolean=> node !== item && node.contains(item));
        // 计算总得分
        if(notFind) {
          score += this.caculateScore(node);
        }
        return notFind;
      });
      // 得到最高值
      if(maxObj.score < score) {
        maxObj.score = score;
        maxObj.elements = firstScreenElements;
        maxObj.ts = tree.ts;
      }
    });
    // 在得分最高的首屏元素中，找出最长的耗时
    return this.getElementMaxTimeConsuming(maxObj.elements, maxObj.ts);
  }
  /**
   * 计算元素分值
   */
  private caculateScore(node: Element): number {
    const { width, height } = node.getBoundingClientRect();
    let weight = TAG_WEIGHT_MAP[node.tagName] || 1;
    if (
      weight === 1 &&
        window.getComputedStyle(node)['background-image'] && // 读取CSS样式中的背景图属性
        window.getComputedStyle(node)['background-image'] !== 'initial'
    ) {
      weight = TAG_WEIGHT_MAP['IMG']; //将有图片背景的普通元素 权重设置为img
    }
    return width * height * weight;
  }
  /**
   * 读取首屏内元素的最长耗时
   */
  private getElementMaxTimeConsuming(elements: Element[], observerTime: number): TypeMaxElement {
    // 记录静态资源的响应结束时间
    const resources = {};
    // 遍历静态资源的时间信息
    performance.getEntries().forEach((item: PerformanceResourceTiming): void => {
      resources[item.name] = item.responseEnd;
    });
    const maxObj: TypeMaxElement = {
      ts: observerTime,
      element: ''
    };
    elements.forEach((node: Element): void => {
      const stage = node.getAttribute(FMP_ATTRIBUTE);
      let ts = stage ? this.cacheTrees[stage].ts : 0;  // 从缓存中读取时间
      switch(node.tagName) {
        case 'IMG':
          ts = resources[(node as HTMLImageElement).src];
          break;
        case 'VIDEO':
          ts = resources[(node as HTMLVideoElement).src];
          !ts && (ts = resources[(node as HTMLVideoElement).poster]);    // 读取封面
          break;
        default: {
          // 读取背景图地址
          const match = window.getComputedStyle(node)['background-image'].match(/url\(\"(.*?)\"\)/);
          if(!match) break;
          let src: string;
          // 判断是否包含协议
          if (match && match[1]) {
            src = match[1];
          }
          if (src.indexOf('http') == -1) {
            src = location.protocol + match[1];
          }
          ts = resources[src];
          break;
        }
          
      }
      // console.log(node, ts)
      if(ts > maxObj.ts) {
        maxObj.ts = ts;
        maxObj.element = node;
      }
    });
    return maxObj;
  }
}
export default FMP;

