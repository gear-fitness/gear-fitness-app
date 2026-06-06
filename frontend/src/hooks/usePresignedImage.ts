import { useEffect, useState } from "react";
import { resolveImageKey } from "../api/imageService";

const REFRESH_SKEW_MS = 30_000;
const MIN_REFRESH_MS = 5_000;

/**
 * Resolve a stored S3 key to a short-lived presigned GET url, re-fetching
 * shortly before the url expires. Returns null while loading or if the key
 * can't be resolved — callers render a placeholder in that case. Presigned urls
 * are never persisted; they live only in the in-memory cache behind
 * resolveImageKey.
 */
export function usePresignedImage(key?: string | null): string | null {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    if (!key) {
      setUri(null);
      return;
    }

    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      const entry = await resolveImageKey(key);
      if (!active) return;
      setUri(entry?.url ?? null);
      if (entry && entry.expiresAt !== Number.MAX_SAFE_INTEGER) {
        const refreshIn = entry.expiresAt - Date.now() - REFRESH_SKEW_MS;
        timer = setTimeout(load, Math.max(refreshIn, MIN_REFRESH_MS));
      }
    };

    load();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [key]);

  return uri;
}
