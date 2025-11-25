"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = extractGradient;
var _react = _interopRequireWildcard(require("react"));
var React = _react;
var _reactNative = require("react-native");
var _extractOpacity = _interopRequireDefault(require("./extractOpacity"));
var _extractTransform = _interopRequireDefault(require("./extractTransform"));
var _units = _interopRequireDefault(require("../units"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
const percentReg = /^([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)(%?)$/;
function percentToFloat(percent) {
  if (typeof percent === 'number') {
    return percent;
  }
  if (typeof percent === 'object' && typeof percent.__getAnimatedValue === 'function') {
    return percent.__getAnimatedValue();
  }
  const matched = typeof percent === 'string' && percent.match(percentReg);
  if (!matched) {
    console.warn(`"${percent}" is not a valid number or percentage string.`);
    return 0;
  }
  return matched[2] ? +matched[1] / 100 : +matched[1];
}
const offsetComparator = (object, other) => object[0] - other[0];
function extractGradient(props, parent) {
  const {
    id,
    children,
    gradientTransform,
    transform,
    gradientUnits
  } = props;
  if (!id) {
    return null;
  }
  const stops = [];
  const childArray = children ? _react.Children.map(children, child => /*#__PURE__*/React.cloneElement(child, {
    parent
  })) : [];
  const l = childArray.length;
  for (let i = 0; i < l; i++) {
    const {
      props: {
        style,
        offset = style && style.offset,
        stopColor = style && style.stopColor || '#000',
        stopOpacity = style && style.stopOpacity
      }
    } = childArray[i];
    const offsetNumber = percentToFloat(offset || 0);
    const color = stopColor && (0, _reactNative.processColor)(stopColor);
    if (typeof color !== 'number' || isNaN(offsetNumber)) {
      console.warn(`"${stopColor}" is not a valid color or "${offset}" is not a valid offset`);
      continue;
    }
    const alpha = Math.round((0, _extractOpacity.default)(stopOpacity) * 255);
    stops.push([offsetNumber, color & 0x00ffffff | alpha << 24]);
  }
  stops.sort(offsetComparator);
  const gradient = [];
  const k = stops.length;
  for (let j = 0; j < k; j++) {
    const s = stops[j];
    gradient.push(s[0], s[1]);
  }
  return {
    name: id,
    gradient,
    children: childArray,
    gradientUnits: gradientUnits && _units.default[gradientUnits] || 0,
    gradientTransform: (0, _extractTransform.default)(gradientTransform || transform || props)
  };
}
//# sourceMappingURL=extractGradient.js.map