import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DaySummary } from "../api/types";
import {
  deleteEntry as apiDeleteEntry,
  getDay,
  logFood as apiLogFood,
  LogFoodPayload,
} from "../api/nutritionService";
import { getCurrentLocalDateString } from "../utils/date";

/**
 * Holds the calorie-tracker's selected day and its cached summary (goal +
 * totals + logged entries), plus the user's meal categories.
 *
 * Categories are purely client-side visual cards (e.g. "Breakfast", "Meal
 * Prep") with no backing table — they live in AsyncStorage, scoped per day.
 * Every day starts from the defaults (Breakfast/Lunch/Dinner); meals the user
 * adds or removes only affect the specific day they changed. Each logged entry
 * carries its category name as a free-text label so it reappears under the
 * right card when a day reloads.
 */
const CATEGORIES_STORAGE_KEY = "nutrition.categoriesByDate";
const DEFAULT_CATEGORIES = ["Breakfast", "Lunch", "Dinner"];

type CategoriesByDate = Record<string, string[]>;

type NutritionContextValue = {
  selectedDate: string; // YYYY-MM-DD
  setSelectedDate: (date: string) => void;
  summary: DaySummary | null;
  loading: boolean;
  categories: string[];
  refresh: () => Promise<void>;
  addLog: (payload: Omit<LogFoodPayload, "date">) => Promise<void>;
  updateLog: (
    entryId: string,
    payload: Omit<LogFoodPayload, "date">,
  ) => Promise<void>;
  removeLog: (entryId: string) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  removeCategory: (name: string) => Promise<void>;
};

const NutritionContext = createContext<NutritionContextValue | null>(null);

export function NutritionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selectedDate, setSelectedDate] = useState<string>(
    getCurrentLocalDateString(),
  );
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [categoriesByDate, setCategoriesByDate] = useState<CategoriesByDate>(
    {},
  );

  // Track the in-flight date so a slow response for an old date can't clobber
  // the summary after the user has already moved to another day.
  const requestedDate = useRef(selectedDate);

  // Load persisted per-day categories on mount.
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(CATEGORIES_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === "object") {
            setCategoriesByDate(parsed);
          }
        }
      } catch (err) {
        console.error("Failed to load meal categories:", err);
      }
    })();
  }, []);

  // Categories for the currently selected day. Days the user has never touched
  // aren't in the map and fall back to the defaults; once they add or remove a
  // meal, that day's list is materialized and stored independently.
  const categories = useMemo(
    () =>
      Object.prototype.hasOwnProperty.call(categoriesByDate, selectedDate)
        ? categoriesByDate[selectedDate]
        : DEFAULT_CATEGORIES,
    [categoriesByDate, selectedDate],
  );

  const persistCategoriesForDate = useCallback(
    async (date: string, next: string[]) => {
      let updated: CategoriesByDate = {};
      setCategoriesByDate((prev) => {
        updated = { ...prev, [date]: next };
        return updated;
      });
      try {
        await AsyncStorage.setItem(
          CATEGORIES_STORAGE_KEY,
          JSON.stringify(updated),
        );
      } catch (err) {
        console.error("Failed to save meal categories:", err);
      }
    },
    [],
  );

  const fetchFor = useCallback(async (date: string) => {
    requestedDate.current = date;
    setLoading(true);
    try {
      const data = await getDay(date);
      if (requestedDate.current === date) setSummary(data);
    } catch (err) {
      console.error("Failed to load nutrition day:", err);
    } finally {
      if (requestedDate.current === date) setLoading(false);
    }
  }, []);

  // Clear stale data immediately on date change, then load the new day.
  useEffect(() => {
    setSummary(null);
    fetchFor(selectedDate);
  }, [selectedDate, fetchFor]);

  const refresh = useCallback(
    () => fetchFor(selectedDate),
    [fetchFor, selectedDate],
  );

  const addLog = useCallback(
    async (payload: Omit<LogFoodPayload, "date">) => {
      await apiLogFood({ ...payload, date: selectedDate });
      await fetchFor(selectedDate);
    },
    [fetchFor, selectedDate],
  );

  // Editing a logged entry: the backend has no update endpoint, so we re-log
  // with the new values and then delete the old row. We add first so a failure
  // never loses the entry.
  const updateLog = useCallback(
    async (entryId: string, payload: Omit<LogFoodPayload, "date">) => {
      await apiLogFood({ ...payload, date: selectedDate });
      await apiDeleteEntry(entryId);
      await fetchFor(selectedDate);
    },
    [fetchFor, selectedDate],
  );

  const removeLog = useCallback(
    async (entryId: string) => {
      // Optimistic removal so the row disappears immediately.
      setSummary((prev) =>
        prev
          ? {
              ...prev,
              entries: prev.entries.filter((e) => e.entryId !== entryId),
            }
          : prev,
      );
      try {
        await apiDeleteEntry(entryId);
      } finally {
        await fetchFor(selectedDate);
      }
    },
    [fetchFor, selectedDate],
  );

  const addCategory = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      // Case-insensitive de-dupe within this day's list.
      if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
        return;
      }
      await persistCategoriesForDate(selectedDate, [...categories, trimmed]);
    },
    [categories, persistCategoriesForDate, selectedDate],
  );

  const removeCategory = useCallback(
    async (name: string) => {
      // Remove the card from this day's list, and delete any entries logged
      // under it on this day so they don't linger.
      const toDelete =
        summary?.entries.filter((e) => e.category === name) ?? [];

      setSummary((prev) =>
        prev
          ? {
              ...prev,
              entries: prev.entries.filter((e) => e.category !== name),
            }
          : prev,
      );

      await persistCategoriesForDate(
        selectedDate,
        categories.filter((c) => c !== name),
      );

      try {
        await Promise.all(toDelete.map((e) => apiDeleteEntry(e.entryId)));
      } catch (err) {
        console.error("Failed to delete entries for category:", err);
      } finally {
        await fetchFor(selectedDate);
      }
    },
    [
      categories,
      persistCategoriesForDate,
      summary,
      fetchFor,
      selectedDate,
    ],
  );

  const value = useMemo(
    () => ({
      selectedDate,
      setSelectedDate,
      summary,
      loading,
      categories,
      refresh,
      addLog,
      updateLog,
      removeLog,
      addCategory,
      removeCategory,
    }),
    [
      selectedDate,
      summary,
      loading,
      categories,
      refresh,
      addLog,
      updateLog,
      removeLog,
      addCategory,
      removeCategory,
    ],
  );

  return (
    <NutritionContext.Provider value={value}>
      {children}
    </NutritionContext.Provider>
  );
}

export function useNutrition(): NutritionContextValue {
  const ctx = useContext(NutritionContext);
  if (!ctx) {
    throw new Error("useNutrition must be used inside a NutritionProvider");
  }
  return ctx;
}
