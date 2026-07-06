import { submitWorkout, WorkoutSubmission } from "../api/workoutService";
import { uploadPostImage } from "../api/imageService";
import { Workout } from "../api/types";
import { isNetworkError } from "./network";
import {
  CACHE_KEYS,
  getActiveUserId,
  readCache,
  writeCache,
} from "./offlineCache";

export const PENDING_WORKOUT_PREFIX = "pending_workout_";

export function isPendingWorkoutId(id: string): boolean {
  return id.startsWith(PENDING_WORKOUT_PREFIX);
}

/**
 * A workout the user finished while offline. We keep the submission payload
 * verbatim and the original local photo URIs — photo uploads need a network
 * round-trip too, so they're deferred until flush.
 */
export interface PendingWorkout {
  id: string;
  createdAt: number;
  submission: WorkoutSubmission;
  /**
   * Local image URIs (file://, ph://, content://). Photos already on S3 don't
   * go here — they would have been uploaded at WorkoutComplete time.
   */
  pendingPhotoUris: string[];
}

async function loadQueue(userId: string): Promise<PendingWorkout[]> {
  const cached = await readCache<PendingWorkout[]>(
    CACHE_KEYS.pendingWorkouts(userId),
  );
  return cached ?? [];
}

async function saveQueue(
  userId: string,
  queue: PendingWorkout[],
): Promise<void> {
  await writeCache(CACHE_KEYS.pendingWorkouts(userId), queue);
}

export async function getPendingWorkoutCount(): Promise<number> {
  const userId = await getActiveUserId();
  if (!userId) return 0;
  const queue = await loadQueue(userId);
  return queue.length;
}

export async function getPendingWorkouts(): Promise<PendingWorkout[]> {
  const userId = await getActiveUserId();
  if (!userId) return [];
  return loadQueue(userId);
}

/**
 * Render the offline queue as `Workout` summaries so screens that already
 * consume the workouts list (History/calendar) can show entries created
 * while offline. The synthesized `workoutId` carries the
 * `pending_workout_` prefix so downstream code can opt out of behaviors
 * that require a real server ID (e.g. sharing, deletion).
 */
export async function getPendingWorkoutsAsWorkouts(): Promise<Workout[]> {
  const pending = await getPendingWorkouts();
  return pending.map((p) => {
    const firstCardio = p.submission.cardio?.[0];
    return {
      workoutId: `${PENDING_WORKOUT_PREFIX}${p.id}`,
      name: p.submission.name,
      datePerformed:
        p.submission.datePerformed ??
        new Date(p.createdAt).toISOString().slice(0, 10),
      createdAt: new Date(p.createdAt).toISOString(),
      durationMin: p.submission.durationMin,
      exerciseCount: p.submission.exercises.length,
      bodyTags: p.submission.bodyTags,
      cardioCount: p.submission.cardio?.length ?? 0,
      cardioActivityType: firstCardio?.activityType ?? null,
      cardioDurationSeconds: firstCardio?.durationSeconds ?? null,
    };
  });
}

export async function enqueueWorkout(
  submission: WorkoutSubmission,
  pendingPhotoUris: string[],
): Promise<void> {
  const userId = await getActiveUserId();
  if (!userId) {
    throw new Error("No active user to queue workout for");
  }
  const queue = await loadQueue(userId);
  queue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    submission,
    pendingPhotoUris,
  });
  await saveQueue(userId, queue);
}

let flushing = false;

/**
 * Try to post every queued workout. Each is attempted exactly once per call;
 * anything that throws a network error stays in the queue for the next
 * attempt. Auth or validation failures drop the workout (it can't be
 * recovered from queue retries alone).
 *
 * Returns the count of workouts that were successfully posted.
 */
export async function flushWorkoutQueue(): Promise<number> {
  if (flushing) return 0;
  flushing = true;
  let posted = 0;
  try {
    const userId = await getActiveUserId();
    if (!userId) return 0;
    const queue = await loadQueue(userId);
    if (queue.length === 0) return 0;

    const remaining: PendingWorkout[] = [];
    for (const item of queue) {
      try {
        // Upload deferred local photos now that we're online. uploadPostImage
        // PUTs each file to S3 via a presigned url and returns its object key,
        // which is what the post's photoUrls field carries under secure-s3.
        let uploadedUrls: string[] = [];
        if (item.pendingPhotoUris.length > 0) {
          uploadedUrls = await Promise.all(
            item.pendingPhotoUris.map((uri) => uploadPostImage(uri)),
          );
        }
        const submission: WorkoutSubmission = {
          ...item.submission,
          photoUrls: [...(item.submission.photoUrls ?? []), ...uploadedUrls],
          imageUrl:
            item.submission.imageUrl ??
            (uploadedUrls.length > 0 ? uploadedUrls[0] : undefined),
        };
        await submitWorkout(submission);
        posted += 1;
      } catch (err) {
        if (isNetworkError(err)) {
          // Keep this item and abort the rest of the loop — there's no point
          // hammering further calls when we know the network is down.
          remaining.push(item);
          const idx = queue.indexOf(item);
          if (idx >= 0) {
            for (let i = idx + 1; i < queue.length; i++) {
              remaining.push(queue[i]);
            }
          }
          break;
        }
        // Non-network failure (validation, 4xx). Drop it — retrying won't
        // help, and we don't want to wedge the queue on a single bad item.
        console.error("Dropping queued workout after non-network error:", err);
      }
    }
    await saveQueue(userId, remaining);
  } finally {
    flushing = false;
  }
  return posted;
}
