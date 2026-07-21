import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  StyleProp,
  StyleSheet,
  useWindowDimensions,
  ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@react-navigation/native";
import { Gesture } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedReaction,
  useDerivedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Spinner } from "./Spinner";

const REFRESH_DISTANCE = 72;
const MAX_ANDROID_PULL_DISTANCE = 160;
const SPINNER_BADGE_SIZE = 38;
const LOADING_LINE_HEIGHT = 2;
// AndroidX SwipeRefreshLayout applies this resistance to touch movement.
const ANDROID_DRAG_RATE = 0.5;
// How close to the resting offset still counts as "at top". Exported so
// consumers deciding "near enough to top to refresh" (Social's re-tap flow)
// use the same tolerance: a tighter value here than theirs makes the
// programmatic pull randomly skip its visuals, because their near-top check
// fires on a scroll event emitted a few px before the scroll fully settles.
export const SCROLL_REST_EPSILON = 8;
// Once shown, the progress line stays up at least this long. A fast refresh
// can flip `refreshing` back within tens of ms, and a sub-150ms flash reads
// as the animation never appearing at all.
const LINE_MIN_VISIBLE_MS = 500;

function triggerRefreshHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/**
 * Tracks pull motion on the UI thread. RefreshControl remains authoritative for
 * deciding whether a release refreshes; this only drives the custom visuals.
 */
export function useRefreshPullTracker({
  refreshing,
  restingOffset = 0,
  onScrollY,
  onTriggerRefresh,
}: {
  refreshing: boolean;
  restingOffset?: number;
  onScrollY?: (offsetY: number) => void;
  // iOS only: called when a release should start a refresh. On iOS the caller
  // must NOT mount a native RefreshControl: UIRefreshControl begins refreshing
  // mid-drag once the pull crosses its internal depth, and the begin/end
  // contentInset churn snaps the offset while the finger is still down,
  // resetting the pull visuals. This hook already measures the pull and owns
  // the threshold haptic, so it is the trigger as well; the refresh fires at
  // the same 72pt that armed the haptic. Android keeps the native control
  // (SwipeRefreshLayout triggers on release, so it has neither problem).
  onTriggerRefresh?: () => void;
}) {
  const isIOS = Platform.OS === "ios";
  const pullDistance = useSharedValue(0);
  const programmaticContentOffset = useSharedValue(0);
  const scrollAtTop = useSharedValue(true);
  const isUserDragging = useSharedValue(false);
  const gestureStartedAtTop = useSharedValue(false);
  const hapticArmed = useSharedValue(false);

  // Ref + stable trampoline so the worklet can runOnJS the latest callback
  // without rebuilding the scroll handler when the caller's closure changes.
  const onTriggerRefreshRef = useRef(onTriggerRefresh);
  onTriggerRefreshRef.current = onTriggerRefresh;
  const fireTriggerRefresh = useCallback(() => {
    onTriggerRefreshRef.current?.();
  }, []);

  // Mirror of `refreshing` for the UI thread. The worklets read this instead
  // of the prop so the scroll handler keeps stable deps. With the prop as a
  // dep, the handler is torn down and re-registered exactly when refreshing
  // flips, which lands mid animation (trigger on release, completion mid
  // rebound); scroll events dropped during the swap freeze the pull overlay
  // and then snap it to the current offset, reading as jump cuts.
  const isRefreshingSV = useSharedValue(refreshing);
  useEffect(() => {
    isRefreshingSV.value = refreshing;
  }, [isRefreshingSV, refreshing]);

  const scrollHandler = useAnimatedScrollHandler(
    {
      onScroll: (event) => {
        const offsetY = event.contentOffset.y;
        scrollAtTop.value = offsetY <= restingOffset + SCROLL_REST_EPSILON;

        if (isIOS) {
          const distance = Math.max(restingOffset - offsetY, 0);

          // UIKit can emit negative offsets while mounting, restoring, or
          // applying insets. Only a real drag may begin a visual pull; once
          // begun, keep following the rebound until it reaches rest.
          if (isUserDragging.value || pullDistance.value > 0) {
            pullDistance.value = distance;
            if (distance >= REFRESH_DISTANCE && !hapticArmed.value) {
              hapticArmed.value = true;
              runOnJS(triggerRefreshHaptic)();
            }
          } else {
            pullDistance.value = 0;
          }
        }

        if (onScrollY) runOnJS(onScrollY)(offsetY);
      },
      onBeginDrag: () => {
        isUserDragging.value = !isRefreshingSV.value;
        if (!isRefreshingSV.value) hapticArmed.value = false;
      },
      onEndDrag: () => {
        isUserDragging.value = false;
        // Release past the haptic distance starts the refresh (iOS trigger,
        // see onTriggerRefresh above). Reading the live distance rather than
        // hapticArmed means backing off below 72 before releasing cancels.
        if (
          isIOS &&
          !isRefreshingSV.value &&
          pullDistance.value >= REFRESH_DISTANCE
        ) {
          runOnJS(fireTriggerRefresh)();
        }
      },
    },
    // Everything here is identity-stable, so the handler survives the whole
    // pull/refresh cycle without being swapped. Do not add `refreshing`.
    [fireTriggerRefresh, isIOS, isRefreshingSV, onScrollY, restingOffset],
  );

  // Memoized on stable values only, so RNGH is not asked to update handler
  // config on every host re-render (each feed state change re-renders the
  // consumer, some of them mid gesture).
  const gesture = useMemo(() => {
    const nativeGesture = Gesture.Native();
    const androidPullGesture = Gesture.Pan()
      // Constant flag only. Gating on `refreshing` here cancelled an active
      // gesture mid drag when a refresh started; the refreshing check lives
      // in onBegin instead, via the shared-value mirror.
      .enabled(!isIOS)
      .activeOffsetY(4)
      .failOffsetX([-12, 12])
      .onBegin(() => {
        gestureStartedAtTop.value = scrollAtTop.value && !isRefreshingSV.value;
        hapticArmed.value = false;
      })
      .onUpdate((event) => {
        if (!gestureStartedAtTop.value) return;

        const distance = Math.min(
          Math.max(event.translationY * ANDROID_DRAG_RATE, 0),
          MAX_ANDROID_PULL_DISTANCE,
        );
        if (Math.abs(event.translationX) > distance) return;

        pullDistance.value = distance;
        if (distance >= REFRESH_DISTANCE && !hapticArmed.value) {
          hapticArmed.value = true;
          runOnJS(triggerRefreshHaptic)();
        }
      })
      .onFinalize(() => {
        gestureStartedAtTop.value = false;
        hapticArmed.value = false;
        pullDistance.value = withTiming(0, { duration: 180 });
      });
    return Gesture.Simultaneous(nativeGesture, androidPullGesture);
  }, [
    gestureStartedAtTop,
    hapticArmed,
    isIOS,
    isRefreshingSV,
    pullDistance,
    scrollAtTop,
  ]);

  useEffect(() => {
    cancelAnimation(programmaticContentOffset);
    programmaticContentOffset.value = withTiming(0, {
      duration: refreshing ? 160 : 220,
    });
  }, [programmaticContentOffset, refreshing]);

  const visualPullDistance = useDerivedValue(() =>
    Math.max(pullDistance.value, programmaticContentOffset.value),
  );

  const contentStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          programmaticContentOffset.value + (isIOS ? 0 : pullDistance.value),
      },
    ],
  }));
  const overlayContentStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: programmaticContentOffset.value + pullDistance.value,
      },
    ],
  }));

  const playProgrammaticPull = useCallback(
    (onExpanded: () => void) => {
      // The expansion is only meaningful when the list rests at top. Anywhere
      // else, skip the visuals and refresh silently so the field can never
      // paint across mid-feed content.
      if (!scrollAtTop.value) {
        onExpanded();
        return;
      }
      cancelAnimation(pullDistance);
      cancelAnimation(programmaticContentOffset);
      pullDistance.value = 0;
      programmaticContentOffset.value = withSequence(
        withTiming(REFRESH_DISTANCE, {
          duration: 220,
          easing: Easing.out(Easing.cubic),
        }),
        withDelay(
          70,
          withTiming(REFRESH_DISTANCE, { duration: 1 }, (finished) => {
            if (finished) runOnJS(onExpanded)();
          }),
        ),
      );
    },
    [programmaticContentOffset, pullDistance, scrollAtTop],
  );

  return {
    pullDistance: visualPullDistance,
    contentStyle,
    overlayContentStyle,
    gesture,
    playProgrammaticPull,
    scrollHandler,
  };
}

/**
 * Thin indeterminate progress line shown while a refresh is in flight. A
 * separate component from the pull visuals so screens can dock it to their
 * header: it must move with the header (or sit at the screen's top edge when
 * the header is hidden) rather than float at a fixed screen position, where
 * it would cut across scrolled feed content. Callers position it via `style`
 * ({ bottom: 0 } inside a header container, or an absolute { top }).
 */
export function RefreshProgressLine({
  refreshing,
  style,
}: {
  refreshing: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, dark } = useTheme();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const lineProgress = useSharedValue(0);
  const lineVisibility = useSharedValue(refreshing ? 1 : 0);
  const shownAtRef = useRef(0);

  useEffect(() => {
    if (!refreshing) {
      // Hold the line on screen until it has been visible LINE_MIN_VISIBLE_MS,
      // sweeping the whole time; hiding is what gets deferred, not the data.
      // Cleanup clears the timer, so a refresh restarting mid-hold just keeps
      // the line up.
      const hold = Math.max(
        0,
        LINE_MIN_VISIBLE_MS - (Date.now() - shownAtRef.current),
      );
      const timer = setTimeout(() => {
        cancelAnimation(lineProgress);
        lineProgress.value = 0;
        lineVisibility.value = withTiming(0, { duration: 140 });
      }, hold);
      return () => clearTimeout(timer);
    }

    shownAtRef.current = Date.now();
    lineVisibility.value = withTiming(1, { duration: 100 });
    if (reduceMotion) {
      lineProgress.value = 0.5;
      return;
    }

    lineProgress.value = 0;
    lineProgress.value = withRepeat(
      withTiming(1, { duration: 1050, easing: Easing.linear }),
      -1,
      false,
    );
    // No cleanup here on purpose: the sweep must keep running through the
    // min-visible hold above, which begins exactly when this branch's cleanup
    // would fire. The unmount effect below stops it instead.
  }, [lineProgress, lineVisibility, reduceMotion, refreshing]);

  useEffect(() => {
    return () => {
      cancelAnimation(lineProgress);
      cancelAnimation(lineVisibility);
    };
  }, [lineProgress, lineVisibility]);

  const lineStyle = useAnimatedStyle(() => ({
    opacity: lineVisibility.value,
  }));

  const segmentWidth = Math.max(96, width * 0.28);
  const lineSegmentStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          lineProgress.value,
          [0, 1],
          [-segmentWidth, width],
        ),
      },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.loadingTrack,
        {
          backgroundColor: dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.16)",
        },
        lineStyle,
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.loadingSegment,
          {
            width: segmentWidth,
            backgroundColor: colors.text,
          },
          lineSegmentStyle,
        ]}
      />
    </Animated.View>
  );
}

export function BrandedRefreshIndicator({
  pullDistance,
  top,
}: {
  pullDistance: SharedValue<number>;
  top: number;
}) {
  const { colors } = useTheme();

  // Mount the ring spinner only while a pull is actually in progress. Spinner
  // runs three infinite animations with per-frame SVG prop writes from the
  // moment it mounts, and the badge sits at opacity 0 almost all the time; an
  // always-mounted spinner is a permanent UI-thread tax on every screen
  // hosting this indicator.
  const [engaged, setEngaged] = useState(false);
  useAnimatedReaction(
    () => pullDistance.value > 0,
    (isEngaged, previous) => {
      if (isEngaged !== previous) runOnJS(setEngaged)(isEngaged);
    },
    [pullDistance],
  );

  const fieldStyle = useAnimatedStyle(() => {
    const distance = Math.max(pullDistance.value, 0);

    return {
      opacity: interpolate(
        distance,
        [0, 4, 16],
        [0, 0, 1],
        Extrapolation.CLAMP,
      ),
      transform: [{ scaleY: distance / REFRESH_DISTANCE }],
    };
  });

  const spinnerStyle = useAnimatedStyle(() => {
    const distance = Math.max(pullDistance.value, 0);
    return {
      opacity: interpolate(distance, [16, 36], [0, 1], Extrapolation.CLAMP),
      transform: [
        // 0.6, not 1: the content's pulled-down top edge sits at `distance`,
        // so riding the full distance centers the spinner on that edge and
        // overlaps whatever rests there (Social's first post). Sub-unit rate
        // keeps it inside the revealed gap the whole pull.
        { translateY: distance * 0.6 },
        {
          scale: interpolate(
            distance,
            [16, REFRESH_DISTANCE],
            [0.72, 1],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.indicator, { top }]}
    >
      <Animated.View
        style={[
          styles.pullField,
          { backgroundColor: colors.background },
          fieldStyle,
        ]}
      />
      <Animated.View
        style={[styles.spinnerBadge, spinnerStyle]}
      >
        {engaged && <Spinner size={28} color={colors.text} />}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  indicator: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 3,
  },
  pullField: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    width: "100%",
    height: REFRESH_DISTANCE,
    transformOrigin: "top center",
  },
  spinnerBadge: {
    position: "absolute",
    top: -SPINNER_BADGE_SIZE / 2,
    left: "50%",
    marginLeft: -SPINNER_BADGE_SIZE / 2,
    width: SPINNER_BADGE_SIZE,
    height: SPINNER_BADGE_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  // Vertical position comes from the caller's style (docked to a header edge
  // or an absolute top), so none is baked in here.
  loadingTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    height: LOADING_LINE_HEIGHT,
    overflow: "hidden",
  },
  loadingSegment: {
    height: LOADING_LINE_HEIGHT,
  },
});
