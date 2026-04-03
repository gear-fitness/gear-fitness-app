import { useState } from "react";
import { getUserWorkouts } from "../api/workoutService";
import { Workout } from "../api/types";

export function useUserWorkouts() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkouts = async (userId: string) => {
    if (workouts.length > 0) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getUserWorkouts(userId);
      setWorkouts(data);
    } catch (err) {
      setError("Failed to load workouts");
      console.error("Failed to load workouts:", err);
    } finally {
      setLoading(false);
    }
  };

  return { workouts, loading, error, fetchWorkouts };
}
