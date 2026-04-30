import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";

import { useAuth } from "../context/AuthContext";
import { updateUserProfile } from "../api/userService";
import {
  getHealthKitSyncStatus,
  readFromHealthKit,
  diffSnapshot,
} from "../utils/healthKitSync";

/**
 * Runs a HealthKit → app read-sync when:
 *   (a) the app initially mounts with an authenticated user
 *   (b) the app returns to foreground
 *
 * Only runs if the user has granted HealthKit permissions. Silent on
 * failure — this is a background nicety, not a critical path.
 *
 * Conflict model: HealthKit wins on reads (per the spec we agreed on).
 * If HealthKit says 172 lbs and the app has 170, we update the app.
 * The app-side writes happen elsewhere (on Settings toggle, edit screens)
 * via syncOnboardingDataToHealthKit.
 *
 * Tolerance: 1 lb / 1 in to avoid chasing rounding noise.
 */
export function useHealthKitForegroundSync() {
  const { user, refreshUser } = useAuth();
  const syncingRef = useRef(false);
  const lastSyncRef = useRef(0);

  // Minimum gap between syncs — prevents thrashing if the user
  // backgrounds/foregrounds quickly.
  const MIN_SYNC_INTERVAL_MS = 30_000;

  const runSync = async () => {
    if (!user) return;
    if (syncingRef.current) return;
    if (Date.now() - lastSyncRef.current < MIN_SYNC_INTERVAL_MS) return;

    syncingRef.current = true;
    try {
      const status = await getHealthKitSyncStatus();
      if (status !== "enabled") return;

      const snapshot = await readFromHealthKit();
      const patch = diffSnapshot(
        { heightInches: user.heightInches, weightLbs: user.weightLbs },
        snapshot,
      );

      if (patch.heightInches == null && patch.weightLbs == null) {
        // Nothing meaningfully different — we're in sync.
        return;
      }

      // Reuse existing profile update API. It requires all fields, so
      // pass current values for anything we're not touching.
      await updateUserProfile(
        patch.heightInches ?? user.heightInches,
        patch.weightLbs ?? user.weightLbs,
        user.age,
        user.username,
        user.displayName,
        user.gender,
      );

      // Refresh the auth context so the rest of the app sees the new values.
      // If your AuthContext doesn't expose refreshUser, swap this for
      // whatever re-fetches the current user.
      if (typeof refreshUser === "function") {
        await refreshUser();
      }

      lastSyncRef.current = Date.now();
    } catch (err) {
      console.warn("HealthKit foreground sync failed:", err);
    } finally {
      syncingRef.current = false;
    }
  };

  useEffect(() => {
    // Run once on mount (covers the "user opens the app cold" case).
    runSync();

    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "active") runSync();
    });

    return () => sub.remove();
    // user?.userId intentionally — we want to re-run on login/logout,
    // but not on every minor user object change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId]);
}
