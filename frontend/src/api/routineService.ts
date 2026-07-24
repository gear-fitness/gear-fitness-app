import apiClient from "./apiClient";
import { Routine, RoutineExercise } from "./types";
import { getCurrentLocalDateString } from "../utils/date";
import {
  CACHE_KEYS,
  getActiveUserId,
  readCache,
  writeCache,
} from "../utils/offlineCache";
import { isNetworkError } from "../utils/network";
import { getCachedExercises } from "./exerciseService";
import {
  enqueueRoutine,
  getPendingRoutines,
  PendingRoutine,
  removePendingRoutine,
} from "../utils/routineQueue";

/**
 * Exercise entry for the routine create/update contract. Sent alongside the
 * legacy flat `exerciseIds` array, permanently: old backends read only
 * `exerciseIds` (rollback safety), new backends prefer `exercises` when
 * present. `supersetGroup` omitted/undefined means ungrouped.
 */
export interface RoutineExerciseInput {
  exerciseId: string;
  supersetGroup?: number;
}

async function loadCachedRoutines(): Promise<Routine[]> {
  const userId = await getActiveUserId();
  if (!userId) return [];
  const cached = await readCache<Routine[]>(CACHE_KEYS.routines(userId));
  return cached ?? [];
}

/**
 * Build a Routine that can be rendered in lists/details from a queued offline
 * creation. For "scratch" routines we look up exercise rows in the local
 * exercise catalog so the card shows real names/body parts; "fromWorkout"
 * routines render with no exercises until the server-side conversion runs at
 * flush time.
 */
async function synthesizePendingRoutine(
  pending: PendingRoutine,
): Promise<Routine> {
  let exercises: RoutineExercise[] = [];
  if (pending.payload.kind === "scratch") {
    const catalog = await getCachedExercises();
    const byId = new Map(catalog.map((e) => [e.exerciseId, e]));
    // Prefer the structured entries (they carry supersetGroup); fall back to
    // the flat id list for queue entries written before the field existed.
    const entries: RoutineExerciseInput[] =
      pending.payload.exercises ??
      pending.payload.exerciseIds.map((exerciseId) => ({ exerciseId }));
    exercises = entries.map((entry, idx) => {
      const match = byId.get(entry.exerciseId);
      return {
        routineExerciseId: `${pending.id}_${idx}`,
        exerciseName: match?.name ?? "Exercise",
        bodyParts: match?.bodyParts ?? [],
        position: idx,
        exerciseId: entry.exerciseId,
        supersetGroup: entry.supersetGroup,
      };
    });
  }
  return {
    routineId: pending.id,
    name: pending.payload.name,
    scheduledDays: pending.payload.scheduledDays,
    exercises,
  };
}

async function mergePendingRoutines(routines: Routine[]): Promise<Routine[]> {
  const pending = await getPendingRoutines();
  if (pending.length === 0) return routines;
  const synthesized = await Promise.all(pending.map(synthesizePendingRoutine));
  return [...synthesized, ...routines];
}

async function persistCachedRoutines(list: Routine[]): Promise<void> {
  const userId = await getActiveUserId();
  if (!userId) return;
  await writeCache(CACHE_KEYS.routines(userId), list);
}

export async function getCachedRoutines(): Promise<Routine[]> {
  return mergePendingRoutines(await loadCachedRoutines());
}

export async function createRoutineFromWorkout(
  workoutId: string,
  name: string,
  scheduledDays: string[],
): Promise<Routine> {
  try {
    const { data } = await apiClient.post<Routine>("/routines/from-workout", {
      workoutId,
      name,
      scheduledDays,
    });
    return data;
  } catch (err) {
    if (isNetworkError(err)) {
      const pending = await enqueueRoutine({
        kind: "fromWorkout",
        workoutId,
        name,
        scheduledDays,
      });
      return synthesizePendingRoutine(pending);
    }
    throw err;
  }
}

export async function getUserRoutines(): Promise<Routine[]> {
  try {
    const { data } = await apiClient.get<Routine[]>("/routines");
    const list = data ?? [];
    await persistCachedRoutines(list);
    return mergePendingRoutines(list);
  } catch (err) {
    if (isNetworkError(err)) {
      return mergePendingRoutines(await loadCachedRoutines());
    }
    throw err;
  }
}

export async function getRoutineDetail(routineId: string): Promise<Routine> {
  // Pending offline routines aren't visible to the server yet — resolve them
  // straight from the queue so the user can open the card they just created.
  const pending = await getPendingRoutines();
  const queued = pending.find((r) => r.id === routineId);
  if (queued) return synthesizePendingRoutine(queued);

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
    return mergePendingRoutinesForToday(data ?? []);
  } catch (err) {
    if (isNetworkError(err)) {
      const cached = await loadCachedRoutines();
      const todayKey = new Date()
        .toLocaleString("en-US", { weekday: "long" })
        .toUpperCase();
      const todaysCached = cached.filter((r) =>
        r.scheduledDays?.some((d) => d.toUpperCase() === todayKey),
      );
      return mergePendingRoutinesForToday(todaysCached);
    }
    throw err;
  }
}

async function mergePendingRoutinesForToday(
  serverList: Routine[],
): Promise<Routine[]> {
  const todayKey = new Date()
    .toLocaleString("en-US", { weekday: "long" })
    .toUpperCase();
  const pending = await getPendingRoutines();
  const todaysPending = pending.filter((r) =>
    r.payload.scheduledDays.some((d) => d.toUpperCase() === todayKey),
  );
  if (todaysPending.length === 0) return serverList;
  const synthesized = await Promise.all(
    todaysPending.map(synthesizePendingRoutine),
  );
  return [...synthesized, ...serverList];
}

export async function updateRoutine(
  routineId: string,
  updateData: {
    name?: string;
    scheduledDays?: string[];
    exerciseIds?: string[];
    exercises?: RoutineExerciseInput[];
  },
): Promise<Routine> {
  // When the caller provides structured entries, send BOTH shapes: the new
  // `exercises` (which the server prefers) and legacy `exerciseIds` derived
  // from it, permanently, so an old backend still applies the exercise list.
  // When the caller sends only `exerciseIds` (or neither), pass the payload
  // through untouched: the legacy shape triggers the server's supersetGroup
  // carry-over, so a metadata-only edit never wipes an existing superset.
  const payload = updateData.exercises
    ? {
        ...updateData,
        exerciseIds: updateData.exercises.map((ex) => ex.exerciseId),
      }
    : updateData;
  const { data } = await apiClient.put<Routine>(
    `/routines/${routineId}`,
    payload,
  );
  return data;
}

export async function createRoutine(
  name: string,
  scheduledDays: string[],
  exerciseIds: string[],
  exercises?: RoutineExerciseInput[],
): Promise<Routine> {
  // Always send BOTH shapes, permanently: legacy `exerciseIds` keeps an old
  // backend working (rollback safety), `exercises` carries supersetGroup for
  // new backends. When structured entries are given they are the source of
  // truth and the flat list is derived from them so the two can't diverge.
  // A fresh routine has no prior groups to preserve, so deriving ungrouped
  // entries from `exerciseIds` is always safe here (unlike update).
  const entries: RoutineExerciseInput[] =
    exercises ?? exerciseIds.map((exerciseId) => ({ exerciseId }));
  const ids = entries.map((ex) => ex.exerciseId);
  try {
    const { data } = await apiClient.post<Routine>("/routines", {
      name,
      scheduledDays,
      exerciseIds: ids,
      exercises: entries,
    });
    return data;
  } catch (err) {
    if (isNetworkError(err)) {
      const pending = await enqueueRoutine({
        kind: "scratch",
        name,
        scheduledDays,
        exerciseIds: ids,
        exercises: entries,
      });
      return synthesizePendingRoutine(pending);
    }
    throw err;
  }
}

export async function deleteRoutine(routineId: string): Promise<void> {
  // A pending offline routine only lives in the local queue — drop it from
  // there instead of trying to hit the server with a fake ID.
  const pending = await getPendingRoutines();
  if (pending.some((r) => r.id === routineId)) {
    await removePendingRoutine(routineId);
    return;
  }
  await apiClient.delete(`/routines/${routineId}`);
}
