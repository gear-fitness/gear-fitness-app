import { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import * as ImagePicker from "expo-image-picker";

type WorkoutCameraModalProps = {
  visible: boolean;
  remaining: number;
  onClose: () => void;
  onCaptured: (uris: string[]) => void;
};

export function WorkoutCameraModal({
  visible,
  remaining,
  onClose,
  onCaptured,
}: WorkoutCameraModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [recentUri, setRecentUri] = useState<string | null>(null);
  const [hasLibraryPerm, setHasLibraryPerm] = useState<boolean>(false);
  const [capturing, setCapturing] = useState(false);
  const [ready, setReady] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (!visible) {
      setReady(false);
      return;
    }
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
    (async () => {
      const lib = await MediaLibrary.requestPermissionsAsync();
      setHasLibraryPerm(lib.status === "granted");
      if (lib.status === "granted") {
        try {
          const page = await MediaLibrary.getAssetsAsync({
            first: 1,
            mediaType: "photo",
            sortBy: [["creationTime", false]],
          });
          if (page.assets.length > 0) {
            setRecentUri(page.assets[0].uri);
          }
        } catch (e) {
          // ignore — fall back to icon
        }
      }
    })();
  }, [visible]);

  const handleCapture = async () => {
    if (!cameraRef.current || capturing || !ready) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });
      if (photo?.uri) {
        onCaptured([photo.uri]);
        onClose();
      }
    } catch (e) {
      Alert.alert("Camera Error", "Could not capture photo. Please try again.");
    } finally {
      setCapturing(false);
    }
  };

  const handleOpenLibrary = async () => {
    const perm = hasLibraryPerm
      ? { status: "granted" as const }
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert(
        "Photo Access Required",
        "Please allow photo library access in Settings to choose photos.",
        [{ text: "OK" }],
      );
      return;
    }
    const slots = Math.max(1, remaining);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: slots > 1,
      selectionLimit: slots,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length) {
      const uris = result.assets.map((a) => a.uri).slice(0, slots);
      onCaptured(uris);
      onClose();
    }
  };

  const flipCamera = () =>
    setFacing((prev) => (prev === "back" ? "front" : "back"));

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.root}>
        {permission && !permission.granted ? (
          <SafeAreaView style={styles.permissionContainer}>
            <Ionicons name="camera-outline" size={48} color="#fff" />
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionBody}>
              Allow camera access to take photos of your workouts.
            </Text>
            {permission.canAskAgain ? (
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={requestPermission}
                activeOpacity={0.8}
              >
                <Text style={styles.permissionButtonText}>Grant Access</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={() => Linking.openSettings()}
                activeOpacity={0.8}
              >
                <Text style={styles.permissionButtonText}>Open Settings</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.permissionCancel}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.permissionCancelText}>Cancel</Text>
            </TouchableOpacity>
          </SafeAreaView>
        ) : (
          <>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFillObject}
              facing={facing}
              onCameraReady={() => setReady(true)}
            />
            <SafeAreaView style={styles.overlay} pointerEvents="box-none">
              <View style={styles.topBar}>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.iconButton}
                  activeOpacity={0.7}
                  accessibilityLabel="Close camera"
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="close" size={26} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={flipCamera}
                  style={styles.iconButton}
                  activeOpacity={0.7}
                  accessibilityLabel="Flip camera"
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="camera-reverse-outline" size={26} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.bottomBar}>
                <TouchableOpacity
                  onPress={handleOpenLibrary}
                  style={styles.thumbTile}
                  activeOpacity={0.8}
                  accessibilityLabel="Choose from library"
                >
                  {recentUri ? (
                    <Image source={{ uri: recentUri }} style={styles.thumbImg} />
                  ) : (
                    <View style={styles.thumbFallback}>
                      <Ionicons name="images" size={22} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleCapture}
                  activeOpacity={0.8}
                  disabled={capturing || !ready}
                  style={styles.shutterOuter}
                  accessibilityLabel="Take photo"
                >
                  <View style={styles.shutterInner}>
                    {capturing ? (
                      <ActivityIndicator color="#111" />
                    ) : null}
                  </View>
                </TouchableOpacity>

                <View style={styles.thumbTilePlaceholder} />
              </View>
            </SafeAreaView>
          </>
        )}
      </View>
    </Modal>
  );
}

const THUMB = 56;
const SHUTTER = 74;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  overlay: {
    flex: 1,
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  thumbTile: {
    width: THUMB,
    height: THUMB,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.7)",
  },
  thumbImg: {
    width: "100%",
    height: "100%",
  },
  thumbFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbTilePlaceholder: {
    width: THUMB,
    height: THUMB,
  },
  shutterOuter: {
    width: SHUTTER,
    height: SHUTTER,
    borderRadius: SHUTTER / 2,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: SHUTTER - 14,
    height: SHUTTER - 14,
    borderRadius: (SHUTTER - 14) / 2,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  permissionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  permissionBody: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  permissionButtonText: {
    color: "#111",
    fontWeight: "600",
    fontSize: 15,
  },
  permissionCancel: {
    marginTop: 16,
    paddingVertical: 8,
  },
  permissionCancelText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
  },
});
