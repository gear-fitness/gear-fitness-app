import { Alert, Linking } from "react-native";

// Hosted legal pages. Surfaced as tappable links on the auth screens, the
// paywall, and Settings to satisfy App Store guidelines 5.1.1 / 3.1.1.
export const TERMS_URL = "https://gearfitness.app/terms";
export const PRIVACY_URL = "https://gearfitness.app/privacy";

export async function openLegalUrl(url: string): Promise<void> {
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
      return;
    }
  } catch {
    // fall through to the alert below
  }
  Alert.alert("Couldn't open link", url);
}

export const openTerms = () => openLegalUrl(TERMS_URL);
export const openPrivacy = () => openLegalUrl(PRIVACY_URL);
