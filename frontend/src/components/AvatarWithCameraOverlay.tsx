import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Spinner } from "./Spinner";

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
      {uploading && (
        <View
          style={[
            styles.uploadingOverlay,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
          pointerEvents="none"
        >
          <Spinner size="large" color="#fff" />
        </View>
      )}
      <View style={styles.badge} pointerEvents="none">
        {uploading ? (
          <Spinner size="small" color="#fff" />
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
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
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
