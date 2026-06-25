import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
import { resolveImageKey } from "../api/imageService";

/**
 * Per-user offline cache of profile picture image bytes. AuthContext pre-warms
 * this on login/refresh so a user's own avatar is visible while offline. The
 * map persists in AsyncStorage; the actual image bytes live in the OS cache
 * directory and may be evicted by the system under storage pressure.
 *
 * The cache is keyed by the stable image identity — an S3 object key under the
 * secure-s3 model (presigned download urls rotate, so they can't be the key).
 * The bytes are downloaded from a freshly resolved presigned url.
 */

const MAP_KEY = "@profile_picture_cache_map";
const SUBDIR = "profile-pictures";

// cacheKey (S3 object key or legacy absolute url) -> local file:// URI
const memCache: Record<string, string> = {};
let memLoaded = false;
const listeners = new Set<() => void>();

async function ensureLoaded(): Promise<void> {
  if (memLoaded) return;
  try {
    const raw = await AsyncStorage.getItem(MAP_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, string>;
      Object.assign(memCache, parsed);
    }
  } catch (err) {
    console.error("Failed to load profile picture cache map:", err);
  }
  memLoaded = true;
}

async function persistMap(): Promise<void> {
  try {
    await AsyncStorage.setItem(MAP_KEY, JSON.stringify(memCache));
  } catch (err) {
    console.error("Failed to persist profile picture cache map:", err);
  }
}

function notify(): void {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch (err) {
      console.error("profile picture cache listener threw:", err);
    }
  });
}

function inferExt(url: string): string {
  const match = url.match(/\.(\w{3,4})(?:\?|#|$)/);
  return match ? `.${match[1].toLowerCase()}` : ".jpg";
}

function safeKey(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

export function getCachedProfilePictureUriSync(
  cacheKey: string | null | undefined,
): string | null {
  if (!cacheKey) return null;
  return memCache[cacheKey] ?? null;
}

export async function loadProfilePictureCache(): Promise<void> {
  await ensureLoaded();
}

/**
 * Download and cache the image identified by `cacheKey`, returning the local
 * file URI. The bytes come from `downloadUrl` when supplied (a presigned url
 * the caller already resolved); otherwise the key is resolved to one here.
 * Either way the on-disk file and the map entry are keyed by the stable
 * `cacheKey`, so a rotating presigned url never causes a cache miss.
 */
export async function cacheProfilePicture(
  cacheKey: string | null | undefined,
  downloadUrl?: string | null,
): Promise<string | null> {
  if (!cacheKey) return null;
  await ensureLoaded();
  const existing = memCache[cacheKey];
  if (existing) {
    try {
      const f = new File(existing);
      if (f.exists) return existing;
    } catch {
      // fall through and re-download
    }
  }
  try {
    // Resolve the key to a downloadable url. resolveImageKey passes absolute
    // urls (legacy rows) and on-device URIs through unchanged.
    const source =
      downloadUrl ?? (await resolveImageKey(cacheKey))?.url ?? null;
    if (!source) return null;

    const dir = new Directory(Paths.cache, SUBDIR);
    if (!dir.exists) dir.create({ intermediates: true });
    const name = `${safeKey(cacheKey)}${inferExt(cacheKey)}`;
    const dest = new File(dir, name);
    if (dest.exists) {
      memCache[cacheKey] = dest.uri;
      notify();
      await persistMap();
      return dest.uri;
    }
    const downloaded = await File.downloadFileAsync(source, dest);
    const uri = downloaded?.uri ?? dest.uri;
    memCache[cacheKey] = uri;
    notify();
    await persistMap();
    return uri;
  } catch (err) {
    console.error("Failed to cache profile picture:", err);
    return null;
  }
}

/**
 * Drop the cached bytes for `cacheKey` and notify subscribers. Use after
 * re-uploading a profile picture: the key is deterministic (it never changes
 * across uploads), so without this the stale on-disk file keeps winning over
 * the freshly uploaded image. Deletes both the mapped file and the
 * deterministic dest path — the latter in case the map entry was lost but the
 * file (whose name derives from the stable key) survived, which would otherwise
 * short-circuit the next download via the `dest.exists` guard.
 */
export async function evictProfilePicture(
  cacheKey: string | null | undefined,
): Promise<void> {
  if (!cacheKey) return;
  await ensureLoaded();

  const mapped = memCache[cacheKey];
  if (mapped) {
    try {
      const f = new File(mapped);
      if (f.exists) f.delete();
    } catch (err) {
      console.error("Failed to delete cached profile picture file:", err);
    }
  }

  try {
    const dir = new Directory(Paths.cache, SUBDIR);
    const dest = new File(dir, `${safeKey(cacheKey)}${inferExt(cacheKey)}`);
    if (dest.exists) dest.delete();
  } catch (err) {
    console.error("Failed to delete cached profile picture file:", err);
  }

  delete memCache[cacheKey];
  notify();
  await persistMap();
}

export function subscribeProfilePictureCache(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
