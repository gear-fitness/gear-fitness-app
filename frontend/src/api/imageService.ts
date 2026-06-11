import * as FileSystem from "expo-file-system/legacy";
import apiClient from "./apiClient";

// Refresh a cached url this many ms before it actually expires, so an <Image>
// never renders a url that dies mid-flight.
const EXPIRY_SKEW_MS = 30_000;
// Backend caps a batch at 100 keys.
const MAX_BATCH = 100;
// Coalesce all key lookups requested within this window into one round trip.
const BATCH_WINDOW_MS = 16;

type CacheEntry = { url: string; expiresAt: number };

const cache = new Map<string, CacheEntry>();
let pending = new Map<string, ((entry: CacheEntry | null) => void)[]>();
let flushScheduled = false;

// Subscribers notified when a key's cached url is invalidated, so any mounted
// <Image> showing that key can re-resolve a fresh presigned url.
const invalidationListeners = new Set<(key: string) => void>();

/** Subscribe to key invalidations. Returns an unsubscribe fn. */
export function onImageKeyInvalidated(cb: (key: string) => void): () => void {
  invalidationListeners.add(cb);
  return () => invalidationListeners.delete(cb);
}

/**
 * Drop a key's cached presigned url and notify subscribers to re-resolve. Use
 * this after re-uploading to a deterministic key (e.g. a profile picture, whose
 * key is stable across uploads) so the new bytes show without a remount.
 */
export function invalidateImageKey(key: string): void {
  if (!key) return;
  cache.delete(key);
  invalidationListeners.forEach((cb) => cb(key));
}

function isFreshlyCached(key: string): CacheEntry | null {
  const entry = cache.get(key);
  if (entry && entry.expiresAt - EXPIRY_SKEW_MS > Date.now()) {
    return entry;
  }
  return null;
}

/**
 * Synchronously return a fresh cached presigned url for a key, or null — without
 * scheduling a fetch. Used to seed a hook's initial state so a remount whose url
 * is already cached doesn't flash a placeholder for a frame. Mirrors the
 * legacy-url passthrough in resolveImageKey.
 */
export function peekCachedImageUrl(key?: string | null): string | null {
  if (!key) return null;
  if (/^https?:\/\//i.test(key)) return key;
  return isFreshlyCached(key)?.url ?? null;
}

async function fetchViewUrls(
  keys: string[],
): Promise<{ urls: Record<string, string>; expiresInSeconds: number }> {
  const { data } = await apiClient.post("/images/view-urls", { keys });
  return data;
}

async function flush() {
  flushScheduled = false;
  const batch = pending;
  pending = new Map();
  const keys = [...batch.keys()];

  const resolveAll = (resolved: Record<string, CacheEntry | null>) => {
    for (const [key, waiters] of batch) {
      waiters.forEach((w) => w(resolved[key] ?? null));
    }
  };

  try {
    const chunks: string[][] = [];
    for (let i = 0; i < keys.length; i += MAX_BATCH) {
      chunks.push(keys.slice(i, i + MAX_BATCH));
    }

    const resolved: Record<string, CacheEntry | null> = {};
    await Promise.all(
      chunks.map(async (chunk) => {
        const { urls, expiresInSeconds } = await fetchViewUrls(chunk);
        const expiresAt = Date.now() + expiresInSeconds * 1000;
        for (const key of chunk) {
          const url = urls[key];
          if (url) {
            const entry = { url, expiresAt };
            cache.set(key, entry);
            resolved[key] = entry;
          } else {
            resolved[key] = null;
          }
        }
      }),
    );
    resolveAll(resolved);
  } catch {
    // Network/auth failure: resolve everyone to null so the UI shows a
    // placeholder. apiClient already handles 401 -> refresh/logout.
    resolveAll({});
  }
}

// A value that is already an absolute URL (e.g. a legacy row the migration left
// untouched) is passed through unchanged rather than presigned.
export function resolveImageKey(key: string): Promise<CacheEntry | null> {
  if (!key) return Promise.resolve(null);
  if (/^https?:\/\//i.test(key)) {
    return Promise.resolve({ url: key, expiresAt: Number.MAX_SAFE_INTEGER });
  }

  const fresh = isFreshlyCached(key);
  if (fresh) return Promise.resolve(fresh);

  return new Promise((resolve) => {
    const waiters = pending.get(key) ?? [];
    waiters.push(resolve);
    pending.set(key, waiters);
    if (!flushScheduled) {
      flushScheduled = true;
      setTimeout(flush, BATCH_WINDOW_MS);
    }
  });
}

export async function requestPostImageUploadUrl(
  contentType: string,
): Promise<{ key: string; uploadUrl: string }> {
  const { data } = await apiClient.post("/images/upload-url", { contentType });
  return data;
}

/**
 * PUT a local image file directly to S3 using a presigned PUT url. The
 * Content-Type MUST match what the backend signed or S3 returns
 * SignatureDoesNotMatch. FormData does not work for a direct S3 PUT — the bytes
 * must be sent raw, which is what BINARY_CONTENT does.
 */
export async function uploadImageToS3(
  uploadUrl: string,
  fileUri: string,
  contentType: string,
): Promise<void> {
  const result = await FileSystem.uploadAsync(uploadUrl, fileUri, {
    httpMethod: "PUT",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { "Content-Type": contentType },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`S3 upload failed (status ${result.status})`);
  }
}

export async function uploadPostImage(fileUri: string): Promise<string> {
  const contentType = "image/jpeg";
  const { key, uploadUrl } = await requestPostImageUploadUrl(contentType);
  await uploadImageToS3(uploadUrl, fileUri, contentType);
  return key;
}
