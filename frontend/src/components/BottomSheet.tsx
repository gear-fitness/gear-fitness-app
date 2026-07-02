import { ReactNode, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  GestureResponderEvent,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  PanResponderGestureState,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { FloatingKeyboardDismiss } from "./FloatingKeyboardDismiss";

const SWIPE_CLOSE_DISTANCE = 80;
const SWIPE_CLOSE_VELOCITY = 0.5;
const OPEN_DURATION = 220;
const CLOSE_DURATION = 200;
const BACKDROP_OPACITY = 0.5;
const OFFSCREEN = Dimensions.get("window").height;
// Drag-dismissal timing bounds. The release duration is the remaining distance
// divided by the fling speed (px/ms), clamped so a slow release still snaps
// shut and a hard fling never undershoots. The velocity floor keeps a near-zero
// release from dividing out to a multi-second duration.
const DISMISS_MIN_DURATION = 120;
const DISMISS_MAX_DURATION = 250;
const DISMISS_VELOCITY_FLOOR = 1.2;

interface Props {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Lift the sheet above the keyboard (for sheets containing a text input). */
  avoidKeyboard?: boolean;
  /** Backdrop dim at rest (0–1). Defaults to 0.5; pass 0 for no dimming. */
  backdropOpacity?: number;
  /** Show the floating keyboard-dismiss pill while the keyboard is open. */
  keyboardDismiss?: boolean;
  /**
   * Allow dragging the sheet body (not just the grabber) to dismiss. Defaults
   * to true. Set false for sheets whose content scrolls or is densely tappable,
   * so the body's pan responder never competes with a ScrollView or steals the
   * odd slidey tap — those sheets dismiss via the grabber, backdrop, or a close
   * control instead.
   */
  bodyDrag?: boolean;
  /**
   * Fires once the close animation finishes and the modal unmounts. Callers use
   * this to chain a follow-up modal or modal-presentation navigation, which iOS
   * refuses to present while this modal is still on screen.
   */
  onClosed?: () => void;
}

/**
 * Bottom sheet shared by the post menus. The dim backdrop fades on its own
 * track while the sheet slides, so the whole screen dims on enter/exit instead
 * of the dimming sliding up and down with the sheet. An internal `rendered`
 * flag keeps the modal mounted through the close animation before unmounting.
 */
export function BottomSheet({
  visible,
  onClose,
  children,
  avoidKeyboard,
  backdropOpacity,
  keyboardDismiss,
  onClosed,
  bodyDrag = true,
}: Props) {
  const { colors } = useTheme();
  const targetBackdrop = backdropOpacity ?? BACKDROP_OPACITY;
  const [rendered, setRendered] = useState(visible);
  const translateY = useRef(new Animated.Value(OFFSCREEN)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  // Keep the latest onClosed so the close animation's completion callback never
  // fires a stale closure.
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;
  // Mirror of `visible` so onShow (which fires outside React's render cycle)
  // can check the current value without a stale closure.
  const visibleRef = useRef(visible);
  // True while a drag-release is running its own local dismissal animation. It
  // stops the close effect from restarting the animation when the parent flips
  // `visible` false in response to that release's onClose() call.
  const closingRef = useRef(false);
  // GPU-bound compositing fix. The slide already runs on the native driver, but
  // the sheet hosts many live liquid-glass surfaces (expo-glass-effect GlassView
  // / UIVisualEffectView-family views plus SwiftUI hosts), and every frame the
  // sheet moves iOS must re-sample and re-blur the backdrop for each surface.
  // Translating 6-10 live glass views is GPU-bound jank no animation driver can
  // fix. Same rasterization trick as the FeedPostCard stacked thumbnails: while
  // the sheet is MOVING, flatten it into a single GPU texture (shouldRasterizeIOS
  // / renderToHardwareTextureAndroid) so the translation is a cheap texture move;
  // at rest, rasterization is OFF so the glass samples live and content stays
  // sharp. Tradeoff: while rasterized the blur is a frozen snapshot (it stops
  // live-sampling the backdrop), but over a ~200ms slide or an active drag that
  // is imperceptible, and the glass goes live again the instant the sheet settles
  // and rasterization turns off.
  const [moving, setMoving] = useState(false);
  // Ref mirror of `moving` so high-frequency gesture callbacks can flip
  // rasterization once per gesture without redundant setState churn.
  const movingRef = useRef(false);
  const setRasterizing = (value: boolean) => {
    if (movingRef.current === value) return;
    movingRef.current = value;
    setMoving(value);
  };

  // Runs the parallel open animation: backdrop fades in while the sheet springs
  // up. Started from onShow (once the native modal is settled) or, on a reopen
  // mid-close, directly from the effect since onShow won't fire a second time.
  const runOpen = () => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: targetBackdrop,
        duration: OPEN_DURATION,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 220,
      }),
    ]).start(({ finished }) => {
      // Glass goes live again once the sheet settles at rest.
      if (finished) setRasterizing(false);
    });
  };

  // Single close finalization, shared by the ordinary close path and the local
  // drag-dismissal. Runs only when its animation finished uninterrupted, so a
  // reopen (which cancels the running animation) never unmounts the sheet.
  const finalizeClose = ({ finished }: Animated.EndResult) => {
    if (!finished) return;
    closingRef.current = false;
    // Modal unmounts now; reset rasterization so the next open starts clean.
    setRasterizing(false);
    setRendered(false);
    onClosedRef.current?.();
  };

  useEffect(() => {
    visibleRef.current = visible;
    if (visible) {
      // Reset the drag guard so a fresh open behaves normally.
      closingRef.current = false;
      if (rendered) {
        // Reopen while a close animation is still running: the modal is already
        // presented so onShow won't fire again. Restart the open animation from
        // wherever the sheet currently sits (this cancels the close animation,
        // whose completion then no-ops via the finished guard). Rasterize the
        // moving sheet; runOpen's completion turns it back off.
        setRasterizing(true);
        runOpen();
      } else {
        // Park offscreen and mount. onShow starts the slide once the native
        // modal is fully presented on a settled surface. Rasterize as `rendered`
        // flips true so the texture is ready before onShow springs the sheet up.
        translateY.setValue(OFFSCREEN);
        backdropAnim.setValue(0);
        setRasterizing(true);
        setRendered(true);
      }
    } else if (rendered && !closingRef.current) {
      // Ordinary close (backdrop tap, close control). A drag-dismissal has
      // already started its own animation and set closingRef, so skip here.
      // Rasterize the moving sheet; finalizeClose resets it as the modal unmounts.
      setRasterizing(true);
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: CLOSE_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: OFFSCREEN,
          duration: CLOSE_DURATION,
          useNativeDriver: true,
        }),
      ]).start(finalizeClose);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Shared drag handlers. Two responders use them: one on the grabber (claims
  // on touch start, so a swipe works from the top) and one on the body (claims
  // only on a downward drag, so taps still reach the tiles/rows/inputs).
  const isDownwardSwipe = (_: unknown, g: PanResponderGestureState) =>
    g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx);

  const onMove = (_: GestureResponderEvent, g: PanResponderGestureState) => {
    if (g.dy > 0) {
      // Rasterize on the first move of the drag; setRasterizing guards via the
      // ref so this only fires setState once per gesture.
      setRasterizing(true);
      translateY.setValue(g.dy);
    }
  };

  const springBack = () =>
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start(({ finished }) => {
      // Below-threshold release (and terminate) settles back at rest; glass
      // goes live again. Also covers onPanResponderTerminate, which uses this.
      if (finished) setRasterizing(false);
    });

  const onRelease = (_: GestureResponderEvent, g: PanResponderGestureState) => {
    if (g.dy > SWIPE_CLOSE_DISTANCE || g.vy > SWIPE_CLOSE_VELOCITY) {
      // Past the dismiss threshold: animate straight down from the finger's
      // current position in the same tick, rather than calling onClose() and
      // waiting for the parent to flip `visible` (which freezes the sheet
      // mid-screen for a React round trip before a fixed-duration slide).
      // closingRef makes the resulting close effect a no-op so this local
      // animation owns the dismissal and its completion runs finalizeClose.
      closingRef.current = true;
      // Velocity-aware duration: remaining distance / fling speed, clamped.
      // Chosen over a velocity-seeded spring because a spring toward an
      // offscreen target visibly decelerates near the edge; a clamped
      // ease-in timing keeps the tail crisp and the distance honest.
      const remaining = Math.max(OFFSCREEN - g.dy, 0);
      const velocity = Math.max(g.vy, DISMISS_VELOCITY_FLOOR);
      const duration = Math.min(
        Math.max(remaining / velocity, DISMISS_MIN_DURATION),
        DISMISS_MAX_DURATION,
      );
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: OFFSCREEN,
          duration,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(finalizeClose);
      // Keep parent state in sync; the close effect no-ops via closingRef.
      onClose();
    } else {
      springBack();
    }
  };

  const grabberPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: isDownwardSwipe,
      onPanResponderMove: onMove,
      onPanResponderRelease: onRelease,
      onPanResponderTerminate: springBack,
    }),
  ).current;

  const bodyPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: isDownwardSwipe,
      onPanResponderMove: onMove,
      onPanResponderRelease: onRelease,
      onPanResponderTerminate: springBack,
    }),
  ).current;

  const body = (
    // `box-none` lets touches fall through the empty area to the backdrop
    // catcher below, while still hitting the sheet where it sits.
    <View style={styles.container} pointerEvents="box-none">
      {/*
        Backdrop tap target. It sits BEHIND the sheet (earlier sibling), so a
        tap only closes when it lands on the exposed area above the sheet. Taps
        on the sheet itself hit the sheet and never reach here, so tapping the
        title, padding, or between controls can no longer dismiss the sheet.
      */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <Animated.View
        // While the sheet is moving, composite it into a single GPU texture so
        // the translate is a cheap texture move instead of a per-frame re-blur of
        // every live glass surface; off at rest so the glass samples live.
        shouldRasterizeIOS={moving}
        renderToHardwareTextureAndroid={moving}
        style={[
          styles.sheet,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            transform: [{ translateY }],
          },
        ]}
        {...(bodyDrag ? bodyPan.panHandlers : {})}
      >
        <View style={styles.grabberZone} {...grabberPan.panHandlers}>
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />
        </View>
        {children}
      </Animated.View>
    </View>
  );

  return (
    <Modal
      visible={rendered}
      transparent
      animationType="none"
      onRequestClose={onClose}
      onShow={() => {
        // Start the open slide only once the native modal is fully presented,
        // so it plays on a settled surface instead of racing the mount of
        // heavy sheet content (GlassView / SwiftUI hosts). Guard against a
        // rapid open/close toggle: skip if the sheet is already closing.
        if (visibleRef.current) runOpen();
      }}
    >
      <Animated.View
        style={[styles.backdrop, { opacity: backdropAnim }]}
        pointerEvents="none"
      />
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
      {keyboardDismiss && <FloatingKeyboardDismiss />}
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingBottom: 40,
  },
  grabberZone: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 14,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.6,
  },
});
