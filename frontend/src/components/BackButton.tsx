import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { SymbolView } from "expo-symbols";

interface BackButtonProps {
  onPress: () => void;
  color?: string;
  size?: number;
}

const CONTAINER_SIZE = 36;

export function BackButton({
  onPress,
  color = "#fff",
  size = 22,
}: BackButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      activeOpacity={0.5}
    >
      <SymbolView name="chevron.backward" size={size} tintColor={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CONTAINER_SIZE,
    height: CONTAINER_SIZE,
    borderRadius: CONTAINER_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
  },
});
