import React from "react";
import {
  Alert,
  Platform,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Button, Host, Menu, Rectangle } from "@expo/ui/swift-ui";
import { foregroundColor, frame } from "@expo/ui/swift-ui/modifiers";

// Wraps an arbitrary trigger (photo tile, avatar) with a native "Take photo /
// Choose from library" menu, matching the calorie tracker's AddLogMenu and
// CameraLogMenu. On iOS a real SwiftUI Menu is overlaid on the trigger: its
// label is a near-invisible rectangle sized to the trigger, since the label is
// the menu's tap target and SwiftUI won't hit-test a fully transparent shape.
// On other platforms it falls back to a plain press + Alert-style menu.
export function PhotoSourceMenu({
  width,
  height,
  onTakePhoto,
  onChooseFromLibrary,
  disabled = false,
  accessibilityLabel = "Add photo",
  style,
  children,
}: {
  width: number;
  height: number;
  onTakePhoto: () => void;
  onChooseFromLibrary: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  if (Platform.OS !== "ios") {
    return (
      <TouchableOpacity
        accessibilityLabel={accessibilityLabel}
        activeOpacity={0.7}
        disabled={disabled}
        style={style}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          Alert.alert("Add photo", undefined, [
            { text: "Take photo", onPress: onTakePhoto },
            { text: "Choose from library", onPress: onChooseFromLibrary },
            { text: "Cancel", style: "cancel" },
          ]);
        }}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={style} accessibilityLabel={accessibilityLabel}>
      {children}
      <Host
        style={[
          StyleSheet.absoluteFill,
          { pointerEvents: disabled ? "none" : "auto" },
        ]}
      >
        <Menu
          label={
            <Rectangle
              modifiers={[
                frame({ width, height }),
                foregroundColor("rgba(128,128,128,0.02)"),
              ]}
            />
          }
        >
          <Button
            label="Take photo"
            systemImage="camera"
            onPress={onTakePhoto}
          />
          <Button
            label="Choose from library"
            systemImage="photo.on.rectangle"
            onPress={onChooseFromLibrary}
          />
        </Menu>
      </Host>
    </View>
  );
}
