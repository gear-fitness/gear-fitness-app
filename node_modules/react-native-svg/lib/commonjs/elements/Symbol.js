"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var React = _interopRequireWildcard(require("react"));
var _extractViewBox = _interopRequireDefault(require("../lib/extract/extractViewBox"));
var _Shape = _interopRequireDefault(require("./Shape"));
var _SymbolNativeComponent = _interopRequireDefault(require("../fabric/SymbolNativeComponent"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
class Symbol extends _Shape.default {
  static displayName = 'Symbol';
  render() {
    const {
      props
    } = this;
    const {
      id,
      children
    } = props;
    const symbolProps = {
      name: id
    };
    return /*#__PURE__*/React.createElement(_SymbolNativeComponent.default, _extends({
      ref: ref => this.refMethod(ref)
    }, symbolProps, (0, _extractViewBox.default)(props)), children);
  }
}
exports.default = Symbol;
//# sourceMappingURL=Symbol.js.map