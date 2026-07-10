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
  updateEntryDisplayMeta,
} from "../api/nutritionService";
import {
  getCurrentLocalDateString,
  getLocalDateStringFromEpoch,
  parseLocalDate,
} from "../utils/date";
import { useAuth } from "./AuthContext";

/**
 * Holds the calorie-tracker's selected day and its cached summary (goal +
 * totals + logged entries).
 *
 * One piece of client-side metadata, AsyncStorage-backed:
 *  - entryUnits: the display unit/quantity a logged entry was last edited in
 *    (the backend only stores SERVING/GRAM, so richer units live here).
 *    Since V46 the same metadata is also stored server-side per entry
 *    (displayMeta), so it survives reinstall; the local map is the offline
 *    cache. Server values are adopted on summary load, and entries that only
 *    have local meta (logged before V46) are backfilled opportunistically.
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

// Shift a YYYY-MM-DD date by whole days in local time (mirrors the tracker's own
// day stepping) so the neighbouring days can be pre-warmed into the cache.
function shiftDay(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return getLocalDateStringFromEpoch(d.getTime());
}

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
  // Per-date summary cache. Swapping the day reveals cached numbers instantly
  // instead of blanking to a spinner and refetching; the visible `summary` is
  // just this map indexed by the current day. Cleared wholesale on account
  // change (below) so one user's days never leak into another's.
  const [summaries, setSummaries] = useState<Record<string, DaySummary>>({});
  const summariesRef = useRef(summaries);
  summariesRef.current = summaries;
  const summary = summaries[selectedDate] ?? null;
  const [loading, setLoading] = useState(false);
  // Bumped whenever the cache is cleared (account switch); a response tagged with
  // a superseded epoch is dropped rather than written into the new account.
  const cacheEpoch = useRef(0);
  const [entryUnits, setEntryUnits] = useState<EntryUnitsMap>({});
  // The AsyncStorage load has settled (found or empty); gates the server
  // backfill so an unloaded local map is never mistaken for "no local meta".
  const [unitsLoaded, setUnitsLoaded] = useState(false);

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
      } finally {
        setUnitsLoaded(true);
      }
    })();
  }, []);

  // Write-through update for the entry-unit map. An updater that returns the
  // previous map unchanged (same reference) skips the AsyncStorage write.
  const persistEntryUnits = useCallback(
    (updater: (prev: EntryUnitsMap) => EntryUnitsMap) => {
      setEntryUnits((prev) => {
        const next = updater(prev);
        if (next !== prev) {
          AsyncStorage.setItem(
            ENTRY_UNITS_STORAGE_KEY,
            JSON.stringify(next),
          ).catch((err) => console.error("Failed to save entry units:", err));
        }
        return next;
      });
    },
    [],
  );

  // Load one day into the cache. `quiet` fetches (used to pre-warm neighbouring
  // days) leave the loading flag and requested-date guard alone, so they never
  // disturb the day the user is actually looking at. The epoch guard drops a
  // response whose account has since changed.
  const fetchFor = useCallback(async (date: string, quiet = false) => {
    const epoch = cacheEpoch.current;
    if (!quiet) {
      requestedDate.current = date;
      setLoading(true);
    }
    try {
      const data = await getDay(date);
      if (cacheEpoch.current === epoch) {
        setSummaries((prev) => ({ ...prev, [date]: data }));
      }
    } catch (err) {
      console.error("Failed to load nutrition day:", err);
    } finally {
      if (!quiet && requestedDate.current === date) setLoading(false);
    }
  }, []);

  // Keying the loaders on the user id (rather than fetching once on mount)
  // matters twice over: the mount fetch can fire before auth has restored a
  // token, and cached summaries must never leak across accounts. Loading as
  // soon as auth lands also means setupComplete is known by the time the
  // Nutrition tab first renders, so it shows the right screen (setup wizard vs
  // tracker) without a flash.
  const { user } = useAuth();
  const userId = user?.userId;

  // Drop the whole cache when the account changes so no day leaks across users.
  // Declared before the loaders so they refetch into an already-cleared cache.
  useEffect(() => {
    cacheEpoch.current += 1;
    setSummaries({});
  }, [userId]);

  // Load the visible day. No blank-first: the cached numbers — or the previous
  // day's, easing to the new ones — stay on screen until fresh data lands, so a
  // day swipe no longer flashes empty.
  useEffect(() => {
    if (userId) fetchFor(selectedDate);
  }, [selectedDate, userId, fetchFor]);

  // Pre-warm the neighbouring days so a sequential swipe lands on already-loaded
  // numbers. Quiet fetches don't drive `loading` or the requested-date guard.
  useEffect(() => {
    if (!userId) return;
    const prev = shiftDay(selectedDate, -1);
    const next = shiftDay(selectedDate, 1);
    if (!summariesRef.current[prev]) fetchFor(prev, true);
    if (!summariesRef.current[next]) fetchFor(next, true);
  }, [selectedDate, userId, fetchFor]);

  const refresh = useCallback(
    () => fetchFor(selectedDate),
    [fetchFor, selectedDate],
  );

  // Reconcile the entry-unit map with the loaded day's server-side displayMeta:
  // adopt server values the local map lacks (restores units after a
  // reinstall), and backfill entries that only have local meta (logged before
  // displayMeta existed). Backfill is self-limiting: once the server stores
  // the meta, the missing-on-server condition disappears, so no done-flag is
  // needed; failures simply retry on a later load.
  const entryUnitsRef = useRef(entryUnits);
  entryUnitsRef.current = entryUnits;
  const backfillInFlight = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!summary || !unitsLoaded) return;
    persistEntryUnits((prev) => {
      let next = prev;
      for (const e of summary.entries) {
        if (e.displayMeta && !next[e.entryId]) {
          if (next === prev) next = { ...prev };
          next[e.entryId] = e.displayMeta;
        }
      }
      return next;
    });
    for (const e of summary.entries) {
      const local = entryUnitsRef.current[e.entryId];
      if (!local || e.displayMeta) continue;
      if (backfillInFlight.current.has(e.entryId)) continue;
      backfillInFlight.current.add(e.entryId);
      updateEntryDisplayMeta(e.entryId, local).catch(() => {
        // Offline or old server: drop the in-flight mark so a later summary
        // load retries.
        backfillInFlight.current.delete(e.entryId);
      });
    }
  }, [summary, unitsLoaded, persistEntryUnits]);

  const getEntryUnitMeta = useCallback(
    (entryId: string) => entryUnits[entryId],
    [entryUnits],
  );

  const addLog = useCallback(
    async (payload: Omit<LogFoodPayload, "date">, unitMeta?: EntryUnitMeta) => {
      let created: FoodLogEntry | null = null;
      try {
        created = await apiLogFood({
          ...payload,
          date: selectedDate,
          displayMeta: unitMeta ?? null,
        });
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
      const created = await apiLogFood({
        ...payload,
        date: selectedDate,
        displayMeta: unitMeta ?? null,
      });
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
      // Optimistic removal from the visible day's cached summary.
      setSummaries((prev) => {
        const cur = prev[selectedDate];
        if (!cur) return prev;
        return {
          ...prev,
          [selectedDate]: {
            ...cur,
            entries: cur.entries.filter((e) => e.entryId !== entryId),
          },
        };
      });
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
