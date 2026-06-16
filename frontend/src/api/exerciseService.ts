/**
 * Exercise service
 * API calls for exercise data
 */

import apiClient from "./apiClient";
import {
  CACHE_KEYS,
  getActiveUserId,
  readCache,
  writeCache,
} from "../utils/offlineCache";
import { isNetworkError } from "../utils/network";

export interface Exercise {
  exerciseId: string;
  name: string;
  bodyParts: BodyPartDTO[];
  description: string;
}

export interface ExerciseSet {
  setNumber: number;
  reps: number;
  weightLbs: number | null;
  isPr: boolean;
}

export interface BodyPartDTO {
  bodyPart: string;
  targetType: "PRIMARY" | "SECONDARY";
}

export interface ExerciseSession {
  workoutId: string;
  workoutName: string;
  datePerformed: string;
  sets: ExerciseSet[];
}

export interface ExerciseHistory {
  exerciseId: string;
  exerciseName: string;
  bodyParts: BodyPartDTO[];
  totalSessions: number;
  personalRecordLbs: number | null;
  sessions: ExerciseSession[];
}

/**
 * Read the offline exercise catalog without touching the network.
 */
export async function getCachedExercises(): Promise<Exercise[]> {
  const cached = await readCache<Exercise[]>(CACHE_KEYS.exercises);
  return cached ?? [];
}

/**
 * Get the global exercise catalog without authentication. Used during
 * onboarding (before the user has an account) so the routine builder can
 * reference real exercises. Returns global exercises only — never custom ones.
 */
export async function getPublicExerciseCatalog(): Promise<Exercise[]> {
  const { data } = await apiClient.get<Exercise[]>("/public/exercises");
  return data ?? [];
}

/**
 * Get all exercises. Tries the network first and refreshes the offline
 * catalog on success; falls back to the cached catalog when the request
 * fails because the device is offline. Auth or server errors are rethrown.
 */
export async function getAllExercises(): Promise<Exercise[]> {
  try {
    const { data } = await apiClient.get<Exercise[]>("/exercises");
    const list = data ?? [];
    await writeCache(CACHE_KEYS.exercises, list);
    return list;
  } catch (err) {
    if (isNetworkError(err)) {
      return getCachedExercises();
    }
    throw err;
  }
}

export async function getCachedExerciseHistory(
  exerciseId: string,
): Promise<ExerciseHistory | null> {
  const userId = await getActiveUserId();
  if (!userId) return null;
  return readCache<ExerciseHistory>(
    CACHE_KEYS.exerciseHistory(userId, exerciseId),
  );
}

/**
 * Build an empty ExerciseHistory shell from the cached exercise catalog so
 * the history screen can still render its zero-state offline when the user
 * opens an exercise they've never performed.
 */
async function buildEmptyHistoryFromCatalog(
  exerciseId: string,
): Promise<ExerciseHistory | null> {
  const catalog = await getCachedExercises();
  const match = catalog.find((e) => e.exerciseId === exerciseId);
  if (!match) return null;
  return {
    exerciseId,
    exerciseName: match.name,
    bodyParts: match.bodyParts,
    totalSessions: 0,
    personalRecordLbs: null,
    sessions: [],
  };
}

/**
 * Get exercise history for the authenticated user. Writes through to a
 * per-user offline cache so the chart screen and the exercise picker stay
 * usable when the device is offline.
 */
export async function getExerciseHistory(
  exerciseId: string,
): Promise<ExerciseHistory> {
  try {
    const { data } = await apiClient.get<ExerciseHistory>(
      `/exercises/${exerciseId}/history`,
    );
    const userId = await getActiveUserId();
    if (userId) {
      await writeCache(CACHE_KEYS.exerciseHistory(userId, exerciseId), data);
    }
    return data;
  } catch (err) {
    if (isNetworkError(err)) {
      const cached = await getCachedExerciseHistory(exerciseId);
      if (cached) return cached;
      const synthetic = await buildEmptyHistoryFromCatalog(exerciseId);
      if (synthetic) return synthetic;
    }
    throw err;
  }
}

/**
 * Bulk-prewarm every history for the authenticated user in one round trip.
 * Fans the response into the existing per-exercise cache keys so the lazy
 * getExerciseHistory offline path keeps working unchanged. Swallows network
 * errors because this is a background prefetch.
 */
export async function getAllExerciseHistory(): Promise<void> {
  try {
    const { data } = await apiClient.get<ExerciseHistory[]>(
      "/exercises/history/all",
    );
    const userId = await getActiveUserId();
    if (!userId || !Array.isArray(data)) return;
    await Promise.all(
      data.map((history) =>
        writeCache(
          CACHE_KEYS.exerciseHistory(userId, history.exerciseId),
          history,
        ),
      ),
    );
  } catch (err) {
    if (isNetworkError(err)) return;
    throw err;
  }
}

/**
 * Create a new exercise
 */
export async function createExercise(exerciseData: {
  name: string;
  description: string | null;
  bodyParts: BodyPartDTO[];
}): Promise<Exercise> {
  const { data } = await apiClient.post<Exercise>("/exercises", exerciseData);
  return data;
}

/**
 * Delete an exercise by ID
 */
export async function deleteExercise(exerciseId: string): Promise<void> {
  await apiClient.delete(`/exercises/${exerciseId}`);
}
