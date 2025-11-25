"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var React = _interopRequireWildcard(require("react"));
var _extractTransform = _interopRequireDefault(require("../lib/extract/extractTransform"));
var _extractViewBox = _interopRequireDefault(require("../lib/extract/extractViewBox"));
var _units = _interopRequireDefault(require("../lib/units"));
var _Shape = _interopRequireDefault(require("./Shape"));
var _PatternNativeComponent = _interopRequireDefault(require("../fabric/PatternNativeComponent"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
class Pattern extends _Shape.default {
  static displayName = 'Pattern';
  static defaultProps = {
    x: '0%',
    y: '0%',
    width: '100%',
    height: '100%'
  };
  render() {
    const {
      props
    } = this;
    const {
      patternTransform,
      transform,
      id,
      x,
      y,
      width,
      height,
      patternUnits,
      patternContentUnits,
      children,
      viewBox,
      preserveAspectRatio
    } = props;
    const matrix = (0, _extractTransform.default)(patternTransform || transform || props);
    const patternProps = {
      x,
      y,
      width,
      height,
      name: id,
      matrix,
      patternTransform: matrix,
      patternUnits: patternUnits && _units.default[patternUnits] || 0,
      patternContentUnits: patternContentUnits ? _units.default[patternContentUnits] : 1
    };
    return /*#__PURE__*/React.createElement(_PatternNativeComponent.default, _extends({
      ref: ref => this.refMethod(ref)
    }, patternProps, (0, _extractViewBox.default)({
      viewBox,
      preserveAspectRatio
    })), children);
  }
}
exports.default = Pattern;
//# sourceMappingURL=Pattern.js.map