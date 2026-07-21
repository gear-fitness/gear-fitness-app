import { ColorValue, StyleProp, View, ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";
import Svg, { Circle } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Geometry matches the source svg: a 24x24 box with a r=9.5 ring, so the
// circumference is ~59.7 and the dash values below read as fractions of it.
const VIEW_BOX = 24;
const RADIUS = 9.5;
const STROKE_WIDTH = 3;
const GAP = 150;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Grow, briefly hold, then shrink the arc back to the same length it started
// with. The dash offset travels exactly one circumference, so both animated
// values are visually continuous when the repeated cycle restarts.
const CYCLE_MS = 1500;
const GROW_MS = CYCLE_MS * 0.475;
const HOLD_MS = CYCLE_MS * 0.05;
const SHRINK_MS = CYCLE_MS - GROW_MS - HOLD_MS;
const DASH_MIN = 2;
const DASH_MAX = 42;

// Deliberately not a multiple of CYCLE_MS: the rotation and the dash sweep
// drift against each other, which is what keeps the motion from looking like
// a repeating loop.
const ROTATE_MS = 2000;

// cubic-bezier(0.42, 0, 0.58, 1), the keySplines from the source svg.
const SPLINE = Easing.inOut(Easing.ease);

/** ActivityIndicator sizes on iOS, so swapped call sites keep their layout. */
const SIZES = { small: 20, large: 36 } as const;

type Props = {
  size?: "small" | "large" | number;
  // ColorValue, not string: call sites pass theme colors straight through, the
  // same as ActivityIndicator accepted.
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
};

/**
 * Ring loader used in place of ActivityIndicator. Same {size, color, style}
 * contract so it drops into existing call sites unchanged.
 */
export function Spinner({ size = "small", color = "#888", style }: Props) {
  const px = typeof size === "number" ? size : SIZES[size];

  const dash = useSharedValue(DASH_MIN);
  const offset = useSharedValue(0);
  const spin = useSharedValue(0);

  useEffect(() => {
    dash.value = withRepeat(
      withSequence(
        withTiming(DASH_MAX, { duration: GROW_MS, easing: SPLINE }),
        withTiming(DASH_MAX, { duration: HOLD_MS }),
        withTiming(DASH_MIN, { duration: SHRINK_MS, easing: SPLINE }),
      ),
      -1,
    );
    offset.value = withRepeat(
      withTiming(-CIRCUMFERENCE, {
        duration: CYCLE_MS,
        easing: Easing.linear,
      }),
      -1,
    );
    spin.value = withRepeat(
      withTiming(360, { duration: ROTATE_MS, easing: Easing.linear }),
      -1,
    );

    return () => {
      cancelAnimation(dash);
      cancelAnimation(offset);
      cancelAnimation(spin);
    };
  }, [dash, offset, spin]);

  const circleProps = useAnimatedProps(() => ({
    strokeDasharray: [dash.value, GAP],
    strokeDashoffset: offset.value,
  }));

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  // The caller's style goes on an outer wrapper rather than on the rotating
  // view: call sites pass padding and margin expecting them to grow the box,
  // which they can't do on a view with an explicit width/height, and a caller
  // passing `transform` would otherwise cancel the rotation.
  return (
    <View style={[{ alignItems: "center", justifyContent: "center" }, style]}>
      <Animated.View style={[{ width: px, height: px }, spinStyle]}>
        <Svg width={px} height={px} viewBox={`0 0 ${VIEW_BOX} ${VIEW_BOX}`}>
          <AnimatedCircle
            cx={VIEW_BOX / 2}
            cy={VIEW_BOX / 2}
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            animatedProps={circleProps}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
