/**
 * Workout service
 * API calls for workout-related data
 */

import apiClient from "./apiClient";
import { BodyPartDTO, getCachedExercises } from "./exerciseService";
import {
  DailyVolumeData,
  WeeklyVolumeData,
  Workout,
  WorkoutDetail,
  PersonalRecord,
} from "./types";
import { getCurrentLocalDateString } from "../utils/date";
import { CACHE_KEYS, readCache, writeCache } from "../utils/offlineCache";
import { isNetworkError } from "../utils/network";
import {
  getPendingWorkouts,
  isPendingWorkoutId,
  PENDING_WORKOUT_PREFIX,
} from "../utils/workoutQueue";

export interface WorkoutSubmission {
  name: string;
  durationMin: number;
  datePerformed?: string; // Optional - date in YYYY-MM-DD format
  bodyTags: string[];
  exercises: ExerciseSubmission[];
  createPost?: boolean;
  caption?: string;
  imageUrl?: string;
  photoUrls?: string[];
}

export interface ExerciseSubmission {
  exerciseId: string;
  note?: string;
  sets: SetSubmission[];
}

export interface SetSubmission {
  reps: string;
  weight: string;
}

export interface WorkoutDetailResponse {
  workoutId: string;
  name: string;
  datePerformed: string;
  durationMin: number;
  bodyTags: string[];
  exercises: Array<{
    workoutExerciseId: string;
    exerciseName: string;
    bodyParts: BodyPartDTO[];
    position: number;
    note: string;
    sets: Array<{
      workoutSetId: string;
      setNumber: number;
      reps: number;
      weightLbs: string;
      isPr: boolean;
    }>;
  }>;
  photoUrls: string[];
}

export async function submitWorkout(
  submission: WorkoutSubmission,
): Promise<WorkoutDetailResponse> {
  const { data } = await apiClient.post("/workouts/submit", submission);
  return data;
}

/**
 * Get weekly volume data for a user
 */
export async function getWeeklyVolume(
  userId: string,
  weeks: number = 8,
): Promise<WeeklyVolumeData[]> {
  const { data } = await apiClient.get(
    `/workouts/user/${userId}/weekly-volume`,
    {
      params: { weeks, localDate: getCurrentLocalDateString() },
    },
  );
  return data;
}

/**
 * Get daily volume data for a user
 */
export async function getDailyVolume(
  userId: string,
  weeks: number = 2,
  weekStartDay: string = "SUNDAY",
): Promise<DailyVolumeData[]> {
  const { data } = await apiClient.get(
    `/workouts/user/${userId}/daily-volume`,
    {
      params: { weeks, weekStartDay, localDate: getCurrentLocalDateString() },
    },
  );
  return data;
}

export async function getCachedUserWorkouts(
  userId: string,
): Promise<Workout[]> {
  const cached = await readCache<Workout[]>(CACHE_KEYS.userWorkouts(userId));
  return cached ?? [];
}

/**
 * Get all workouts for a user. Writes through to the per-user offline cache
 * on success; falls back to the cached list when the device is offline.
 */
export async function getUserWorkouts(userId: string): Promise<Workout[]> {
  try {
    const { data } = await apiClient.get<Workout[]>(`/workouts/user/${userId}`);
    const list = data ?? [];
    await writeCache(CACHE_KEYS.userWorkouts(userId), list);
    return list;
  } catch (err) {
    if (isNetworkError(err)) {
      return getCachedUserWorkouts(userId);
    }
    throw err;
  }
}

/**
 * Build a minimal WorkoutDetail from a cached summary. The summary doesn't
 * carry set-level data, so exercises is empty — DetailedHistory renders the
 * high-level metadata and the empty exercise list is correctly handled by
 * the existing "no exercises" path.
 */
function synthesizeDetailFromSummary(summary: Workout): WorkoutDetail {
  return {
    workoutId: summary.workoutId,
    name: summary.name,
    datePerformed: summary.datePerformed,
    durationMin: summary.durationMin,
    bodyTags: summary.bodyTags ?? [],
    exercises: [],
  };
}

async function synthesizePendingDetail(
  workoutId: string,
): Promise<WorkoutDetail | null> {
  if (!isPendingWorkoutId(workoutId)) return null;
  const queueId = workoutId.slice(PENDING_WORKOUT_PREFIX.length);
  const pending = await getPendingWorkouts();
  const item = pending.find((p) => p.id === queueId);
  if (!item) return null;
  const catalog = await getCachedExercises();
  const byId = new Map(catalog.map((e) => [e.exerciseId, e]));
  return {
    workoutId,
    name: item.submission.name,
    datePerformed:
      item.submission.datePerformed ??
      new Date(item.createdAt).toISOString().slice(0, 10),
    durationMin: item.submission.durationMin,
    bodyTags: item.submission.bodyTags ?? [],
    exercises: item.submission.exercises.map((ex, position) => {
      const match = byId.get(ex.exerciseId);
      return {
        workoutExerciseId: `${workoutId}_ex_${position}`,
        exerciseName: match?.name ?? "Exercise",
        bodyParts: match?.bodyParts ?? [],
        position,
        note: ex.note ?? null,
        sets: ex.sets.map((s, idx) => ({
          workoutSetId: `${workoutId}_ex_${position}_set_${idx}`,
          setNumber: idx + 1,
          reps: Number(s.reps) || 0,
          weightLbs: s.weight ? Number(s.weight) : null,
          isPr: false,
        })),
      };
    }),
  };
}

/**
 * Get detailed workout by ID. When offline, falls back to a synthesized
 * detail built from the cached workout summary so the screen renders date,
 * duration, name and tags — set-level data isn't available without network.
 */
export async function getWorkoutDetails(
  workoutId: string,
): Promise<WorkoutDetail> {
  // Pending offline workouts only live in the queue — they have no server
  // counterpart yet, so resolve them locally before attempting the API call.
  const pendingDetail = await synthesizePendingDetail(workoutId);
  if (pendingDetail) return pendingDetail;

  try {
    const { data } = await apiClient.get<WorkoutDetail>(
      `/workouts/${workoutId}`,
    );
    return data;
  } catch (err) {
    if (isNetworkError(err)) {
      // We don't know which user this workout belongs to from this call, so
      // scan the current user's cache. The History/Profile flows are the
      // only paths into DetailedHistory that hit this fallback usefully.
      const activeUserId = await readCache<string>(CACHE_KEYS.lastUserId);
      if (activeUserId) {
        const cached = await getCachedUserWorkouts(activeUserId);
        const summary = cached.find((w) => w.workoutId === workoutId);
        if (summary) return synthesizeDetailFromSummary(summary);
      }
    }
    throw err;
  }
}

export async function getCachedPersonalRecords(
  userId: string,
): Promise<PersonalRecord[]> {
  const cached = await readCache<PersonalRecord[]>(
    CACHE_KEYS.personalRecords(userId),
  );
  return cached ?? [];
}

/**
 * Get personal records for a user. Writes through to the per-user offline
 * cache on success; falls back to cache when the device is offline.
 */
export async function getUserPersonalRecords(
  userId: string,
): Promise<PersonalRecord[]> {
  try {
    const { data } = await apiClient.get<PersonalRecord[]>(
      `/personal-records/user/${userId}`,
    );
    const list = data ?? [];
    await writeCache(CACHE_KEYS.personalRecords(userId), list);
    return list;
  } catch (err) {
    if (isNetworkError(err)) {
      return getCachedPersonalRecords(userId);
    }
    throw err;
  }
}

/**
 * Delete a workout by ID
 */
export async function deleteWorkout(workoutId: string): Promise<void> {
  await apiClient.delete(`/workouts/${workoutId}`);
}
