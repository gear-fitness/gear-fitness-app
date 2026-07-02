import React from "react";
import { Alert, Platform, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { GlassView } from "expo-glass-effect";
import { Host, Menu, Button, Image } from "@expo/ui/swift-ui";

// A small glass "+" button that opens a native menu of ways to add to the day:
// log a food, or create a new meal category. On iOS this is a real SwiftUI Menu
// anchored to the plus icon sitting on a liquid-glass pill; on other platforms
// it falls back to a plain button + an Alert-style menu (SwiftUI is iOS-only).
export function AddLogMenu({
  size = 38,
  color,
  onAddFood,
  onAddCategory,
}: {
  size?: number;
  color: string;
  onAddFood: () => void;
  onAddCategory: () => void;
}) {
  const pill = { width: size, height: size, borderRadius: size / 2 };

  if (Platform.OS !== "ios") {
    return (
      <GlassView style={[styles.glass, pill]}>
        <TouchableOpacity
          accessibilityLabel="Add to day"
          style={[styles.center, pill]}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            Alert.alert("Add", undefined, [
              { text: "Add food", onPress: onAddFood },
              { text: "Add meal category", onPress: onAddCategory },
              { text: "Cancel", style: "cancel" },
            ]);
          }}
        >
          <MaterialCommunityIcons
            name="plus"
            size={Math.round(size * 0.63)}
            color={color}
          />
        </TouchableOpacity>
      </GlassView>
    );
  }

  return (
    <GlassView style={[styles.glass, pill]}>
      <Host style={{ width: size, height: size }}>
        <Menu
          label={
            <Image
              systemName="plus"
              size={Math.round(size * 0.5)}
              color={color}
            />
          }
        >
          <Button
            label="Add food"
            systemImage="fork.knife"
            onPress={onAddFood}
          />
          <Button
            label="Add meal category"
            systemImage="folder.badge.plus"
            onPress={onAddCategory}
          />
        </Menu>
      </Host>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  glass: { overflow: "hidden" },
  center: { alignItems: "center", justifyContent: "center" },
});
