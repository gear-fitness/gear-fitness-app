import { useEffect, useState } from "react";
import {
  resolveImageKey,
  onImageKeyInvalidated,
  peekCachedImageUrl,
} from "../api/imageService";

const REFRESH_SKEW_MS = 30_000;
const MIN_REFRESH_MS = 5_000;
// Failed resolutions (imageService resolves network/auth failures to null and
// does not cache them) retry with exponential backoff instead of giving up:
// without a retry, the consumer sits on the loading placeholder forever.
const FAILED_RETRY_BASE_MS = 5_000;
const FAILED_RETRY_MAX_MS = 60_000;

export function usePresignedImage(key?: string | null): string | null {
  // Seed from the in-memory cache so a remount whose url is already cached shows
  // the image immediately instead of flashing the placeholder for a frame.
  const [uri, setUri] = useState<string | null>(() => peekCachedImageUrl(key));
  // Bumped when this key is invalidated (e.g. a profile picture re-uploaded to
  // its stable key), forcing the load effect below to re-resolve a fresh url.
  const [bust, setBust] = useState(0);

  useEffect(() => {
    if (!key) return;
    return onImageKeyInvalidated((invalidated) => {
      if (invalidated === key) setBust((n) => n + 1);
    });
  }, [key]);

  useEffect(() => {
    if (!key) {
      setUri(null);
      return;
    }

    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failedAttempts = 0;

    const load = async () => {
      const entry = await resolveImageKey(key);
      if (!active) return;
      // Keep showing the last good url if a re-resolve transiently fails, rather
      // than flashing back to the placeholder.
      setUri((prev) => entry?.url ?? prev ?? null);
      if (entry) {
        failedAttempts = 0;
        if (entry.expiresAt !== Number.MAX_SAFE_INTEGER) {
          const refreshIn = entry.expiresAt - Date.now() - REFRESH_SKEW_MS;
          timer = setTimeout(load, Math.max(refreshIn, MIN_REFRESH_MS));
        }
      } else {
        const delay = Math.min(
          FAILED_RETRY_BASE_MS * 2 ** failedAttempts,
          FAILED_RETRY_MAX_MS,
        );
        failedAttempts += 1;
        timer = setTimeout(load, delay);
      }
    };

    load();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [key, bust]);

  return uri;
}
