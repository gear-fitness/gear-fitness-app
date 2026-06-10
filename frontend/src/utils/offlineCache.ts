import AsyncStorage from "@react-native-async-storage/async-storage";

export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Failed to read offline cache "${key}":`, err);
    return null;
  }
}

export async function writeCache<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Failed to write offline cache "${key}":`, err);
  }
}

export async function clearCache(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (err) {
    console.error(`Failed to clear offline cache "${key}":`, err);
  }
}

export const CACHE_KEYS = {
  exercises: "@offline_exercises",
  routines: (userId: string) => `@offline_routines_${userId}`,
  userProfile: (userId: string) => `@offline_user_profile_${userId}`,
  lastUserId: "@offline_last_user_id",
  pendingWorkouts: (userId: string) => `@offline_pending_workouts_${userId}`,
  pendingRoutines: (userId: string) => `@offline_pending_routines_${userId}`,
  userWorkouts: (userId: string) => `@offline_workouts_${userId}`,
  personalRecords: (userId: string) => `@offline_prs_${userId}`,
  exerciseHistory: (userId: string, exerciseId: string) =>
    `@offline_exercise_history_${userId}_${exerciseId}`,
};

/**
 * The userId of the most recently authenticated profile. AuthContext writes
 * this on successful profile fetch so services that don't have direct access
 * to the auth context (exerciseService, routineService) can scope their
 * caches per-user.
 */
export async function getActiveUserId(): Promise<string | null> {
  return readCache<string>(CACHE_KEYS.lastUserId);
}

export async function setActiveUserId(userId: string | null): Promise<void> {
  if (userId == null) {
    await clearCache(CACHE_KEYS.lastUserId);
    return;
  }
  await writeCache(CACHE_KEYS.lastUserId, userId);
}
