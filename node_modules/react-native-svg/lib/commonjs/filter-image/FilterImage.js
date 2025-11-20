"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FilterImage = void 0;
var React = _interopRequireWildcard(require("react"));
var _reactNative = require("react-native");
var _index = require("../index");
var _resolveAssetUri = require("../lib/resolveAssetUri");
var _util = require("../lib/util");
var _extractFilters = require("./extract/extractFilters");
var _extractImage = require("./extract/extractImage");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const FilterImage = props => {
  const {
    filters = [],
    source,
    style,
    ...imageProps
  } = props;
  const {
    filter: stylesFilter,
    ...styles
  } = _reactNative.StyleSheet.flatten(style ?? {});
  const extractedFilters = [...filters, ...(0, _extractFilters.extractFiltersCss)(stylesFilter)];
  const filterId = React.useMemo(() => `RNSVG-${(0, _util.getRandomNumber)()}`, []);
  if (!source) return null;
  const src = _reactNative.Platform.OS === 'web' ? (0, _resolveAssetUri.resolveAssetUri)(source) : _reactNative.Image.resolveAssetSource(source);
  const width = props.width || (styles === null || styles === void 0 ? void 0 : styles.width) || (src === null || src === void 0 ? void 0 : src.width);
  const height = props.height || (styles === null || styles === void 0 ? void 0 : styles.height) || (src === null || src === void 0 ? void 0 : src.height);
  const preserveAspectRatio = (0, _extractImage.extractResizeMode)(props.resizeMode);
  return /*#__PURE__*/React.createElement(_reactNative.View, {
    style: [styles, {
      width,
      height,
      overflow: 'hidden'
    }]
  }, /*#__PURE__*/React.createElement(_index.Svg, {
    width: "100%",
    height: "100%"
  }, /*#__PURE__*/React.createElement(_index.Filter, {
    id: filterId
  }, extractedFilters.map(_extractFilters.mapFilterToComponent)), /*#__PURE__*/React.createElement(_index.Image, _extends({}, imageProps, {
    href: props.src || props.source,
    width: "100%",
    height: "100%",
    preserveAspectRatio: preserveAspectRatio,
    filter: extractedFilters.length > 0 ? `url(#${filterId})` : undefined
  }))));
};
exports.FilterImage = FilterImage;
//# sourceMappingURL=FilterImage.js.map