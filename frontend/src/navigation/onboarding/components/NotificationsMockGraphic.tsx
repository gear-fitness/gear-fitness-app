import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useOnboardingColors } from "./useOnboardingColors";

/** A stylised iOS notification-permission dialog used as the hero on the
 *  Notifications screen. Tapping a button drives the real flow. */
export function NotificationsMockGraphic({
  onAllow,
  onDeny,
}: {
  onAllow: () => void;
  onDeny: () => void;
}) {
  const colors = useOnboardingColors();
  const { width: screenW } = useWindowDimensions();
  const cardBg = colors.isDark ? "#2C2C2E" : "#ECECEE";
  const btnBg = colors.isDark ? "#3A3A3C" : "#DEDEE1";
  // Fill the body content width (screen minus the 24pt body padding each side).
  const cardWidth = Math.min(screenW - 48, 360);

  return (
    <View style={styles.wrap}>
      <View
        style={[styles.card, { width: cardWidth, backgroundColor: cardBg }]}
      >
        <Text style={[styles.title, { color: colors.text }]}>
          “Gear Fitness” would like to send you Notifications
        </Text>
        <View style={styles.btnRow}>
          <Pressable
            onPress={onDeny}
            style={({ pressed }) => [
              styles.btn,
              { backgroundColor: btnBg },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.btnText, { color: colors.text }]}>
              Don't Allow
            </Text>
          </Pressable>
          <Pressable
            onPress={onAllow}
            style={({ pressed }) => [
              styles.btn,
              { backgroundColor: btnBg },
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[styles.btnText, styles.allow, { color: colors.text }]}
            >
              Allow
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "stretch",
    alignItems: "center",
  },
  card: {
    borderRadius: 28,
    paddingHorizontal: 26,
    paddingVertical: 26,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 9 },
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 27,
    marginBottom: 24,
  },
  btnRow: {
    flexDirection: "row",
    gap: 14,
  },
  btn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    fontSize: 18,
    fontWeight: "500",
  },
  allow: {
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.6,
  },
});
