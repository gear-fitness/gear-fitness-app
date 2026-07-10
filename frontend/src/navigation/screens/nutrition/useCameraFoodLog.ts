import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { openCamera } from "../../../utils/inAppCamera";
import { openBarcodeScanner } from "../../../utils/barcodeScanner";
import { lookupBarcode } from "../../../api/nutritionService";

// Orchestrates the calorie tracker's three camera logging flows (barcode
// scan, take photo, choose from library) for the CameraLogMenu. The menu
// already sits behind the tracker's Plus capture overlay, so no client-side
// tier gate here; the endpoints 403 server-side as defense in depth.

// iOS refuses to present a modal while another is still dismissing, so give
// the scanner/camera dismissal a beat before presenting the next screen or
// sheet.
const MODAL_HANDOFF_MS = 500;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useCameraFoodLog() {
  const navigation = useNavigation() as any;

  // Photo estimate sheet session (take photo + library share it).
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoVisible, setPhotoVisible] = useState(false);

  // Barcode-miss fallback: opens SavedFoodsSheet on its create form.
  const [customFoodOpen, setCustomFoodOpen] = useState(false);
  const [customFoodPrefill, setCustomFoodPrefill] = useState<string | null>(
    null,
  );

  const offerCustomFood = useCallback((productName: string | null) => {
    Alert.alert(
      "Product not found",
      productName
        ? `We found "${productName}" but it has no nutrition data yet. You can add it as a custom food instead.`
        : "We couldn't find nutrition for that barcode. You can add it as a custom food instead.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Create custom food",
          onPress: () => {
            setCustomFoodPrefill(productName);
            setCustomFoodOpen(true);
          },
        },
      ],
    );
  }, []);

  const runLookup = useCallback(
    async (code: string) => {
      try {
        // The lookup races the scanner modal's dismissal; the floor keeps a
        // fast local hit from presenting BarcodeReview mid-dismiss.
        const [result] = await Promise.all([
          lookupBarcode(code),
          delay(MODAL_HANDOFF_MS),
        ]);
        if (result.status === "FOUND" && result.food) {
          navigation.navigate("BarcodeReview", { food: result.food });
        } else {
          offerCustomFood(result.productName);
        }
      } catch (err: any) {
        if (err?.response?.status === 403) {
          navigation.navigate("PlusUpsell", {
            feature: "Track calories and macros with the food journal",
          });
          return;
        }
        Alert.alert(
          "Lookup failed",
          "We couldn't look up that barcode. Check your connection and try again.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Try again", onPress: () => runLookup(code) },
          ],
        );
      }
    },
    [navigation, offerCustomFood],
  );

  const scanBarcode = useCallback(async () => {
    const code = await openBarcodeScanner(navigation);
    if (!code) return; // dismissed without scanning
    await runLookup(code);
  }, [navigation, runLookup]);

  const openPhotoSheet = useCallback(async (uri: string) => {
    await delay(MODAL_HANDOFF_MS);
    setPhotoUri(uri);
    setPhotoVisible(true);
  }, []);

  const takePhoto = useCallback(async () => {
    const result = await openCamera(navigation);
    const uri = result?.uris[0];
    if (!uri) return;
    await openPhotoSheet(uri);
  }, [navigation, openPhotoSheet]);

  const chooseFromLibrary = useCallback(async () => {
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
      allowsMultipleSelection: false,
      quality: 1,
    });
    const uri = result.canceled ? null : result.assets?.[0]?.uri;
    if (!uri) return;
    await openPhotoSheet(uri);
  }, [openPhotoSheet]);

  const closePhoto = useCallback(() => setPhotoVisible(false), []);

  const closeCustomFood = useCallback(() => {
    setCustomFoodOpen(false);
    setCustomFoodPrefill(null);
  }, []);

  return {
    scanBarcode,
    takePhoto,
    chooseFromLibrary,
    photoUri,
    photoVisible,
    closePhoto,
    customFoodOpen,
    customFoodPrefill,
    closeCustomFood,
  };
}
