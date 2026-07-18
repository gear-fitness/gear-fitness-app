import { useEffect, useState } from "react";
import {
  Dimensions,
  Keyboard,
  KeyboardEvent,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { GlassView } from "expo-glass-effect";
import { SymbolView } from "expo-symbols";

// Height the keyboard occupies from the bottom of the window, treating a frame
// that sits at or below the window bottom (or has no height) as hidden. Used to
// derive a single consistent value from any keyboard event's endCoordinates.
function heightFromCoordinates(coords: {
  screenY: number;
  height: number;
}): number {
  const windowHeight = Dimensions.get("window").height;
  if (coords.height === 0 || coords.screenY >= windowHeight) return 0;
  return coords.height;
}

export function FloatingKeyboardDismiss() {
  const isDark = useColorScheme() === "dark";
  // Seed from the current keyboard so the pill appears even when this mounts
  // while the keyboard is already up (e.g. a sheet opening over a focused
  // input). Keyboard.isVisible()/metrics() are available in RN 0.83.
  const [keyboardHeight, setKeyboardHeight] = useState(() => {
    if (Keyboard.isVisible()) {
      return Keyboard.metrics()?.height ?? 0;
    }
    return 0;
  });

  useEffect(() => {
    if (Platform.OS === "ios") {
      // On iOS willShow/willHide/willChangeFrame all carry endCoordinates, and
      // changeFrame fires alongside show/hide as well as on standalone frame
      // changes (e.g. switching keyboard type). Derive the height from the same
      // handler for all three so the listeners never fight each other.
      const onFrame = (e: KeyboardEvent) => {
        setKeyboardHeight(heightFromCoordinates(e.endCoordinates));
      };
      const subs = [
        Keyboard.addListener("keyboardWillShow", onFrame),
        Keyboard.addListener("keyboardWillHide", onFrame),
        Keyboard.addListener("keyboardWillChangeFrame", onFrame),
      ];
      return () => subs.forEach((s) => s.remove());
    }

    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (keyboardHeight === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { bottom: keyboardHeight + 8 }]}
    >
      <GlassView style={styles.pill}>
        <TouchableOpacity
          onPress={() => Keyboard.dismiss()}
          accessibilityLabel="Dismiss keyboard"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.button}
        >
          <SymbolView
            key={isDark ? "dark" : "light"}
            name="keyboard.chevron.compact.down"
            tintColor={isDark ? "#fff" : "#000"}
            size={22}
          />
        </TouchableOpacity>
      </GlassView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 16,
    alignItems: "flex-end",
  },
  pill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
  },
  button: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
