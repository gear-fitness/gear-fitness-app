import { ReactNode, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
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

const SWIPE_CLOSE_DISTANCE = 80;
const SWIPE_CLOSE_VELOCITY = 0.5;
const OPEN_DURATION = 220;
const CLOSE_DURATION = 200;
const BACKDROP_OPACITY = 0.5;
const OFFSCREEN = Dimensions.get("window").height;

interface Props {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Lift the sheet above the keyboard (for sheets containing a text input). */
  avoidKeyboard?: boolean;
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
  onClosed,
}: Props) {
  const { colors } = useTheme();
  const [rendered, setRendered] = useState(visible);
  const translateY = useRef(new Animated.Value(OFFSCREEN)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  // Keep the latest onClosed so the close animation's completion callback never
  // fires a stale closure.
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;

  useEffect(() => {
    if (visible) {
      setRendered(true);
    } else if (rendered) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: CLOSE_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: OFFSCREEN,
          duration: CLOSE_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setRendered(false);
        onClosedRef.current?.();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (rendered && visible) {
      translateY.setValue(OFFSCREEN);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: BACKDROP_OPACITY,
          duration: OPEN_DURATION,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 2,
        }),
      ]).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rendered]);

  // Shared drag handlers. Two responders use them: one on the grabber (claims
  // on touch start, so a swipe works from the top) and one on the body (claims
  // only on a downward drag, so taps still reach the tiles/rows/inputs).
  const isDownwardSwipe = (_: unknown, g: PanResponderGestureState) =>
    g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx);

  const onMove = (_: GestureResponderEvent, g: PanResponderGestureState) => {
    if (g.dy > 0) translateY.setValue(g.dy);
  };

  const springBack = () =>
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();

  const onRelease = (_: GestureResponderEvent, g: PanResponderGestureState) => {
    if (g.dy > SWIPE_CLOSE_DISTANCE || g.vy > SWIPE_CLOSE_VELOCITY) {
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
    <Pressable style={styles.container} onPress={onClose}>
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            transform: [{ translateY }],
          },
        ]}
        {...bodyPan.panHandlers}
      >
        <View style={styles.grabberZone} {...grabberPan.panHandlers}>
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />
        </View>
        {children}
      </Animated.View>
    </Pressable>
  );

  return (
    <Modal
      visible={rendered}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
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
