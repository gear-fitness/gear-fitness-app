import * as Notifications from "expo-notifications";

// Local notification fired if the user backgrounds the app mid-workout and
// doesn't return within this window. This module is the single owner of the
// reminder: every schedule/cancel in the app must go through the ops below.
export const UNFINISHED_WORKOUT_NOTIFICATION_ID = "unfinished-workout-reminder";
const UNFINISHED_WORKOUT_DELAY_SECONDS = 20 * 60;

// All operations run through one promise chain so they reach the OS in call
// order. Without this, a fire-and-forget cancel issued after a schedule can
// execute before the schedule's native add completes and silently no-op,
// leaving the reminder armed (transient inactive/active AppState blips from
// permission dialogs, the notification shade, Face ID, etc. produce exactly
// that schedule-then-cancel pattern).
let chain: Promise<void> = Promise.resolve();
// Bumped by every op. A schedule that was still queued when a newer op was
// issued is stale and must not arm; cancels always run.
let opSeq = 0;

function enqueue(op: () => Promise<void>): Promise<void> {
  chain = chain.then(op, op);
  return chain;
}

// isStillEligible is re-evaluated at execution time, immediately before the
// native call: the workout may have been reset, or a post may have begun,
// while this op waited in the chain.
export function scheduleUnfinishedWorkoutReminder(
  isStillEligible: () => boolean,
): Promise<void> {
  const seq = ++opSeq;
  return enqueue(async () => {
    if (seq !== opSeq) return;
    if (!isStillEligible()) return;
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: UNFINISHED_WORKOUT_NOTIFICATION_ID,
        content: {
          title: "Finish your workout?",
          body: "You've got an unfinished workout waiting. Tap to jump back in.",
          data: { type: "UNFINISHED_WORKOUT" },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: UNFINISHED_WORKOUT_DELAY_SECONDS,
        },
      });
    } catch (error) {
      console.error("Failed to schedule unfinished workout reminder:", error);
    }
  });
}

export function cancelUnfinishedWorkoutReminder(): Promise<void> {
  ++opSeq;
  return enqueue(async () => {
    try {
      await Notifications.cancelScheduledNotificationAsync(
        UNFINISHED_WORKOUT_NOTIFICATION_ID,
      );
    } catch {
      // No pending notification with this identifier; safe to ignore.
    }
    // Also clear any delivered copy from the tray so the user doesn't keep
    // seeing "finish your workout" reminders after the workout has been
    // posted. (A banner that already fired cannot be retracted; this only
    // cleans the notification list.)
    try {
      await Notifications.dismissNotificationAsync(
        UNFINISHED_WORKOUT_NOTIFICATION_ID,
      );
    } catch {
      // Not in tray; safe to ignore.
    }
  });
}
