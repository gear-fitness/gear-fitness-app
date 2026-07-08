import { useState } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { uploadProfilePicture } from "../api/userService";
import { invalidateImageKey } from "../api/imageService";
import { evictProfilePicture } from "../utils/profilePictureCache";
import { useAuth } from "../context/AuthContext";
import { openCamera } from "../utils/inAppCamera";
import { cropImageToSquare } from "../utils/image";

// Profile picture flows, exposed as the two actions of the native
// "Take photo / Choose from library" menu (see PhotoSourceMenu).
export function useProfilePhoto() {
  const navigation = useNavigation();
  const { refreshUser } = useAuth();
  const [uploading, setUploading] = useState(false);

  const processAndUpload = async (uri: string) => {
    try {
      setUploading(true);
      // Camera captures are full-frame; square them off to match the 1:1
      // crop the library picker's editing step produces. No-op for images
      // that are already square.
      const squared = await cropImageToSquare(uri);
      const manipulated = await ImageManipulator.manipulateAsync(
        squared,
        [{ resize: { width: 300 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
      );

      const updated = await uploadProfilePicture(manipulated.uri);
      // The profile key is deterministic (overwritten in place), so refreshUser
      // alone won't change it. Bust BOTH caches for the key before refreshing:
      // the presigned-url cache so avatars re-resolve a fresh url, and the
      // on-disk byte cache so the stale local file stops winning (and so the
      // pre-warm inside refreshUser re-downloads the new bytes).
      const key = updated?.profilePictureUrl;
      if (key) {
        invalidateImageKey(key);
        await evictProfilePicture(key);
      }
      await refreshUser();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to upload profile picture");
    } finally {
      setUploading(false);
    }
  };

  const takePhotoAndUpload = async () => {
    const result = await openCamera(navigation, {
      // Applied if the user picks via the camera screen's library shortcut;
      // matches the direct library flow below.
      library: { allowsEditing: true, aspect: [1, 1], quality: 0.8 },
    });
    const uri = result?.uris[0];
    if (uri) await processAndUpload(uri);
  };

  const chooseFromLibraryAndUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    const uri = result.canceled ? undefined : result.assets[0]?.uri;
    if (uri) await processAndUpload(uri);
  };

  return { takePhotoAndUpload, chooseFromLibraryAndUpload, uploading };
}
