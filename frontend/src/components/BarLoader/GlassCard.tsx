import React, { ReactNode } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useThemeColors } from "../../hooks/useThemeColors";

const CARD_RADIUS = 24;

/** Standard glass surface with the app's card fallback, radius 24. */
export function GlassCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  const t = useThemeColors();

  if (isLiquidGlassAvailable()) {
    return (
      <GlassView glassEffectStyle="regular" style={[styles.card, style]}>
        {children}
      </GlassView>
    );
  }
  return (
    <View
      style={[
        styles.card,
        styles.fallback,
        { backgroundColor: t.cardBg, borderColor: t.cardBorder },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: CARD_RADIUS,
    overflow: "hidden",
  },
  fallback: {
    borderWidth: StyleSheet.hairlineWidth,
  },
});
