import AsyncStorage from "@react-native-async-storage/async-storage";

const SAVE_PHOTOS_ON_POST_KEY = "@save_photos_on_post";

// Whether photos taken with the in-app camera get saved to the device photo
// library when a workout is posted. Defaults to ON: anything other than an
// explicit "false" reads as enabled.
export async function getSavePhotosOnPost(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(SAVE_PHOTOS_ON_POST_KEY);
    return stored !== "false";
  } catch {
    return true;
  }
}

export async function setSavePhotosOnPost(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(
      SAVE_PHOTOS_ON_POST_KEY,
      enabled ? "true" : "false",
    );
  } catch {
    // Non-critical preference; ignore storage failures.
  }
}
