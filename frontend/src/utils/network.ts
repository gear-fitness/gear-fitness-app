/**
 * Network status singleton.
 *
 * The apiClient interceptors call setOnline(true) on any successful response
 * and setOnline(false) on responses that look like a transport failure (no
 * response, ECONNABORTED, ERR_NETWORK). Consumers subscribe to flip UI between
 * cached/online views and to flush the offline workout queue when a transition
 * to online happens.
 */

type Listener = (online: boolean) => void;

let online = true;
const listeners = new Set<Listener>();

export function isOnline(): boolean {
  return online;
}

export function setOnline(next: boolean): void {
  if (online === next) return;
  online = next;
  listeners.forEach((cb) => {
    try {
      cb(next);
    } catch (err) {
      console.error("network listener threw:", err);
    }
  });
}

export function subscribeOnlineStatus(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/**
 * Probe the public health endpoint and update online status. Returns the
 * resulting online state. Uses bare fetch so it can't cycle through
 * apiClient's interceptors and trigger spurious refresh attempts.
 */
export async function probeNetwork(apiBaseUrl?: string): Promise<boolean> {
  const base = apiBaseUrl ?? process.env.EXPO_PUBLIC_API_URL;
  if (!base) {
    setOnline(false);
    return false;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${base}/health`, { signal: controller.signal });
    clearTimeout(timer);
    const ok = res.ok;
    setOnline(ok);
    return ok;
  } catch {
    setOnline(false);
    return false;
  }
}

/**
 * Treat axios errors with no response, ECONNABORTED, or "Network Error" as
 * connectivity failures. Anything with a status code is a server response and
 * means we are online (even 5xx — the API was reachable).
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;
  if (error.response) return false;
  const code = error.code;
  if (code === "ECONNABORTED" || code === "ERR_NETWORK") return true;
  const msg = String(error.message ?? "").toLowerCase();
  return msg.includes("network") || msg.includes("timeout");
}
