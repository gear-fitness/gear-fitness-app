import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "../../components/Text";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from "react-native-vision-camera";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { Ionicons } from "@expo/vector-icons";
import {
  getCameraLibraryOptions,
  resolveCamera,
} from "../../utils/inAppCamera";

// In-app camera presented as a full-screen modal. Consumers never render this
// directly: they call openCamera() (utils/inAppCamera) and await the URIs.
// The screen resolves with a capture, with library picks made through the
// last-photo shortcut, or with null when dismissed.

type FlashMode = "off" | "auto" | "on";

const SHUTTER_OUTER = 76;
const SHUTTER_INNER = 60;
const SIDE_BUTTON = 46;
const RETICLE_SIZE = 56;
// Cap pinch zoom well below device.maxZoom: phones report extremes (100x+)
// that are useless digital crops.
const MAX_ZOOM = 12;

export function CameraScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const cameraRef = useRef<Camera>(null);

  const { hasPermission, requestPermission } = useCameraPermission();
  const [permissionDenied, setPermissionDenied] = useState(
    () => Camera.getCameraPermissionStatus() === "denied",
  );
  const [facing, setFacing] = useState<"back" | "front">("back");
  const device = useCameraDevice(facing);
  const [flash, setFlash] = useState<FlashMode>("off");
  const [zoom, setZoom] = useState(1);
  const [capturing, setCapturing] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [libraryThumbUri, setLibraryThumbUri] = useState<string | null>(null);

  const zoomBase = useSharedValue(1);
  const shutterScale = useSharedValue(1);
  const captureFlash = useSharedValue(0);
  const reticleX = useSharedValue(0);
  const reticleY = useSharedValue(0);
  const reticleScale = useSharedValue(1);
  const reticleOpacity = useSharedValue(0);

  // If the screen unmounts without an explicit resolve (swipe-down dismiss,
  // hardware back), settle the pending request as a cancel. After a normal
  // resolve this is a no-op.
  useEffect(() => {
    return () => resolveCamera(null);
  }, []);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission().then((granted) => setPermissionDenied(!granted));
    }
  }, [hasPermission, requestPermission]);

  // Each device (back/front) has its own zoom range; start at its neutral
  // zoom whenever the active device changes.
  useEffect(() => {
    if (device) setZoom(device.neutralZoom);
  }, [device?.id]);

  // Most recent library photo for the gallery shortcut. Only read if photo
  // access was already granted elsewhere; never prompts from here.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const current = await MediaLibrary.getPermissionsAsync();
        if (!current.granted) return;
        const page = await MediaLibrary.getAssetsAsync({
          first: 1,
          mediaType: "photo",
          sortBy: [[MediaLibrary.SortBy.creationTime, false]],
        });
        const asset = page.assets[0];
        if (!asset) return;
        // asset.uri is a ph:// Photos identifier on iOS, which RN's Image
        // can't load (silently blank on the new architecture). Resolve the
        // real file:// URL instead.
        let uri = asset.uri;
        if (Platform.OS === "ios") {
          const info = await MediaLibrary.getAssetInfoAsync(asset.id);
          if (info.localUri) uri = info.localUri;
        }
        if (!cancelled) setLibraryThumbUri(uri);
      } catch {
        // Thumbnail is decorative; fall back to the plain icon.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const close = () => navigation.goBack();

  const toggleFacing = () => {
    Haptics.selectionAsync().catch(() => {});
    setFacing((prev) => (prev === "back" ? "front" : "back"));
  };

  const cycleFlash = () => {
    setFlash((prev) =>
      prev === "off" ? "auto" : prev === "auto" ? "on" : "off",
    );
  };

  const cameraReady = hasPermission && !!device;
  const minZoom = device?.minZoom ?? 1;
  const maxZoom = Math.min(device?.maxZoom ?? 1, MAX_ZOOM);

  const pinch = Gesture.Pinch()
    .enabled(!previewUri)
    .onStart(() => {
      zoomBase.value = zoom;
    })
    .onUpdate((e) => {
      const next = Math.min(
        maxZoom,
        Math.max(minZoom, zoomBase.value * e.scale),
      );
      runOnJS(setZoom)(next);
    });

  // Fast double-taps drift a few points between touches; the default
  // maxDistance is strict enough to reject them, so widen it. onStart fires
  // the moment the second tap lands rather than waiting for lift-off.
  const doubleTap = Gesture.Tap()
    .enabled(!previewUri)
    .numberOfTaps(2)
    .maxDelay(250)
    .maxDistance(30)
    .onStart(() => {
      runOnJS(toggleFacing)();
    });

  // Instagram-style tap to focus: a ring shrinks onto the tap point while
  // the sensor focuses (and meters exposure) at those exact coordinates.
  const tapToFocus = (x: number, y: number) => {
    if (!cameraReady) return;
    reticleX.value = x;
    reticleY.value = y;
    reticleScale.value = 1.6;
    reticleScale.value = withTiming(1, { duration: 260 });
    reticleOpacity.value = withSequence(
      withTiming(1, { duration: 80 }),
      withDelay(500, withTiming(0, { duration: 250 })),
    );
    if (device?.supportsFocus) {
      // Best-effort: focus() rejects if superseded by a newer focus request.
      cameraRef.current?.focus({ x, y }).catch(() => {});
    }
  };

  const singleTap = Gesture.Tap()
    .enabled(!previewUri)
    .numberOfTaps(1)
    .onEnd((event, success) => {
      if (success) runOnJS(tapToFocus)(event.x, event.y);
    });

  // Exclusive so a double tap wins; the single tap fires only once the
  // double-tap window has passed.
  const gestures = Gesture.Simultaneous(
    pinch,
    Gesture.Exclusive(doubleTap, singleTap),
  );

  const takePhoto = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    captureFlash.value = withSequence(
      withTiming(0.85, { duration: 60 }),
      withTiming(0, { duration: 200 }),
    );
    try {
      const photo = await cameraRef.current.takePhoto({
        flash: device?.hasFlash ? flash : "off",
      });
      setPreviewUri(`file://${photo.path}`);
    } catch {
      Alert.alert("Error", "Failed to take photo. Please try again.");
    } finally {
      setCapturing(false);
    }
  };

  const usePhoto = () => {
    if (!previewUri) return;
    resolveCamera({ uris: [previewUri], source: "capture" });
    navigation.goBack();
  };

  const openLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Photo Access Required",
        "Please allow photo library access in Settings to choose photos.",
        [{ text: "OK" }],
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      ...getCameraLibraryOptions(),
    });
    if (!result.canceled && result.assets?.length) {
      resolveCamera({
        uris: result.assets.map((a) => a.uri),
        source: "library",
      });
      navigation.goBack();
    }
  };

  const shutterInnerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shutterScale.value }],
  }));
  const captureFlashStyle = useAnimatedStyle(() => ({
    opacity: captureFlash.value,
  }));
  const reticleStyle = useAnimatedStyle(() => ({
    opacity: reticleOpacity.value,
    transform: [
      { translateX: reticleX.value - RETICLE_SIZE / 2 },
      { translateY: reticleY.value - RETICLE_SIZE / 2 },
      { scale: reticleScale.value },
    ],
  }));

  const flashIcon =
    flash === "off"
      ? "flash-off"
      : flash === "auto"
        ? "flash-outline"
        : "flash";

  return (
    <View style={styles.root}>
      {/* Preview */}
      <View style={[styles.previewWrap, { marginTop: insets.top + 4 }]}>
        <GestureDetector gesture={gestures}>
          <View style={styles.previewInner}>
            {cameraReady ? (
              <Camera
                ref={cameraRef}
                style={StyleSheet.absoluteFillObject}
                device={device}
                isActive={isFocused}
                photo={true}
                zoom={zoom}
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
                    <Text style={styles.permissionTitle}>
                      Camera access is off
                    </Text>
                    <Text style={styles.permissionBody}>
                      Allow camera access in Settings to take photos in Gear
                      Fitness.
                    </Text>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.permissionBtn}
                      onPress={() => Linking.openSettings()}
                    >
                      <Text style={styles.permissionBtnText}>
                        Open Settings
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : hasPermission && !device ? (
                  <Text style={styles.permissionBody}>
                    No camera available on this device.
                  </Text>
                ) : null}
              </View>
            )}

            {previewUri && (
              <Image
                source={{ uri: previewUri }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
              />
            )}

            <Animated.View
              pointerEvents="none"
              style={[styles.captureFlash, captureFlashStyle]}
            />

            <Animated.View
              pointerEvents="none"
              style={[styles.focusReticle, reticleStyle]}
            />

            {/* Top controls */}
            <View style={[styles.topRow, { top: 14 }]}>
              <TouchableOpacity
                accessibilityLabel="Close camera"
                activeOpacity={0.8}
                style={styles.topButton}
                onPress={close}
              >
                <Ionicons
                  name="close"
                  size={32}
                  color="#fff"
                  style={styles.topIcon}
                />
              </TouchableOpacity>
              {!previewUri && cameraReady && device.hasFlash && (
                <TouchableOpacity
                  accessibilityLabel={`Flash ${flash}`}
                  activeOpacity={0.8}
                  style={styles.topButton}
                  onPress={cycleFlash}
                >
                  <Ionicons
                    name={flashIcon}
                    size={28}
                    color="#fff"
                    style={styles.topIcon}
                  />
                  {flash === "auto" && (
                    <Text style={styles.flashAutoBadge}>A</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </GestureDetector>
      </View>

      {/* Bottom controls */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 18) },
        ]}
      >
        {previewUri ? (
          <>
            <TouchableOpacity
              accessibilityLabel="Retake photo"
              activeOpacity={0.7}
              style={styles.retakeBtn}
              onPress={() => setPreviewUri(null)}
            >
              <Text style={styles.retakeText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Use photo"
              activeOpacity={0.85}
              style={styles.useBtn}
              onPress={usePhoto}
            >
              <Text style={styles.useBtnText}>Use photo</Text>
              <Ionicons name="arrow-forward" size={15} color="#000" />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              accessibilityLabel="Choose from library"
              activeOpacity={0.8}
              style={styles.libraryBtn}
              onPress={openLibrary}
            >
              {libraryThumbUri ? (
                <Image
                  source={{ uri: libraryThumbUri }}
                  style={StyleSheet.absoluteFillObject}
                  resizeMode="cover"
                  onError={() => setLibraryThumbUri(null)}
                />
              ) : (
                <Ionicons
                  name="images-outline"
                  size={20}
                  color="rgba(255,255,255,0.85)"
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityLabel="Take photo"
              activeOpacity={1}
              disabled={!cameraReady || capturing}
              onPressIn={() => {
                shutterScale.value = withSpring(0.82, {
                  damping: 18,
                  stiffness: 320,
                });
              }}
              onPressOut={() => {
                shutterScale.value = withSpring(1, {
                  damping: 18,
                  stiffness: 320,
                });
              }}
              onPress={takePhoto}
              style={[
                styles.shutterOuter,
                (!cameraReady || capturing) && { opacity: 0.4 },
              ]}
            >
              <Animated.View style={[styles.shutterInner, shutterInnerStyle]} />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityLabel="Flip camera"
              activeOpacity={0.8}
              style={styles.flipBtn}
              onPress={toggleFacing}
              disabled={!cameraReady}
            >
              <Ionicons name="sync-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  previewWrap: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#111",
  },
  previewInner: {
    flex: 1,
  },
  captureFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#fff",
  },
  focusReticle: {
    position: "absolute",
    top: 0,
    left: 0,
    width: RETICLE_SIZE,
    height: RETICLE_SIZE,
    borderRadius: RETICLE_SIZE / 2,
    borderWidth: 1.5,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
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
  flashAutoBadge: {
    position: "absolute",
    top: 2,
    right: 3,
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
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
  bottomBar: {
    height: 128,
    paddingTop: 22,
    paddingHorizontal: 34,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  libraryBtn: {
    width: SIDE_BUTTON,
    height: SIDE_BUTTON,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.7)",
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginTop: (SHUTTER_OUTER - SIDE_BUTTON) / 2,
  },
  flipBtn: {
    width: SIDE_BUTTON,
    height: SIDE_BUTTON,
    borderRadius: SIDE_BUTTON / 2,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: (SHUTTER_OUTER - SIDE_BUTTON) / 2,
  },
  shutterOuter: {
    width: SHUTTER_OUTER,
    height: SHUTTER_OUTER,
    borderRadius: SHUTTER_OUTER / 2,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: SHUTTER_INNER,
    height: SHUTTER_INNER,
    borderRadius: SHUTTER_INNER / 2,
    backgroundColor: "#fff",
  },
  retakeBtn: {
    height: SHUTTER_OUTER,
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  retakeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  useBtn: {
    height: 48,
    marginTop: (SHUTTER_OUTER - 48) / 2,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  useBtnText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
});
