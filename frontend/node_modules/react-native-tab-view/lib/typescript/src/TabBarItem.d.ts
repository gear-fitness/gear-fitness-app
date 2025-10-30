import { Animated, type LayoutChangeEvent, type PressableAndroidRippleConfig, type StyleProp, type ViewStyle } from 'react-native';
import type { NavigationState, Route, TabDescriptor } from './types';
export type Props<T extends Route> = TabDescriptor<T> & {
    position: Animated.AnimatedInterpolation<number>;
    route: T;
    navigationState: NavigationState<T>;
    activeColor?: string;
    inactiveColor?: string;
    pressColor?: string;
    pressOpacity?: number;
    onLayout?: (event: LayoutChangeEvent) => void;
    onPress: () => void;
    onLongPress: () => void;
    defaultTabWidth?: number;
    style: StyleProp<ViewStyle>;
    android_ripple?: PressableAndroidRippleConfig;
};
export declare function TabBarItem<T extends Route>(props: Props<T>): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=TabBarItem.d.ts.map