import { useState, useEffect, useCallback } from "react";
import {
  getAllExercises,
  getCachedExercises,
  Exercise,
} from "../api/exerciseService";
import { subscribeOnlineStatus } from "../utils/network";

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

  const fetchExercises = useCallback(async () => {
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
  }, []);

  // Paint from cache immediately so the screen is usable offline.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await getCachedExercises();
      if (!cancelled && cached.length > 0) {
        setExercises((prev) => (prev.length === 0 ? cached : prev));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchExercises();
    }
  }, [autoFetch, fetchExercises]);

  // Resync the catalog when we come back online so newly-added exercises
  // make it into the offline copy without requiring a fresh app launch.
  useEffect(() => {
    return subscribeOnlineStatus((online) => {
      if (online) {
        fetchExercises();
      }
    });
  }, [fetchExercises]);

  return { exercises, loading, error, fetchExercises };
}
