/**
 * Mint a client-side idempotency key for a workout session. The key rides in
 * the persisted workout blob and on queue entries so a resubmit of the same
 * session (lost response, offline re-flush) dedupes server-side instead of
 * creating a duplicate workout.
 *
 * Uniqueness only needs to hold per user; cryptographic strength is not
 * required, so the Math.random fallback is fine on runtimes without
 * crypto.randomUUID (this Expo setup ships no crypto polyfill).
 */
export function mintIdempotencyKey(): string {
  const native = globalThis.crypto?.randomUUID?.();
  if (native) {
    return native;
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
