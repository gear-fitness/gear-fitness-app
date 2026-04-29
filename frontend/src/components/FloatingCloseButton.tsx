import React from "react";
import { StyleSheet, TouchableOpacity, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import Svg, { Path } from "react-native-svg";

type Props = {
  onPress?: () => void;
  accessibilityLabel?: string;
  direction?: "down" | "left";
};

export function FloatingCloseButton({
  onPress,
  accessibilityLabel = "Close",
  direction = "down",
}: Props) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const glassAvailable = isLiquidGlassAvailable();

  const stroke = isDark ? "#fff" : "#000";
  const surface = isDark ? "#141414" : "#ffffff";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const handleDefaultPress = () => {
    const parent = navigation.getParent();
    if (parent) parent.goBack();
    else navigation.goBack();
  };

  return (
    <TouchableOpacity
      accessibilityLabel={accessibilityLabel}
      onPress={onPress ?? handleDefaultPress}
      activeOpacity={0.7}
      style={[
        styles.button,
        {
          top: insets.top + 8,
          backgroundColor: glassAvailable ? "transparent" : surface,
          borderColor: glassAvailable ? "transparent" : border,
        },
      ]}
    >
      {glassAvailable && (
        <GlassView
          style={[StyleSheet.absoluteFillObject, { borderRadius: 20 }]}
          glassEffectStyle="regular"
          isInteractive
        />
      )}
      <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
        <Path
          d={direction === "left" ? "M10 4l-4 4 4 4" : "M4 6l4 4 4-4"}
          stroke={stroke}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
