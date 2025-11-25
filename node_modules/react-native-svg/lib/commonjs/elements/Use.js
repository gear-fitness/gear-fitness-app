"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var React = _interopRequireWildcard(require("react"));
var _extractProps = require("../lib/extract/extractProps");
var _util = require("../lib/util");
var _Shape = _interopRequireDefault(require("./Shape"));
var _UseNativeComponent = _interopRequireDefault(require("../fabric/UseNativeComponent"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
class Use extends _Shape.default {
  static displayName = 'Use';
  static defaultProps = {
    x: 0,
    y: 0,
    width: 0,
    height: 0
  };
  render() {
    const {
      props
    } = this;
    const {
      children,
      x,
      y,
      width,
      height,
      xlinkHref,
      href = xlinkHref
    } = props;
    const matched = href && href.match(_util.idPattern);
    const match = matched && matched[1];
    if (!match) {
      console.warn('Invalid `href` prop for `Use` element, expected a href like "#id", but got: "' + href + '"');
    }
    const useProps = {
      href: match ?? undefined,
      x,
      y,
      width,
      height
    };
    return /*#__PURE__*/React.createElement(_UseNativeComponent.default, _extends({
      ref: ref => this.refMethod(ref)
    }, (0, _extractProps.withoutXY)(this, props), useProps), children);
  }
}
exports.default = Use;
//# sourceMappingURL=Use.js.map