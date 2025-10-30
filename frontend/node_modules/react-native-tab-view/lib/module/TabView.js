"use strict";

import * as React from 'react';
import { I18nManager, Platform, StyleSheet, View } from 'react-native';
import { Pager } from './Pager';
import { SceneView } from "./SceneView.js";
import { TabBar } from "./TabBar.js";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const renderLazyPlaceholderDefault = () => null;
export function TabView({
  onIndexChange,
  onTabSelect,
  navigationState,
  renderScene,
  initialLayout,
  keyboardDismissMode = 'auto',
  lazy = false,
  lazyPreloadDistance = 0,
  onSwipeStart,
  onSwipeEnd,
  renderLazyPlaceholder = renderLazyPlaceholderDefault,
  // eslint-disable-next-line @eslint-react/no-unstable-default-props
  renderTabBar = props => /*#__PURE__*/_jsx(TabBar, {
    ...props
  }),
  pagerStyle,
  style,
  direction = I18nManager.getConstants().isRTL ? 'rtl' : 'ltr',
  swipeEnabled = true,
  tabBarPosition = 'top',
  animationEnabled = true,
  overScrollMode,
  options: sceneOptions,
  commonOptions
}) {
  if (Platform.OS !== 'web' && direction !== (I18nManager.getConstants().isRTL ? 'rtl' : 'ltr')) {
    console.warn(`The 'direction' prop is set to '${direction}' but the effective value is '${I18nManager.getConstants().isRTL ? 'rtl' : 'ltr'}'. This is not supported. Make sure to match the 'direction' prop with the writing direction of the app.`);
  }
  const [layout, setLayout] = React.useState({
    width: 0,
    height: 0,
    ...initialLayout
  });
  const jumpToIndex = index => {
    if (index !== navigationState.index) {
      onIndexChange(index);
    }
  };
  const handleLayout = e => {
    const {
      height,
      width
    } = e.nativeEvent.layout;
    setLayout(prevLayout => {
      if (prevLayout.width === width && prevLayout.height === height) {
        return prevLayout;
      }
      return {
        height,
        width
      };
    });
  };
  const options = Object.fromEntries(navigationState.routes.map(route => [route.key, {
    ...commonOptions,
    ...sceneOptions?.[route.key]
  }]));
  return /*#__PURE__*/_jsx(View, {
    onLayout: handleLayout,
    style: [styles.pager, style],
    children: /*#__PURE__*/_jsx(Pager, {
      layout: layout,
      navigationState: navigationState,
      keyboardDismissMode: keyboardDismissMode,
      swipeEnabled: swipeEnabled,
      onSwipeStart: onSwipeStart,
      onSwipeEnd: onSwipeEnd,
      onIndexChange: jumpToIndex,
      onTabSelect: onTabSelect,
      animationEnabled: animationEnabled,
      overScrollMode: overScrollMode,
      style: pagerStyle,
      layoutDirection: direction,
      children: ({
        position,
        render,
        addEnterListener,
        jumpTo
      }) => {
        // All the props here must not change between re-renders
        // This is crucial to optimizing the routes with PureComponent
        const sceneRendererProps = {
          position,
          layout,
          jumpTo
        };
        return /*#__PURE__*/_jsxs(React.Fragment, {
          children: [tabBarPosition === 'top' && renderTabBar({
            ...sceneRendererProps,
            options,
            navigationState
          }), render(navigationState.routes.map((route, i) => {
            const {
              sceneStyle
            } = options?.[route.key] ?? {};
            return /*#__PURE__*/_jsx(SceneView, {
              ...sceneRendererProps,
              addEnterListener: addEnterListener,
              index: i,
              lazy: typeof lazy === 'function' ? lazy({
                route
              }) : lazy,
              lazyPreloadDistance: lazyPreloadDistance,
              navigationState: navigationState,
              style: sceneStyle,
              children: ({
                loading
              }) => loading ? renderLazyPlaceholder({
                route
              }) : renderScene({
                ...sceneRendererProps,
                route
              })
            }, route.key);
          })), tabBarPosition === 'bottom' && renderTabBar({
            ...sceneRendererProps,
            options,
            navigationState
          })]
        });
      }
    })
  });
}
const styles = StyleSheet.create({
  pager: {
    flex: 1,
    overflow: 'hidden'
  }
});
//# sourceMappingURL=TabView.js.map