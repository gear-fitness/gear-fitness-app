import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

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
  const [currentExerciseId, setCurrentExerciseId] = useState<string | null>(null);

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
          console.log("App returned to foreground, timer synced to:", totalElapsedSeconds + currentElapsed);
        } else if (
          nextAppState.match(/inactive|background/) &&
          running &&
          startTimestamp !== null
        ) {
          // App going to background while timer is running
          console.log("App going to background, timer will persist...");
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [running, startTimestamp, totalElapsedSeconds]);

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

  const reset = () => {
    setRunning(false);
    setSeconds(0);
    setStartTimestamp(null);
    setTotalElapsedSeconds(0);
    setExercises([]);
    hidePlayer();
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
