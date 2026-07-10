import { useEffect, useRef, useState } from "react";
import {
  Linking,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Text } from "../../components/Text";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from "react-native-vision-camera";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { resolveBarcode } from "../../utils/barcodeScanner";

// Full-screen barcode scanner for food logging. Consumers never render this
// directly: they call openBarcodeScanner() (utils/barcodeScanner) and await
// the code. Resolves with the first retail barcode seen, or null on dismiss.

const FRAME_WIDTH_RATIO = 0.78;
const FRAME_ASPECT = 0.62;

export function BarcodeScannerScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { width } = useWindowDimensions();

  const { hasPermission, requestPermission } = useCameraPermission();
  const [permissionDenied, setPermissionDenied] = useState(
    () => Camera.getCameraPermissionStatus() === "denied",
  );
  const device = useCameraDevice("back");
  const [torch, setTorch] = useState(false);
  // Fire-once guard: onCodeScanned keeps streaming frames after a hit, and
  // resolving twice would leak into the next pending request.
  const scannedRef = useRef(false);

  // If the screen unmounts without an explicit resolve (swipe-down dismiss,
  // hardware back), settle the pending request as a cancel. After a normal
  // resolve this is a no-op.
  useEffect(() => {
    return () => resolveBarcode(null);
  }, []);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission().then((granted) => setPermissionDenied(!granted));
    }
  }, [hasPermission, requestPermission]);

  const codeScanner = useCodeScanner({
    codeTypes: ["ean-13", "ean-8", "upc-a", "upc-e"],
    onCodeScanned: (codes) => {
      if (scannedRef.current) return;
      const value = codes[0]?.value;
      if (!value) return;
      scannedRef.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
      resolveBarcode(value);
      navigation.goBack();
    },
  });

  const cameraReady = hasPermission && !!device;
  const frameWidth = Math.round(width * FRAME_WIDTH_RATIO);
  const frameHeight = Math.round(frameWidth * FRAME_ASPECT);

  return (
    <View style={styles.root}>
      {cameraReady ? (
        <Camera
          style={StyleSheet.absoluteFillObject}
          device={device}
          isActive={isFocused}
          codeScanner={codeScanner}
          torch={torch ? "on" : "off"}
        />
      ) : (
        <View style={styles.permissionBlock}>
          {permissionDenied ? (
            <>
              <Ionicons
                name="videocam-off-outline"
                size={34}
                color="rgba(255,255,255,0.55)"
              />
              <Text style={styles.permissionTitle}>Camera access is off</Text>
              <Text style={styles.permissionBody}>
                Allow camera access in Settings to scan barcodes in Gear
                Fitness.
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.permissionBtn}
                onPress={() => Linking.openSettings()}
              >
                <Text style={styles.permissionBtnText}>Open Settings</Text>
              </TouchableOpacity>
            </>
          ) : hasPermission && !device ? (
            <Text style={styles.permissionBody}>
              No camera available on this device.
            </Text>
          ) : null}
        </View>
      )}

      {/* Dimmed surround with a clear viewfinder cutout. Four panels rather
          than a masked overlay keep this pure layout, no extra deps. */}
      {cameraReady && (
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          <View style={styles.dimRow} />
          <View style={{ flexDirection: "row" }}>
            <View style={styles.dimSide} />
            <View style={{ width: frameWidth, height: frameHeight }}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <View style={styles.dimSide} />
          </View>
          <View style={[styles.dimRow, styles.hintArea]}>
            <Text style={styles.hint}>Point your camera at a barcode</Text>
          </View>
        </View>
      )}

      {/* Top controls */}
      <View style={[styles.topRow, { top: insets.top + 10 }]}>
        <TouchableOpacity
          accessibilityLabel="Close barcode scanner"
          activeOpacity={0.8}
          style={styles.topButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="close"
            size={32}
            color="#fff"
            style={styles.topIcon}
          />
        </TouchableOpacity>
        {cameraReady && device.hasTorch && (
          <TouchableOpacity
            accessibilityLabel={torch ? "Turn torch off" : "Turn torch on"}
            activeOpacity={0.8}
            style={styles.topButton}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setTorch((prev) => !prev);
            }}
          >
            <Ionicons
              name={torch ? "flashlight" : "flashlight-outline"}
              size={26}
              color="#fff"
              style={styles.topIcon}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const DIM = "rgba(0,0,0,0.55)";
const CORNER = 26;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  dimRow: {
    flex: 1,
    backgroundColor: DIM,
  },
  dimSide: {
    flex: 1,
    backgroundColor: DIM,
  },
  hintArea: {
    alignItems: "center",
    paddingTop: 26,
  },
  hint: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: -0.2,
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  corner: {
    position: "absolute",
    width: CORNER,
    height: CORNER,
    borderColor: "#fff",
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 14,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 14,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 14,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 14,
  },
  topRow: {
    position: "absolute",
    left: 14,
    right: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  topButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  // The icons sit directly on the live feed; a soft shadow keeps them
  // readable over bright scenes.
  topIcon: {
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  permissionBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    gap: 10,
  },
  permissionTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.2,
    marginTop: 4,
  },
  permissionBody: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  permissionBtn: {
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#fff",
  },
  permissionBtnText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "600",
  },
});
