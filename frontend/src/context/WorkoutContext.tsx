import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { BodyPartDTO } from "../api/exerciseService";
import { WeightUnit } from "../utils/weight";

export interface WorkoutSet {
  reps: string;
  weight: string;
}

export interface WorkoutExercise {
  workoutExerciseId: string;
  exerciseId: string;
  name: string;
  sets: WorkoutSet[];
  note?: string;
  bodyParts?: BodyPartDTO[];
  durationSeconds?: number;
  draftReps?: string;
  draftWeight?: string;
  // Per-exercise display/input unit for this workout. Undefined → use the
  // app-wide default. Workout-scoped: a fresh workout starts without it, so it
  // resets to the global default. `weight` stays canonical lbs.
  weightUnit?: WeightUnit;
}

export interface CardioEntry {
  // Local-only id assigned when the entry is added to the workout. The server
  // generates the real workoutCardioId at submit time.
  workoutCardioId: string;
  cardioActivityId: string;
  // Denormalized catalog name — what the server stores as activity_type.
  activityType: string;
  durationSeconds: number;
  // Optional numeric inputs kept as raw strings while editing; parsed at submit.
  distance?: string;
  calories?: string;
  intensity?: string;
  note?: string;
}

export type LastModalScreen = "WorkoutSummary" | "ExerciseDetail" | null;

interface PersistedWorkoutState {
  version: number;
  totalElapsedSeconds: number;
  startTimestamp: number | null;
  // Write-once wall-clock epoch (ms) of when the workout first began. Unlike
  // startTimestamp (the timer anchor, reset on pause/app-kill restore), this is
  // set once and never reset, so the workout's streak/calendar day can be pinned
  // to when the user actually started training. See getLocalDateStringFromEpoch.
  workoutStartedAtEpoch: number | null;
  running: boolean;
  lastSaveTimestamp: number;
  exercises: WorkoutExercise[];
  cardioEntries: CardioEntry[];
  // Cardio stopwatch (independent from the main workout timer), persisted so a
  // mid-logging app-kill restores the in-progress cardio duration.
  cardioTotalElapsedSeconds: number;
  cardioStartTimestamp: number | null;
  cardioRunning: boolean;
  playerVisible: boolean;
  currentExerciseId: string | null;
  currentCardioId: string | null;
  activeTab: string;
  lastModalScreen: LastModalScreen;
  activeExerciseId: string | null;
  activeExerciseStartedAt: number | null;
}

const WORKOUT_STATE_VERSION = 1;
export const WORKOUT_STATE_STORAGE_KEY = "@workout_state";
const STORAGE_KEY = WORKOUT_STATE_STORAGE_KEY;
const SAVE_DEBOUNCE_MS = 500;
const MAX_STATE_AGE_DAYS = 7;

// Local notification fired if the user backgrounds the app mid-workout
// and doesn't return within this window.
export const UNFINISHED_WORKOUT_NOTIFICATION_ID = "unfinished-workout-reminder";
const UNFINISHED_WORKOUT_DELAY_SECONDS = 20 * 60;

async function scheduleUnfinishedWorkoutReminder() {
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
}

async function cancelUnfinishedWorkoutReminder() {
  try {
    await Notifications.cancelScheduledNotificationAsync(
      UNFINISHED_WORKOUT_NOTIFICATION_ID,
    );
  } catch {
    // No pending notification with this identifier; safe to ignore.
  }
  // Also clear any *delivered* copy of this notification from the tray so the
  // user doesn't keep seeing "finish your workout" reminders after the workout
  // has been posted.
  try {
    await Notifications.dismissNotificationAsync(
      UNFINISHED_WORKOUT_NOTIFICATION_ID,
    );
  } catch {
    // Not in tray; safe to ignore.
  }
}

interface WorkoutContextValue {
  seconds: number;
  running: boolean;
  // Write-once epoch (ms) of when the current workout began; null when no
  // workout is in progress. Used at submission to date the workout by its start.
  workoutStartedAtEpoch: number | null;
  start: () => void;
  pause: () => void;
  reset: () => void;

  exercises: WorkoutExercise[];
  // All discrete exercise-list mutations write through to AsyncStorage
  // synchronously (gated by the workout-ended suppress barrier). Callers
  // don't need to opt in — discrete user actions are inherently save points.
  addExercise: (ex: WorkoutExercise) => void;
  updateExercise: (id: string, fields: Partial<WorkoutExercise>) => void;
  removeExercise: (id: string) => void;
  // Replace the exercise at `workoutExerciseId` in place. Wipes per-exercise
  // data (sets, note, drafts, duration) — matches the "All current exercise
  // data will be lost" confirmation in the swap UI.
  swapExercise: (
    workoutExerciseId: string,
    replacement: {
      exerciseId: string;
      name: string;
      bodyParts?: BodyPartDTO[];
    },
  ) => void;
  // True when there's an in-flight workout: any exercises, a running timer,
  // or accumulated elapsed time. Use this to gate new-workout entry points
  // (routines etc.) so a Start tap doesn't silently destroy a live workout.
  hasActiveWorkout: boolean;

  // Cardio entries logged in the current workout, alongside `exercises`.
  cardioEntries: CardioEntry[];
  addCardioEntry: (entry: CardioEntry) => void;
  updateCardioEntry: (id: string, fields: Partial<CardioEntry>) => void;
  removeCardioEntry: (id: string) => void;

  // Cardio stopwatch used by CardioDetailContent to capture an entry's
  // durationSeconds. Independent from the main workout timer.
  cardioSeconds: number;
  cardioRunning: boolean;
  startCardio: () => void;
  pauseCardio: () => void;
  resetCardio: () => void;

  // Player state
  playerVisible: boolean;
  currentExerciseId: string | null;
  // The cardio entry the player is currently representing. Mutually exclusive
  // with currentExerciseId — whichever was opened last is the "current" item so
  // minimizing the detail collapses back to it.
  currentCardioId: string | null;
  showPlayer: (exerciseId: string) => void;
  showCardio: (cardioId: string) => void;
  hidePlayer: () => void;
  setCurrentExercise: (id: string) => void;
  setCurrentCardio: (id: string | null) => void;

  // Active-exercise timing (the exercise whose per-exercise clock is ticking)
  activeExerciseId: string | null;
  activeExerciseStartedAt: number | null;
  setActiveExercise: (id: string) => void;

  // Tab tracking
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Last fullscreen modal the user viewed (for MiniPlayer return target)
  lastModalScreen: LastModalScreen;
  setLastModalScreen: (screen: LastModalScreen) => void;

  loadFromRoutine: (
    exercises: Array<{ exerciseId: string; name: string }>,
  ) => Promise<void>;
}

const WorkoutTimerContext = createContext<WorkoutContextValue | null>(null);

export function WorkoutTimerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);

  // Timestamp-based tracking for background persistence
  const [startTimestamp, setStartTimestamp] = useState<number | null>(null);
  // Write-once start-of-workout stamp (see PersistedWorkoutState). Distinct from
  // startTimestamp, which is reset on pause and app-kill restore.
  const [workoutStartedAtEpoch, setWorkoutStartedAtEpoch] = useState<
    number | null
  >(null);
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState(0);

  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);

  // Cardio entries + stopwatch
  const [cardioEntries, setCardioEntries] = useState<CardioEntry[]>([]);
  const [cardioRunning, setCardioRunning] = useState(false);
  const [cardioStartTimestamp, setCardioStartTimestamp] = useState<
    number | null
  >(null);
  const [cardioTotalElapsedSeconds, setCardioTotalElapsedSeconds] = useState(0);
  const [cardioSeconds, setCardioSeconds] = useState(0);

  // Player state
  const [playerVisible, setPlayerVisible] = useState(false);
  const [currentExerciseId, setCurrentExerciseId] = useState<string | null>(
    null,
  );
  const [currentCardioId, setCurrentCardioId] = useState<string | null>(null);

  // Tab tracking
  const [activeTab, setActiveTab] = useState("Home"); // Default to Home tab
  const [lastModalScreen, setLastModalScreen] = useState<LastModalScreen>(null);

  // Active-exercise timing
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [activeExerciseStartedAt, setActiveExerciseStartedAt] = useState<
    number | null
  >(null);

  // Persistence state
  const [isRestoringState, setIsRestoringState] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Write barrier: when true, all storage writes and the in-memory mutators
  // that side-effect handlers can hit (addExercise/updateExercise) become
  // no-ops. Set inside reset() to prevent late writes — most notably the
  // ExerciseDetail `beforeRemove` save() that fires during whole-stack
  // unmount AFTER the workout has been posted and reset. Cleared the moment
  // the user begins a new workout (start() / loadFromRoutine()).
  const suppressWritesRef = useRef(false);
  // Bumped by mutators called with `{ immediate: true }`. A dedicated effect
  // below watches this and triggers an immediate (non-debounced) write to
  // AsyncStorage on the render after the state mutation, so closure values
  // are fresh. Discrete user actions (Log Set, edit, delete) use this so a
  // kill right after tapping doesn't lose data.
  const [immediateSaveCounter, setImmediateSaveCounter] = useState(0);
  const immediateSaveSkipInitialRef = useRef(true);

  // ---------------- PERSISTENCE FUNCTIONS ----------------
  const saveWorkoutState = (immediate = false) => {
    if (isRestoringState) return; // Don't save during restoration
    if (suppressWritesRef.current) return; // Workout just ended; ignore.

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    const doSave = async () => {
      const state: PersistedWorkoutState = {
        version: WORKOUT_STATE_VERSION,
        totalElapsedSeconds,
        startTimestamp,
        workoutStartedAtEpoch,
        running,
        lastSaveTimestamp: Date.now(),
        exercises,
        cardioEntries,
        cardioTotalElapsedSeconds,
        cardioStartTimestamp,
        cardioRunning,
        playerVisible,
        currentExerciseId,
        currentCardioId,
        activeTab,
        lastModalScreen,
        activeExerciseId,
        activeExerciseStartedAt,
      };

      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        console.error("Failed to save workout state:", error);
      }
    };

    if (immediate) {
      doSave();
    } else {
      saveTimeoutRef.current = setTimeout(doSave, SAVE_DEBOUNCE_MS);
    }
  };

  const restoreTimerState = (saved: PersistedWorkoutState) => {
    const now = Date.now();

    if (saved.running && saved.startTimestamp !== null) {
      // Timer was running - calculate time elapsed since app was killed
      const elapsedSinceKill = Math.floor((now - saved.startTimestamp) / 1000);
      const totalSeconds = saved.totalElapsedSeconds + elapsedSinceKill;

      setTotalElapsedSeconds(totalSeconds);
      setSeconds(totalSeconds);
      setStartTimestamp(now); // Reset to current time
      setRunning(true);
    } else {
      // Timer was paused - restore accumulated time
      setTotalElapsedSeconds(saved.totalElapsedSeconds);
      setSeconds(saved.totalElapsedSeconds);
      setStartTimestamp(null);
      setRunning(false);
    }
  };

  const restoreCardioTimerState = (saved: PersistedWorkoutState) => {
    const now = Date.now();
    const savedTotal = saved.cardioTotalElapsedSeconds ?? 0;
    if (saved.cardioRunning && saved.cardioStartTimestamp != null) {
      const elapsedSinceKill = Math.floor(
        (now - saved.cardioStartTimestamp) / 1000,
      );
      const total = savedTotal + elapsedSinceKill;
      setCardioTotalElapsedSeconds(total);
      setCardioSeconds(total);
      setCardioStartTimestamp(now);
      setCardioRunning(true);
    } else {
      setCardioTotalElapsedSeconds(savedTotal);
      setCardioSeconds(savedTotal);
      setCardioStartTimestamp(null);
      setCardioRunning(false);
    }
  };

  const restoreWorkoutState = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setIsRestoringState(false);
        return;
      }

      const parsed: PersistedWorkoutState = JSON.parse(stored);

      // Version check
      if (parsed.version !== WORKOUT_STATE_VERSION) {
        await AsyncStorage.removeItem(STORAGE_KEY);
        setIsRestoringState(false);
        return;
      }

      // Age check (don't restore workouts older than 7 days)
      const daysSinceLastSave =
        (Date.now() - parsed.lastSaveTimestamp) / (1000 * 60 * 60 * 24);
      if (daysSinceLastSave > MAX_STATE_AGE_DAYS) {
        await AsyncStorage.removeItem(STORAGE_KEY);
        setIsRestoringState(false);
        return;
      }

      // Restore state
      setExercises(parsed.exercises);
      // Cardio entries + stopwatch. `?? []`/`?? 0` keeps states saved before the
      // cardio feature shipped restorable without a version bump.
      setCardioEntries(parsed.cardioEntries ?? []);
      restoreCardioTimerState(parsed);
      setPlayerVisible(parsed.playerVisible);
      setCurrentExerciseId(parsed.currentExerciseId);
      setCurrentCardioId(parsed.currentCardioId ?? null);
      setActiveTab(parsed.activeTab);
      setLastModalScreen(parsed.lastModalScreen ?? null);
      setActiveExerciseId(parsed.activeExerciseId ?? null);
      setActiveExerciseStartedAt(parsed.activeExerciseStartedAt ?? null);
      // Restore the write-once start stamp unchanged (it must survive app-kill).
      // Fall back to startTimestamp for any workout persisted before this field
      // existed, so an in-flight upgrade still gets a sensible start date.
      setWorkoutStartedAtEpoch(
        parsed.workoutStartedAtEpoch ?? parsed.startTimestamp ?? null,
      );
      restoreTimerState(parsed);
    } catch (error) {
      console.error("Failed to restore workout state:", error);
      await AsyncStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsRestoringState(false);
    }
  };

  const clearPersistedState = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear workout state:", error);
    }
  };

  // Restore workout state on mount
  useEffect(() => {
    setIsRestoringState(true);
    restoreWorkoutState();
    // Drop any reminder left over from a previous session — the 20-min
    // window only restarts on the next background event.
    cancelUnfinishedWorkoutReminder();
  }, []);

  // Immediate-save trigger: fires on the render after any exercise-list
  // mutator runs. By the time this effect fires, the queued setExercises has
  // propagated, so saveWorkoutState reads fresh state and writes synchronously
  // to AsyncStorage. Any pending debounced save is cleared — it would just
  // re-write the same content 500ms later.
  useEffect(() => {
    if (immediateSaveSkipInitialRef.current) {
      immediateSaveSkipInitialRef.current = false;
      return;
    }
    if (isRestoringState) return;
    if (suppressWritesRef.current) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    saveWorkoutState(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediateSaveCounter]);

  // Auto-save on state changes
  useEffect(() => {
    if (isRestoringState) return; // Don't save during restoration
    if (suppressWritesRef.current) return; // Workout just ended.

    // Only save if there's an active workout (exercises/cardio exist or a timer
    // is running)
    if (
      exercises.length > 0 ||
      running ||
      totalElapsedSeconds > 0 ||
      cardioEntries.length > 0 ||
      cardioRunning ||
      cardioTotalElapsedSeconds > 0
    ) {
      saveWorkoutState(false);
    } else if (saveTimeoutRef.current) {
      // State went empty — kill any pending debounced save so it can't
      // re-persist stale closure-captured state after reset().
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, [
    seconds,
    running,
    exercises,
    cardioEntries,
    cardioSeconds,
    cardioRunning,
    cardioTotalElapsedSeconds,
    playerVisible,
    currentExerciseId,
    currentCardioId,
    activeTab,
    lastModalScreen,
    totalElapsedSeconds,
    activeExerciseId,
    activeExerciseStartedAt,
    isRestoringState,
  ]);

  // ---------------- TIMER LOOP ----------------
  // Update seconds based on timestamp calculation
  useEffect(() => {
    if (!running || startTimestamp === null) {
      return;
    }

    // Update every 100ms for smoother UI
    const interval = setInterval(() => {
      const now = Date.now();
      const currentElapsed = Math.floor((now - startTimestamp) / 1000);
      setSeconds(totalElapsedSeconds + currentElapsed);
    }, 100);

    return () => clearInterval(interval);
  }, [running, startTimestamp, totalElapsedSeconds]);

  // Cardio stopwatch loop — mirrors the main timer's timestamp math.
  useEffect(() => {
    if (!cardioRunning || cardioStartTimestamp === null) {
      return;
    }
    const interval = setInterval(() => {
      const now = Date.now();
      const currentElapsed = Math.floor((now - cardioStartTimestamp) / 1000);
      setCardioSeconds(cardioTotalElapsedSeconds + currentElapsed);
    }, 100);
    return () => clearInterval(interval);
  }, [cardioRunning, cardioStartTimestamp, cardioTotalElapsedSeconds]);

  // Handle app going to background/foreground
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active" && running && startTimestamp !== null) {
          // App came to foreground while timer was running
          // Force immediate recalculation of elapsed time
          const now = Date.now();
          const currentElapsed = Math.floor((now - startTimestamp) / 1000);
          setSeconds(totalElapsedSeconds + currentElapsed);
          cancelUnfinishedWorkoutReminder();
        } else if (nextAppState === "active") {
          cancelUnfinishedWorkoutReminder();
        } else if (nextAppState.match(/inactive|background/)) {
          // Workout just ended — don't re-persist or arm a reminder. Without
          // this guard, backgrounding the app between the success Alert and
          // the navigation pop would write a zombie state back to storage.
          if (suppressWritesRef.current) return;
          // App going to background - save immediately (no debounce)
          saveWorkoutState(true);
          if (running) {
            scheduleUnfinishedWorkoutReminder();
          }
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [
    running,
    startTimestamp,
    totalElapsedSeconds,
    exercises,
    playerVisible,
    currentExerciseId,
    activeTab,
    lastModalScreen,
    activeExerciseId,
    activeExerciseStartedAt,
  ]);

  // ---------------- EXERCISES LIST ----------------
  const addExercise = (exercise: WorkoutExercise) => {
    // Block writes after a workout has been posted/reset. The most common
    // caller this affects is ExerciseDetail's `beforeRemove` save(), which
    // fires during whole-stack unmount and would otherwise resurrect the
    // last-edited exercise into a fresh workout.
    if (suppressWritesRef.current) return;
    setImmediateSaveCounter((c) => c + 1);
    setExercises((prev) => {
      const exists = prev.find(
        (e) => e.workoutExerciseId === exercise.workoutExerciseId,
      );
      if (exists) {
        return prev.map((e) =>
          e.workoutExerciseId === exercise.workoutExerciseId ? exercise : e,
        );
      }
      return [...prev, exercise];
    });
  };

  const updateExercise = (
    workoutExerciseId: string,
    updatedFields: Partial<WorkoutExercise>,
  ) => {
    if (suppressWritesRef.current) return;
    setImmediateSaveCounter((c) => c + 1);
    setExercises((prev) =>
      prev.map((ex) =>
        ex.workoutExerciseId === workoutExerciseId
          ? { ...ex, ...updatedFields }
          : ex,
      ),
    );
  };

  const removeExercise = (workoutExerciseId: string) => {
    if (suppressWritesRef.current) return;
    setImmediateSaveCounter((c) => c + 1);
    setExercises((prev) =>
      prev.filter((ex) => ex.workoutExerciseId !== workoutExerciseId),
    );
  };

  // ---------------- CARDIO ENTRIES ----------------
  const addCardioEntry = (entry: CardioEntry) => {
    if (suppressWritesRef.current) return;
    setImmediateSaveCounter((c) => c + 1);
    setCardioEntries((prev) => {
      const exists = prev.find(
        (e) => e.workoutCardioId === entry.workoutCardioId,
      );
      if (exists) {
        return prev.map((e) =>
          e.workoutCardioId === entry.workoutCardioId ? entry : e,
        );
      }
      return [...prev, entry];
    });
  };

  const updateCardioEntry = (
    workoutCardioId: string,
    updatedFields: Partial<CardioEntry>,
  ) => {
    if (suppressWritesRef.current) return;
    setImmediateSaveCounter((c) => c + 1);
    setCardioEntries((prev) =>
      prev.map((e) =>
        e.workoutCardioId === workoutCardioId
          ? { ...e, ...updatedFields }
          : e,
      ),
    );
  };

  const removeCardioEntry = (workoutCardioId: string) => {
    if (suppressWritesRef.current) return;
    setImmediateSaveCounter((c) => c + 1);
    setCardioEntries((prev) =>
      prev.filter((e) => e.workoutCardioId !== workoutCardioId),
    );
  };

  // ---------------- CARDIO STOPWATCH ----------------
  const startCardio = () => {
    suppressWritesRef.current = false;
    setCardioRunning(true);
    if (cardioStartTimestamp === null) {
      setCardioStartTimestamp(Date.now());
    }
  };

  const pauseCardio = () => {
    if (cardioStartTimestamp !== null) {
      const currentElapsed = Math.floor(
        (Date.now() - cardioStartTimestamp) / 1000,
      );
      setCardioTotalElapsedSeconds((prev) => prev + currentElapsed);
    }
    setCardioRunning(false);
    setCardioStartTimestamp(null);
  };

  const resetCardio = () => {
    setCardioRunning(false);
    setCardioStartTimestamp(null);
    setCardioTotalElapsedSeconds(0);
    setCardioSeconds(0);
  };

  // Replace the exercise at `workoutExerciseId` in place. Per-exercise data
  // (sets, note, drafts, duration) is wiped to match the swap-confirmation
  // UI. The total workout timer is unaffected — it lives outside `exercises`.
  const swapExercise = (
    workoutExerciseId: string,
    replacement: {
      exerciseId: string;
      name: string;
      bodyParts?: BodyPartDTO[];
    },
  ) => {
    if (suppressWritesRef.current) return;
    setImmediateSaveCounter((c) => c + 1);
    setExercises((prev) =>
      prev.map((ex) =>
        ex.workoutExerciseId === workoutExerciseId
          ? {
              workoutExerciseId,
              exerciseId: replacement.exerciseId,
              name: replacement.name,
              bodyParts: replacement.bodyParts,
              sets: [],
              note: "",
              durationSeconds: 0,
              draftReps: "",
              draftWeight: "",
            }
          : ex,
      ),
    );
    // If we're swapping the active exercise, reset its live ticker so the
    // per-exercise clock starts fresh from zero. setActiveExercise() can't do
    // this from the callsite — it early-returns when the id is unchanged.
    if (activeExerciseId === workoutExerciseId) {
      setActiveExerciseStartedAt(Date.now());
    }
  };

  // Freeze the currently-active exercise's per-exercise timer by merging the
  // elapsed delta into its durationSeconds, then clear the active pointer.
  const freezeActiveExercise = () => {
    if (suppressWritesRef.current) return;
    if (activeExerciseId === null || activeExerciseStartedAt === null) return;
    const delta = Math.floor((Date.now() - activeExerciseStartedAt) / 1000);
    if (delta > 0) {
      const targetId = activeExerciseId;
      setExercises((prev) =>
        prev.map((ex) =>
          ex.workoutExerciseId === targetId
            ? { ...ex, durationSeconds: (ex.durationSeconds ?? 0) + delta }
            : ex,
        ),
      );
    }
    setActiveExerciseId(null);
    setActiveExerciseStartedAt(null);
  };

  const setActiveExercise = (id: string) => {
    if (suppressWritesRef.current) return;
    if (id === activeExerciseId) return;
    if (activeExerciseId !== null && activeExerciseStartedAt !== null) {
      const delta = Math.floor((Date.now() - activeExerciseStartedAt) / 1000);
      if (delta > 0) {
        const prevId = activeExerciseId;
        setExercises((prev) =>
          prev.map((ex) =>
            ex.workoutExerciseId === prevId
              ? { ...ex, durationSeconds: (ex.durationSeconds ?? 0) + delta }
              : ex,
          ),
        );
      }
    }
    setActiveExerciseId(id);
    setActiveExerciseStartedAt(Date.now());
  };

  const start = () => {
    // Mounting ExerciseDetail (or any explicit start) means the user is
    // actively working out — release the post-reset write barrier.
    suppressWritesRef.current = false;
    setRunning(true);
    // Only set timestamp if not already set (prevents resetting timer when adding exercises)
    if (startTimestamp === null) {
      setStartTimestamp(Date.now());
    }
    // Record when this workout first began, once. Never overwritten for the life
    // of the workout (reset() clears it), so it survives pauses and app kills.
    if (workoutStartedAtEpoch === null) {
      setWorkoutStartedAtEpoch(Date.now());
    }
    // If we resumed with an active exercise that was frozen on pause, restart
    // its live ticker so it accumulates from now forward — without this the
    // per-exercise display would jump by the entire pause gap on resume.
    if (activeExerciseId !== null && activeExerciseStartedAt === null) {
      setActiveExerciseStartedAt(Date.now());
    }
  };

  const pause = () => {
    if (startTimestamp !== null) {
      // Save accumulated time before pausing
      const now = Date.now();
      const currentElapsed = Math.floor((now - startTimestamp) / 1000);
      setTotalElapsedSeconds((prev) => prev + currentElapsed);
    }
    // Freeze the active-exercise live ticker into durationSeconds and clear
    // its started-at. Without this, the per-exercise time would keep growing
    // while the workout is paused (and would catch up the entire kill gap on
    // restore-while-paused). The activeExerciseId pointer is preserved so a
    // subsequent start() can resume the same exercise.
    if (activeExerciseId !== null && activeExerciseStartedAt !== null) {
      const delta = Math.floor((Date.now() - activeExerciseStartedAt) / 1000);
      if (delta > 0) {
        const targetId = activeExerciseId;
        setExercises((prev) =>
          prev.map((ex) =>
            ex.workoutExerciseId === targetId
              ? { ...ex, durationSeconds: (ex.durationSeconds ?? 0) + delta }
              : ex,
          ),
        );
      }
      setActiveExerciseStartedAt(null);
    }

    setRunning(false);
    setStartTimestamp(null);
    cancelUnfinishedWorkoutReminder();
  };

  const reset = async () => {
    // Engage the write barrier *synchronously* before any state setter or
    // await — this is what makes late side-effect writes (the ExerciseDetail
    // `beforeRemove` save during stack unmount, a backgrounded AppState
    // event, etc.) safely no-op.
    suppressWritesRef.current = true;
    // Kill any pending debounced save before it can fire with stale state
    // captured in its closure.
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    setRunning(false);
    setSeconds(0);
    setStartTimestamp(null);
    setWorkoutStartedAtEpoch(null);
    setTotalElapsedSeconds(0);
    setExercises([]);
    setCardioEntries([]);
    setCardioRunning(false);
    setCardioStartTimestamp(null);
    setCardioTotalElapsedSeconds(0);
    setCardioSeconds(0);
    setLastModalScreen(null);
    setActiveExerciseId(null);
    setActiveExerciseStartedAt(null);
    setCurrentCardioId(null);
    hidePlayer();

    // Clear persisted state
    await clearPersistedState();
    await cancelUnfinishedWorkoutReminder();
  };

  // Player actions
  const showPlayer = (exerciseId: string) => {
    setCurrentExerciseId(exerciseId);
    // An exercise is now the current player item; clear any cardio pointer so
    // the two stay mutually exclusive.
    setCurrentCardioId(null);
    setPlayerVisible(true);
  };

  // Mark a cardio entry as the current player item (mirrors showPlayer). Clears
  // currentExerciseId so the MiniPlayer/expand target resolves to the cardio.
  const showCardio = (cardioId: string) => {
    setCurrentCardioId(cardioId);
    setCurrentExerciseId(null);
    setPlayerVisible(true);
  };

  // Set the current exercise, clearing any cardio pointer (used by the
  // "next exercise" / summary-tap flows).
  const setCurrentExercise = (id: string) => {
    setCurrentExerciseId(id);
    setCurrentCardioId(null);
  };

  const setCurrentCardio = (id: string | null) => {
    setCurrentCardioId(id);
    if (id) setCurrentExerciseId(null);
  };

  const hidePlayer = () => {
    setPlayerVisible(false);
    setCurrentExerciseId(null);
    setCurrentCardioId(null);
  };

  const loadFromRoutine = async (
    routineExercises: Array<{
      exerciseId: string;
      name: string;
      bodyParts?: BodyPartDTO[];
    }>,
  ): Promise<void> => {
    // Fully reset any prior workout first (also engages the write barrier
    // and cancels notifications/pending saves).
    await reset();

    const newExercises: WorkoutExercise[] = routineExercises.map(
      (ex, index) => ({
        workoutExerciseId: `routine-${Date.now()}-${index}`,
        exerciseId: ex.exerciseId,
        name: ex.name,
        bodyParts: ex.bodyParts,
        sets: [{ reps: "", weight: "" }],
      }),
    );

    // Release the write barrier before setting new state so the autosave
    // effect can persist this fresh workout.
    suppressWritesRef.current = false;
    setExercises(newExercises);

    if (newExercises.length > 0) {
      setRunning(true);
      setStartTimestamp(Date.now());
      setWorkoutStartedAtEpoch(Date.now());
      setCurrentExerciseId(newExercises[0].workoutExerciseId);
      setPlayerVisible(true);
    }
  };

  const hasActiveWorkout =
    exercises.length > 0 ||
    running ||
    totalElapsedSeconds > 0 ||
    cardioEntries.length > 0 ||
    cardioRunning ||
    cardioTotalElapsedSeconds > 0;

  return (
    <WorkoutTimerContext.Provider
      value={{
        seconds,
        running,
        workoutStartedAtEpoch,
        start,
        pause,
        reset,
        exercises,
        addExercise,
        updateExercise,
        removeExercise,
        swapExercise,
        hasActiveWorkout,
        cardioEntries,
        addCardioEntry,
        updateCardioEntry,
        removeCardioEntry,
        cardioSeconds,
        cardioRunning,
        startCardio,
        pauseCardio,
        resetCardio,
        playerVisible,
        currentExerciseId,
        currentCardioId,
        showPlayer,
        showCardio,
        hidePlayer,
        setCurrentExercise,
        setCurrentCardio,
        activeExerciseId,
        activeExerciseStartedAt,
        setActiveExercise,
        // Tab tracking
        activeTab,
        setActiveTab,
        lastModalScreen,
        setLastModalScreen,
        loadFromRoutine,
      }}
    >
      {children}
    </WorkoutTimerContext.Provider>
  );
}

export function useWorkoutTimer() {
  const ctx = useContext(WorkoutTimerContext);
  if (!ctx) throw new Error("useWorkoutTimer must be used inside provider");
  return ctx;
}
