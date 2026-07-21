import PostHog from "posthog-react-native";
import type { AnalyticsEventName, AnalyticsEvents } from "./events";
import type { UserProfile } from "../api/types";

// Host is fixed: the PostHog project lives in US Cloud (data residency is
// set at project creation and never varies per environment).
const POSTHOG_HOST = "https://us.i.posthog.com";

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;

// Dev builds don't report analytics so local testing never pollutes real
// usage data. EXPO_PUBLIC_POSTHOG_FORCE_DEV=true in .env re-enables capture
// when smoke-testing the analytics pipeline itself.
const enabled =
  !!apiKey &&
  (!__DEV__ || process.env.EXPO_PUBLIC_POSTHOG_FORCE_DEV === "true");

function createClient(): PostHog | null {
  if (!enabled || !apiKey) return null;
  try {
    return new PostHog(apiKey, {
      host: POSTHOG_HOST,
      captureAppLifecycleEvents: true,
      // Only signed-in users get person profiles; anonymous devices stay
      // event-only.
      personProfiles: "identified_only",
    });
  } catch (e) {
    // Analytics must never take the app down: a failed init degrades every
    // helper below to a no-op.
    console.warn("PostHog: init failed, analytics disabled", e);
    return null;
  }
}

/**
 * The raw PostHog client, or null when analytics is disabled (dev build,
 * missing key, or init failure). Prefer the wrappers below — they're
 * null-safe, so call sites never have to branch.
 */
export const posthog: PostHog | null = createClient();

/**
 * Capture a custom product event. The event name and its properties are
 * typed against {@link AnalyticsEvents} — new events must be declared there
 * first, which is also the privacy allowlist (no PII / health values).
 * Call after the action succeeds (post-API), not on button press.
 */
export function track<E extends AnalyticsEventName>(
  event: E,
  ...args: AnalyticsEvents[E] extends undefined ? [] : [AnalyticsEvents[E]]
): void {
  posthog?.capture(event, args[0]);
}

/**
 * Capture a screen view. Only called from the navigationRef "state"
 * listener in App.tsx — don't call from individual screens, or views get
 * double-counted. Route names only; params must never be sent.
 */
export function trackScreen(name: string): void {
  posthog?.screen(name);
}

/**
 * Attach this device's events to a signed-in user (distinct_id = userId)
 * and set person props. Only called from AnalyticsIdentitySync, which
 * watches auth state — feature code should never need this.
 */
export function identifyUser(user: UserProfile): void {
  if (!posthog) return;
  const tier = user.tier ?? "BASIC";
  // Email is deliberately excluded: distinct_id === userId already joins to
  // our own database when support needs a lookup.
  posthog.identify(user.userId, {
    $set: {
      username: user.username,
      tier,
      created_at: user.createdAt,
    },
  });
  // Super property so every event (not just the person) is filterable by tier.
  posthog.register({ tier });
}

/**
 * Return to an anonymous identity after sign-out so the next account on
 * this device isn't mixed in. Only called from AnalyticsIdentitySync;
 * flush() first or queued events lose their user attribution.
 */
export function resetIdentity(): void {
  posthog?.reset();
}

/**
 * Send queued events now instead of waiting for the batch timer. Needed
 * before resetIdentity() and before teardown-ish moments (e.g. account
 * deletion); everyday events should just rely on batching.
 */
export async function flush(): Promise<void> {
  await posthog?.flush();
}

/**
 * Whether the user currently shares usage data (SDK-persisted opt-in
 * state). Drives the "Share Anonymous Usage Data" toggle in Settings;
 * always false when the client is disabled.
 */
export function isAnalyticsEnabled(): boolean {
  return posthog ? !posthog.optedOut : false;
}

/**
 * Opt in/out of all analytics, persisted by the SDK across launches.
 * Wired to the Settings privacy toggle — purely client-side, no server
 * call involved.
 */
export async function setAnalyticsEnabled(enable: boolean): Promise<void> {
  if (!posthog) return;
  if (enable) {
    await posthog.optIn();
  } else {
    await posthog.optOut();
  }
}
