import { useState } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { uploadProfilePicture } from "../api/userService";
import { invalidateImageKey } from "../api/imageService";
import { evictProfilePicture } from "../utils/profilePictureCache";
import { useAuth } from "../context/AuthContext";

export function useProfilePhoto() {
  const { refreshUser } = useAuth();
  const [uploading, setUploading] = useState(false);

  const pickAndUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      setUploading(true);
      const manipulated = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
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

  return { pickAndUpload, uploading };
}
