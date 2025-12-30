import React, { createContext, useContext, useEffect, useState } from "react";

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
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);

  // Player state
  const [playerVisible, setPlayerVisible] = useState(false);
  const [currentExerciseId, setCurrentExerciseId] = useState<string | null>(
    null
  );

  // Tab tracking
  const [activeTab, setActiveTab] = useState("Home"); // Default to Home tab

  // ---------------- TIMER LOOP ----------------
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (running) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [running]);

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

  const start = () => setRunning(true);
  const pause = () => setRunning(false);

  const reset = () => {
    setRunning(false);
    setSeconds(0);
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
