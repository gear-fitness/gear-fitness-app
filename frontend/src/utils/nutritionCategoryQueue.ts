import {
  deleteCategoryApi,
  renameCategoryApi,
  setCategoryRecurringApi,
} from "../api/nutritionCategoryService";
import { isNetworkError } from "./network";
import {
  CACHE_KEYS,
  getActiveUserId,
  readCache,
  writeCache,
} from "./offlineCache";

/**
 * Offline-first queue for meal-category mutations, mirroring routineQueue.
 *
 * Category state is applied optimistically and persisted client-side
 * immediately (NutritionContext → AsyncStorage). The matching server sync is
 * enqueued here and replayed on the next online transition (wired in
 * AuthContext). Network failures stay queued; non-network failures are dropped
 * so a single bad op can't wedge the queue.
 */
export type PendingCategoryOp =
  | { kind: "rename"; from: string; to: string }
  | { kind: "delete"; name: string }
  | { kind: "setRecurring"; name: string; value: boolean; recurringFrom?: string };

export interface PendingCategoryAction {
  id: string;
  createdAt: number;
  op: PendingCategoryOp;
}

async function loadQueue(userId: string): Promise<PendingCategoryAction[]> {
  const cached = await readCache<PendingCategoryAction[]>(
    CACHE_KEYS.pendingNutritionCategoryOps(userId),
  );
  return cached ?? [];
}

async function saveQueue(
  userId: string,
  queue: PendingCategoryAction[],
): Promise<void> {
  await writeCache(CACHE_KEYS.pendingNutritionCategoryOps(userId), queue);
}

export async function enqueueCategoryOp(op: PendingCategoryOp): Promise<void> {
  const userId = await getActiveUserId();
  if (!userId) return;
  const item: PendingCategoryAction = {
    id: `pending_category_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    createdAt: Date.now(),
    op,
  };
  const queue = await loadQueue(userId);
  queue.push(item);
  await saveQueue(userId, queue);
}

async function runOp(op: PendingCategoryOp): Promise<void> {
  switch (op.kind) {
    case "rename":
      return renameCategoryApi(op.from, op.to);
    case "delete":
      return deleteCategoryApi(op.name);
    case "setRecurring":
      return setCategoryRecurringApi(op.name, op.value, op.recurringFrom);
  }
}

let flushing = false;

/**
 * Replay every queued category op once. Network errors keep the item (and stop
 * the run to preserve order); other errors drop it. Returns ops synced.
 */
export async function flushNutritionCategoryQueue(): Promise<number> {
  if (flushing) return 0;
  flushing = true;
  let synced = 0;
  try {
    const userId = await getActiveUserId();
    if (!userId) return 0;
    const queue = await loadQueue(userId);
    if (queue.length === 0) return 0;

    const remaining: PendingCategoryAction[] = [];
    for (let i = 0; i < queue.length; i++) {
      try {
        await runOp(queue[i].op);
        synced += 1;
      } catch (err) {
        if (isNetworkError(err)) {
          for (let j = i; j < queue.length; j++) remaining.push(queue[j]);
          break;
        }
        console.error(
          "Dropping queued category op after non-network error:",
          err,
        );
      }
    }
    await saveQueue(userId, remaining);
  } finally {
    flushing = false;
  }
  return synced;
}
