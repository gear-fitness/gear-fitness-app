import React from "react";
import {
  View,
  StyleSheet,
  Pressable,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Text } from "./Text";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../hooks/useThemeColors";

const PLUS_ACCENT = "#4F6BF6";

interface PlusLockOverlayProps {
  /** Called when the overlay is tapped — typically opens the Plus upsell. */
  onPress: () => void;
  /** Short label under the lock icon. Defaults to "Plus". */
  label?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * An absolutely-filling translucent overlay that covers Plus-gated content.
 * Place inside a relatively-positioned parent. Self-contained: it does not
 * navigate — the consumer passes `onPress` (e.g. opening the PlusUpsell sheet).
 */
export function PlusLockOverlay({
  onPress,
  label = "Plus",
  style,
}: PlusLockOverlayProps) {
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.overlay,
        {
          backgroundColor: colors.isDark
            ? "rgba(10,10,10,0.72)"
            : "rgba(255,255,255,0.78)",
        },
        style,
      ]}
    >
      <Ionicons name="lock-closed" size={26} color={PLUS_ACCENT} />
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.subtext, { color: colors.secondary }]}>
        Tap to unlock
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 8,
  },
  subtext: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
});
