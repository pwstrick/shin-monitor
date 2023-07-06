/*!
 * shin-monitor 1.4.2 (https://github.com/pwstrick/shin-monitor)
 * API https://github.com/pwstrick/shin-monitor/blob/master/doc/api.md
 * Copyright 2017-2023 pwstrick. All Rights Reserved
 * Licensed under MIT (https://github.com/pwstrick/shin-monitor/blob/master/LICENSE)
 */

'use strict';

/*
 * @Author: strick
 * @LastEditors: strick
 * @Date: 2023-01-12 11:19:52
 * @LastEditTime: 2023-01-14 18:57:32
 * @Description: 工具函数，与业务解耦
 * @FilePath: /web/shin-monitor/src/utils.ts
 */
var CONSTANT = {
    // 定义行为类型
    ACTION_ERROR: 'error',
    ACTION_AJAX: 'ajax',
    ACTION_EVENT: 'event',
    ACTION_PRINT: 'console',
    ACTION_REDIRECT: 'redirect',
    // 定义的错误类型码
    ERROR_RUNTIME: 'runtime',
    ERROR_SCRIPT: 'script',
    ERROR_STYLE: 'style',
    ERROR_IMAGE: 'image',
    ERROR_AUDIO: 'audio',
    ERROR_VIDEO: 'video',
    ERROR_PROMISE: 'promise',
    ERROR_VUE: 'vue',
    ERROR_REACT: 'react',
    ERROR_CRASH: 'crash',
    LOAD_ERROR_TYPE: {
        SCRIPT: 'script',
        LINK: 'style',
        IMG: 'image',
        AUDIO: 'audio',
    }
};
/**
 * 均匀获得两个数字之间的随机数，两个数值倒过来也能获得指定区间的数字
 * @param max 最大值
 * @param min 最小值
 */
function randomNum(max, min) {
    // 向下取整
    return Math.floor(Math.random() * (max - min + 1) + min);
}
/**
 * 四舍五入
 * @param number 数值
 * @param decimal 要舍去的位数
 */
function rounded(number, decimal) {
    return parseFloat(number.toFixed(decimal));
}
/**
 * 计算KB值
 * http://stackoverflow.com/questions/1248302/javascript-object-size
 * @param bytes 字节数
 */
function kb(bytes) {
    return rounded(bytes / 1024, 2); // 四舍五入 2 位小数
}
/**
 * 去除双引号
 * @param html
 */
function removeQuote(html) {
    return html.replace(/"/g, '');
}
/**
 * 得到当前时间戳，单位毫秒
 * Date.now() 会受系统程序执行阻塞的影响
 * performance.now() 的时间是以恒定速率递增的，不受系统时间的影响（系统时间可被人为或软件调整）
 */
function getNowTimestamp() {
    return performance.now();
}

var Http = /** @class */ (function () {
    function Http(params) {
        this.params = params;
    }
    /**
     * 身份标识
     */
    Http.prototype.getIdentity = function () {
        var key = 'shin-monitor-identity';
        // 页面级的缓存而非全站缓存
        var identity = sessionStorage.getItem(key);
        if (!identity) {
            // 生成标识
            identity = Number(Math.random().toString().substring(3, 6) + Date.now()).toString(36);
            var value = this.params.identity.value;
            // 与自定义的身份字段合并，自定义字段在前，便于使用 ES 的前缀查询
            value && (identity = value + '-' + identity);
            sessionStorage.setItem(key, identity);
        }
        return identity;
    };
    /**
     * 组装监控变量
     * https://github.com/appsignal/appsignal-frontend-monitoring
     */
    Http.prototype.paramify = function (obj) {
        obj.author = this.params.author;
        obj.token = this.params.token;
        obj.subdir = this.params.subdir;
        obj.identity = this.getIdentity();
        obj.referer = location.href; // 来源地址，即当前页面地址
        // return encodeURIComponent(JSON.stringify(obj));
        return JSON.stringify(obj);
    };
    /**
     * 推送监控信息
     * 改成POST请求
     */
    Http.prototype.send = function (data, callback) {
        // const ts = new Date().getTime().toString();
        // const img = new Image(0, 0);
        // img.src = shin.param.src + "?m=" + _paramify(data) + "&ts=" + ts;
        var m = this.paramify(data);
        // 大于8000的长度，就不在上报，废弃掉
        if (m.length >= 8000) {
            return;
        }
        var body = { m: m };
        callback && callback(data, body); // 自定义的参数处理回调
        // 如果修改headers，就会多一次OPTIONS预检请求
        fetch(this.params.src, {
            method: 'POST',
            // headers: {
            //   'Content-Type': 'application/json',
            // },
            body: JSON.stringify(body),
        });
    };
    /**
     * 组装性能变量
     */
    Http.prototype.paramifyPerformance = function (obj) {
        obj.token = this.params.token;
        obj.pkey = this.params.pkey;
        obj.identity = this.getIdentity();
        obj.referer = location.href; // 来源地址
        // 静态资源列表
        var resources = performance.getEntriesByType('resource');
        var newResources = [];
        resources && resources.forEach(function (value) {
            // 过滤 fetch 请求
            if (value.initiatorType === 'fetch')
                return;
            // 只存储 1 分钟内的资源
            if (value.startTime > 60000)
                return;
            newResources.push({
                name: value.name,
                duration: rounded(value.duration),
                startTime: rounded(value.startTime),
            });
        });
        obj.resource = newResources;
        return JSON.stringify(obj);
    };
    /**
     * 发送性能数据
     */
    Http.prototype.sendPerformance = function (data) {
        // 如果传了数据就使用该数据，否则读取性能参数，并格式化为字符串
        var str = this.paramifyPerformance(data);
        this.rate = randomNum(10, 1); // 选取1~10之间的整数
        // 命中采样
        if (this.params.rate >= this.rate && this.params.pkey) {
            // 开启了录像得用 fetch 传输
            if (this.params.record.isSendInPerformance) {
                fetch(this.params.psrc, {
                    method: 'POST',
                    body: str,
                });
                return;
            }
            // 普通性能监控，就只传输 64KB 以内的数据
            navigator.sendBeacon(this.params.psrc, str);
        }
    };
    /**
     * 组装性能变量
     */
    Http.prototype.paramifyBehavior = function (obj) {
        obj.pkey = this.params.pkey;
        obj.identity = this.getIdentity();
        obj.referer = location.href; // 来源地址
        return JSON.stringify(obj);
    };
    /**
     * 发送用户行为数据
     */
    Http.prototype.sendBehavior = function (data) {
        // 避免不必要的请求，只有当性能参数发送后，才可以将相应的行为数据发送到服务器中
        if (this.rate && this.params.rate >= this.rate) {
            var str = this.paramifyBehavior(data);
            navigator.sendBeacon(this.params.psrc, str);
        }
    };
    return Http;
}());

var ErrorMonitor = /** @class */ (function () {
    function ErrorMonitor(params) {
        this.params = params;
        this.recordEventsMatrix = [[]];
        this.http = new Http(params);
    }
    /**
     * 注册 error 事件，监控脚本异常
     * https://github.com/BetterJS/badjs-report
     */
    ErrorMonitor.prototype.registerErrorEvent = function () {
        var _this = this;
        var isFilterErrorFunc = this.params.error.isFilterErrorFunc;
        window.addEventListener('error', function (event) {
            var errorTarget = event.target;
            // 过滤掉与业务无关或无意义的错误
            if (isFilterErrorFunc && isFilterErrorFunc(event)) {
                return;
            }
            // 过滤 target 为 window 的异常
            if (errorTarget !== window
                && errorTarget.nodeName
                && CONSTANT.LOAD_ERROR_TYPE[errorTarget.nodeName.toUpperCase()]) {
                _this.handleError(_this.formatLoadError(errorTarget));
            }
            else {
                // 过滤无效错误
                event.message && _this.handleError(_this.formatRuntimerError(event.message, event.filename, event.lineno, event.colno));
            }
        }, true); // 捕获
    };
    /**
     * 注册 unhandledrejection 事件，监控未处理的Promise错误
     * 当 Promise 被 reject 且没有 reject 处理器时触发
     */
    ErrorMonitor.prototype.registerUnhandledrejectionEvent = function () {
        var _this = this;
        var isFilterPromiseFunc = this.params.error.isFilterPromiseFunc;
        window.addEventListener('unhandledrejection', function (event) {
            // 处理响应数据，只抽取重要信息
            var response = event.reason.response;
            // 若无响应，则不监控
            if (!response || !response.request) {
                return;
            }
            var desc = response.request.ajax;
            desc.status = event.reason.status || response.status;
            // 过滤掉与业务无关或无意义的错误
            if (isFilterPromiseFunc && isFilterPromiseFunc(desc)) {
                return;
            }
            _this.handleError({
                type: CONSTANT.ERROR_PROMISE,
                desc: desc,
            });
        }, true);
    };
    /**
     * 录制用户行为
     */
    ErrorMonitor.prototype.recordPage = function () {
        var _this = this;
        var _a = this.params.record, isOpen = _a.isOpen, src = _a.src;
        if (!isOpen) {
            return;
        }
        var script = document.createElement('script');
        script.src = src;
        // 开始监控页面行为
        script.onload = function () {
            rrweb.record({
                emit: function (event, isCheckout) {
                    // isCheckout 是一个标识，告诉你重新制作了快照
                    if (isCheckout) {
                        // 最多保留 3 段行为记录
                        var deleteCount = _this.recordEventsMatrix.length - 2;
                        deleteCount > 0 && _this.recordEventsMatrix.splice(0, deleteCount);
                        _this.recordEventsMatrix.push([]);
                    }
                    var lastEvents = _this.recordEventsMatrix[_this.recordEventsMatrix.length - 1];
                    lastEvents.push(event);
                },
                checkoutEveryNms: 20 * 1000,
            });
        };
        setTimeout(function () {
            document.head && document.head.appendChild(script);
        }, 0);
    };
    /**
     * 读取最近 40 秒的行为记录
     */
    ErrorMonitor.prototype.getRecentRecord = function () {
        var len = this.recordEventsMatrix.length;
        // if(len === 0) return '';
        var events;
        if (len >= 2) {
            events = this.recordEventsMatrix[len - 2].concat(this.recordEventsMatrix[len - 1]);
        }
        else {
            events = this.recordEventsMatrix[len - 1];
        }
        // 返回值有可能是 []，因为此时录像脚本可能还没加载完成
        return JSON.stringify(events);
    };
    /**
     * 奔溃时的参数设置
     */
    ErrorMonitor.prototype.handleCrashParams = function (data, body) {
        // 当前是一条错误日志，并且描述的是奔溃
        if (data.category === CONSTANT.ACTION_ERROR && data.data.type === CONSTANT.ERROR_CRASH) {
            // 读取行为记录
            var record = this.getRecentRecord();
            // 只有当有内容时，才发送行为记录
            record.length > 0 && (body.r = record);
        }
    };
    /**
     * 白屏计算规则
     */
    ErrorMonitor.prototype.isWhiteScreen = function () {
        var visibles = [];
        var nodes = []; //遍历到的节点的关键信息，用于查明白屏原因
        // 深度优先遍历子元素
        var dfs = function (node) {
            var tagName = node.tagName.toLowerCase();
            var rect = node.getBoundingClientRect();
            // 选取节点的属性作记录
            var attrs = {
                id: node.id,
                tag: tagName,
                className: node.className,
                display: node.style.display,
                height: rect.height
            };
            var src = node.src;
            if (src) {
                attrs.src = src; // 记录图像的地址
            }
            var href = node.href;
            if (href) {
                attrs.href = href; // 记录链接的地址
            }
            nodes.push(attrs);
            // 若已找到一个有高度的元素，则结束搜索
            if (visibles.length > 0)
                return;
            // 若元素隐藏，则结束搜索
            if (node.style.display === 'none')
                return;
            // 若元素有高度并且不是 body 元素，则结束搜索
            if (rect.height > 0 && tagName !== 'body') {
                visibles.push(node);
                return;
            }
            node.children && [].slice.call(node.children).forEach(function (child) {
                var tagName = child.tagName.toLowerCase();
                // 过滤脚本和样式元素
                if (tagName === 'script' || tagName === 'link')
                    return;
                dfs(child);
            });
        };
        dfs(document.body);
        return {
            visibles: visibles,
            nodes: nodes
        };
    };
    /**
     * 上报错误
     * @param errorLog
     */
    ErrorMonitor.prototype.handleError = function (errorLog) {
        // 推送版本号
        this.params.version && (errorLog.version = this.params.version);
        this.http.send({
            category: CONSTANT.ACTION_ERROR,
            data: errorLog
        }, this.handleCrashParams.bind(this));
    };
    /**
     * 监控页面奔溃情况
     */
    ErrorMonitor.prototype.monitorCrash = function () {
        var _this = this;
        var _a = this.params.crash, isOpen = _a.isOpen, validateFunc = _a.validateFunc;
        if (!isOpen) {
            return;
        }
        var HEARTBEAT_INTERVAL = 5 * 1000; // 每五秒发一次心跳
        var crashHeartbeat = function () {
            // 是否自定义了规则
            if (validateFunc) {
                var result = validateFunc();
                // 符合自定义的奔溃规则
                if (result && !result.success) {
                    _this.handleError({
                        type: CONSTANT.ERROR_CRASH,
                        desc: {
                            prompt: result.prompt,
                            url: location.href,
                        },
                    });
                    // 关闭定时器
                    clearInterval(timer);
                }
            }
            else {
                // 兜底白屏算法，可根据自身业务定义
                var whiteObj = _this.isWhiteScreen();
                if (whiteObj.visibles.length > 0) {
                    return;
                }
                // 查询第一个div
                var currentDiv = document.querySelector('div');
                // 增加 html 字段是为了验证是否出现了误报
                _this.handleError({
                    type: CONSTANT.ERROR_CRASH,
                    desc: {
                        prompt: '页面没有高度',
                        url: location.href,
                        html: currentDiv ? removeQuote(currentDiv.innerHTML) : '',
                        fontSize: document.documentElement.style.fontSize,
                        nodes: whiteObj.nodes
                    },
                });
                clearInterval(timer);
            }
        };
        var timer = setInterval(crashHeartbeat, HEARTBEAT_INTERVAL);
        crashHeartbeat(); // 立即执行一次
        // 5分钟后自动取消定时器
        setTimeout(function () {
            // 关闭定时器
            clearInterval(timer);
        }, 1000 * 300);
    };
    /**
     * 生成 load 错误日志
     * 需要加载资源的元素
     * @param  {Object} errorTarget
     */
    ErrorMonitor.prototype.formatLoadError = function (errorTarget) {
        var desc = {
            url: errorTarget.baseURI,
            src: errorTarget.src || errorTarget.href
        };
        /**
         * 对于媒体资源 errorTarget 会包含 error 属性，其 code 包含 4 个值
         * MEDIA_ERR_ABORTED：表示由于用户取消操作而引发的错误（数值为 1）
         * MEDIA_ERR_NETWORK：表示由于网络错误而引发的错误（数值为 2）
         * MEDIA_ERR_DECODE：表示由于解码错误而引发的错误（数值为 3）
         * MEDIA_ERR_SRC_NOT_SUPPORTED：表示由于不支持媒体资源格式而引发的错误（数值为 4）
         */
        if (errorTarget.error) {
            var MEDIA_ERR = {
                1: '用户取消操作',
                2: '网络错误',
                3: '解码错误',
                4: '不支持的媒体资源格式'
            };
            var code = errorTarget.error.code;
            code && (desc.message = MEDIA_ERR[code]);
        }
        return {
            type: CONSTANT.LOAD_ERROR_TYPE[errorTarget.nodeName.toUpperCase()],
            desc: desc
            // stack: "no stack"
        };
    };
    /**
     * 生成 runtime 错误日志
     * @param {String}  message      错误信息
     * @param {String}  filename     出错文件的URL
     * @param {Long}    lineno       出错代码的行号
     * @param {Long}    colno        出错代码的列号
     * @param {Object}  error        错误信息Object
     * https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Error
     */
    ErrorMonitor.prototype.formatRuntimerError = function (message, filename, lineno, colno) {
        return {
            type: CONSTANT.ERROR_RUNTIME,
            lineno: lineno,
            colno: colno,
            desc: {
                prompt: (message + ' at ' + filename + ':' + lineno + ':' + colno),
                url: location.href
            },
        };
    };
    /**
     * 处理 React 错误（对外）
     */
    ErrorMonitor.prototype.reactError = function (err, info) {
        this.handleError({
            type: CONSTANT.ERROR_REACT,
            desc: {
                prompt: err.toString(),
                url: location.href
            },
            stack: info.componentStack,
        });
    };
    /**
     * Vue.js 错误劫持（对外）
     */
    ErrorMonitor.prototype.vueError = function (vue) {
        var _this = this;
        var _vueConfigErrorHandler = vue.config.errorHandler;
        vue.config.errorHandler = function (err, vm, info) {
            _this.handleError({
                type: CONSTANT.ERROR_VUE,
                desc: {
                    prompt: err.toString(),
                    url: location.href
                },
                stack: err.stack,
            });
            // 控制台打印错误
            if (typeof console !== 'undefined' && typeof console.error !== 'undefined') {
                console.error(err);
            }
            // 执行原始的错误处理程序
            if (typeof _vueConfigErrorHandler === 'function') {
                _vueConfigErrorHandler.call(err, vm, info);
            }
        };
    };
    /**
     * 在 load 事件中，监控奔溃
     * 该事件不可取消，也不会冒泡
     */
    ErrorMonitor.prototype.registerLoadEvent = function () {
        var _this = this;
        window.addEventListener('load', function () {
            /**
             * 监控页面奔溃情况
             * 原先是在 DOMContentLoaded 事件内触发，经测试发现，当因为脚本错误出现白屏时，两个事件的触发时机会很接近
             * 在线上监控时发现会有一些误报，HTML是有内容的，那很可能是 DOMContentLoaded 触发时，页面内容还没渲染好
             */
            setTimeout(function () {
                _this.monitorCrash();
            }, 1000);
        });
    };
    return ErrorMonitor;
}());

var ActionMonitor = /** @class */ (function () {
    function ActionMonitor(params) {
        this.params = params;
        this.http = new Http(params);
        this.refer = location.href;
    }
    /**
     * 递归的将数字四舍五入小数点后两位
     */
    ActionMonitor.prototype.handleNumber = function (obj) {
        var type = typeof obj;
        if (type === 'object' && type !== null) {
            for (var key in obj) {
                // 当key是只读属性时，就不能直接赋值了
                obj[key] = this.handleNumber(obj[key]);
            }
        }
        if (type === 'number') {
            return rounded(obj, 2);
        }
        return obj;
    };
    /**
     * 在将数据整理好后，发送到后台
     */
    ActionMonitor.prototype.handleAction = function (type, data) {
        this.http.send({ category: type, data: this.handleNumber(data) });
    };
    /**
     * 全局监听打印
     * 重置 console.log 的动作
     */
    ActionMonitor.prototype.injectConsole = function () {
        var _this = this;
        var _a = this.params.console, isOpen = _a.isOpen, isFilterLogFunc = _a.isFilterLogFunc;
        isOpen && ['log', 'error'].forEach(function (level) {
            var _oldConsole = console[level];
            console[level] = function () {
                var params = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    params[_i] = arguments[_i];
                }
                _oldConsole.apply(_this, params); // 执行原先的 console 方法
                var replaceParams = [];
                var _loop_1 = function (value) {
                    // 不能使用 typeof 读取实例类型
                    if (Object.prototype.toString.call(value) === '[object Error]') {
                        var errorObj_1 = {};
                        // 遍历错误实例的属性
                        Object.getOwnPropertyNames(value).forEach(function (prop) {
                            errorObj_1[prop] = value[prop];
                        });
                        replaceParams.push(errorObj_1);
                        return "continue";
                    }
                    replaceParams.push(value);
                };
                // 对 Error 实例做特殊处理
                for (var _a = 0, params_1 = params; _a < params_1.length; _a++) {
                    var value = params_1[_a];
                    _loop_1(value);
                }
                var seen = [];
                // 避免循环引用
                var desc = JSON.stringify(replaceParams, function (key, value) {
                    // 对普通对象的一般处理
                    if (typeof value === 'object' && value !== null) {
                        if (seen.indexOf(value) >= 0) {
                            return;
                        }
                        seen.push(value);
                    }
                    return value;
                });
                // 过滤无意义的打印信息
                if (isFilterLogFunc && isFilterLogFunc(desc)) {
                    return;
                }
                _this.handleAction(CONSTANT.ACTION_PRINT, {
                    type: level,
                    desc: desc,
                });
            };
        });
    };
    /**
     * 发送路由信息
     */
    ActionMonitor.prototype.sendRouterInfo = function () {
        var href = location.href;
        this.handleAction(CONSTANT.ACTION_REDIRECT, {
            refer: this.refer,
            current: href,
        });
        this.refer = href;
    };
    /**
     * 监听路由跳转
     */
    ActionMonitor.prototype.injectRouter = function () {
        var _this = this;
        /**
         * 全局监听跳转
         * 点击后退、前进按钮或者调用 history.back()、history.forward()、history.go() 方法才会触发 popstate 事件
         * 点击 <a href=/xx/yy#anchor>hash</a> 按钮也会触发 popstate 事件
         */
        var _onPopState = window.onpopstate;
        window.onpopstate = function (args) {
            _this.sendRouterInfo();
            _onPopState && _onPopState.apply(_this, args);
        };
        /**
         * 监听 pushState() 和 replaceState() 两个方法
         */
        var bindEventListener = function (type) {
            var historyEvent = history[type];
            return function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                // 触发 history 的原始事件，apply 的第一个参数若不是 history，就会报错
                var newEvent = historyEvent.apply(history, args);
                _this.sendRouterInfo();
                return newEvent;
            };
        };
        history.pushState = bindEventListener('pushState');
        history.replaceState = bindEventListener('replaceState');
    };
    /**
     * 网络状态
     * https://github.com/daniellmb/downlinkMax
     * http://stackoverflow.com/questions/5529718/how-to-detect-internet-speed-in-javascript
     */
    ActionMonitor.prototype.network = function () {
        var navigator = window.navigator;
        // 2.2--4.3安卓机才可使用
        var connection = navigator.connection;
        var effectiveType = connection && connection.effectiveType;
        if (effectiveType) {
            return { bandwidth: 0, type: effectiveType.toUpperCase() };
        }
        var types = 'Unknown Ethernet WIFI 2G 3G 4G'.split(' ');
        var info = { bandwidth: 0, type: '' };
        if (connection && connection.type) {
            info.type = types[connection.type];
        }
        return info;
    };
    /**
     * 全局监听事件
     */
    ActionMonitor.prototype.handleEvent = function (eventType, detect) {
        var _this = this;
        return function (e) {
            if (!detect(e)) {
                return;
            }
            _this.handleAction(CONSTANT.ACTION_EVENT, {
                type: eventType,
                desc: removeQuote(e.target.outerHTML),
            });
        };
    };
    /**
     * 监听点击事件
     * window.onclick 支持 IE9+，若要支持 IE8 浏览器，可以改成 document.onclick
     */
    ActionMonitor.prototype.injectEvent = function () {
        var _this = this;
        window.addEventListener('click', this.handleEvent('click', function (e) {
            var node = e.target;
            var nodeName = node.nodeName.toLowerCase();
            // 若是 body 元素，则不记录
            if (nodeName === 'body') {
                return false;
            }
            var isFilterClickFunc = _this.params.event.isFilterClickFunc;
            // 过滤不需要记录点击事件的元素
            if (isFilterClickFunc && isFilterClickFunc(node))
                return false;
            return true;
        }), false);
    };
    /**
     * 监听 Ajax
     * https://github.com/HubSpot/pace
     */
    ActionMonitor.prototype.injectAjax = function () {
        var _this = this;
        var isFilterSendFunc = this.params.ajax.isFilterSendFunc;
        var _XMLHttpRequest = window.XMLHttpRequest; // 保存原生的XMLHttpRequest
        // 覆盖XMLHttpRequest
        window.XMLHttpRequest = function () {
            var req = new _XMLHttpRequest(); // 调用原生的XMLHttpRequest
            monitorXHR(req); // 埋入我们的间谍
            return req;
        };
        var monitorXHR = function (req) {
            req.ajax = {};
            var self = _this;
            var start; //开始时间
            req.addEventListener('readystatechange', function () {
                if (this.readyState == 4) {
                    var responseType = req.responseType;
                    // 只上报文本和JSON格式的响应数据
                    if (responseType && (responseType != 'text' && responseType != 'json')) {
                        return;
                    }
                    var responseText = void 0; //响应内容
                    var response = void 0; // 响应内容（对象或字符串）
                    try {
                        if (responseType === 'text') {
                            responseText = req.responseText; // 响应类型是 text，就读取 responseText 属性
                            response = req.responseText;
                        }
                        else {
                            responseText = JSON.stringify(req.response); // 响应类型是 json，就读取 response 属性
                            response = req.response;
                        }
                    }
                    catch (e) {
                        responseText = '';
                        response = {};
                    }
                    var end = getNowTimestamp(); // 结束时间
                    req.ajax.status = req.status; // 状态码
                    // 请求成功
                    if ((req.status >= 200 && req.status < 300) || req.status == 304) {
                        req.ajax.endBytes = kb(responseText.length * 2) + "KB"; // KB
                    }
                    else {
                        // 请求失败
                        req.ajax.endBytes = 0;
                    }
                    // 为监控的响应头添加 req-id 字段，为了与云端的接口日志进行关联
                    var reqId = req.getResponseHeader('req-id');
                    if (reqId) {
                        req.ajax.header ? (req.ajax.header['req-id'] = reqId) : (req.ajax.header = { 'req-id': reqId });
                    }
                    req.ajax.interval = rounded(end - start, 2) + "ms"; // 单位毫秒
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
            var _open = req.open;
            req.open = function (type, url) {
                req.ajax.type = type; // 埋点
                req.ajax.url = url; // 埋点
                return _open.apply(req, arguments);
            };
            // 设置请求首部
            var _setRequestHeader = req.setRequestHeader;
            req.setRequestHeader = function (header, value) {
                var _a;
                // JWT 跨域认证解决方案会在头中增加 Authorization 字段 
                if (header === 'Authorization') { // 通过 Authorization 可以反查登录账号
                    req.ajax.header = (_a = {}, _a[header] = value, _a);
                }
                return _setRequestHeader.apply(req, arguments);
            };
            // 发送请求
            var _send = req.send;
            req.send = function (data) {
                start = getNowTimestamp(); // 埋点
                if (data) {
                    req.ajax.startBytes = kb(JSON.stringify(data).length * 2) + "KB";
                    req.ajax.data = data; // 传递的参数
                }
                return _send.apply(req, arguments);
            };
        };
    };
    return ActionMonitor;
}());

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

/*
 * @Author: strick
 * @LastEditors: strick
 * @Date: 2023-01-12 10:17:17
 * @LastEditTime: 2023-01-25 13:52:50
 * @Description: FMP的计算
 * @FilePath: /web/shin-monitor/src/lib/fmp.ts
 */
var IGNORE_TAG_SET = ['SCRIPT', 'STYLE', 'META', 'HEAD', 'LINK'];
var TAG_WEIGHT_MAP = {
    SVG: 2,
    IMG: 2,
    CANVAS: 4,
    OBJECT: 4,
    EMBED: 4,
    VIDEO: 4
};
var WW = window.innerWidth;
var WH = window.innerHeight;
var FMP_ATTRIBUTE = '_ts';
var FMP = /** @class */ (function () {
    function FMP() {
        var _this = this;
        this.cacheTrees = []; // 缓存每次更新的DOM元素
        this.callbackCount = 0; // DOM 变化的计数
        // 开始监控DOM的变化
        this.observer = new MutationObserver(function () {
            var mutationsList = [];
            // 从 body 元素开始遍历
            document.body && _this.doTag(document.body, _this.callbackCount++, mutationsList);
            _this.cacheTrees.push({
                ts: performance.now(),
                children: mutationsList
            });
            // console.log("mutationsList", performance.now(), mutationsList);
        });
        this.observer.observe(document, {
            childList: true,
            subtree: true // 监控后代元素
        });
    }
    /**
     * 为 HTML 元素打标记，记录是哪一次的 DOM 更新
     */
    FMP.prototype.doTag = function (target, callbackCount, mutationsList) {
        var childrenLen = target.children ? target.children.length : 0;
        // 结束递归
        if (childrenLen === 0)
            return;
        for (var children = target.children, i = childrenLen - 1; i >= 0; i--) {
            var child = children[i];
            var tagName = child.tagName;
            if (child.getAttribute(FMP_ATTRIBUTE) === null &&
                IGNORE_TAG_SET.indexOf(tagName) === -1 // 过滤掉忽略的元素
            ) {
                child.setAttribute(FMP_ATTRIBUTE, callbackCount.toString());
                mutationsList.push(child); // 记录更新的元素
            }
            // 继续递归
            this.doTag(child, callbackCount, mutationsList);
        }
    };
    /**
     * 是否超出屏幕外
     */
    FMP.prototype.isOutScreen = function (node) {
        var _a = node.getBoundingClientRect(), left = _a.left, top = _a.top;
        return WH < top || WW < left;
    };
    /**
     * 读取 FMP 信息
     */
    FMP.prototype.getFMP = function () {
        var _this = this;
        this.observer.disconnect(); // 停止监听
        var maxObj = {
            score: -1,
            elements: [],
            ts: 0 // DOM变化时的时间戳
        };
        // 遍历DOM数组，并计算它们的得分
        this.cacheTrees.forEach(function (tree) {
            var score = 0;
            // 首屏内的元素
            var firstScreenElements = [];
            tree.children.forEach(function (node) {
                // 只记录元素
                if (node.nodeType !== 1 || IGNORE_TAG_SET.indexOf(node.tagName) >= 0) {
                    return;
                }
                var height = node.getBoundingClientRect().height;
                // 过滤高度为 0，在首屏外的元素
                if (height > 0 && !_this.isOutScreen(node)) {
                    firstScreenElements.push(node);
                }
            });
            // 若首屏中的一个元素是另一个元素的后代，则过滤掉该祖先元素
            firstScreenElements = firstScreenElements.filter(function (node) {
                // 只要找到一次包含关系，就过滤掉
                var notFind = !firstScreenElements.some(function (item) { return node !== item && node.contains(item); });
                // 计算总得分
                if (notFind) {
                    score += _this.caculateScore(node);
                }
                return notFind;
            });
            // 得到最高值
            if (maxObj.score < score) {
                maxObj.score = score;
                maxObj.elements = firstScreenElements;
                maxObj.ts = tree.ts;
            }
        });
        // 在得分最高的首屏元素中，找出最长的耗时
        return this.getElementMaxTimeConsuming(maxObj.elements, maxObj.ts);
    };
    /**
     * 计算元素分值
     */
    FMP.prototype.caculateScore = function (node) {
        var _a = node.getBoundingClientRect(), width = _a.width, height = _a.height;
        var weight = TAG_WEIGHT_MAP[node.tagName] || 1;
        if (weight === 1 &&
            window.getComputedStyle(node)['background-image'] && // 读取CSS样式中的背景图属性
            window.getComputedStyle(node)['background-image'] !== 'initial') {
            weight = TAG_WEIGHT_MAP['IMG']; //将有图片背景的普通元素 权重设置为img
        }
        return width * height * weight;
    };
    /**
     * 读取首屏内元素的最长耗时
     */
    FMP.prototype.getElementMaxTimeConsuming = function (elements, observerTime) {
        var _this = this;
        // 记录静态资源的响应结束时间
        var resources = {};
        // 遍历静态资源的时间信息
        performance.getEntries().forEach(function (item) {
            resources[item.name] = item.responseEnd;
        });
        var maxObj = {
            ts: observerTime,
            element: ''
        };
        elements.forEach(function (node) {
            var stage = node.getAttribute(FMP_ATTRIBUTE);
            var ts = stage ? _this.cacheTrees[stage].ts : 0; // 从缓存中读取时间
            switch (node.tagName) {
                case 'IMG':
                    ts = resources[node.src];
                    break;
                case 'VIDEO':
                    ts = resources[node.src];
                    !ts && (ts = resources[node.poster]); // 读取封面
                    break;
                default: {
                    // 读取背景图地址
                    var match = window.getComputedStyle(node)['background-image'].match(/url\(\"(.*?)\"\)/);
                    if (!match)
                        break;
                    var src = void 0;
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
            if (ts > maxObj.ts) {
                maxObj.ts = ts;
                maxObj.element = node;
            }
        });
        return maxObj;
    };
    return FMP;
}());

var PerformanceMonitor = /** @class */ (function () {
    function PerformanceMonitor(params) {
        this.params = params;
        this.fmpObj = new FMP();
        this.http = new Http(params);
        this.isNeedHideEvent = true;
        this.lcp = {
            time: 0,
            url: '',
            element: '' // 参照的元素
        };
        this.fmp = {
            time: 0,
            element: ''
        };
        this.fid = 0;
        this.beginStayTime = getNowTimestamp();
    }
    /**
     * 从 performance.timing 读取的性能参数，有些值是 0
     * @param timing
     */
    PerformanceMonitor.prototype.setTimingDefaultValue = function (timing) {
        if (timing.redirectStart === 0)
            timing.redirectStart = timing.navigationStart;
        if (timing.redirectEnd === 0)
            timing.redirectEnd = timing.navigationStart;
        if (timing.loadEventStart === 0)
            timing.loadEventStart = timing.domComplete;
        if (timing.loadEventEnd === 0)
            timing.loadEventEnd = timing.loadEventStart;
    };
    /**
     * 读取 timing 对象，兼容新版和旧版
     */
    PerformanceMonitor.prototype.getTiming = function () {
        // 在 iOS 设备中，若 SDK 涉及跨域，那就需要声明 timing-allow-origin 首部，否则 PerformanceResourceTiming 中的大部分属性都是 0
        var timing = (performance.getEntriesByType('navigation')[0] || performance.timing);
        var now = 0;
        if (!timing) {
            return { now: now };
        }
        var navigationStart;
        if (timing.startTime === undefined) {
            navigationStart = timing.navigationStart;
            var cloneTiming = {};
            // 不能直接将 timing 传递进去，因为 timing 的属性都是只读的
            for (var key in timing) {
                cloneTiming[key] = timing[key];
            }
            // 消除为 0 的性能参数
            this.setTimingDefaultValue(cloneTiming);
            /**
             * 之所以老版本的用 Date，是为了防止出现负数
             * 当 performance.now 是最新版本时，数值的位数要比 timing 中的少很多
             */
            now = new Date().getTime() - navigationStart;
            return { timing: cloneTiming, navigationStart: navigationStart, now: rounded(now) };
        }
        navigationStart = timing.startTime;
        now = getNowTimestamp() - navigationStart;
        return { timing: timing, navigationStart: navigationStart, now: rounded(now) };
    };
    /**
     * 判断当前宿主环境是否支持 PerformanceObserver
     * 并且支持某个特定的类型
     */
    PerformanceMonitor.prototype.checkSupportPerformanceObserver = function (type) {
        if (!window.PerformanceObserver)
            return false;
        var types = PerformanceObserver.supportedEntryTypes;
        // 浏览器兼容判断，不存在或没有关键字
        if (!types || types.indexOf(type) === -1) {
            return false;
        }
        return true;
    };
    /**
     * 浏览器 LCP 计算
     * LCP（Largest Contentful Paint）最大内容在可视区域内变得可见的时间
     * https://developer.mozilla.org/en-US/docs/Web/API/LargestContentfulPaint
     */
    PerformanceMonitor.prototype.observerLCP = function () {
        var _this = this;
        var lcpType = 'largest-contentful-paint';
        var isSupport = this.checkSupportPerformanceObserver(lcpType);
        // 浏览器兼容判断
        if (!isSupport) {
            return;
        }
        var po = new PerformanceObserver(function (entryList) {
            var entries = entryList.getEntries();
            var lastEntry = entries[entries.length - 1];
            _this.lcp = {
                time: rounded(lastEntry.renderTime || lastEntry.loadTime),
                url: lastEntry.url,
                element: lastEntry.element ? removeQuote(lastEntry.element.outerHTML) : '' // 参照的元素
            };
        });
        // buffered 为 true 表示调用 observe() 之前的也算进来
        po.observe({ type: lcpType, buffered: true });
        // po.observe({ entryTypes: [lcpType] });
        /**
         * 当有按键或点击（包括滚动）时，就停止 LCP 的采样
         * once 参数是指事件被调用一次后就会被移除
         */
        ['keydown', 'click'].forEach(function (type) {
            window.addEventListener(type, function () {
                // 断开此观察者的连接
                po.disconnect();
            }, { once: true, capture: true });
        });
    };
    /**
     * 浏览器 FID 计算
     * FID（First Input Delay）用户第一次与页面交互到浏览器对交互作出响应的时间
     * https://developer.mozilla.org/en-US/docs/Glossary/First_input_delay
     */
    PerformanceMonitor.prototype.observerFID = function () {
        var _this = this;
        var fidType = 'first-input';
        var isSupport = this.checkSupportPerformanceObserver(fidType);
        // 浏览器兼容判断
        if (!isSupport) {
            return;
        }
        var po = new PerformanceObserver(function (entryList, obs) {
            var entries = entryList.getEntries();
            var firstInput = entries[0];
            // 测量第一个输入事件的延迟
            _this.fid = rounded(firstInput.processingStart - firstInput.startTime);
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
        po.observe({ type: fidType, buffered: true });
        // po.observe({ entryTypes: [fidType] });
    };
    /**
     * 计算 DOM 相关的数据
     */
    PerformanceMonitor.prototype.countAllElementsOnPage = function () {
        var nodes = [document.documentElement];
        // 总节点数
        var totalElementCount = 0;
        // 最大节点深度
        var maxDOMTreeDepth = 0;
        // 最大子节点数
        var maxChildrenCount = 0;
        // 逐层遍历
        while (nodes.length) {
            maxDOMTreeDepth++;
            var children = [];
            for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
                var node = nodes_1[_i];
                totalElementCount++;
                children.push.apply(children, Array.from(node.children));
                maxChildrenCount = Math.max(maxChildrenCount, node.children.length);
            }
            // nodes 是一个由 HTMLElement 组成的数组
            nodes = children;
        }
        return {
            maxDOMTreeDepth: maxDOMTreeDepth,
            maxChildrenCount: maxChildrenCount,
            totalElementCount: totalElementCount,
        };
    };
    /**
     * 请求时间统计
     * https://github.com/addyosmani/timing.js
     */
    PerformanceMonitor.prototype.getTimes = function () {
        // 出于对浏览器兼容性的考虑，仍然引入即将淘汰的 performance.timing
        var currentTiming = this.getTiming();
        var timing = currentTiming.timing;
        var domCount = this.countAllElementsOnPage();
        var api = __assign({}, domCount); // 时间单位 ms
        if (!timing) {
            return null;
        }
        var navigationStart = currentTiming.navigationStart;
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
         * 在初始 HTML 文档已完全加载和解析时触发（无需等待图像和 iframe 完成加载）
         * 紧跟在 DOMInteractive 之后。
         * https://www.dareboost.com/en/doc/website-speed-test/metrics/dom-content-loaded-dcl
         * 2023-01-18 fetchStart 替换成 navigationStart，理由 interactiveTime 相同
         */
        api.domReadyTime = timing.domContentLoadedEventEnd - navigationStart;
        /**
         * 白屏时间
         * FP（First Paint）首次渲染的时间
         */
        var paint = performance.getEntriesByType('paint');
        if (paint && timing.entryType && paint[0]) {
            api.firstPaint = paint[0].startTime - timing.fetchStart;
            api.firstPaintStart = paint[0].startTime; // 记录白屏时间点
        }
        else {
            api.firstPaint = timing.responseEnd - timing.fetchStart;
        }
        /**
         * FCP（First Contentful Paint）首次有实际内容渲染的时间
         */
        if (paint && timing.entryType && paint[1]) {
            api.firstContentfulPaint = paint[1].startTime - timing.fetchStart;
            api.firstContentfulPaintStart = paint[1].startTime; // 记录 FCP 时间点
        }
        else {
            api.firstContentfulPaint = 0;
        }
        /**
         * 解析 DOM 树结构的时间
         * DOM 中的所有脚本，包括具有 async 属性的脚本，都已执行。加载 DOM 中定义的所有页面静态资源（图像、iframe 等）
         * loadEventStart 紧跟在 domComplete 之后。在大多数情况下，这 2 个指标是相等的。
         * 在加载事件开始之前可能引入的唯一额外延迟将由 onReadyStateChange 的处理引起。
         * https://www.dareboost.com/en/doc/website-speed-test/metrics/dom-complete
         * 有可能是负数，domComplete 有可能是 0，此时文档没有完全加载
         */
        api.parseDomTime = timing.domComplete - timing.domInteractive;
        /**
         * 请求完毕至 DOM 加载耗时
         * 在加载 DOM 并执行网页的阻塞脚本时触发
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
        for (var keyName in api) {
            api[keyName] = rounded(api[keyName]);
        }
        // 读取FMP信息
        var fmp = this.fmpObj.getFMP();
        var fmpTime = rounded(fmp.ts - navigationStart);
        this.fmp = {
            // ts 是通过 performance.now() 得到的，若 navigationStart 是从 performance.timing 获取的（13 位的数字），那么就会出现负数
            time: fmpTime > 0 ? fmpTime : rounded(fmp.ts),
            element: fmp.element ? removeQuote(fmp.element.outerHTML) : ''
        };
        /**
         * 浏览器读取到的性能参数，用于排查，并保留两位小数
         */
        api.timing = {};
        for (var key in timing) {
            var timingValue = timing[key];
            var type = typeof timingValue;
            if (type === 'function') {
                continue;
            }
            api.timing[key] = timingValue;
            if (type === 'number') {
                api.timing[key] = rounded(timingValue, 2);
            }
        }
        // 取 FMP、LCP 和用户可操作时间中的最大值
        api.firstScreen = Math.max.call(undefined, this.fmp.time, this.lcp.time, api.domReadyTime);
        api.timing.lcp = this.lcp; //记录LCP对象
        api.timing.fmp = this.fmp; //记录FMP对象
        api.timing.fid = this.fid; //记录FID对象
        return api;
    };
    /**
     * 注册 laod 和页面隐藏事件
     */
    PerformanceMonitor.prototype.registerLoadAndHideEvent = function (setRecord) {
        var _this = this;
        // 发送性能数据
        var sendPerformance = function () {
            var data = _this.getTimes();
            if (_this.isNeedHideEvent && data) {
                // 只有开启了存储录像回放，才会执行 setRecord 回调
                _this.params.record.isSendInPerformance && setRecord(data);
                _this.http.sendPerformance(data);
                _this.isNeedHideEvent = false;
            }
        };
        // 发送用户行为数据
        var sendBehavior = function () {
            var behavior = {};
            behavior.duration = rounded(getNowTimestamp() - _this.beginStayTime); // 页面停留时长
            _this.http.sendBehavior(behavior);
        };
        /**
         * 在 load 事件中，上报性能参数
         * 该事件不可取消，也不会冒泡
         */
        window.addEventListener('load', function () {
            // 加定时器是避免在上报性能参数时，loadEventEnd 为 0，因为事件还没执行完毕
            setTimeout(function () {
                sendPerformance();
            }, 0);
        });
        /**
         * iOS 设备不支持 beforeunload 事件，需要使用 pagehide 事件
         * 在页面卸载之前，推送性能信息
         */
        var isIOS = !!navigator.userAgent.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/);
        var eventName = isIOS ? 'pagehide' : 'beforeunload';
        window.addEventListener(eventName, function () {
            sendPerformance();
            sendBehavior();
        }, false);
    };
    return PerformanceMonitor;
}());

/*
 * @Author: strick
 * @LastEditors: strick
 * @Date: 2023-01-12 10:17:17
 * @LastEditTime: 2023-07-04 14:40:03
 * @Description: 入口，自动初始化
 * @FilePath: /web/shin-monitor/src/index.ts
 */
/**
 * 默认属性
 */
var defaults = {
    src: '//127.0.0.1:3000/ma.gif',
    psrc: '//127.0.0.1:3000/pe.gif',
    pkey: '',
    subdir: '',
    rate: 5,
    version: '',
    author: '',
    record: {
        isOpen: true,
        isSendInPerformance: false,
        src: '//cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js' // 录像地址
    },
    error: {
        isFilterErrorFunc: null,
        isFilterPromiseFunc: null,
    },
    console: {
        isOpen: true,
        isFilterLogFunc: null,
    },
    crash: {
        isOpen: true,
        validateFunc: null,
    },
    event: {
        isFilterClickFunc: null,
    },
    ajax: {
        isFilterSendFunc: null // 在发送监控日志时需要过滤的通信
    },
    identity: {
        value: '',
        getFunc: null,
    },
};
var shin = {
    setParams: setParams
};
/**
 * 自定义参数
 * @param params
 */
function setParams(params) {
    if (!params) {
        return null;
    }
    var combination = defaults;
    // 为所有参数赋默认值
    for (var key in params) {
        var value = params[key];
        // 当参数值是对象时，需要对其属性挨个赋值
        if (typeof value === 'object') {
            for (var childKey in value) {
                combination[key][childKey] = value[childKey];
            }
        }
        else {
            combination[key] = value;
        }
    }
    // 埋入自定义的身份信息
    var getFunc = combination.identity.getFunc;
    getFunc && getFunc(combination);
    // 监控页面错误
    var error = new ErrorMonitor(combination);
    error.registerErrorEvent(); // 注册 error 事件
    error.registerUnhandledrejectionEvent(); // 注册 unhandledrejection 事件
    error.registerLoadEvent(); // 注册 load 事件
    error.recordPage(); // 是否启动录像回放
    shin.reactError = error.reactError.bind(error); // 对外提供 React 的错误处理
    shin.vueError = error.vueError.bind(error); // 对外提供 Vue 的错误处理
    // 启动性能监控
    var pe = new PerformanceMonitor(combination);
    pe.observerLCP(); // 监控 LCP
    pe.observerFID(); // 监控 FID
    var setRecord = function (data) {
        // 只对白屏时间超过 4 秒的页面进行录像存储
        if (data.firstPaint > 4000)
            data.record = error.getRecentRecord();
    };
    pe.registerLoadAndHideEvent(setRecord); // 注册 load 和页面隐藏事件
    // 为原生对象注入自定义行为
    var action = new ActionMonitor(combination);
    action.injectConsole(); // 监控打印
    action.injectRouter(); // 监听路由
    action.injectEvent(); // 监听事件
    action.injectAjax(); // 监听Ajax
    return combination;
}

module.exports = shin;
