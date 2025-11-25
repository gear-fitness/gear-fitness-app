"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _react = _interopRequireDefault(require("react"));
var _FeFloodNativeComponent = _interopRequireDefault(require("../../fabric/FeFloodNativeComponent"));
var _extractFilter = _interopRequireWildcard(require("../../lib/extract/extractFilter"));
var _FilterPrimitive = _interopRequireDefault(require("./FilterPrimitive"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
class FeFlood extends _FilterPrimitive.default {
  static displayName = 'FeFlood';
  static defaultProps = {
    ...this.defaultPrimitiveProps,
    floodColor: 'black',
    floodOpacity: 1
  };
  render() {
    return /*#__PURE__*/_react.default.createElement(_FeFloodNativeComponent.default, _extends({
      ref: ref => this.refMethod(ref)
    }, (0, _extractFilter.extractFilter)(this.props), (0, _extractFilter.default)(this.props)));
  }
}
exports.default = FeFlood;
//# sourceMappingURL=FeFlood.js.map