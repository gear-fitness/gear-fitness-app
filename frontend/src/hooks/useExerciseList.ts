import { useState, useEffect } from "react";
import { getAllExercises, Exercise } from "../api/exerciseService";

/**
 * Loads the exercise catalog. Defaults to the authenticated endpoint; pass a
 * different `fetcher` (e.g. getPublicExerciseCatalog) to load without auth,
 * such as during onboarding.
 */
export function useExerciseList(
  autoFetch = true,
  fetcher: () => Promise<Exercise[]> = getAllExercises,
) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExercises = async () => {
    if (exercises.length > 0) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetcher();
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
