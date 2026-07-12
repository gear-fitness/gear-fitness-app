import AsyncStorage from "@react-native-async-storage/async-storage";
import { GymLocation } from "../api/locationService";

const RECENT_GYMS_KEY = "@recent_gyms";
const MAX_RECENTS = 5;

// Most people train at the same one or two gyms, so the picker shows these
// instantly before any network call — which also keeps repeat visits off the
// paid Places path entirely.
export async function getRecentGyms(): Promise<GymLocation[]> {
  try {
    const stored = await AsyncStorage.getItem(RECENT_GYMS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((g) => g && typeof g.name === "string");
  } catch {
    return [];
  }
}

export async function addRecentGym(gym: GymLocation): Promise<void> {
  try {
    const recents = await getRecentGyms();
    const next = [gym, ...recents.filter((g) => !isSameGym(g, gym))].slice(
      0,
      MAX_RECENTS,
    );
    await AsyncStorage.setItem(RECENT_GYMS_KEY, JSON.stringify(next));
  } catch {
    // Non-critical; ignore storage failures.
  }
}

function isSameGym(a: GymLocation, b: GymLocation): boolean {
  if (a.googlePlaceId && b.googlePlaceId) {
    return a.googlePlaceId === b.googlePlaceId;
  }
  return a.name.trim().toLowerCase() === b.name.trim().toLowerCase();
}
