import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface StartCountdownOverlayProps {
  visible: boolean;
  countdownValue: number;
  isDark: boolean;
  onCancel: () => void;
}

export function StartCountdownOverlay({
  visible,
  countdownValue,
  isDark,
  onCancel,
}: StartCountdownOverlayProps) {
  const countdownScale = useRef(new Animated.Value(0.7)).current;
  const countdownOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    countdownScale.setValue(0.5);
    countdownOpacity.setValue(0);

    Animated.parallel([
      Animated.spring(countdownScale, {
        toValue: 1,
        friction: 80,
        tension: 0,
        useNativeDriver: true,
      }),
      Animated.timing(countdownOpacity, {
        toValue: 1,
        duration: 620,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, countdownValue, countdownOpacity, countdownScale]);

  return (
    <Modal visible={visible} transparent={false} animationType="none">
      <View
        style={[
          styles.countdownOverlay,
          { backgroundColor: isDark ? "#000" : "#fff" },
        ]}
      >
        <View style={styles.countdownContent}>
          <Animated.Text
            style={[
              styles.countdownNumber,
              {
                color: isDark ? "#fff" : "#000",
                opacity: countdownOpacity,
                transform: [{ scale: countdownScale }],
              },
            ]}
          >
            {countdownValue}
          </Animated.Text>
        </View>

        <TouchableOpacity
          style={[
            styles.countdownCancelButton,
            {
              backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#f4f4f4",
              borderColor: isDark ? "rgba(255,255,255,0.22)" : "#dedede",
            },
          ]}
          onPress={onCancel}
        >
          <Text
            style={[styles.countdownCancelText, { color: isDark ? "#fff" : "#111" }]}
          >
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  countdownContent: {
    alignItems: "center",
    justifyContent: "center",
    flex: 0,
  },
  countdownNumber: {
    fontSize: 154,
    lineHeight: 164,
    fontWeight: "900",
  },
  countdownCancelButton: {
    width: "62%",
    maxWidth: 200,
    height: 44,
    marginTop: 24,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  countdownCancelText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
