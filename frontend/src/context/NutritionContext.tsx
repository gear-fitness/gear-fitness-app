import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DaySummary, MealCategory } from "../api/types";
import {
  createCategory as apiCreateCategory,
  deleteCategory as apiDeleteCategory,
  deleteEntry as apiDeleteEntry,
  getDay,
  logFood as apiLogFood,
  LogFoodPayload,
} from "../api/nutritionService";
import { getCurrentLocalDateString } from "../utils/date";

type NutritionContextValue = {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  summary: DaySummary | null;
  loading: boolean;
  refresh: () => Promise<void>;
  addLog: (payload: Omit<LogFoodPayload, "date">) => Promise<void>;
  removeLog: (entryId: string) => Promise<void>;
  addCategory: (name: string) => Promise<MealCategory>;
  removeCategory: (categoryId: string) => Promise<void>;
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

  const requestedDate = useRef(selectedDate);

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

  const removeLog = useCallback(
    async (entryId: string) => {
      setSummary((prev) =>
        prev
          ? { ...prev, entries: prev.entries.filter((e) => e.entryId !== entryId) }
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
    async (name: string): Promise<MealCategory> => {
      const category = await apiCreateCategory(name);
      await fetchFor(selectedDate);
      return category;
    },
    [fetchFor, selectedDate],
  );

  const removeCategory = useCallback(
    async (categoryId: string) => {
      // Optimistically drop the category and its entries from local state.
      setSummary((prev) =>
        prev
          ? {
              ...prev,
              categories: prev.categories.filter(
                (c) => c.categoryId !== categoryId,
              ),
              entries: prev.entries.filter(
                (e) => e.categoryId !== categoryId,
              ),
            }
          : prev,
      );
      try {
        await apiDeleteCategory(categoryId);
      } finally {
        await fetchFor(selectedDate);
      }
    },
    [fetchFor, selectedDate],
  );

  const value = useMemo(
    () => ({
      selectedDate,
      setSelectedDate,
      summary,
      loading,
      refresh,
      addLog,
      removeLog,
      addCategory,
      removeCategory,
    }),
    [
      selectedDate,
      summary,
      loading,
      refresh,
      addLog,
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
