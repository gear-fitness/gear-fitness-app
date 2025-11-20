"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var React = _interopRequireWildcard(require("react"));
var _extractProps = require("../lib/extract/extractProps");
var _units = _interopRequireDefault(require("../lib/units"));
var _Shape = _interopRequireDefault(require("./Shape"));
var _MaskNativeComponent = _interopRequireDefault(require("../fabric/MaskNativeComponent"));
var _maskType = require("../lib/maskType");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
class Mask extends _Shape.default {
  static displayName = 'Mask';
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
      x,
      y,
      width,
      height,
      maskUnits,
      maskContentUnits,
      children,
      style
    } = props;
    const maskProps = {
      x,
      y,
      width,
      height,
      maskUnits: maskUnits !== undefined ? _units.default[maskUnits] : 0,
      maskContentUnits: maskContentUnits !== undefined ? _units.default[maskContentUnits] : 1,
      maskType: _maskType.maskType[(props === null || props === void 0 ? void 0 : props.maskType) || (style === null || style === void 0 ? void 0 : style.maskType) || 'luminance']
    };
    return /*#__PURE__*/React.createElement(_MaskNativeComponent.default, _extends({
      ref: ref => this.refMethod(ref)
    }, (0, _extractProps.withoutXY)(this, props), maskProps), children);
  }
}
exports.default = Mask;
//# sourceMappingURL=Mask.js.map