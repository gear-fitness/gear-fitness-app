import React from "react";
import { Alert, Platform, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { GlassView } from "expo-glass-effect";
import { Host, Menu, Button, Image } from "@expo/ui/swift-ui";

// A small glass camera button that opens a native menu of photo-based logging
// options: scan a barcode, take a photo, or choose an existing photo. The
// three handlers come from useCameraFoodLog via the tracker.
//
// On iOS this is a real SwiftUI Menu (anchored to the camera icon) sitting on a
// liquid-glass pill; on other platforms it falls back to a plain button + an
// Alert-style menu, since the SwiftUI components are iOS-only.
export function CameraLogMenu({
  size = 38,
  color,
  onScanBarcode,
  onTakePhoto,
  onChooseFromLibrary,
}: {
  size?: number;
  color: string;
  onScanBarcode: () => void;
  onTakePhoto: () => void;
  onChooseFromLibrary: () => void;
}) {
  const pill = { width: size, height: size, borderRadius: size / 2 };

  if (Platform.OS !== "ios") {
    return (
      <GlassView style={[styles.glass, pill]}>
        <TouchableOpacity
          accessibilityLabel="Log with camera"
          style={[styles.center, pill]}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            Alert.alert("Log with camera", undefined, [
              { text: "Scan barcode", onPress: onScanBarcode },
              { text: "Take photo", onPress: onTakePhoto },
              { text: "Choose from library", onPress: onChooseFromLibrary },
              { text: "Cancel", style: "cancel" },
            ]);
          }}
        >
          <Ionicons
            name="camera"
            size={Math.round(size * 0.45)}
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
              systemName="camera.fill"
              size={Math.round(size * 0.42)}
              color={color}
            />
          }
        >
          <Button
            label="Scan barcode"
            systemImage="barcode.viewfinder"
            onPress={onScanBarcode}
          />
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
    </GlassView>
  );
}

const styles = StyleSheet.create({
  glass: { overflow: "hidden" },
  center: { alignItems: "center", justifyContent: "center" },
});
