import React from "react";
import { TouchableOpacity, StyleSheet, ColorValue } from "react-native";
import { SymbolView } from "expo-symbols";

interface BackButtonProps {
  onPress: () => void;
  color?: ColorValue;
  size?: number;
}

/** Width/height of the tap target; use as horizontal spacer when centering a title beside the button. */
export const BACK_BUTTON_SLOT_WIDTH = 36;

export function BackButton({
  onPress,
  color = "#fff",
  size = 22,
}: BackButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.container,
        { width: BACK_BUTTON_SLOT_WIDTH, height: BACK_BUTTON_SLOT_WIDTH },
      ]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      activeOpacity={0.5}
    >
      <SymbolView
        name="chevron.backward"
        size={size}
        tintColor={color as string}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BACK_BUTTON_SLOT_WIDTH / 2,
    justifyContent: "center",
    alignItems: "center",
  },
});
