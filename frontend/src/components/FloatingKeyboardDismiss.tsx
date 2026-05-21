import { useEffect, useState } from "react";
import {
  Keyboard,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { GlassView } from "expo-glass-effect";
import { SymbolView } from "expo-symbols";

export function FloatingKeyboardDismiss() {
  const isDark = useColorScheme() === "dark";
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvt =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvt, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvt, () => {
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
