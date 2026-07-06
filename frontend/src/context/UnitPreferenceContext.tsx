import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WeightUnit } from "../utils/weight";
import { DistanceUnit } from "../utils/distance";

/**
 * App-wide weight-unit preference (lbs / kg). Local-only, persisted to
 * AsyncStorage — mirrors the theme preference (`@theme_override`). All weight
 * is stored canonically in lbs; this only controls how weight is displayed and
 * entered. See utils/weight.ts for the conversion helpers.
 *
 * This is the global DEFAULT. An individual exercise can override it for the
 * duration of a workout via `WorkoutExercise.weightUnit` (set on the logging
 * screen) — that override is workout-scoped and resets to this default for the
 * next workout.
 */
export type { DistanceUnit };
export type EnergyUnit = "cal" | "kcal";

type UnitPreferenceContextValue = {
  weightUnit: WeightUnit;
  setWeightUnit: (unit: WeightUnit) => void;
  // Cardio display units. Distance is stored canonically in meters, so this only
  // affects how it's shown/entered; energy is purely a label (cal === kcal).
  distanceUnit: DistanceUnit;
  setDistanceUnit: (unit: DistanceUnit) => void;
  energyUnit: EnergyUnit;
  setEnergyUnit: (unit: EnergyUnit) => void;
};

const WEIGHT_UNIT_STORAGE_KEY = "@weight_unit";
const DISTANCE_UNIT_STORAGE_KEY = "@distance_unit";
const ENERGY_UNIT_STORAGE_KEY = "@energy_unit";

const UnitPreferenceContext = createContext<UnitPreferenceContextValue | null>(
  null,
);

export function UnitPreferenceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [weightUnit, setWeightUnitState] = useState<WeightUnit>("lbs");
  const [distanceUnit, setDistanceUnitState] = useState<DistanceUnit>("mi");
  const [energyUnit, setEnergyUnitState] = useState<EnergyUnit>("cal");

  useEffect(() => {
    AsyncStorage.getItem(WEIGHT_UNIT_STORAGE_KEY).then((stored) => {
      if (stored === "kg" || stored === "lbs") {
        setWeightUnitState(stored);
      }
    });
    AsyncStorage.getItem(DISTANCE_UNIT_STORAGE_KEY).then((stored) => {
      if (stored === "mi" || stored === "km") {
        setDistanceUnitState(stored);
      }
    });
    AsyncStorage.getItem(ENERGY_UNIT_STORAGE_KEY).then((stored) => {
      if (stored === "cal" || stored === "kcal") {
        setEnergyUnitState(stored);
      }
    });
  }, []);

  const setWeightUnit = useCallback((unit: WeightUnit) => {
    setWeightUnitState(unit);
    AsyncStorage.setItem(WEIGHT_UNIT_STORAGE_KEY, unit).catch((err) => {
      console.warn("Failed to persist weight unit:", err);
    });
  }, []);

  const setDistanceUnit = useCallback((unit: DistanceUnit) => {
    setDistanceUnitState(unit);
    AsyncStorage.setItem(DISTANCE_UNIT_STORAGE_KEY, unit).catch((err) => {
      console.warn("Failed to persist distance unit:", err);
    });
  }, []);

  const setEnergyUnit = useCallback((unit: EnergyUnit) => {
    setEnergyUnitState(unit);
    AsyncStorage.setItem(ENERGY_UNIT_STORAGE_KEY, unit).catch((err) => {
      console.warn("Failed to persist energy unit:", err);
    });
  }, []);

  const value = useMemo(
    () => ({
      weightUnit,
      setWeightUnit,
      distanceUnit,
      setDistanceUnit,
      energyUnit,
      setEnergyUnit,
    }),
    [
      weightUnit,
      setWeightUnit,
      distanceUnit,
      setDistanceUnit,
      energyUnit,
      setEnergyUnit,
    ],
  );

  return (
    <UnitPreferenceContext.Provider value={value}>
      {children}
    </UnitPreferenceContext.Provider>
  );
}

export function useUnitPreference(): UnitPreferenceContextValue {
  const ctx = useContext(UnitPreferenceContext);
  if (!ctx) {
    throw new Error(
      "useUnitPreference must be used inside a UnitPreferenceProvider",
    );
  }
  return ctx;
}
