"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var React = _interopRequireWildcard(require("react"));
var _extractProps = _interopRequireWildcard(require("../lib/extract/extractProps"));
var _extractTransform = _interopRequireDefault(require("../lib/extract/extractTransform"));
var _extractText = _interopRequireWildcard(require("../lib/extract/extractText"));
var _util = require("../lib/util");
var _Shape = _interopRequireDefault(require("./Shape"));
var _TSpanNativeComponent = _interopRequireDefault(require("../fabric/TSpanNativeComponent"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
class TSpan extends _Shape.default {
  static displayName = 'TSpan';
  setNativeProps = props => {
    const matrix = !props.matrix && (0, _extractTransform.default)(props);
    if (matrix) {
      props.matrix = matrix;
    }
    const prop = (0, _extractProps.propsAndStyles)(props);
    Object.assign(prop, (0, _util.pickNotNil)((0, _extractText.default)(prop, false)));
    this.root && this.root.setNativeProps(prop);
  };
  render() {
    const prop = (0, _extractProps.propsAndStyles)(this.props);
    const props = (0, _extractProps.default)({
      ...prop,
      x: null,
      y: null
    }, this);
    Object.assign(props, (0, _extractText.default)(prop, false));
    props.ref = this.refMethod;
    return /*#__PURE__*/React.createElement(_TSpanNativeComponent.default, props);
  }
}
exports.default = TSpan;
(0, _extractText.setTSpan)(TSpan);
//# sourceMappingURL=TSpan.js.map