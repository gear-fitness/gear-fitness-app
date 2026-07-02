import React from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Host, Menu, Button, Toggle, Image } from "@expo/ui/swift-ui";

// A bare pencil icon that opens a native menu of category actions (rename /
// recurring / delete). On iOS it's a real SwiftUI Menu anchored to the pencil;
// elsewhere it falls back to a plain button + Alert. `onSelected` is called after
// any action fires so the caller can close the swipe row.
export function MealMenuButton({
  name,
  recurring,
  size = 44,
  color,
  onRename,
  onToggleRecurring,
  onDelete,
  onSelected,
}: {
  name: string;
  recurring: boolean;
  size?: number;
  color: string;
  onRename: () => void;
  onToggleRecurring: () => void;
  onDelete: () => void;
  onSelected?: () => void;
}) {
  const rename = () => {
    onRename();
    onSelected?.();
  };
  const toggleRecurring = () => {
    onToggleRecurring();
    onSelected?.();
  };
  const remove = () => {
    onDelete();
    onSelected?.();
  };

  if (Platform.OS !== "ios") {
    return (
      <TouchableOpacity
        accessibilityLabel={`${name} options`}
        style={[styles.center, { width: size, height: size }]}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          Alert.alert(name, undefined, [
            {
              text: recurring ? "Remove recurring" : "Make recurring",
              onPress: toggleRecurring,
            },
            { text: "Rename", onPress: rename },
            { text: "Delete", style: "destructive", onPress: remove },
            { text: "Cancel", style: "cancel", onPress: onSelected },
          ]);
        }}
      >
        <Ionicons name="pencil" size={Math.round(size * 0.5)} color={color} />
      </TouchableOpacity>
    );
  }

  return (
    <Host style={{ width: size, height: size }}>
      <Menu
        label={
          <Image
            systemName="pencil"
            size={Math.round(size * 0.5)}
            color={color}
          />
        }
      >
        <Button label="Rename" systemImage="pencil" onPress={rename} />
        <Toggle
          label="Recurring"
          systemImage="repeat"
          isOn={recurring}
          onIsOnChange={toggleRecurring}
        />
        <Button
          label="Delete"
          role="destructive"
          systemImage="trash"
          onPress={remove}
        />
      </Menu>
    </Host>
  );
}

// Leading swipe action for a meal card: the pencil menu, revealed on the left as
// the row is dragged right by <Swipeable renderLeftActions>. Swipeable already
// translates the action area, so nothing here is animated on its own.
export function MealSwipeLeftAction({
  size = 44,
  ...menuProps
}: {
  size?: number;
} & React.ComponentProps<typeof MealMenuButton>) {
  return (
    <View style={styles.leftContainer}>
      <MealMenuButton size={size} {...menuProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  leftContainer: {
    width: 64,
    justifyContent: "center",
    alignItems: "center",
  },
});
