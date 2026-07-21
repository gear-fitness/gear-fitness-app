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

// A value that is already a renderable URI must not be sent to the presign
// endpoint — it isn't an S3 key. This covers absolute http(s) urls (e.g. a
// legacy row the migration left untouched) and on-device URIs (file://, ph://,
// content://, data:, assets-library://) used by offline pending posts whose
// photos haven't been uploaded yet.
const RENDERABLE_URI = /^(https?:|file:|ph:|content:|data:|assets-library:)/i;

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
  if (RENDERABLE_URI.test(key)) return key;
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

// A value that is already a renderable URI (a legacy absolute url the migration
// left untouched, or an on-device URI from an offline pending post) is passed
// through unchanged rather than presigned.
export function resolveImageKey(key: string): Promise<CacheEntry | null> {
  if (!key) return Promise.resolve(null);
  if (RENDERABLE_URI.test(key)) {
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
  const { data } = await apiClient.post(
    "/images/upload-url",
    { contentType },
    // Per-request timeout so a severed presign call can't hang the outbox
    // flush; ECONNABORTED classifies as a retryable network error.
    { timeout: 15000 },
  );
  return data;
}

/**
 * Mint a presigned PUT url for an ephemeral AI meal photo. The uploaded object
 * is analyzed and deleted server-side right after; unlike post images its key
 * is never persisted. Uploading straight to S3 keeps the image bytes off the
 * API request body, which the CloudFront WAF blocks for a base64 payload.
 */
export async function requestFoodImageUploadUrl(
  contentType: string,
): Promise<{ key: string; uploadUrl: string }> {
  const { data } = await apiClient.post("/images/food-upload-url", {
    contentType,
  });
  return data;
}

/**
 * PUT a local image file directly to S3 using a presigned PUT url. The
 * Content-Type MUST match what the backend signed or S3 returns
 * SignatureDoesNotMatch. FormData does not work for a direct S3 PUT — the bytes
 * must be sent raw, which is what BINARY_CONTENT does.
 */
// Generous ceiling for one photo PUT on a slow link. The PUT has no native
// timeout; without a watchdog a suspend-severed upload hangs forever, which
// would wedge the workout outbox drain behind it.
const S3_UPLOAD_TIMEOUT_MS = 60_000;

export async function uploadImageToS3(
  uploadUrl: string,
  fileUri: string,
  contentType: string,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  const task = FileSystem.createUploadTask(
    uploadUrl,
    fileUri,
    {
      httpMethod: "PUT",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { "Content-Type": contentType },
    },
    onProgress
      ? ({ totalBytesSent, totalBytesExpectedToSend }) => {
          if (totalBytesExpectedToSend > 0) {
            onProgress(Math.min(1, totalBytesSent / totalBytesExpectedToSend));
          }
        }
      : undefined,
  );

  let timedOut = false;
  const watchdog = setTimeout(() => {
    timedOut = true;
    void task.cancelAsync();
  }, S3_UPLOAD_TIMEOUT_MS);

  let result: FileSystem.FileSystemUploadResult | null | undefined;
  try {
    result = await task.uploadAsync();
  } catch (err) {
    // The message must contain "timeout": isNetworkError keys on it to
    // classify the failure as retryable.
    if (timedOut) throw new Error("S3 upload timeout");
    throw err;
  } finally {
    clearTimeout(watchdog);
  }

  if (timedOut || !result) {
    throw new Error("S3 upload timeout");
  }
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`S3 upload failed (status ${result.status})`);
  }
}

export async function uploadPostImage(
  fileUri: string,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  const contentType = "image/jpeg";
  const { key, uploadUrl } = await requestPostImageUploadUrl(contentType);
  await uploadImageToS3(uploadUrl, fileUri, contentType, onProgress);
  return key;
}
