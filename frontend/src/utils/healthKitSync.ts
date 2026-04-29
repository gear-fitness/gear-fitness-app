import { Platform } from "react-native";
import {
  isHealthDataAvailable,
  requestAuthorization,
  saveQuantitySample,
  getMostRecentQuantitySample,
  authorizationStatusFor,
} from "@kingstinct/react-native-healthkit";

import {
  Height,
  Weight,
  OnboardingDraft,
} from "../navigation/onboarding/types";

// ──────────────────────────────────────────────────────────────
// Unit converters (pure, exported for testability)
// ──────────────────────────────────────────────────────────────

export function heightToMeters(h: Height): number {
  if (h.unit === "ft_in") {
    const totalInches = h.ft * 12 + h.inch;
    return totalInches * 0.0254;
  }
  return h.cm / 100;
}

export function weightToKilograms(w: Weight): number {
  if (w.unit === "kg") return w.value;
  return w.value / 2.2046226;
}

// HealthKit → our units (inches and pounds, matching what the backend stores)
export function metersToInches(m: number): number {
  return Math.round(m * 39.3701);
}

export function kilogramsToPounds(kg: number): number {
  return Math.round(kg * 2.2046226);
}

// ──────────────────────────────────────────────────────────────
// HealthKit identifiers we care about
// ──────────────────────────────────────────────────────────────

const HEIGHT_ID = "HKQuantityTypeIdentifierHeight";
const WEIGHT_ID = "HKQuantityTypeIdentifierBodyMass";

// Both read AND write — required for bidirectional sync.
const HK_WRITE_IDENTIFIERS = [HEIGHT_ID, WEIGHT_ID] as const;
const HK_READ_IDENTIFIERS = [HEIGHT_ID, WEIGHT_ID] as const;

// ──────────────────────────────────────────────────────────────
// Permission / status
// ──────────────────────────────────────────────────────────────

/**
 * Request both read and write permissions for height + weight. Shows
 * the iOS HealthKit permission sheet if the user hasn't been prompted
 * for these types yet. If they have, this is effectively a no-op.
 *
 * Must be called before any saveQuantitySample or getMostRecentQuantitySample
 * — per the library docs, skipping this crashes the app natively.
 */
export async function requestHealthKitPermissions(): Promise<void> {
  if (Platform.OS !== "ios") return;
  const available = await isHealthDataAvailable();
  if (!available) return;

  await requestAuthorization({
    toShare: HK_WRITE_IDENTIFIERS as unknown as string[],
    toRead: HK_READ_IDENTIFIERS as unknown as string[],
  });
}

/**
 * Best-effort check for whether we have WRITE permission. HealthKit's
 * auth model is intentionally opaque for reads (to prevent apps from
 * fingerprinting what data exists), but write status IS queryable.
 *
 * For our UI purposes, "has ever been granted write" is a good enough
 * proxy for "bidirectional sync is set up" — you can't write without
 * read having been requested in the same prompt.
 *
 * Returns:
 *   "enabled"      — user has granted write
 *   "not_determined" — never asked, or iOS can't tell us
 *   "disabled"     — user explicitly denied
 *   "unavailable"  — non-iOS or HealthKit disabled on device
 */
export async function getHealthKitSyncStatus(): Promise<
  "enabled" | "disabled" | "not_determined" | "unavailable"
> {
  if (Platform.OS !== "ios") return "unavailable";
  try {
    const available = await isHealthDataAvailable();
    if (!available) return "unavailable";

    // Check the height type's share (write) authorization. If the user
    // granted everything in one prompt (which our flow ensures), this
    // is a reliable indicator of overall status.
    const status = await authorizationStatusFor(HEIGHT_ID);
    // Values per Apple's HKAuthorizationStatus:
    //   0 = notDetermined, 1 = sharingDenied, 2 = sharingAuthorized
    if (status === 2) return "enabled";
    if (status === 1) return "disabled";
    return "not_determined";
  } catch (err) {
    console.warn("HealthKit status check failed:", err);
    return "not_determined";
  }
}

// ──────────────────────────────────────────────────────────────
// Write path (existing — used on onboarding and on app-side changes)
// ──────────────────────────────────────────────────────────────

/**
 * Pushes the user's height/weight into Apple Health. "App wins on writes" —
 * we silently overwrite whatever is in HealthKit.
 *
 * Assumes permissions have already been requested (either by onboarding or
 * by the Settings toggle). Safe to call without — failures resolve quietly.
 */
export async function syncOnboardingDataToHealthKit(
  draft: Pick<OnboardingDraft, "height" | "weight">,
): Promise<boolean> {
  if (Platform.OS !== "ios") return false;

  try {
    const available = await isHealthDataAvailable();
    if (!available) return false;

    await requestAuthorization({
      toShare: HK_WRITE_IDENTIFIERS as unknown as string[],
      toRead: HK_READ_IDENTIFIERS as unknown as string[],
    });

    const now = new Date();
    let wroteSomething = false;

    if (draft.height) {
      try {
        await saveQuantitySample(
          HEIGHT_ID,
          "m",
          heightToMeters(draft.height),
          now,
          now,
        );
        wroteSomething = true;
      } catch (e) {
        console.warn("HealthKit height write failed:", e);
      }
    }

    if (draft.weight) {
      try {
        await saveQuantitySample(
          WEIGHT_ID,
          "kg",
          weightToKilograms(draft.weight),
          now,
          now,
        );
        wroteSomething = true;
      } catch (e) {
        console.warn("HealthKit weight write failed:", e);
      }
    }

    return wroteSomething;
  } catch (err) {
    console.warn("HealthKit sync failed:", err);
    return false;
  }
}

// ──────────────────────────────────────────────────────────────
// Read path (new — used for foreground sync from HealthKit → app)
// ──────────────────────────────────────────────────────────────

export type HealthKitSnapshot = {
  heightInches: number | null;
  weightLbs: number | null;
};

/**
 * Reads the most recent height and weight samples from Apple Health.
 * Returns values in the app's canonical units (inches, lbs) to match
 * what the backend user profile stores.
 *
 * Assumes permissions have been granted. Individual read failures are
 * caught and returned as null — partial results are fine.
 */
export async function readFromHealthKit(): Promise<HealthKitSnapshot> {
  const snapshot: HealthKitSnapshot = {
    heightInches: null,
    weightLbs: null,
  };

  if (Platform.OS !== "ios") return snapshot;

  try {
    const available = await isHealthDataAvailable();
    if (!available) return snapshot;

    try {
      const heightSample = await getMostRecentQuantitySample(HEIGHT_ID, "m");
      if (heightSample?.quantity != null) {
        snapshot.heightInches = metersToInches(heightSample.quantity);
      }
    } catch (e) {
      console.warn("HealthKit height read failed:", e);
    }

    try {
      const weightSample = await getMostRecentQuantitySample(WEIGHT_ID, "kg");
      if (weightSample?.quantity != null) {
        snapshot.weightLbs = kilogramsToPounds(weightSample.quantity);
      }
    } catch (e) {
      console.warn("HealthKit weight read failed:", e);
    }
  } catch (err) {
    console.warn("HealthKit read failed:", err);
  }

  return snapshot;
}

// ──────────────────────────────────────────────────────────────
// Diff helper
// ──────────────────────────────────────────────────────────────

/**
 * Returns the subset of HealthKit values that differ from the user's
 * current profile. Tolerances chosen to ignore meaningless rounding —
 * no one cares about a 1-lb or 1-inch flutter.
 */
export function diffSnapshot(
  current: { heightInches: number | null; weightLbs: number | null },
  snapshot: HealthKitSnapshot,
): { heightInches?: number; weightLbs?: number } {
  const patch: { heightInches?: number; weightLbs?: number } = {};

  if (
    snapshot.heightInches != null &&
    (current.heightInches == null ||
      Math.abs(snapshot.heightInches - current.heightInches) >= 1)
  ) {
    patch.heightInches = snapshot.heightInches;
  }

  if (
    snapshot.weightLbs != null &&
    (current.weightLbs == null ||
      Math.abs(snapshot.weightLbs - current.weightLbs) >= 1)
  ) {
    patch.weightLbs = snapshot.weightLbs;
  }

  return patch;
}
