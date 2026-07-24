import { ComponentProps } from "react";
import { Alert, Platform, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Host, Menu, Button, Image } from "@expo/ui/swift-ui";

export interface ExerciseMenuItem {
  key: string;
  label: string;
  systemImage: NonNullable<ComponentProps<typeof Button>["systemImage"]>;
  onPress: () => void;
}

// Ellipsis-anchored exercise actions menu, built on the same pattern as
// nutrition's CameraLogMenu: on iOS a real SwiftUI Menu (Host + Menu + Button
// with systemImage) anchored to the glyph; elsewhere a plain button that opens
// an Alert-style list, since the SwiftUI components are iOS-only.
export function ExerciseOptionsMenu({
  items,
  color,
  size = 40,
}: {
  items: ExerciseMenuItem[];
  color: string;
  size?: number;
}) {
  if (Platform.OS !== "ios") {
    return (
      <TouchableOpacity
        accessibilityLabel="Exercise options"
        style={[styles.center, { width: size, height: size }]}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          Alert.alert("Exercise options", undefined, [
            ...items.map((item) => ({
              text: item.label,
              onPress: item.onPress,
            })),
            { text: "Cancel", style: "cancel" as const },
          ]);
        }}
      >
        <Ionicons name="ellipsis-horizontal" size={22} color={color} />
      </TouchableOpacity>
    );
  }

  // The mounted SwiftUI Host does not survive its Menu's children being
  // restructured (linking a superset grows the menu from 2 items to 3, after
  // which the ellipsis stops responding to taps). Key the Host by the item
  // structure so any change rebuilds the native menu from scratch; structure
  // only changes on link/unlink, so remounts are rare and invisible.
  const structureKey = items.map((i) => `${i.key}:${i.label}`).join("|");

  return (
    <Host key={structureKey} style={{ width: size, height: size }}>
      <Menu label={<Image systemName="ellipsis" size={18} color={color} />}>
        {items.map((item) => (
          <Button
            key={item.key}
            label={item.label}
            systemImage={item.systemImage}
            onPress={item.onPress}
          />
        ))}
      </Menu>
    </Host>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
});
