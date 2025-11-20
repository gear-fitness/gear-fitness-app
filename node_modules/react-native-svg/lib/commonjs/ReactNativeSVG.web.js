"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  camelCase: true,
  parse: true,
  SvgAst: true,
  SvgFromUri: true,
  SvgFromXml: true,
  SvgUri: true,
  SvgXml: true,
  fetchText: true,
  inlineStyles: true,
  loadLocalRawResource: true,
  LocalSvg: true,
  SvgCss: true,
  SvgCssUri: true,
  SvgWithCss: true,
  SvgWithCssUri: true,
  WithLocalSvg: true
};
Object.defineProperty(exports, "LocalSvg", {
  enumerable: true,
  get: function () {
    return _deprecated.LocalSvg;
  }
});
Object.defineProperty(exports, "SvgAst", {
  enumerable: true,
  get: function () {
    return _xml.SvgAst;
  }
});
Object.defineProperty(exports, "SvgCss", {
  enumerable: true,
  get: function () {
    return _deprecated.SvgCss;
  }
});
Object.defineProperty(exports, "SvgCssUri", {
  enumerable: true,
  get: function () {
    return _deprecated.SvgCssUri;
  }
});
Object.defineProperty(exports, "SvgFromUri", {
  enumerable: true,
  get: function () {
    return _xml.SvgFromUri;
  }
});
Object.defineProperty(exports, "SvgFromXml", {
  enumerable: true,
  get: function () {
    return _xml.SvgFromXml;
  }
});
Object.defineProperty(exports, "SvgUri", {
  enumerable: true,
  get: function () {
    return _xml.SvgUri;
  }
});
Object.defineProperty(exports, "SvgWithCss", {
  enumerable: true,
  get: function () {
    return _deprecated.SvgWithCss;
  }
});
Object.defineProperty(exports, "SvgWithCssUri", {
  enumerable: true,
  get: function () {
    return _deprecated.SvgWithCssUri;
  }
});
Object.defineProperty(exports, "SvgXml", {
  enumerable: true,
  get: function () {
    return _xml.SvgXml;
  }
});
Object.defineProperty(exports, "WithLocalSvg", {
  enumerable: true,
  get: function () {
    return _deprecated.WithLocalSvg;
  }
});
Object.defineProperty(exports, "camelCase", {
  enumerable: true,
  get: function () {
    return _xml.camelCase;
  }
});
Object.defineProperty(exports, "default", {
  enumerable: true,
  get: function () {
    return _elements.default;
  }
});
Object.defineProperty(exports, "fetchText", {
  enumerable: true,
  get: function () {
    return _fetchData.fetchText;
  }
});
Object.defineProperty(exports, "inlineStyles", {
  enumerable: true,
  get: function () {
    return _deprecated.inlineStyles;
  }
});
Object.defineProperty(exports, "loadLocalRawResource", {
  enumerable: true,
  get: function () {
    return _deprecated.loadLocalRawResource;
  }
});
Object.defineProperty(exports, "parse", {
  enumerable: true,
  get: function () {
    return _xml.parse;
  }
});
var _xml = require("./xml");
var _fetchData = require("./utils/fetchData");
var _deprecated = require("./deprecated");
var _types = require("./lib/extract/types");
Object.keys(_types).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _types[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _types[key];
    }
  });
});
var _elements = _interopRequireWildcard(require("./elements"));
Object.keys(_elements).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _elements[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _elements[key];
    }
  });
});
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
//# sourceMappingURL=ReactNativeSVG.web.js.map