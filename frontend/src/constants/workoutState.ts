// AsyncStorage key for the persisted in-progress workout. Lives outside
// WorkoutContext so modules the provider itself imports (AuthContext) can
// reference it without creating an import cycle.
export const WORKOUT_STATE_STORAGE_KEY = "@workout_state";
