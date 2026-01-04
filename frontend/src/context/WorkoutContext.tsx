import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WorkoutSet {
  reps: string;
  weight: string;
}

export interface WorkoutExercise {
  workoutExerciseId: string;
  exerciseId: string;
  name: string;
  sets: WorkoutSet[];
}

interface PersistedWorkoutState {
  version: number;
  totalElapsedSeconds: number;
  startTimestamp: number | null;
  running: boolean;
  lastSaveTimestamp: number;
  exercises: WorkoutExercise[];
  playerVisible: boolean;
  currentExerciseId: string | null;
  activeTab: string;
}

const WORKOUT_STATE_VERSION = 1;
const STORAGE_KEY = '@workout_state';
const SAVE_DEBOUNCE_MS = 500;
const MAX_STATE_AGE_DAYS = 7;

interface WorkoutContextValue {
  seconds: number;
  running: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;

  exercises: WorkoutExercise[];
  addExercise: (ex: WorkoutExercise) => void;
  updateExercise: (id: string, fields: Partial<WorkoutExercise>) => void;
  removeExercise: (id: string) => void;

  // Player state
  playerVisible: boolean;
  currentExerciseId: string | null;
  showPlayer: (exerciseId: string) => void;
  hidePlayer: () => void;
  setCurrentExercise: (id: string) => void;

  // Tab tracking
  activeTab: string;
  setActiveTab: (tab: string) => void;
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
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState(0);

  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);

  // Player state
  const [playerVisible, setPlayerVisible] = useState(false);
  const [currentExerciseId, setCurrentExerciseId] = useState<string | null>(
    null
  );

  // Tab tracking
  const [activeTab, setActiveTab] = useState("Home"); // Default to Home tab

  // Persistence state
  const [isRestoringState, setIsRestoringState] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ---------------- PERSISTENCE FUNCTIONS ----------------
  const saveWorkoutState = (immediate = false) => {
    if (isRestoringState) return; // Don't save during restoration

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    const doSave = async () => {
      const state: PersistedWorkoutState = {
        version: WORKOUT_STATE_VERSION,
        totalElapsedSeconds,
        startTimestamp,
        running,
        lastSaveTimestamp: Date.now(),
        exercises,
        playerVisible,
        currentExerciseId,
        activeTab,
      };

      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        console.error('Failed to save workout state:', error);
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
      const daysSinceLastSave = (Date.now() - parsed.lastSaveTimestamp) / (1000 * 60 * 60 * 24);
      if (daysSinceLastSave > MAX_STATE_AGE_DAYS) {
        await AsyncStorage.removeItem(STORAGE_KEY);
        setIsRestoringState(false);
        return;
      }

      // Restore state
      setExercises(parsed.exercises);
      setPlayerVisible(parsed.playerVisible);
      setCurrentExerciseId(parsed.currentExerciseId);
      setActiveTab(parsed.activeTab);
      restoreTimerState(parsed);

      console.log('Workout state restored successfully');
    } catch (error) {
      console.error('Failed to restore workout state:', error);
      await AsyncStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsRestoringState(false);
    }
  };

  const clearPersistedState = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear workout state:', error);
    }
  };

  // Restore workout state on mount
  useEffect(() => {
    setIsRestoringState(true);
    restoreWorkoutState();
  }, []);

  // Auto-save on state changes
  useEffect(() => {
    if (isRestoringState) return; // Don't save during restoration

    // Only save if there's an active workout (exercises exist or timer is running)
    if (exercises.length > 0 || running || totalElapsedSeconds > 0) {
      saveWorkoutState(false);
    }
  }, [seconds, running, exercises, playerVisible, currentExerciseId, activeTab, totalElapsedSeconds, isRestoringState]);

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
          console.log(
            "App returned to foreground, timer synced to:",
            totalElapsedSeconds + currentElapsed
          );
        } else if (
          nextAppState.match(/inactive|background/)
        ) {
          // App going to background - save immediately (no debounce)
          console.log("App going to background, saving state...");
          saveWorkoutState(true);
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [running, startTimestamp, totalElapsedSeconds, exercises, playerVisible, currentExerciseId, activeTab]);

  // ---------------- EXERCISES LIST ----------------
  const addExercise = (exercise: WorkoutExercise) => {
    setExercises((prev) => {
      const exists = prev.find(
        (e) => e.workoutExerciseId === exercise.workoutExerciseId
      );
      if (exists) {
        return prev.map((e) =>
          e.workoutExerciseId === exercise.workoutExerciseId ? exercise : e
        );
      }
      return [...prev, exercise];
    });
  };

  const updateExercise = (
    workoutExerciseId: string,
    updatedFields: Partial<WorkoutExercise>
  ) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.workoutExerciseId === workoutExerciseId
          ? { ...ex, ...updatedFields }
          : ex
      )
    );
  };

  const removeExercise = (workoutExerciseId: string) => {
    setExercises((prev) =>
      prev.filter((ex) => ex.workoutExerciseId !== workoutExerciseId)
    );
  };

  const start = () => {
    setRunning(true);
    // Only set timestamp if not already set (prevents resetting timer when adding exercises)
    if (startTimestamp === null) {
      setStartTimestamp(Date.now());
    }
  };

  const pause = () => {
    if (startTimestamp !== null) {
      // Save accumulated time before pausing
      const now = Date.now();
      const currentElapsed = Math.floor((now - startTimestamp) / 1000);
      setTotalElapsedSeconds((prev) => prev + currentElapsed);
    }

    setRunning(false);
    setStartTimestamp(null);
  };

  const reset = async () => {
    setRunning(false);
    setSeconds(0);
    setStartTimestamp(null);
    setTotalElapsedSeconds(0);
    setExercises([]);
    hidePlayer();

    // Clear persisted state
    await clearPersistedState();
  };

  // Player actions
  const showPlayer = (exerciseId: string) => {
    setCurrentExerciseId(exerciseId);
    setPlayerVisible(true);
  };

  const hidePlayer = () => {
    setPlayerVisible(false);
    setCurrentExerciseId(null);
  };

  return (
    <WorkoutTimerContext.Provider
      value={{
        seconds,
        running,
        start,
        pause,
        reset,
        exercises,
        addExercise,
        updateExercise,
        removeExercise,
        playerVisible,
        currentExerciseId,
        showPlayer,
        hidePlayer,
        setCurrentExercise: setCurrentExerciseId,
        // Tab tracking
        activeTab,
        setActiveTab,
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
