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
  onSkip: () => void;
}

const DESTRUCTIVE = "#C93838";

export function StartCountdownOverlay({
  visible,
  countdownValue,
  isDark,
  onCancel,
  onSkip,
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
          <TouchableOpacity activeOpacity={0.6} onPress={onSkip} hitSlop={25}>
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
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.countdownCancelButton]}
          onPress={onCancel}
        >
          <Text style={[styles.countdownCancelText]}>Cancel</Text>
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
    height: 46,
    paddingHorizontal: 36,
    marginTop: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: DESTRUCTIVE,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  countdownCancelText: {
    fontSize: 15,
    color: DESTRUCTIVE,
    fontWeight: "700",
  },
});
