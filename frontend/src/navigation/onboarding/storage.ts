import AsyncStorage from "@react-native-async-storage/async-storage";
import { OnboardingDraft } from "./types";

const SEEN_KEY = "@onboarding_seen_v1";
const DRAFT_KEY = "@onboarding_draft_v1";

export async function hasSeenOnboarding(): Promise<boolean> {
  const val = await AsyncStorage.getItem(SEEN_KEY);
  return val === "true";
}

export async function markOnboardingSeen(): Promise<void> {
  await AsyncStorage.setItem(SEEN_KEY, "true");
}

export async function saveOnboardingDraft(draft: OnboardingDraft): Promise<void> {
  await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export async function loadOnboardingDraft(): Promise<OnboardingDraft | null> {
  const raw = await AsyncStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OnboardingDraft;
  } catch {
    return null;
  }
}

export async function clearOnboardingDraft(): Promise<void> {
  await AsyncStorage.removeItem(DRAFT_KEY);
}
