/**
 * Post-upload event singleton.
 *
 * The workout outbox (workoutQueue) publishes delivery lifecycle events here:
 * live progress fractions while an entry's photos and submission upload, a
 * "delivered" signal when an entry lands, and a generic "outboxChanged" on any
 * queue mutation. The social feed's upload bar subscribes to drive its
 * "Keep Gear open to finish posting..." treatment. This module must stay
 * dependency-free so workoutQueue -> here -> UI never forms a cycle.
 */

export type PostUploadEvent =
  | { type: "progress"; queueId: string; fraction: number }
  | { type: "delivered"; queueId: string }
  | { type: "outboxChanged" };

type Listener = (event: PostUploadEvent) => void;

const listeners = new Set<Listener>();

// Snapshot of the entry the flush is actively delivering, so a subscriber
// mounting mid-flush (the feed screen right after posting) can seed its bar
// without waiting for the next progress callback.
let current: { queueId: string; fraction: number } | null = null;

export function getUploadProgress(): {
  queueId: string;
  fraction: number;
} | null {
  return current;
}

function emit(event: PostUploadEvent): void {
  listeners.forEach((cb) => {
    try {
      cb(event);
    } catch (err) {
      console.error("post upload listener threw:", err);
    }
  });
}

export function publishUploadProgress(queueId: string, fraction: number): void {
  const clamped = Math.min(1, Math.max(0, fraction));
  current = { queueId, fraction: clamped };
  emit({ type: "progress", queueId, fraction: clamped });
}

/**
 * The flush stopped working this entry without delivering it (failure or a
 * network break). Drops the snapshot so the bar falls back to queue state.
 */
export function clearUploadProgress(): void {
  if (!current) return;
  current = null;
  emit({ type: "outboxChanged" });
}

export function publishPostDelivered(queueId: string): void {
  current = null;
  emit({ type: "delivered", queueId });
}

export function publishOutboxChanged(): void {
  emit({ type: "outboxChanged" });
}

export function subscribePostUploadEvents(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
