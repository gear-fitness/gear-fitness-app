import * as React from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import type { LocaleDirection, NavigationState, Route, SceneRendererProps } from './types';
export type GetTabWidth = (index: number) => number;
export type Props<T extends Route> = SceneRendererProps & {
    navigationState: NavigationState<T>;
    width: 'auto' | `${number}%` | number;
    getTabWidth: GetTabWidth;
    direction: LocaleDirection;
    style?: StyleProp<ViewStyle>;
    gap?: number;
    children?: React.ReactNode;
};
export declare function TabBarIndicator<T extends Route>({ getTabWidth, layout, navigationState, position, width, direction, gap, style, children, }: Props<T>): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=TabBarIndicator.d.ts.map