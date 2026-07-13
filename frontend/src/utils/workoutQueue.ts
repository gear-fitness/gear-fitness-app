import * as ImageManipulator from "expo-image-manipulator";
import { submitWorkout, WorkoutSubmission } from "../api/workoutService";
import { uploadPostImage } from "../api/imageService";
import { Workout } from "../api/types";
import { isNetworkError } from "./network";
import { mintIdempotencyKey } from "./idempotency";
import {
  CACHE_KEYS,
  getActiveUserId,
  readCache,
  writeCache,
} from "./offlineCache";

export const PENDING_WORKOUT_PREFIX = "pending_workout_";

// A 5xx / unknown failure is retried this many times across flushes before
// the entry is parked as "failed" and handed to the user (Retry/Discard on
// the Profile card). 4xx failures park immediately: they won't self-heal.
const MAX_SERVER_ATTEMPTS = 5;

export function isPendingWorkoutId(id: string): boolean {
  return id.startsWith(PENDING_WORKOUT_PREFIX);
}

/**
 * An outbox entry: a workout the user has committed to posting. Since the
 * enqueue-first rework this is EVERY post, not just offline ones; tapping
 * Post enqueues (with an idempotency key) and the flush delivers. The
 * submission payload is kept verbatim and photos are kept as local URIs,
 * compressed and uploaded at flush time.
 */
export interface PendingWorkout {
  id: string;
  createdAt: number;
  submission: WorkoutSubmission;
  /**
   * Local image URIs (file://, ph://, content://) still to be uploaded.
   */
  pendingPhotoUris: string[];
  /**
   * Session-scoped key the server dedupes on: a re-flush of a submission
   * that already committed (response lost mid-flight) returns the existing
   * workout instead of creating a duplicate.
   */
  idempotencyKey: string;
  /** undefined (legacy entries) reads as "pending". */
  status?: "pending" | "failed";
  /** Consecutive server/unknown failures; parked as failed at the cap. */
  attempts?: number;
  failedAt?: number;
  /** "client" = 4xx (won't self-heal); "server" = 5xx/unknown (gave up). */
  lastErrorKind?: "client" | "server";
  /**
   * S3 object keys for photos already uploaded, parallel to
   * pendingPhotoUris. Persisted per photo so a retry never re-uploads (and
   * never orphans) an already-delivered image.
   */
  uploadedPhotoKeys?: (string | null)[];
}

export function isEntryFailed(entry: PendingWorkout): boolean {
  return entry.status === "failed";
}

// ---------------------------------------------------------------------------
// Queue storage. ALL read-modify-write cycles must go through withQueueLock:
// the flush loop persists per item while WorkoutComplete enqueues and the
// Profile card retries/discards, and an unserialized load-mutate-save would
// silently drop whichever write lost the race.
// ---------------------------------------------------------------------------

let queueLock: Promise<void> = Promise.resolve();

function withQueueLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queueLock.then(fn);
  queueLock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
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

/**
 * Load the queue and backfill idempotency keys onto entries persisted by
 * builds that predate them. A legacy entry's past ambiguity can't be fixed,
 * but a key minted now protects all of its future retries. Must run under
 * the queue lock.
 */
async function loadQueueNormalized(userId: string): Promise<PendingWorkout[]> {
  const queue = await loadQueue(userId);
  let changed = false;
  for (const item of queue) {
    if (!item.idempotencyKey) {
      item.idempotencyKey = mintIdempotencyKey();
      changed = true;
    }
  }
  if (changed) {
    await saveQueue(userId, queue);
  }
  return queue;
}

/** Mutate one entry in place (by queue id) and persist. Lock-wrapped. */
async function updateEntry(
  userId: string,
  id: string,
  mutate: (entry: PendingWorkout) => void,
): Promise<void> {
  await withQueueLock(async () => {
    const queue = await loadQueue(userId);
    const entry = queue.find((e) => e.id === id);
    if (!entry) return;
    mutate(entry);
    await saveQueue(userId, queue);
  });
}

/** Remove one entry (by queue id) and persist. Lock-wrapped. */
async function removeEntry(userId: string, id: string): Promise<void> {
  await withQueueLock(async () => {
    const queue = await loadQueue(userId);
    await saveQueue(
      userId,
      queue.filter((e) => e.id !== id),
    );
  });
}

export async function getPendingWorkoutCount(): Promise<number> {
  const userId = await getActiveUserId();
  if (!userId) return 0;
  const queue = await withQueueLock(() => loadQueueNormalized(userId));
  return queue.length;
}

export async function getPendingWorkouts(): Promise<PendingWorkout[]> {
  const userId = await getActiveUserId();
  if (!userId) return [];
  return withQueueLock(() => loadQueueNormalized(userId));
}

/**
 * True when the current user's queue holds an entry with this idempotency
 * key. Used by WorkoutContext's restore to reject an already-posted ghost
 * blob (enqueue write landed, reset() write didn't before the app died).
 * Returns false with no active user so restore proceeds normally.
 */
export async function hasQueuedIdempotencyKey(key: string): Promise<boolean> {
  const userId = await getActiveUserId();
  if (!userId) return false;
  const queue = await withQueueLock(() => loadQueueNormalized(userId));
  return queue.some((e) => e.idempotencyKey === key);
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
  return pending.map((p) => ({
    workoutId: `${PENDING_WORKOUT_PREFIX}${p.id}`,
    name: p.submission.name,
    datePerformed:
      p.submission.datePerformed ??
      new Date(p.createdAt).toISOString().slice(0, 10),
    createdAt: new Date(p.createdAt).toISOString(),
    durationMin: p.submission.durationMin,
    exerciseCount: p.submission.exercises.length,
    bodyTags: p.submission.bodyTags,
  }));
}

/**
 * Commit a workout to the outbox. This is the post flow's commit point:
 * once this resolves, the workout is durably owned by the queue and the
 * in-progress session can be reset. Dedupes by idempotency key so a
 * double-tap (or a replayed flow) can't create two entries.
 */
export async function enqueueWorkout(
  submission: WorkoutSubmission,
  pendingPhotoUris: string[],
  idempotencyKey: string,
): Promise<void> {
  const userId = await getActiveUserId();
  if (!userId) {
    throw new Error("No active user to queue workout for");
  }
  await withQueueLock(async () => {
    const queue = await loadQueue(userId);
    if (queue.some((e) => e.idempotencyKey === idempotencyKey)) return;
    queue.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
      submission: { ...submission, idempotencyKey },
      pendingPhotoUris,
      idempotencyKey,
      status: "pending",
      attempts: 0,
    });
    await saveQueue(userId, queue);
  });
}

/** Reset a failed entry to pending and drive a flush. */
export async function retryPendingWorkout(queueId: string): Promise<number> {
  const userId = await getActiveUserId();
  if (!userId) return 0;
  await updateEntry(userId, queueId, (entry) => {
    entry.status = "pending";
    entry.attempts = 0;
    entry.failedAt = undefined;
    entry.lastErrorKind = undefined;
  });
  return flushWorkoutQueue();
}

/** Permanently drop an entry (the workout was never posted). */
export async function discardPendingWorkout(queueId: string): Promise<void> {
  const userId = await getActiveUserId();
  if (!userId) return;
  await removeEntry(userId, queueId);
}

// ---------------------------------------------------------------------------
// Flush: a coalescing drain. Only one drain runs at a time; a call landing
// mid-pass (WorkoutComplete kicking the flush right after enqueueing while
// an AuthContext reconnect flush is mid-loop) requests a re-run and shares
// the drain's promise, so the promise it awaits always covers a full pass
// over its just-enqueued entry.
// ---------------------------------------------------------------------------

let inFlightFlush: Promise<number> | null = null;
let rerunRequested = false;

export function flushWorkoutQueue(): Promise<number> {
  if (inFlightFlush) {
    rerunRequested = true;
    return inFlightFlush;
  }
  const run = (async () => {
    let posted = 0;
    do {
      rerunRequested = false;
      try {
        posted += await flushOnce();
      } catch (err) {
        // flushOnce handles per-entry failures itself; this guards the drain
        // against the unexpected so inFlightFlush can never wedge.
        console.error("Workout queue flush pass failed:", err);
      }
    } while (rerunRequested);
    return posted;
  })();
  inFlightFlush = run;
  void run.then(
    () => {
      inFlightFlush = null;
    },
    () => {
      inFlightFlush = null;
    },
  );
  return run;
}

/**
 * One pass over the queue. Pending entries are attempted once each; failed
 * entries are skipped (they only move via retryPendingWorkout). Progress is
 * persisted per item, so a kill mid-pass leaves an accurate queue and the
 * server's idempotency-key dedupe absorbs a commit whose removal didn't
 * land. Returns the number of workouts posted.
 */
async function flushOnce(): Promise<number> {
  let posted = 0;
  const userId = await getActiveUserId();
  if (!userId) return 0;
  const snapshot = await withQueueLock(() => loadQueueNormalized(userId));

  for (const item of snapshot) {
    if (isEntryFailed(item)) continue;
    try {
      // Compress and upload photos that haven't made it to S3 yet. Each
      // uploaded key is persisted immediately so a later retry resumes
      // instead of re-uploading.
      const uploadedKeys: (string | null)[] = [
        ...(item.uploadedPhotoKeys ??
          new Array<string | null>(item.pendingPhotoUris.length).fill(null)),
      ];
      for (let i = 0; i < item.pendingPhotoUris.length; i++) {
        if (uploadedKeys[i]) continue;
        const compressed = await ImageManipulator.manipulateAsync(
          item.pendingPhotoUris[i],
          [{ resize: { width: 1600 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
        );
        uploadedKeys[i] = await uploadPostImage(compressed.uri);
        await updateEntry(userId, item.id, (entry) => {
          entry.uploadedPhotoKeys = [...uploadedKeys];
        });
      }

      const photoKeys = uploadedKeys.filter((k): k is string => k !== null);
      const submission: WorkoutSubmission = {
        ...item.submission,
        idempotencyKey: item.idempotencyKey,
        photoUrls: [...(item.submission.photoUrls ?? []), ...photoKeys],
        imageUrl:
          item.submission.imageUrl ??
          (photoKeys.length > 0 ? photoKeys[0] : undefined),
      };
      await submitWorkout(submission);
      await removeEntry(userId, item.id);
      posted += 1;
    } catch (err) {
      if (isNetworkError(err)) {
        // Offline (or timed out): keep the entry pending and stop the pass;
        // there's no point hammering further calls when the network is down.
        break;
      }
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      if (typeof status === "number" && status >= 400 && status < 500) {
        // The server rejected the payload; a retry won't self-heal. Park it
        // for the user to Retry (after an app update fixes the cause) or
        // Discard. Never silently dropped.
        await updateEntry(userId, item.id, (entry) => {
          entry.status = "failed";
          entry.failedAt = Date.now();
          entry.lastErrorKind = "client";
        });
      } else {
        // 5xx, S3 upload failure, missing local file, anything unknown:
        // transient until proven otherwise. Count the attempt and park the
        // entry once the budget is spent.
        const attempts = (item.attempts ?? 0) + 1;
        await updateEntry(userId, item.id, (entry) => {
          entry.attempts = attempts;
          if (attempts >= MAX_SERVER_ATTEMPTS) {
            entry.status = "failed";
            entry.failedAt = Date.now();
            entry.lastErrorKind = "server";
          }
        });
      }
      console.error("Queued workout submission failed:", err);
    }
  }
  return posted;
}
