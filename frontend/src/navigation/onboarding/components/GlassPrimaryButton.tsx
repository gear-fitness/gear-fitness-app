import React from "react";
import { Pressable, Text, StyleSheet, View, ActivityIndicator } from "react-native";

interface GlassPrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "dark" | "white";
  icon?: React.ReactNode;
}

export function GlassPrimaryButton({
  label,
  onPress,
  loading = false,
  variant = "dark",
  icon,
}: GlassPrimaryButtonProps) {
  const isDark = variant === "dark";
  const labelColor = isDark ? "#fff" : "#000";

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.pressable,
        pressed && !loading ? styles.pressablePressed : undefined,
      ]}
    >
      <View style={[styles.button, isDark ? styles.dark : styles.white]}>
        {loading ? (
          <ActivityIndicator color={labelColor} />
        ) : (
          <>
            {icon}
            <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: "100%",
  },
  pressablePressed: {
    transform: [{ scale: 0.985 }],
  },
  button: {
    height: 60,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    overflow: "hidden",
  },
  dark: {
    backgroundColor: "#000000",
  },
  white: {
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.2)",
  },
  label: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
});
