import React from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  children: React.ReactNode;
  size: number;
  uploading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AvatarWithCameraOverlay({
  children,
  size,
  uploading = false,
  style,
}: Props) {
  return (
    <View style={[styles.wrap, { width: size, height: size }, style]}>
      {children}
      <View style={styles.badge} pointerEvents="none">
        {uploading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="camera" size={14} color="#fff" />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
});
