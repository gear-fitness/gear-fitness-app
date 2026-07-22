import { WeightUnit } from "../../utils/weight";
import { Sex, StackPlate } from "../../utils/plateMath";

export type BarLoaderTab = "calculate" | "reverse" | "calculators";

/**
 * In-memory session state for the Load the Bar screen. The screen is a
 * pushed route that unmounts on back, but lifters bounce between it and
 * the logger between sets, so the working state lives here: the screen
 * seeds from it on mount and writes through on change. It survives
 * navigation and intentionally dies with the app process, unlike the
 * AsyncStorage-backed equipment config in useBarLoaderConfig.
 */
export const barLoaderSession = {
  /** null until the screen is first opened; then the last-used unit. */
  unit: null as WeightUnit | null,
  tab: "calculate" as BarLoaderTab,
  weightInput: "",
  reverseStack: [] as StackPlate[],
  // Calculators tab
  lastWeight: "",
  lastReps: 5,
  lastRpe: 8,
  nextReps: 5,
  nextRpe: 8,
  percentBase: "",
  sex: "male" as Sex,
  bodyweight: "",
  total: "",
};
