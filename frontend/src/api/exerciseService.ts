/**
 * Exercise service
 * API calls for exercise data
 */

import apiClient from "./apiClient";
import { CACHE_KEYS, readCache, writeCache } from "../utils/offlineCache";
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

/**
 * Get exercise history for the authenticated user
 */
export async function getExerciseHistory(
  exerciseId: string,
): Promise<ExerciseHistory> {
  const { data } = await apiClient.get<ExerciseHistory>(
    `/exercises/${exerciseId}/history`,
  );
  return data;
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
