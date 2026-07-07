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
import { DaySummary, EntryUnitMeta, FoodLogEntry } from "../api/types";
import {
  deleteEntry as apiDeleteEntry,
  getDay,
  logFood as apiLogFood,
  LogFoodPayload,
} from "../api/nutritionService";
import { getCurrentLocalDateString } from "../utils/date";

/**
 * Holds the calorie-tracker's selected day and its cached summary (goal +
 * totals + logged entries).
 *
 * One piece of client-side metadata, AsyncStorage-backed:
 *  - entryUnits: the display unit/quantity a logged entry was last edited in
 *    (the backend only stores SERVING/GRAM, so richer units live here).
 */
const ENTRY_UNITS_STORAGE_KEY = "nutrition.entryUnits";

// Storage left behind by the retired meal-category system (cards were merged
// into the journal screen). Harmless if present, but reclaim the space.
const OBSOLETE_STORAGE_KEYS = [
  "nutrition.categoriesByDate",
  "nutrition.recurringFrom",
  "nutrition.categoryOrder",
  "nutrition.smartJournal",
];

type EntryUnitsMap = Record<string, EntryUnitMeta>;

type NutritionContextValue = {
  selectedDate: string; // YYYY-MM-DD
  setSelectedDate: (date: string) => void;
  summary: DaySummary | null;
  loading: boolean;
  refresh: () => Promise<void>;
  addLog: (
    payload: Omit<LogFoodPayload, "date">,
    unitMeta?: EntryUnitMeta,
  ) => Promise<FoodLogEntry | null>;
  updateLog: (
    entryId: string,
    payload: Omit<LogFoodPayload, "date">,
    unitMeta?: EntryUnitMeta,
  ) => Promise<FoodLogEntry | null>;
  removeLog: (entryId: string) => Promise<void>;
  getEntryUnitMeta: (entryId: string) => EntryUnitMeta | undefined;
};

const NutritionContext = createContext<NutritionContextValue | null>(null);

export function NutritionProvider({ children }: { children: React.ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<string>(
    getCurrentLocalDateString(),
  );
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [entryUnits, setEntryUnits] = useState<EntryUnitsMap>({});

  // Track the in-flight date so a slow response for an old date can't clobber
  // the summary after the user has already moved to another day.
  const requestedDate = useRef(selectedDate);

  // Load persisted client-side metadata on mount.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(ENTRY_UNITS_STORAGE_KEY);
        if (raw) {
          try {
            const v = JSON.parse(raw);
            if (v && typeof v === "object") setEntryUnits(v as EntryUnitsMap);
          } catch {
            /* corrupt map: start fresh */
          }
        }
        AsyncStorage.multiRemove(OBSOLETE_STORAGE_KEYS).catch(() => {});
      } catch (err) {
        console.error("Failed to load nutrition metadata:", err);
      }
    })();
  }, []);

  // Write-through update for the entry-unit map.
  const persistEntryUnits = useCallback(
    (updater: (prev: EntryUnitsMap) => EntryUnitsMap) => {
      setEntryUnits((prev) => {
        const next = updater(prev);
        AsyncStorage.setItem(
          ENTRY_UNITS_STORAGE_KEY,
          JSON.stringify(next),
        ).catch((err) => console.error("Failed to save entry units:", err));
        return next;
      });
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

  const getEntryUnitMeta = useCallback(
    (entryId: string) => entryUnits[entryId],
    [entryUnits],
  );

  const addLog = useCallback(
    async (payload: Omit<LogFoodPayload, "date">, unitMeta?: EntryUnitMeta) => {
      let created: FoodLogEntry | null = null;
      try {
        created = await apiLogFood({ ...payload, date: selectedDate });
        if (created && unitMeta) {
          const id = created.entryId;
          persistEntryUnits((prev) => ({ ...prev, [id]: unitMeta }));
        }
      } finally {
        await fetchFor(selectedDate);
      }
      return created;
    },
    [fetchFor, selectedDate, persistEntryUnits],
  );

  // Editing has no PATCH endpoint, so we re-log with the new values and delete
  // the old row (add-first so a failure never loses the entry), migrating the
  // entry's unit metadata to the freshly created id.
  const updateLog = useCallback(
    async (
      entryId: string,
      payload: Omit<LogFoodPayload, "date">,
      unitMeta?: EntryUnitMeta,
    ) => {
      const created = await apiLogFood({ ...payload, date: selectedDate });
      await apiDeleteEntry(entryId);
      persistEntryUnits((prev) => {
        const next = { ...prev };
        delete next[entryId];
        if (created && unitMeta) next[created.entryId] = unitMeta;
        return next;
      });
      await fetchFor(selectedDate);
      return created;
    },
    [fetchFor, selectedDate, persistEntryUnits],
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
      persistEntryUnits((prev) => {
        if (!prev[entryId]) return prev;
        const next = { ...prev };
        delete next[entryId];
        return next;
      });
      try {
        await apiDeleteEntry(entryId);
      } finally {
        await fetchFor(selectedDate);
      }
    },
    [fetchFor, selectedDate, persistEntryUnits],
  );

  const value = useMemo(
    () => ({
      selectedDate,
      setSelectedDate,
      summary,
      loading,
      refresh,
      addLog,
      updateLog,
      removeLog,
      getEntryUnitMeta,
    }),
    [
      selectedDate,
      summary,
      loading,
      refresh,
      addLog,
      updateLog,
      removeLog,
      getEntryUnitMeta,
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
