import { useEffect, useState } from "react";
import { usePresignedImage } from "./usePresignedImage";
import {
  cacheProfilePicture,
  getCachedProfilePictureUriSync,
  loadProfilePictureCache,
  subscribeProfilePictureCache,
} from "../utils/profilePictureCache";

/**
 * Resolve a profile picture S3 key to a renderable URI.
 *
 * Under the secure-s3 image model `key` is an S3 object key, not a public URL.
 * This hook returns, in priority order:
 *   1. a locally-cached file URI (offline-safe, no flicker), if one exists for
 *      this key;
 *   2. otherwise a freshly presigned url resolved from the key (online);
 *   3. otherwise null — letting the Avatar fall back to initials (e.g. offline
 *      with no cached copy).
 *
 * `enableDownload` controls whether a cache miss kicks off a background
 * download of the bytes (keyed by the stable S3 key) so the avatar survives
 * going offline. Pass true for the current user's own avatar; false for
 * incidental avatars elsewhere in the UI, which are cached centrally by
 * AuthContext's pre-warm instead.
 */
export function useCachedAvatarUri(
  key: string | null | undefined,
  enableDownload: boolean = false,
): string | null | undefined {
  // Live presigned url for the key (null while resolving or when offline). For
  // already-renderable values (legacy absolute urls, on-device URIs) this is a
  // passthrough — see resolveImageKey.
  const presigned = usePresignedImage(key);

  const [cached, setCached] = useState<string | null>(() =>
    key ? (getCachedProfilePictureUriSync(key) ?? null) : null,
  );

  // Track the locally-cached file for this key, and react to cache updates
  // (e.g. AuthContext pre-warming the current user's avatar after login).
  useEffect(() => {
    if (!key) {
      setCached(null);
      return;
    }
    let cancelled = false;
    (async () => {
      await loadProfilePictureCache();
      if (cancelled) return;
      setCached(getCachedProfilePictureUriSync(key) ?? null);
    })();
    // Re-read this key's cached file on any cache change. Setting null when the
    // entry is gone is intentional: after an eviction (re-upload) the avatar
    // must fall back to the freshly presigned url instead of the stale file.
    const unsubscribe = subscribeProfilePictureCache(() => {
      setCached(getCachedProfilePictureUriSync(key) ?? null);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [key]);

  // Once a presigned url is available, opportunistically cache the bytes under
  // the stable key so the avatar is visible the next time the app is offline.
  useEffect(() => {
    if (!enableDownload || !key || !presigned) return;
    if (getCachedProfilePictureUriSync(key)) return;
    let cancelled = false;
    cacheProfilePicture(key, presigned).then((local) => {
      if (!cancelled && local) setCached(local);
    });
    return () => {
      cancelled = true;
    };
  }, [enableDownload, key, presigned]);

  return cached ?? presigned ?? null;
}
