"use strict";

import * as React from 'react';
import { jsx as _jsx } from "react/jsx-runtime";
const SceneComponent = /*#__PURE__*/React.memo(({
  component,
  ...rest
}) => {
  return /*#__PURE__*/React.createElement(component, rest);
});
SceneComponent.displayName = 'SceneComponent';
export function SceneMap(scenes) {
  return ({
    route,
    jumpTo,
    position
  }) => /*#__PURE__*/_jsx(SceneComponent, {
    component: scenes[route.key],
    route: route,
    jumpTo: jumpTo,
    position: position
  }, route.key);
}
//# sourceMappingURL=SceneMap.js.map