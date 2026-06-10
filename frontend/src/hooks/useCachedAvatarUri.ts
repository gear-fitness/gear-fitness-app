import { useEffect, useState } from "react";
import {
  cacheProfilePicture,
  getCachedProfilePictureUriSync,
  loadProfilePictureCache,
  subscribeProfilePictureCache,
} from "../utils/profilePictureCache";

/**
 * Resolve a remote profile picture URL to a local file URI when one has been
 * cached on this device. When no local copy exists, falls back to the remote
 * URL — which renders normally online and silently shows the Avatar initials
 * fallback when offline.
 *
 * `enableDownload` controls whether a cache miss kicks off a background
 * download. Callers should pass true for the current user's avatar (so it is
 * available the next time they open the app offline) and false for incidental
 * avatars elsewhere in the UI.
 */
export function useCachedAvatarUri(
  remoteUrl: string | null | undefined,
  enableDownload: boolean = false,
): string | null | undefined {
  const [resolved, setResolved] = useState<string | null | undefined>(() => {
    if (!remoteUrl) return remoteUrl ?? null;
    return getCachedProfilePictureUriSync(remoteUrl) ?? remoteUrl;
  });

  useEffect(() => {
    if (!remoteUrl) {
      setResolved(remoteUrl ?? null);
      return;
    }
    let cancelled = false;
    (async () => {
      await loadProfilePictureCache();
      if (cancelled) return;
      const existing = getCachedProfilePictureUriSync(remoteUrl);
      if (existing) {
        setResolved(existing);
        return;
      }
      setResolved(remoteUrl);
      if (!enableDownload) return;
      const local = await cacheProfilePicture(remoteUrl);
      if (!cancelled && local) setResolved(local);
    })();
    const unsubscribe = subscribeProfilePictureCache(() => {
      if (!remoteUrl) return;
      const local = getCachedProfilePictureUriSync(remoteUrl);
      if (local) setResolved(local);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [remoteUrl, enableDownload]);

  return resolved;
}
