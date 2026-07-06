import React from "react";
import { Alert, Platform, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { GlassView } from "expo-glass-effect";
import { Host, Menu, Button, Image } from "@expo/ui/swift-ui";

// A small glass camera button that opens a native menu of photo-based logging
// options: scan a barcode, take a photo, or choose an existing photo. All three
// are stubbed no-ops for now.
//
// On iOS this is a real SwiftUI Menu (anchored to the camera icon) sitting on a
// liquid-glass pill; on other platforms it falls back to a plain button + an
// Alert-style menu, since the SwiftUI components are iOS-only.
export function CameraLogMenu({
  size = 38,
  color,
}: {
  size?: number;
  color: string;
}) {
  // Stubs — wired to nothing yet.
  const scanBarcode = () => {};
  const takePhoto = () => {};
  const chooseFromLibrary = () => {};

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
              { text: "Scan barcode", onPress: scanBarcode },
              { text: "Take photo", onPress: takePhoto },
              { text: "Choose from library", onPress: chooseFromLibrary },
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
            onPress={scanBarcode}
          />
          <Button label="Take photo" systemImage="camera" onPress={takePhoto} />
          <Button
            label="Choose from library"
            systemImage="photo.on.rectangle"
            onPress={chooseFromLibrary}
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
