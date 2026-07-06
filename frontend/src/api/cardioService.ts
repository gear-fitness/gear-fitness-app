/**
 * Cardio service
 * API calls for the cardio activity catalog
 */

import apiClient from "./apiClient";
import { CACHE_KEYS, readCache, writeCache } from "../utils/offlineCache";
import { isNetworkError } from "../utils/network";

export interface CardioActivity {
  cardioActivityId: string;
  name: string;
  description: string | null;
}

/**
 * Read the offline cardio activity catalog without touching the network.
 */
export async function getCachedCardioActivities(): Promise<CardioActivity[]> {
  const cached = await readCache<CardioActivity[]>(CACHE_KEYS.cardioActivities);
  return cached ?? [];
}

/**
 * Get the cardio activity catalog. Tries the network first and refreshes the
 * offline catalog on success; falls back to the cached catalog when the device
 * is offline. Auth or server errors are rethrown.
 */
export async function getAllCardioActivities(): Promise<CardioActivity[]> {
  try {
    const { data } =
      await apiClient.get<CardioActivity[]>("/cardio-activities");
    const list = data ?? [];
    await writeCache(CACHE_KEYS.cardioActivities, list);
    return list;
  } catch (err) {
    if (isNetworkError(err)) {
      return getCachedCardioActivities();
    }
    throw err;
  }
}
