"use strict";

import { CommonActions, useLocale, useTheme } from '@react-navigation/native';
import { TabView } from 'react-native-tab-view';
import { TabAnimationContext } from "../utils/TabAnimationContext.js";
import { MaterialTopTabBar } from "./MaterialTopTabBar.js";
import { jsx as _jsx } from "react/jsx-runtime";
const renderTabBarDefault = props => /*#__PURE__*/_jsx(MaterialTopTabBar, {
  ...props
});
export function MaterialTopTabView({
  tabBar = renderTabBarDefault,
  state,
  navigation,
  descriptors,
  ...rest
}) {
  const {
    colors
  } = useTheme();
  const {
    direction
  } = useLocale();
  const renderTabBar = ({
    /* eslint-disable @typescript-eslint/no-unused-vars */
    navigationState,
    options,
    /* eslint-enable @typescript-eslint/no-unused-vars */
    ...rest
  }) => {
    return tabBar({
      ...rest,
      state: state,
      navigation: navigation,
      descriptors: descriptors
    });
  };
  const focusedOptions = descriptors[state.routes[state.index].key].options;
  return /*#__PURE__*/_jsx(TabView, {
    ...rest,
    onIndexChange: index => {
      const route = state.routes[index];
      navigation.dispatch({
        ...CommonActions.navigate(route),
        target: state.key
      });
    },
    renderScene: ({
      route,
      position
    }) => /*#__PURE__*/_jsx(TabAnimationContext.Provider, {
      value: {
        position
      },
      children: descriptors[route.key].render()
    }),
    navigationState: state,
    renderTabBar: renderTabBar,
    renderLazyPlaceholder: ({
      route
    }) => descriptors[route.key].options.lazyPlaceholder?.() ?? null,
    lazy: ({
      route
    }) => descriptors[route.key].options.lazy === true && !state.preloadedRouteKeys.includes(route.key),
    lazyPreloadDistance: focusedOptions.lazyPreloadDistance,
    swipeEnabled: focusedOptions.swipeEnabled,
    animationEnabled: focusedOptions.animationEnabled,
    onSwipeStart: () => navigation.emit({
      type: 'swipeStart'
    }),
    onSwipeEnd: () => navigation.emit({
      type: 'swipeEnd'
    }),
    direction: direction,
    options: Object.fromEntries(state.routes.map(route => {
      const options = descriptors[route.key]?.options;
      return [route.key, {
        sceneStyle: [{
          backgroundColor: colors.background
        }, options?.sceneStyle]
      }];
    }))
  });
}
//# sourceMappingURL=MaterialTopTabView.js.map