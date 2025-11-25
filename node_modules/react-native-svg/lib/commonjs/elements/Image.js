"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var React = _interopRequireWildcard(require("react"));
var _reactNative = require("react-native");
var _extractViewBox = require("../lib/extract/extractViewBox");
var _extractProps = require("../lib/extract/extractProps");
var _Shape = _interopRequireDefault(require("./Shape"));
var _ImageNativeComponent = _interopRequireDefault(require("../fabric/ImageNativeComponent"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const spacesRegExp = /\s+/;
class SvgImage extends _Shape.default {
  static displayName = 'Image';
  static defaultProps = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    preserveAspectRatio: 'xMidYMid meet'
  };
  render() {
    const {
      props
    } = this;
    const {
      preserveAspectRatio,
      x,
      y,
      width,
      height,
      xlinkHref,
      href = xlinkHref,
      onLoad
    } = props;
    const modes = preserveAspectRatio ? preserveAspectRatio.trim().split(spacesRegExp) : [];
    const align = modes[0];
    const meetOrSlice = modes[1];
    const imageProps = {
      x,
      y,
      width,
      height,
      onLoad,
      meetOrSlice: _extractViewBox.meetOrSliceTypes[meetOrSlice] || 0,
      align: _extractViewBox.alignEnum[align] || 'xMidYMid',
      src: !href ? null : _reactNative.Image.resolveAssetSource(typeof href === 'string' ? {
        uri: href
      } : href)
    };
    return /*#__PURE__*/React.createElement(_ImageNativeComponent.default, _extends({
      ref: ref => this.refMethod(ref)
    }, (0, _extractProps.withoutXY)(this, props), imageProps));
  }
}
exports.default = SvgImage;
//# sourceMappingURL=Image.js.map