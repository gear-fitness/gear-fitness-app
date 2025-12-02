import React, { createContext, useContext, useEffect, useState } from "react";

export interface WorkoutSet {
  reps: string;
  weight: string;
}

export interface WorkoutExercise {
  id: string;
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
      // if exercise already exists → replace it
      const exists = prev.find((e) => e.id === exercise.id);
      if (exists) {
        return prev.map((e) => (e.id === exercise.id ? exercise : e));
      }
      return [...prev, exercise];
    });
  };

  const updateExercise = (
    id: string,
    updatedFields: Partial<WorkoutExercise>
  ) => {
    setExercises((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, ...updatedFields } : ex))
    );
  };

  const removeExercise = (id: string) => {
    setExercises((prev) => prev.filter((ex) => ex.id !== id));
  };

  const start = () => setRunning(true);
  const pause = () => setRunning(false);

  const reset = () => {
    setRunning(false);
    setSeconds(0);
    setExercises([]);
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
