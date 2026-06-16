import { useState } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { uploadProfilePicture } from "../api/userService";
import { invalidateImageKey } from "../api/imageService";
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
      await refreshUser();
      // The profile key is deterministic (overwritten in place), so refreshUser
      // alone won't change it. Invalidate so mounted avatars re-resolve a fresh
      // presigned url and show the new bytes without a remount.
      if (updated?.profilePictureUrl) {
        invalidateImageKey(updated.profilePictureUrl);
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to upload profile picture");
    } finally {
      setUploading(false);
    }
  };

  return { pickAndUpload, uploading };
}
