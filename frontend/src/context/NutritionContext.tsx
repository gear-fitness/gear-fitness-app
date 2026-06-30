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
import {
  enqueueCategoryOp,
  flushNutritionCategoryQueue,
} from "../utils/nutritionCategoryQueue";

/**
 * Holds the calorie-tracker's selected day and its cached summary (goal +
 * totals + logged entries), plus the user's meal categories.
 *
 * Categories are purely client-side visual cards with no backing table, stored
 * in AsyncStorage. There are two flavours:
 *  - Recurring categories appear on every day from an "effective from" date
 *    onward until toggled off. Breakfast/Lunch/Dinner are recurring from the
 *    epoch by default, so they show on every day unless turned off.
 *  - Per-day extras are one-off cards added to a single day.
 * The displayed list for a day is the active recurring set plus that day's
 * extras. Each logged entry also carries its category name as a free-text label
 * so it reappears under the right card on reload.
 *
 * Two more pieces of client-side metadata, also AsyncStorage-backed:
 *  - entryUnits: the display unit/quantity a logged entry was last edited in
 *    (the backend only stores SERVING/GRAM, so richer units live here).
 *  - recurringFrom: per-category "recurring since" dates, synced via the
 *    offline-first nutritionCategoryQueue.
 */
const CATEGORIES_STORAGE_KEY = "nutrition.categoriesByDate";
const ENTRY_UNITS_STORAGE_KEY = "nutrition.entryUnits";
const RECURRING_STORAGE_KEY = "nutrition.recurringFrom";
const CATEGORY_ORDER_STORAGE_KEY = "nutrition.categoryOrder";

// Far-past date so default recurring categories are active on every day.
const EPOCH = "1970-01-01";
const DEFAULT_RECURRING: Record<string, string> = {
  Breakfast: EPOCH,
  Lunch: EPOCH,
  Dinner: EPOCH,
};
// Single source of truth for card ORDER (recurring/extras only control
// per-day visibility), so toggling recurrence never reorders the list.
const DEFAULT_ORDER = ["Breakfast", "Lunch", "Dinner"];

type CategoriesByDate = Record<string, string[]>;
type EntryUnitsMap = Record<string, EntryUnitMeta>;
// name -> effective-from date (YYYY-MM-DD). Presence means "recurring".
type RecurringMap = Record<string, string>;

type NutritionContextValue = {
  selectedDate: string; // YYYY-MM-DD
  setSelectedDate: (date: string) => void;
  summary: DaySummary | null;
  loading: boolean;
  categories: string[];
  isRecurring: (name: string) => boolean;
  refresh: () => Promise<void>;
  addLog: (
    payload: Omit<LogFoodPayload, "date">,
    unitMeta?: EntryUnitMeta,
  ) => Promise<FoodLogEntry | null>;
  updateLog: (
    entryId: string,
    payload: Omit<LogFoodPayload, "date">,
    unitMeta?: EntryUnitMeta,
  ) => Promise<void>;
  removeLog: (entryId: string) => Promise<void>;
  getEntryUnitMeta: (entryId: string) => EntryUnitMeta | undefined;
  addCategory: (name: string) => Promise<void>;
  renameCategory: (oldName: string, newName: string) => Promise<void>;
  removeCategory: (name: string) => Promise<void>;
  setCategoryRecurring: (name: string, value: boolean) => Promise<void>;
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
  const [entryUnits, setEntryUnits] = useState<EntryUnitsMap>({});
  const [recurringFrom, setRecurringFrom] = useState<RecurringMap>({
    ...DEFAULT_RECURRING,
  });
  const [categoryOrder, setCategoryOrder] = useState<string[]>([
    ...DEFAULT_ORDER,
  ]);

  // Track the in-flight date so a slow response for an old date can't clobber
  // the summary after the user has already moved to another day.
  const requestedDate = useRef(selectedDate);

  // Load all persisted client-side metadata on mount.
  useEffect(() => {
    (async () => {
      try {
        const [cats, units, recurring, order] = await AsyncStorage.multiGet([
          CATEGORIES_STORAGE_KEY,
          ENTRY_UNITS_STORAGE_KEY,
          RECURRING_STORAGE_KEY,
          CATEGORY_ORDER_STORAGE_KEY,
        ]);
        const parse = <T,>(raw: string | null): T | null => {
          if (!raw) return null;
          try {
            const v = JSON.parse(raw);
            return v && typeof v === "object" ? (v as T) : null;
          } catch {
            return null;
          }
        };
        const c = parse<CategoriesByDate>(cats[1]);
        if (c) setCategoriesByDate(c);
        const u = parse<EntryUnitsMap>(units[1]);
        if (u) setEntryUnits(u);
        const r = parse<RecurringMap>(recurring[1]);
        if (r) setRecurringFrom(r);
        const o = parse<string[]>(order[1]);
        if (Array.isArray(o)) setCategoryOrder(o);
      } catch (err) {
        console.error("Failed to load nutrition metadata:", err);
      }
    })();
  }, []);

  // Displayed categories for the selected day. Visibility comes from recurrence
  // (active on this day) or the day's one-off extras; ORDER comes solely from
  // categoryOrder, so toggling recurrence or renaming never moves a card.
  const categories = useMemo(() => {
    const extras = categoriesByDate[selectedDate] ?? [];
    const isVisible = (name: string) =>
      (Object.prototype.hasOwnProperty.call(recurringFrom, name) &&
        recurringFrom[name] <= selectedDate) ||
      extras.includes(name);
    const ordered = categoryOrder.filter(isVisible);
    // Safety net: surface any visible category missing from the order list.
    const recActive = Object.keys(recurringFrom).filter(
      (n) => recurringFrom[n] <= selectedDate,
    );
    for (const n of [...recActive, ...extras]) {
      if (!ordered.includes(n)) ordered.push(n);
    }
    return ordered;
  }, [categoryOrder, recurringFrom, categoriesByDate, selectedDate]);

  const isRecurring = useCallback(
    (name: string) => Object.prototype.hasOwnProperty.call(recurringFrom, name),
    [recurringFrom],
  );

  // Write-through update for the whole per-day categories map.
  const persistCategoriesMap = useCallback(
    (updater: (prev: CategoriesByDate) => CategoriesByDate) => {
      setCategoriesByDate((prev) => {
        const next = updater(prev);
        AsyncStorage.setItem(
          CATEGORIES_STORAGE_KEY,
          JSON.stringify(next),
        ).catch((err) => console.error("Failed to save meal categories:", err));
        return next;
      });
    },
    [],
  );

  const persistCategoriesForDate = useCallback(
    (date: string, next: string[]) => {
      persistCategoriesMap((prev) => ({ ...prev, [date]: next }));
    },
    [persistCategoriesMap],
  );

  const persistRecurring = useCallback(
    (updater: (prev: RecurringMap) => RecurringMap) => {
      setRecurringFrom((prev) => {
        const next = updater(prev);
        AsyncStorage.setItem(
          RECURRING_STORAGE_KEY,
          JSON.stringify(next),
        ).catch((err) => console.error("Failed to save recurring meals:", err));
        return next;
      });
    },
    [],
  );

  const persistCategoryOrder = useCallback(
    (updater: (prev: string[]) => string[]) => {
      setCategoryOrder((prev) => {
        const next = updater(prev);
        AsyncStorage.setItem(
          CATEGORY_ORDER_STORAGE_KEY,
          JSON.stringify(next),
        ).catch((err) => console.error("Failed to save category order:", err));
        return next;
      });
    },
    [],
  );

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

  const addCategory = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      // Already shown today (recurring or an existing extra)?
      if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
        return;
      }
      const extras = categoriesByDate[selectedDate] ?? [];
      persistCategoriesForDate(selectedDate, [...extras, trimmed]);
      persistCategoryOrder((prev) =>
        prev.includes(trimmed) ? prev : [...prev, trimmed],
      );
    },
    [
      categories,
      categoriesByDate,
      persistCategoriesForDate,
      persistCategoryOrder,
      selectedDate,
    ],
  );

  const setCategoryRecurring = useCallback(
    async (name: string, value: boolean) => {
      if (value) {
        // Recurring from this day forward. Order is unchanged, so the card
        // stays exactly where it is.
        persistRecurring((prev) => ({ ...prev, [name]: selectedDate }));
        persistCategoryOrder((prev) =>
          prev.includes(name) ? prev : [...prev, name],
        );
      } else {
        persistRecurring((prev) => {
          if (!Object.prototype.hasOwnProperty.call(prev, name)) return prev;
          const next = { ...prev };
          delete next[name];
          return next;
        });
        // Keep it on the current day so it doesn't vanish while being viewed;
        // future days simply won't include it anymore.
        const extras = categoriesByDate[selectedDate] ?? [];
        if (!extras.includes(name)) {
          persistCategoriesForDate(selectedDate, [...extras, name]);
        }
      }
      await enqueueCategoryOp({
        kind: "setRecurring",
        name,
        value,
        recurringFrom: value ? selectedDate : undefined,
      });
      flushNutritionCategoryQueue().catch(() => {});
    },
    [
      persistRecurring,
      persistCategoryOrder,
      categoriesByDate,
      persistCategoriesForDate,
      selectedDate,
    ],
  );

  const renameCategory = useCallback(
    async (oldName: string, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed || trimmed === oldName) return;
      if (
        categories.some(
          (c) =>
            c.toLowerCase() === trimmed.toLowerCase() &&
            c.toLowerCase() !== oldName.toLowerCase(),
        )
      ) {
        return;
      }

      // 1. Rename in the recurring map (preserving its effective-from date) and
      // in the order list in place (order drives display position).
      persistRecurring((prev) => {
        if (!Object.prototype.hasOwnProperty.call(prev, oldName)) return prev;
        const next: RecurringMap = {};
        for (const [k, v] of Object.entries(prev)) {
          next[k === oldName ? trimmed : k] = v;
        }
        return next;
      });
      persistCategoryOrder((prev) =>
        prev.map((c) => (c === oldName ? trimmed : c)),
      );

      // 2. Rename across every day's one-off extras.
      persistCategoriesMap((prev) => {
        const next: CategoriesByDate = {};
        for (const [date, list] of Object.entries(prev)) {
          const renamed = list.map((c) => (c === oldName ? trimmed : c));
          next[date] = renamed.filter((c, i) => renamed.indexOf(c) === i);
        }
        return next;
      });

      // 3. Re-tag this day's logged entries (no PATCH endpoint), preserving
      // each entry's unit metadata across the new id.
      const toMove =
        summary?.entries.filter((e) => e.category === oldName) ?? [];
      for (const e of toMove) {
        const payload: Omit<LogFoodPayload, "date"> = e.foodId
          ? {
              foodId: e.foodId,
              category: trimmed,
              quantity: e.quantity,
              unit: e.unit,
            }
          : {
              category: trimmed,
              quantity: e.quantity,
              unit: e.unit,
              description: e.description,
              calories: e.calories ?? 0,
              proteinG: e.proteinG ?? 0,
              carbsG: e.carbsG ?? 0,
              fatG: e.fatG ?? 0,
            };
        try {
          const created = await apiLogFood({ ...payload, date: selectedDate });
          await apiDeleteEntry(e.entryId);
          persistEntryUnits((prev) => {
            const meta = prev[e.entryId];
            if (!meta) return prev;
            const next = { ...prev };
            delete next[e.entryId];
            if (created) next[created.entryId] = meta;
            return next;
          });
        } catch (err) {
          console.error("Failed to move entry during rename:", err);
        }
      }
      await fetchFor(selectedDate);

      await enqueueCategoryOp({ kind: "rename", from: oldName, to: trimmed });
      flushNutritionCategoryQueue().catch(() => {});
    },
    [
      categories,
      persistRecurring,
      persistCategoryOrder,
      persistCategoriesMap,
      persistEntryUnits,
      summary,
      fetchFor,
      selectedDate,
    ],
  );

  const removeCategory = useCallback(
    async (name: string) => {
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

      // Stop it recurring and drop it from this day's extras.
      persistRecurring((prev) => {
        if (!Object.prototype.hasOwnProperty.call(prev, name)) return prev;
        const next = { ...prev };
        delete next[name];
        return next;
      });
      const extras = (categoriesByDate[selectedDate] ?? []).filter(
        (c) => c !== name,
      );
      persistCategoriesForDate(selectedDate, extras);
      persistCategoryOrder((prev) => prev.filter((c) => c !== name));

      const deletedIds = new Set(toDelete.map((e) => e.entryId));
      persistEntryUnits((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const id of deletedIds) {
          if (next[id]) {
            delete next[id];
            changed = true;
          }
        }
        return changed ? next : prev;
      });

      try {
        await Promise.all(toDelete.map((e) => apiDeleteEntry(e.entryId)));
      } catch (err) {
        console.error("Failed to delete entries for category:", err);
      } finally {
        await fetchFor(selectedDate);
      }

      await enqueueCategoryOp({ kind: "delete", name });
      flushNutritionCategoryQueue().catch(() => {});
    },
    [
      categoriesByDate,
      persistRecurring,
      persistCategoryOrder,
      persistCategoriesForDate,
      persistEntryUnits,
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
      isRecurring,
      refresh,
      addLog,
      updateLog,
      removeLog,
      getEntryUnitMeta,
      addCategory,
      renameCategory,
      removeCategory,
      setCategoryRecurring,
    }),
    [
      selectedDate,
      summary,
      loading,
      categories,
      isRecurring,
      refresh,
      addLog,
      updateLog,
      removeLog,
      getEntryUnitMeta,
      addCategory,
      renameCategory,
      removeCategory,
      setCategoryRecurring,
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
