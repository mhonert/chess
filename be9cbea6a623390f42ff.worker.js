!function(t){var r={};function e(n){if(r[n])return r[n].exports;var o=r[n]={i:n,l:!1,exports:{}};return t[n].call(o.exports,o,o.exports,e),o.l=!0,o.exports}e.m=t,e.c=r,e.d=function(t,r,n){e.o(t,r)||Object.defineProperty(t,r,{enumerable:!0,get:n})},e.r=function(t){"undefined"!==typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},e.t=function(t,r){if(1&r&&(t=e(t)),8&r)return t;if(4&r&&"object"===typeof t&&t&&t.__esModule)return t;var n=Object.create(null);if(e.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:t}),2&r&&"string"!=typeof t)for(var o in t)e.d(n,o,function(r){return t[r]}.bind(null,o));return n},e.n=function(t){var r=t&&t.__esModule?function(){return t.default}:function(){return t};return e.d(r,"a",r),r},e.o=function(t,r){return Object.prototype.hasOwnProperty.call(t,r)},e.p="/chess/",e(e.s=2)}([function(t,r,e){t.exports=e(1)},function(t,r,e){var n=function(t){"use strict";var r,e=Object.prototype,n=e.hasOwnProperty,o="function"===typeof Symbol?Symbol:{},a=o.iterator||"@@iterator",i=o.asyncIterator||"@@asyncIterator",c=o.toStringTag||"@@toStringTag";function u(t,r,e){return Object.defineProperty(t,r,{value:e,enumerable:!0,configurable:!0,writable:!0}),t[r]}try{u({},"")}catch(S){u=function(t,r,e){return t[r]=e}}function f(t,r,e,n){var o=r&&r.prototype instanceof d?r:d,a=Object.create(o.prototype),i=new L(n||[]);return a._invoke=function(t,r,e){var n=l;return function(o,a){if(n===h)throw new Error("Generator is already running");if(n===y){if("throw"===o)throw a;return M()}for(e.method=o,e.arg=a;;){var i=e.delegate;if(i){var c=E(i,e);if(c){if(c===v)continue;return c}}if("next"===e.method)e.sent=e._sent=e.arg;else if("throw"===e.method){if(n===l)throw n=y,e.arg;e.dispatchException(e.arg)}else"return"===e.method&&e.abrupt("return",e.arg);n=h;var u=s(t,r,e);if("normal"===u.type){if(n=e.done?y:p,u.arg===v)continue;return{value:u.arg,done:e.done}}"throw"===u.type&&(n=y,e.method="throw",e.arg=u.arg)}}}(t,e,i),a}function s(t,r,e){try{return{type:"normal",arg:t.call(r,e)}}catch(S){return{type:"throw",arg:S}}}t.wrap=f;var l="suspendedStart",p="suspendedYield",h="executing",y="completed",v={};function d(){}function g(){}function m(){}var w={};w[a]=function(){return this};var b=Object.getPrototypeOf,_=b&&b(b(k([])));_&&_!==e&&n.call(_,a)&&(w=_);var O=m.prototype=d.prototype=Object.create(w);function x(t){["next","throw","return"].forEach((function(r){u(t,r,(function(t){return this._invoke(r,t)}))}))}function A(t,r){function e(o,a,i,c){var u=s(t[o],t,a);if("throw"!==u.type){var f=u.arg,l=f.value;return l&&"object"===typeof l&&n.call(l,"__await")?r.resolve(l.__await).then((function(t){e("next",t,i,c)}),(function(t){e("throw",t,i,c)})):r.resolve(l).then((function(t){f.value=t,i(f)}),(function(t){return e("throw",t,i,c)}))}c(u.arg)}var o;this._invoke=function(t,n){function a(){return new r((function(r,o){e(t,n,r,o)}))}return o=o?o.then(a,a):a()}}function E(t,e){var n=t.iterator[e.method];if(n===r){if(e.delegate=null,"throw"===e.method){if(t.iterator.return&&(e.method="return",e.arg=r,E(t,e),"throw"===e.method))return v;e.method="throw",e.arg=new TypeError("The iterator does not provide a 'throw' method")}return v}var o=s(n,t.iterator,e.arg);if("throw"===o.type)return e.method="throw",e.arg=o.arg,e.delegate=null,v;var a=o.arg;return a?a.done?(e[t.resultName]=a.value,e.next=t.nextLoc,"return"!==e.method&&(e.method="next",e.arg=r),e.delegate=null,v):a:(e.method="throw",e.arg=new TypeError("iterator result is not an object"),e.delegate=null,v)}function j(t){var r={tryLoc:t[0]};1 in t&&(r.catchLoc=t[1]),2 in t&&(r.finallyLoc=t[2],r.afterLoc=t[3]),this.tryEntries.push(r)}function P(t){var r=t.completion||{};r.type="normal",delete r.arg,t.completion=r}function L(t){this.tryEntries=[{tryLoc:"root"}],t.forEach(j,this),this.reset(!0)}function k(t){if(t){var e=t[a];if(e)return e.call(t);if("function"===typeof t.next)return t;if(!isNaN(t.length)){var o=-1,i=function e(){for(;++o<t.length;)if(n.call(t,o))return e.value=t[o],e.done=!1,e;return e.value=r,e.done=!0,e};return i.next=i}}return{next:M}}function M(){return{value:r,done:!0}}return g.prototype=O.constructor=m,m.constructor=g,g.displayName=u(m,c,"GeneratorFunction"),t.isGeneratorFunction=function(t){var r="function"===typeof t&&t.constructor;return!!r&&(r===g||"GeneratorFunction"===(r.displayName||r.name))},t.mark=function(t){return Object.setPrototypeOf?Object.setPrototypeOf(t,m):(t.__proto__=m,u(t,c,"GeneratorFunction")),t.prototype=Object.create(O),t},t.awrap=function(t){return{__await:t}},x(A.prototype),A.prototype[i]=function(){return this},t.AsyncIterator=A,t.async=function(r,e,n,o,a){void 0===a&&(a=Promise);var i=new A(f(r,e,n,o),a);return t.isGeneratorFunction(e)?i:i.next().then((function(t){return t.done?t.value:i.next()}))},x(O),u(O,c,"Generator"),O[a]=function(){return this},O.toString=function(){return"[object Generator]"},t.keys=function(t){var r=[];for(var e in t)r.push(e);return r.reverse(),function e(){for(;r.length;){var n=r.pop();if(n in t)return e.value=n,e.done=!1,e}return e.done=!0,e}},t.values=k,L.prototype={constructor:L,reset:function(t){if(this.prev=0,this.next=0,this.sent=this._sent=r,this.done=!1,this.delegate=null,this.method="next",this.arg=r,this.tryEntries.forEach(P),!t)for(var e in this)"t"===e.charAt(0)&&n.call(this,e)&&!isNaN(+e.slice(1))&&(this[e]=r)},stop:function(){this.done=!0;var t=this.tryEntries[0].completion;if("throw"===t.type)throw t.arg;return this.rval},dispatchException:function(t){if(this.done)throw t;var e=this;function o(n,o){return c.type="throw",c.arg=t,e.next=n,o&&(e.method="next",e.arg=r),!!o}for(var a=this.tryEntries.length-1;a>=0;--a){var i=this.tryEntries[a],c=i.completion;if("root"===i.tryLoc)return o("end");if(i.tryLoc<=this.prev){var u=n.call(i,"catchLoc"),f=n.call(i,"finallyLoc");if(u&&f){if(this.prev<i.catchLoc)return o(i.catchLoc,!0);if(this.prev<i.finallyLoc)return o(i.finallyLoc)}else if(u){if(this.prev<i.catchLoc)return o(i.catchLoc,!0)}else{if(!f)throw new Error("try statement without catch or finally");if(this.prev<i.finallyLoc)return o(i.finallyLoc)}}}},abrupt:function(t,r){for(var e=this.tryEntries.length-1;e>=0;--e){var o=this.tryEntries[e];if(o.tryLoc<=this.prev&&n.call(o,"finallyLoc")&&this.prev<o.finallyLoc){var a=o;break}}a&&("break"===t||"continue"===t)&&a.tryLoc<=r&&r<=a.finallyLoc&&(a=null);var i=a?a.completion:{};return i.type=t,i.arg=r,a?(this.method="next",this.next=a.finallyLoc,v):this.complete(i)},complete:function(t,r){if("throw"===t.type)throw t.arg;return"break"===t.type||"continue"===t.type?this.next=t.arg:"return"===t.type?(this.rval=this.arg=t.arg,this.method="return",this.next="end"):"normal"===t.type&&r&&(this.next=r),v},finish:function(t){for(var r=this.tryEntries.length-1;r>=0;--r){var e=this.tryEntries[r];if(e.finallyLoc===t)return this.complete(e.completion,e.afterLoc),P(e),v}},catch:function(t){for(var r=this.tryEntries.length-1;r>=0;--r){var e=this.tryEntries[r];if(e.tryLoc===t){var n=e.completion;if("throw"===n.type){var o=n.arg;P(e)}return o}}throw new Error("illegal catch attempt")},delegateYield:function(t,e,n){return this.delegate={iterator:k(t),resultName:e,nextLoc:n},"next"===this.method&&(this.arg=r),v}},t}(t.exports);try{regeneratorRuntime=n}catch(o){Function("r","regeneratorRuntime = r")(n)}},function(t,r,e){"use strict";e.r(r),e.d(r,"init",(function(){return P})),e.d(r,"newGame",(function(){return k})),e.d(r,"calculateMove",(function(){return M})),e.d(r,"performMove",(function(){return S})),e.d(r,"setPosition",(function(){return U}));var n=e(0),o=e.n(n);function a(t,r,e,n,o,a,i){try{var c=t[a](i),u=c.value}catch(f){return void e(f)}c.done?r(u):Promise.resolve(u).then(n,o)}function i(t){return function(){var r=this,e=arguments;return new Promise((function(n,o){var i=t.apply(r,e);function c(t){a(i,n,o,c,u,"next",t)}function u(t){a(i,n,o,c,u,"throw",t)}c(void 0)}))}}function c(t,r,e){return r in t?Object.defineProperty(t,r,{value:e,enumerable:!0,configurable:!0,writable:!0}):t[r]=e,t}function u(t,r){var e=Object.keys(t);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(t);r&&(n=n.filter((function(r){return Object.getOwnPropertyDescriptor(t,r).enumerable}))),e.push.apply(e,n)}return e}function f(t){for(var r=1;r<arguments.length;r++){var e=null!=arguments[r]?arguments[r]:{};r%2?u(Object(e),!0).forEach((function(r){c(t,r,e[r])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(e)):u(Object(e)).forEach((function(r){Object.defineProperty(t,r,Object.getOwnPropertyDescriptor(e,r))}))}return t}var s="undefined"!==typeof BigUint64Array,l=Symbol(),p=new TextDecoder("utf-16le");function h(t,r){var e=new Uint32Array(t)[r+-4>>>2]>>>1,n=new Uint16Array(t,r,e);return e<=32?String.fromCharCode.apply(String,n):p.decode(n)}function y(t){var r={};function e(t,r){return t?h(t.buffer,r):"<yet unknown>"}var n=t.env=t.env||{};return n.abort=n.abort||function(t,o,a,i){var c=r.memory||n.memory;throw Error("abort: ".concat(e(c,t)," at ").concat(e(c,o),":").concat(a,":").concat(i))},n.trace=n.trace||function(t,o){for(var a=r.memory||n.memory,i=arguments.length,c=new Array(i>2?i-2:0),u=2;u<i;u++)c[u-2]=arguments[u];console.log("trace: ".concat(e(a,t)).concat(o?" ":"").concat(c.slice(0,o).join(", ")))},n.seed=n.seed||Date.now,t.Math=t.Math||Math,t.Date=t.Date||Date,r}var v=function(){throw Error("Operation requires compiling with --exportRuntime")};function d(t,r){var e=r.exports,n=e.memory,o=e.table,a=e.__new||v,i=e.__pin||v,c=e.__unpin||v,u=e.__collect||v,f=e.__rtti_base||-1;function l(t){var r=function(t){var r=new Uint32Array(n.buffer);if((t>>>=0)>=r[f>>>2])throw Error("invalid id: ".concat(t));return r[(f+4>>>2)+2*t]}(t);if(!(7&r))throw Error("not an array: ".concat(t,", flags=").concat(r));return r}function p(t){var r=new Uint32Array(n.buffer);if((t>>>=0)>=r[f>>>2])throw Error("invalid id: ".concat(t));return r[(f+4>>>2)+2*t+1]}function y(t){return 31-Math.clz32(t>>>6&31)}function d(t,r,e){var o=n.buffer;if(e)switch(t){case 2:return new Float32Array(o);case 3:return new Float64Array(o)}else switch(t){case 0:return new(r?Int8Array:Uint8Array)(o);case 1:return new(r?Int16Array:Uint16Array)(o);case 2:return new(r?Int32Array:Uint32Array)(o);case 3:return new(r?BigInt64Array:BigUint64Array)(o)}throw Error("unsupported align: ".concat(t))}function g(t){var r=new Uint32Array(n.buffer),e=l(r[t+-8>>>2]),o=y(e),a=4&e?t:r[t+4>>>2],i=2&e?r[t+12>>>2]:r[a+-4>>>2]>>>o;return d(o,2048&e,4096&e).subarray(a>>>=o,a+i)}function m(t,r,e){return new t(w(t,r,e))}function w(t,r,e){var o=n.buffer,a=new Uint32Array(o),i=a[e+4>>>2];return new t(o,i,a[i+-4>>>2]>>>r)}function b(r,e,n){t["__get".concat(e)]=m.bind(null,r,n),t["__get".concat(e,"View")]=w.bind(null,r,n)}return t.__new=a,t.__pin=i,t.__unpin=c,t.__collect=u,t.__newString=function(t){if(null==t)return 0;for(var r=t.length,e=a(r<<1,1),o=new Uint16Array(n.buffer),i=0,c=e>>>1;i<r;++i)o[c+i]=t.charCodeAt(i);return e},t.__getString=function(t){if(!t)return null;var r=n.buffer;if(1!==new Uint32Array(r)[t+-8>>>2])throw Error("not a string: ".concat(t));return h(r,t)},t.__newArray=function(t,r){var e,o=l(t),u=y(o),f=r.length,s=a(f<<u,4&o?t:0);if(4&o)e=s;else{i(s);var p=a(2&o?16:12,t);c(s);var h=new Uint32Array(n.buffer);h[p+0>>>2]=s,h[p+4>>>2]=s,h[p+8>>>2]=f<<u,2&o&&(h[p+12>>>2]=f),e=p}var v=d(u,2048&o,4096&o);if(16384&o)for(var g=0;g<f;++g){var m=r[g];v[(s>>>u)+g]=m}else v.set(r,s>>>u);return e},t.__getArrayView=g,t.__getArray=function(t){for(var r=g(t),e=r.length,n=new Array(e),o=0;o<e;o++)n[o]=r[o];return n},t.__getArrayBuffer=function(t){var r=n.buffer,e=new Uint32Array(r)[t+-4>>>2];return r.slice(t,t+e)},[Int8Array,Uint8Array,Uint8ClampedArray,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array].forEach((function(t){b(t,t.name,31-Math.clz32(t.BYTES_PER_ELEMENT))})),s&&[BigUint64Array,BigInt64Array].forEach((function(t){b(t,t.name.slice(3),3)})),t.__instanceof=function(t,r){var e=new Uint32Array(n.buffer),o=e[t+-8>>>2];if(o<=e[f>>>2])do{if(o==r)return!0;o=p(o)}while(o);return!1},t.memory=t.memory||n,t.table=t.table||o,x(e,t)}function g(t){return"undefined"!==typeof Response&&t instanceof Response}function m(t){return t instanceof WebAssembly.Module}function w(t){return b.apply(this,arguments)}function b(){return(b=i(o.a.mark((function t(r){var e,n,a,i,c,u=arguments;return o.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return e=u.length>1&&void 0!==u[1]?u[1]:{},t.t0=g,t.next=4,r;case 4:if(t.t1=r=t.sent,!(0,t.t0)(t.t1)){t.next=7;break}return t.abrupt("return",_(r,e));case 7:if(!m(r)){t.next=11;break}t.t2=r,t.next=14;break;case 11:return t.next=13,WebAssembly.compile(r);case 13:t.t2=t.sent;case 14:return n=t.t2,a=y(e),t.next=18,WebAssembly.instantiate(n,e);case 18:return i=t.sent,c=d(a,i),t.abrupt("return",{module:n,instance:i,exports:c});case 21:case"end":return t.stop()}}),t)})))).apply(this,arguments)}function _(t){return O.apply(this,arguments)}function O(){return(O=i(o.a.mark((function t(r){var e,n,a,i,c=arguments;return o.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:if(e=c.length>1&&void 0!==c[1]?c[1]:{},WebAssembly.instantiateStreaming){t.next=15;break}return t.t0=w,t.t1=g,t.next=6,r;case 6:if(t.t2=r=t.sent,!(0,t.t1)(t.t2)){t.next=11;break}t.t3=r.arrayBuffer(),t.next=12;break;case 11:t.t3=r;case 12:return t.t4=t.t3,t.t5=e,t.abrupt("return",(0,t.t0)(t.t4,t.t5));case 15:return n=y(e),t.next=18,WebAssembly.instantiateStreaming(r,e);case 18:return a=t.sent,i=d(n,a.instance),t.abrupt("return",f(f({},a),{},{exports:i}));case 21:case"end":return t.stop()}}),t)})))).apply(this,arguments)}function x(t){var r=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},e=t.__argumentsLength?function(r){t.__argumentsLength.value=r}:t.__setArgumentsLength||t.__setargc||function(){},n=function(n){if(!Object.prototype.hasOwnProperty.call(t,n))return"continue";for(var o=t[n],a=n.split("."),i=r;a.length>1;){var u=a.shift();Object.prototype.hasOwnProperty.call(i,u)||(i[u]={}),i=i[u]}var f=a[0],s=f.indexOf("#");if(s>=0){var p=f.substring(0,s),h=i[p];if("undefined"===typeof h||!h.prototype){var y=function t(){for(var r,e=arguments.length,n=new Array(e),o=0;o<e;o++)n[o]=arguments[o];return t.wrap((r=t.prototype).constructor.apply(r,[0].concat(n)))};y.prototype={valueOf:function(){return this[l]}},y.wrap=function(t){return Object.create(y.prototype,c({},l,{value:t,writable:!1}))},h&&Object.getOwnPropertyNames(h).forEach((function(t){return Object.defineProperty(y,t,Object.getOwnPropertyDescriptor(h,t))})),i[p]=y}if(f=f.substring(s+1),i=i[p].prototype,/^(get|set):/.test(f)){if(!Object.prototype.hasOwnProperty.call(i,f=f.substring(4))){var v=t[n.replace("set:","get:")],d=t[n.replace("get:","set:")];Object.defineProperty(i,f,{get:function(){return v(this[l])},set:function(t){d(this[l],t)},enumerable:!0})}}else"constructor"===f?(i[f]=function(){return e(arguments.length),o.apply(void 0,arguments)}).original=o:(i[f]=function(){for(var t=arguments.length,r=new Array(t),n=0;n<t;n++)r[n]=arguments[n];return e(r.length),o.apply(void 0,[this[l]].concat(r))}).original=o}else/^(get|set):/.test(f)?Object.prototype.hasOwnProperty.call(i,f=f.substring(4))||Object.defineProperty(i,f,{get:t[n.replace("set:","get:")],set:t[n.replace("get:","set:")],enumerable:!0}):"function"===typeof o&&o!==e?(i[f]=function(){return e(arguments.length),o.apply(void 0,arguments)}).original=o:i[f]=o};for(var o in t)n(o);return r}function A(t,r){for(var e=0;e<r.length;e++){var n=r[e];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n)}}var E,j=function(){function t(r,e,n){!function(t,r){if(!(t instanceof r))throw new TypeError("Cannot call a class as a function")}(this,t),this.start=e,this.end=n,this.encodedMove=Math.abs(r)|e<<3|n<<10}var r,e,n;return r=t,n=[{key:"fromEncodedMove",value:function(r){return new t(7&r,r>>3&127,r>>10&127)}}],(e=null)&&A(r.prototype,e),n&&A(r,n),t}();function P(){return L.apply(this,arguments)}function L(){return(L=i(o.a.mark((function t(){var r;return o.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:if(!E){t.next=2;break}return t.abrupt("return");case 2:return t.next=4,w(fetch("./as-api.wasm"));case 4:r=t.sent,E=r.exports,console.log("Engine initialized");case 7:case"end":return t.stop()}}),t)})))).apply(this,arguments)}function k(){E.newGame()}function M(t){console.log("Start calculation of move ...");var r=E.calculateMove(t),e=j.fromEncodedMove(r);return console.log("Calculation finished"),e}function S(t){var r=E.__pin(E.performMove(t.encodedMove)),e=E.__getArray(r);return E.__unpin(r),I(e)}function U(t,r){var e=E.__pin(E.__newString(t)),n=E.__pin(E.__newArray(E.INT32ARRAY_ID,r.map((function(t){return t.encodedMove})))),o=E.__pin(E.setPosition(e,n));E.__unpin(n),E.__unpin(e);var a=E.__getArray(o);return E.__unpin(o),I(a)}function I(t){var r=t.slice(0,64),e=t[64];return{board:r,moves:t.length>65?t.slice(65).map(j.fromEncodedMove):[],gameEnded:0!==(1&e),checkMate:0!==(2&e),staleMate:0!==(4&e),whiteInCheck:0!==(128&e),blackInCheck:0!==(256&e),threefoldRepetition:0!==(8&e),fiftyMoveDraw:0!==(16&e),insufficientMaterial:0!==(32&e),activePlayer:0!==(64&e)?-1:1}}addEventListener("message",(function(t){var e,n=t.data,o=n.type,a=n.method,i=n.id,c=n.params;"RPC"===o&&a&&((e=r[a])?Promise.resolve().then((function(){return e.apply(r,c)})):Promise.reject("No such method")).then((function(t){postMessage({type:"RPC",id:i,result:t})})).catch((function(t){var r={message:t};t.stack&&(r.message=t.message,r.stack=t.stack,r.name=t.name),postMessage({type:"RPC",id:i,error:r})}))})),postMessage({type:"RPC",method:"ready"})}]);
//# sourceMappingURL=be9cbea6a623390f42ff.worker.js.map