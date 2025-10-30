import * as React from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import type { Layout, LocaleDirection, NavigationState, PagerProps, Route, SceneRendererProps, TabDescriptor } from './types';
export type Props<T extends Route> = Omit<PagerProps, 'layoutDirection'> & {
    onIndexChange: (index: number) => void;
    onTabSelect?: (props: {
        index: number;
    }) => void;
    navigationState: NavigationState<T>;
    renderLazyPlaceholder?: (props: {
        route: T;
    }) => React.ReactNode;
    renderTabBar?: (props: SceneRendererProps & {
        navigationState: NavigationState<T>;
        options: Record<string, TabDescriptor<T>> | undefined;
    }) => React.ReactNode;
    tabBarPosition?: 'top' | 'bottom';
    initialLayout?: Partial<Layout>;
    lazy?: ((props: {
        route: T;
    }) => boolean) | boolean;
    lazyPreloadDistance?: number;
    direction?: LocaleDirection;
    pagerStyle?: StyleProp<ViewStyle>;
    style?: StyleProp<ViewStyle>;
    renderScene: (props: SceneRendererProps & {
        route: T;
    }) => React.ReactNode;
    options?: Record<string, TabDescriptor<T>>;
    commonOptions?: TabDescriptor<T>;
};
export declare function TabView<T extends Route>({ onIndexChange, onTabSelect, navigationState, renderScene, initialLayout, keyboardDismissMode, lazy, lazyPreloadDistance, onSwipeStart, onSwipeEnd, renderLazyPlaceholder, renderTabBar, pagerStyle, style, direction, swipeEnabled, tabBarPosition, animationEnabled, overScrollMode, options: sceneOptions, commonOptions, }: Props<T>): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=TabView.d.ts.map