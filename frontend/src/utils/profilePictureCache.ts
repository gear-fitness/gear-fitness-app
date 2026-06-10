import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";

/**
 * Per-user offline cache of profile picture image bytes. AuthContext pre-warms
 * this on login/refresh so a user's own avatar is visible while offline. The
 * map persists in AsyncStorage; the actual image bytes live in the OS cache
 * directory and may be evicted by the system under storage pressure.
 */

const MAP_KEY = "@profile_picture_cache_map";
const SUBDIR = "profile-pictures";

// remoteUrl -> local file:// URI
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
  remoteUrl: string | null | undefined,
): string | null {
  if (!remoteUrl) return null;
  return memCache[remoteUrl] ?? null;
}

export async function loadProfilePictureCache(): Promise<void> {
  await ensureLoaded();
}

export async function cacheProfilePicture(
  remoteUrl: string | null | undefined,
): Promise<string | null> {
  if (!remoteUrl) return null;
  await ensureLoaded();
  const existing = memCache[remoteUrl];
  if (existing) {
    try {
      const f = new File(existing);
      if (f.exists) return existing;
    } catch {
      // fall through and re-download
    }
  }
  try {
    const dir = new Directory(Paths.cache, SUBDIR);
    if (!dir.exists) dir.create({ intermediates: true });
    const name = `${safeKey(remoteUrl)}${inferExt(remoteUrl)}`;
    const dest = new File(dir, name);
    if (dest.exists) {
      memCache[remoteUrl] = dest.uri;
      notify();
      await persistMap();
      return dest.uri;
    }
    const downloaded = await File.downloadFileAsync(remoteUrl, dest);
    const uri = downloaded?.uri ?? dest.uri;
    memCache[remoteUrl] = uri;
    notify();
    await persistMap();
    return uri;
  } catch (err) {
    console.error("Failed to cache profile picture:", err);
    return null;
  }
}

export function subscribeProfilePictureCache(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
