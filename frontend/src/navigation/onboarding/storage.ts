import AsyncStorage from "@react-native-async-storage/async-storage";
import { OnboardingDraft } from "./types";

const SEEN_KEY = "@onboarding_seen_v1";
// v2: flow switched to the short step list (steps.ts), which renumbered
// draft.step. Bumping the key discards in-flight v1 drafts so nobody resumes
// at the wrong screen; completed-onboarding state (SEEN_KEY) is unaffected.
const DRAFT_KEY = "@onboarding_draft_v2";

export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(SEEN_KEY);
    return val === "true";
  } catch {
    return false;
  }
}

export async function markOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(SEEN_KEY, "true");
  } catch {
    // Silently ignore — worst case user sees onboarding again
  }
}

export async function saveOnboardingDraft(
  draft: OnboardingDraft,
): Promise<void> {
  try {
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Silently ignore — draft will be rebuilt from scratch next launch
  }
}

export async function loadOnboardingDraft(): Promise<OnboardingDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OnboardingDraft;
  } catch {
    return null;
  }
}

export async function clearOnboardingDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DRAFT_KEY);
  } catch {
    // Silently ignore
  }
}
