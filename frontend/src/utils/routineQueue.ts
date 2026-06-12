import apiClient from "../api/apiClient";
import { isNetworkError } from "./network";
import {
  CACHE_KEYS,
  getActiveUserId,
  readCache,
  writeCache,
} from "./offlineCache";

/**
 * A routine the user created while offline. Held verbatim and re-played
 * against the real API on the next online→offline transition.
 */
export type PendingRoutinePayload =
  | {
      kind: "scratch";
      name: string;
      scheduledDays: string[];
      exerciseIds: string[];
    }
  | {
      kind: "fromWorkout";
      workoutId: string;
      name: string;
      scheduledDays: string[];
    };

export interface PendingRoutine {
  /**
   * Temporary identifier used as the routine's `routineId` while it lives in
   * the queue. Always starts with `pending_` so consumers can distinguish
   * synthesized rows from server-issued routines.
   */
  id: string;
  createdAt: number;
  payload: PendingRoutinePayload;
}

export const PENDING_ROUTINE_PREFIX = "pending_routine_";

export function isPendingRoutineId(id: string): boolean {
  return id.startsWith(PENDING_ROUTINE_PREFIX);
}

async function loadQueue(userId: string): Promise<PendingRoutine[]> {
  const cached = await readCache<PendingRoutine[]>(
    CACHE_KEYS.pendingRoutines(userId),
  );
  return cached ?? [];
}

async function saveQueue(
  userId: string,
  queue: PendingRoutine[],
): Promise<void> {
  await writeCache(CACHE_KEYS.pendingRoutines(userId), queue);
}

export async function getPendingRoutines(): Promise<PendingRoutine[]> {
  const userId = await getActiveUserId();
  if (!userId) return [];
  return loadQueue(userId);
}

export async function enqueueRoutine(
  payload: PendingRoutinePayload,
): Promise<PendingRoutine> {
  const userId = await getActiveUserId();
  if (!userId) {
    throw new Error("No active user to queue routine for");
  }
  const item: PendingRoutine = {
    id: `${PENDING_ROUTINE_PREFIX}${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    createdAt: Date.now(),
    payload,
  };
  const queue = await loadQueue(userId);
  queue.push(item);
  await saveQueue(userId, queue);
  return item;
}

export async function removePendingRoutine(id: string): Promise<void> {
  const userId = await getActiveUserId();
  if (!userId) return;
  const queue = await loadQueue(userId);
  const next = queue.filter((r) => r.id !== id);
  if (next.length !== queue.length) await saveQueue(userId, next);
}

let flushing = false;

/**
 * Try to post every queued routine. Each is attempted exactly once per call;
 * anything that throws a network error stays in the queue. Non-network
 * failures drop the item — retrying won't recover and we don't want a single
 * malformed routine to wedge the queue.
 *
 * Returns the count of routines that were successfully posted.
 */
export async function flushRoutineQueue(): Promise<number> {
  if (flushing) return 0;
  flushing = true;
  let posted = 0;
  try {
    const userId = await getActiveUserId();
    if (!userId) return 0;
    const queue = await loadQueue(userId);
    if (queue.length === 0) return 0;

    const remaining: PendingRoutine[] = [];
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      try {
        if (item.payload.kind === "scratch") {
          await apiClient.post("/routines", {
            name: item.payload.name,
            scheduledDays: item.payload.scheduledDays,
            exerciseIds: item.payload.exerciseIds,
          });
        } else {
          await apiClient.post("/routines/from-workout", {
            workoutId: item.payload.workoutId,
            name: item.payload.name,
            scheduledDays: item.payload.scheduledDays,
          });
        }
        posted += 1;
      } catch (err) {
        if (isNetworkError(err)) {
          remaining.push(item);
          for (let j = i + 1; j < queue.length; j++) {
            remaining.push(queue[j]);
          }
          break;
        }
        console.error("Dropping queued routine after non-network error:", err);
      }
    }
    await saveQueue(userId, remaining);
  } finally {
    flushing = false;
  }
  return posted;
}
