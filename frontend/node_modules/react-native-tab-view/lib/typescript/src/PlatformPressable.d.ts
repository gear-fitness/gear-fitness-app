import * as React from 'react';
import { type GestureResponderEvent, type PressableProps } from 'react-native';
export type Props = Omit<PressableProps, 'onPress'> & {
    href?: string;
    pressColor?: string;
    pressOpacity?: number;
    onPress?: (e: React.MouseEvent<HTMLAnchorElement, MouseEvent> | GestureResponderEvent) => void;
    children: React.ReactNode;
};
/**
 * PlatformPressable provides an abstraction on top of Pressable to handle platform differences.
 */
export declare function PlatformPressable({ disabled, android_ripple, pressColor, pressOpacity, style, onPress, ...rest }: Props): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=PlatformPressable.d.ts.map