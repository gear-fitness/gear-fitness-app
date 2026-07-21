// The complete vocabulary of custom analytics events. track() is typed
// against this map, so an event name or property that isn't declared here
// won't compile — this is also the privacy allowlist: no PII, no health
// values (body stats, lifted weights, message/food text) may be added.
export interface AnalyticsEvents {
  sign_up: { method: "google" | "apple" };
  sign_in: { method: "google" | "apple" };
  onboarding_step_viewed: { step: string; step_index: number };
  healthkit_step_completed: { granted: boolean };
  onboarding_completed: undefined;
  workout_started: {
    source: "exercise_select" | "routine" | "todays_routine";
  };
  workout_completed: {
    duration_min: number;
    exercise_count: number;
    set_count: number;
    visibility: "PUBLIC" | "FRIENDS" | "PRIVATE";
    offline_queued: boolean;
  };
  workout_discarded: { exercise_count: number };
  routine_created: {
    source: "scratch" | "from_workout";
    exercise_count?: number;
  };
  rest_day_logged: undefined;
  streak_restored: undefined;
  post_liked: undefined;
  comment_added: undefined;
  user_followed: { source: "profile" | "follow_list" | "post_menu" };
  follow_request_accepted: undefined;
  social_feed_viewed: { feed: "following" | "discover" };
  privacy_toggled: { is_private: boolean };
  account_deleted: undefined;
}

export type AnalyticsEventName = keyof AnalyticsEvents;
