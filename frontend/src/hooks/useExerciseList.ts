import { useState, useEffect } from "react";
import { getAllExercises, Exercise } from "../api/exerciseService";

export function useExerciseList(autoFetch = true) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExercises = async () => {
    if (exercises.length > 0) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAllExercises();
      setExercises(data);
    } catch (err) {
      setError("Failed to load exercises");
      console.error("Failed to load exercises:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch) {
      fetchExercises();
    }
  }, []);

  return { exercises, loading, error, fetchExercises };
}
