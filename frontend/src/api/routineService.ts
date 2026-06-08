import apiClient from "./apiClient";
import { Routine } from "./types";
import { getCurrentLocalDateString } from "../utils/date";
import {
  CACHE_KEYS,
  getActiveUserId,
  readCache,
  writeCache,
} from "../utils/offlineCache";
import { isNetworkError } from "../utils/network";

async function loadCachedRoutines(): Promise<Routine[]> {
  const userId = await getActiveUserId();
  if (!userId) return [];
  const cached = await readCache<Routine[]>(CACHE_KEYS.routines(userId));
  return cached ?? [];
}

async function persistCachedRoutines(list: Routine[]): Promise<void> {
  const userId = await getActiveUserId();
  if (!userId) return;
  await writeCache(CACHE_KEYS.routines(userId), list);
}

export async function getCachedRoutines(): Promise<Routine[]> {
  return loadCachedRoutines();
}

export async function createRoutineFromWorkout(
  workoutId: string,
  name: string,
  scheduledDays: string[],
): Promise<Routine> {
  const { data } = await apiClient.post<Routine>("/routines/from-workout", {
    workoutId,
    name,
    scheduledDays,
  });
  return data;
}

export async function getUserRoutines(): Promise<Routine[]> {
  try {
    const { data } = await apiClient.get<Routine[]>("/routines");
    const list = data ?? [];
    await persistCachedRoutines(list);
    return list;
  } catch (err) {
    if (isNetworkError(err)) {
      return loadCachedRoutines();
    }
    throw err;
  }
}

export async function getRoutineDetail(routineId: string): Promise<Routine> {
  try {
    const { data } = await apiClient.get<Routine>(`/routines/${routineId}`);
    return data;
  } catch (err) {
    if (isNetworkError(err)) {
      const cached = await loadCachedRoutines();
      const match = cached.find((r) => r.routineId === routineId);
      if (match) return match;
    }
    throw err;
  }
}

export async function getTodaysRoutines(): Promise<Routine[]> {
  try {
    const { data } = await apiClient.get<Routine[]>("/routines/today", {
      params: { localDate: getCurrentLocalDateString() },
    });
    return data;
  } catch (err) {
    if (isNetworkError(err)) {
      const cached = await loadCachedRoutines();
      const todayKey = new Date()
        .toLocaleString("en-US", { weekday: "long" })
        .toUpperCase();
      return cached.filter((r) =>
        r.scheduledDays?.some((d) => d.toUpperCase() === todayKey),
      );
    }
    throw err;
  }
}

export async function updateRoutine(
  routineId: string,
  updateData: {
    name?: string;
    scheduledDays?: string[];
    exerciseIds?: string[];
  },
): Promise<Routine> {
  const { data } = await apiClient.put<Routine>(
    `/routines/${routineId}`,
    updateData,
  );
  return data;
}

export async function createRoutine(
  name: string,
  scheduledDays: string[],
  exerciseIds: string[],
): Promise<Routine> {
  const { data } = await apiClient.post<Routine>("/routines", {
    name,
    scheduledDays,
    exerciseIds,
  });
  return data;
}

export async function deleteRoutine(routineId: string): Promise<void> {
  await apiClient.delete(`/routines/${routineId}`);
}
