import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WeightUnit } from "../utils/weight";
import { BarSpec, PlateInventory } from "../utils/plateMath";

/**
 * Persisted equipment config for the Load the Bar screen: saved barbells,
 * owned plate pairs per unit, and collar weight per unit. Local-only,
 * persisted to AsyncStorage like the unit preference. Renders from seeded
 * defaults immediately and hydrates underneath, so there is no loading state.
 *
 * Bars store BOTH unit weights verbatim (see utils/plateMath.ts): a 44 lb
 * bar stays exactly 44 lbs and its kg value is just the label shown when
 * calculating in kg mode.
 */
export type BarLoaderConfig = {
  bars: BarSpec[];
  activeBarId: string;
  kgInventory: PlateInventory;
  lbInventory: PlateInventory;
  /** Per-side collar weight in each unit's own denomination. */
  collarKg: number;
  collarLbs: number;
};

const STORAGE_KEY = "@bar_loader_config";

export const DEFAULT_BARS: BarSpec[] = [
  { id: "standard", name: "Standard Bar", weightKg: 20, weightLbs: 45 },
  { id: "womens", name: "Women's Bar", weightKg: 15, weightLbs: 33 },
  { id: "squat", name: "Squat Bar", weightKg: 25, weightLbs: 55 },
];

const DEFAULT_KG_INVENTORY: PlateInventory = {
  50: 0,
  25: 8,
  20: 2,
  15: 2,
  10: 2,
  5: 2,
  2.5: 2,
  2: 0,
  1.5: 0,
  1.25: 2,
  1: 0,
  0.5: 0,
};

const DEFAULT_LB_INVENTORY: PlateInventory = {
  55: 0,
  45: 8,
  35: 2,
  25: 2,
  10: 2,
  5: 2,
  2.5: 2,
  1.25: 0,
};

const DEFAULTS: BarLoaderConfig = {
  bars: DEFAULT_BARS,
  activeBarId: "standard",
  kgInventory: DEFAULT_KG_INVENTORY,
  lbInventory: DEFAULT_LB_INVENTORY,
  collarKg: 0,
  collarLbs: 0,
};

function newBarId(): string {
  return `bar_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
}

export function useBarLoaderConfig() {
  const [config, setConfig] = useState<BarLoaderConfig>(DEFAULTS);
  // A write that lands before hydration resolves has already persisted, so
  // applying the older stored blob afterwards would revert the edit on screen.
  const edited = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<BarLoaderConfig>;
          // Merge over defaults so new fields survive old stored shapes.
          setConfig((prev) =>
            edited.current
              ? prev
              : {
                  ...prev,
                  ...parsed,
                  kgInventory: {
                    ...DEFAULT_KG_INVENTORY,
                    ...parsed.kgInventory,
                  },
                  lbInventory: {
                    ...DEFAULT_LB_INVENTORY,
                    ...parsed.lbInventory,
                  },
                  bars: parsed.bars?.length ? parsed.bars : prev.bars,
                },
          );
        }
      })
      .catch((err) => console.warn("Failed to load bar loader config:", err));
  }, []);

  const update = useCallback(
    (
      patch:
        | Partial<BarLoaderConfig>
        | ((prev: BarLoaderConfig) => Partial<BarLoaderConfig>),
    ) => {
      edited.current = true;
      setConfig((prev) => {
        const next = {
          ...prev,
          ...(typeof patch === "function" ? patch(prev) : patch),
        };
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch((err) =>
          console.warn("Failed to persist bar loader config:", err),
        );
        return next;
      });
    },
    [],
  );

  const activeBar = useMemo(
    () =>
      config.bars.find((b) => b.id === config.activeBarId) ?? config.bars[0],
    [config.bars, config.activeBarId],
  );

  const setActiveBar = useCallback(
    (id: string) => update({ activeBarId: id }),
    [update],
  );

  const addBar = useCallback(
    (bar: Omit<BarSpec, "id">) => {
      const withId = { ...bar, id: newBarId() };
      update((prev) => ({
        bars: [...prev.bars, withId],
        activeBarId: withId.id,
      }));
    },
    [update],
  );

  const updateBar = useCallback(
    (bar: BarSpec) => {
      update((prev) => ({
        bars: prev.bars.map((b) => (b.id === bar.id ? bar : b)),
      }));
    },
    [update],
  );

  const deleteBar = useCallback(
    (id: string) => {
      update((prev) => {
        if (prev.bars.length <= 1) return {};
        const bars = prev.bars.filter((b) => b.id !== id);
        return {
          bars,
          activeBarId: prev.activeBarId === id ? bars[0].id : prev.activeBarId,
        };
      });
    },
    [update],
  );

  const setPlatePairs = useCallback(
    (unit: WeightUnit, denom: number, pairs: number) => {
      const key = unit === "kg" ? "kgInventory" : "lbInventory";
      update((prev) => ({
        [key]: { ...prev[key], [denom]: Math.max(0, pairs) },
      }));
    },
    [update],
  );

  const setCollar = useCallback(
    (unit: WeightUnit, perSide: number) => {
      update(
        unit === "kg"
          ? { collarKg: Math.max(0, perSide) }
          : { collarLbs: Math.max(0, perSide) },
      );
    },
    [update],
  );

  const resetInventory = useCallback(
    (unit: WeightUnit) => {
      update(
        unit === "kg"
          ? { kgInventory: DEFAULT_KG_INVENTORY, collarKg: 0 }
          : { lbInventory: DEFAULT_LB_INVENTORY, collarLbs: 0 },
      );
    },
    [update],
  );

  return {
    config,
    activeBar,
    setActiveBar,
    addBar,
    updateBar,
    deleteBar,
    setPlatePairs,
    setCollar,
    resetInventory,
  };
}
