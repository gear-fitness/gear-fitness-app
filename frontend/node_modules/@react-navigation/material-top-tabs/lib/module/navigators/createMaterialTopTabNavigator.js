"use strict";

import { createNavigatorFactory, TabRouter, useNavigationBuilder } from '@react-navigation/native';
import { MaterialTopTabView } from "../views/MaterialTopTabView.js";
import { jsx as _jsx } from "react/jsx-runtime";
function MaterialTopTabNavigator({
  id,
  initialRouteName,
  backBehavior,
  children,
  layout,
  screenListeners,
  screenOptions,
  screenLayout,
  UNSTABLE_router,
  ...rest
}) {
  const {
    state,
    descriptors,
    navigation,
    NavigationContent
  } = useNavigationBuilder(TabRouter, {
    id,
    initialRouteName,
    backBehavior,
    children,
    layout,
    screenListeners,
    screenOptions,
    screenLayout,
    UNSTABLE_router
  });
  return /*#__PURE__*/_jsx(NavigationContent, {
    children: /*#__PURE__*/_jsx(MaterialTopTabView, {
      ...rest,
      state: state,
      navigation: navigation,
      descriptors: descriptors
    })
  });
}
export function createMaterialTopTabNavigator(config) {
  return createNavigatorFactory(MaterialTopTabNavigator)(config);
}
//# sourceMappingURL=createMaterialTopTabNavigator.js.map