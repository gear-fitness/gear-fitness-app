// ──────────────────────────────────────────────────────────────
// Plate-loading and gym-math helpers for the Load the Bar screen.
//
// All loading math runs natively in the active display unit (kg math
// never round-trips through lbs), so a 20 kg bar plus 25 kg plates is
// exact. Bars therefore store BOTH weights verbatim (a "45 lb" bar is
// 45, not 20.4 kg converted). LBS_PER_KG is only used to render the
// other unit's equivalent alongside the active one.
//
// Pure + exported for testability, matching utils/weight.ts.
// ──────────────────────────────────────────────────────────────

import { LBS_PER_KG, WeightUnit } from "./weight";

export type BarSpec = {
  id: string;
  name: string;
  weightKg: number;
  weightLbs: number;
};

/** Owned plate pairs, keyed by denomination (in that unit). */
export type PlateInventory = Record<number, number>;

export type PlateCount = { denom: number; count: number };

export type Loadout = {
  /** Plates for ONE side, largest first. */
  platesPerSide: PlateCount[];
  /** Bar + collars + both sides. The nearest total the inventory can build. */
  achievedTotal: number;
  /** True when achievedTotal matches the requested target. */
  exact: boolean;
};

// Denominations shown in the reverse grid and inventory, largest first.
export const KG_DENOMS = [50, 25, 20, 15, 10, 5, 2.5, 2, 1.5, 1.25, 1, 0.5];
export const LB_DENOMS = [55, 45, 35, 25, 10, 5, 2.5, 1.25];

export function denomsFor(unit: WeightUnit): number[] {
  return unit === "kg" ? KG_DENOMS : LB_DENOMS;
}

type PlateColor = { bg: string; text: string };

// IPF/IWF competition colors, full saturation. lb plates render as
// iron grays.
const KG_COLORS: Record<number, PlateColor> = {
  50: { bg: "#232325", text: "#fff" },
  25: { bg: "#D93A2E", text: "#fff" },
  20: { bg: "#3B70E4", text: "#fff" },
  15: { bg: "#F2C832", text: "#1a1a1a" },
  10: { bg: "#2FA84F", text: "#fff" },
  5: { bg: "#F7F7F2", text: "#1a1a1a" },
  2.5: { bg: "#2E2E30", text: "#fff" },
  2: { bg: "#3B70E4", text: "#fff" },
  1.5: { bg: "#F2C832", text: "#1a1a1a" },
  1.25: { bg: "#C4C8CC", text: "#1a1a1a" },
  1: { bg: "#2FA84F", text: "#fff" },
  0.5: { bg: "#C4C8CC", text: "#1a1a1a" },
};

const LB_COLORS: Record<number, PlateColor> = {
  55: { bg: "#2C2C2E", text: "#fff" },
  45: { bg: "#3A3A3C", text: "#fff" },
  35: { bg: "#48484A", text: "#fff" },
  25: { bg: "#565658", text: "#fff" },
  10: { bg: "#636366", text: "#fff" },
  5: { bg: "#707074", text: "#fff" },
  2.5: { bg: "#7D7D80", text: "#fff" },
  1.25: { bg: "#8A8A8E", text: "#fff" },
};

const FALLBACK_COLOR: PlateColor = { bg: "#8A8A8E", text: "#fff" };

export function plateColor(denom: number, unit: WeightUnit): PlateColor {
  const map = unit === "kg" ? KG_COLORS : LB_COLORS;
  return map[denom] ?? FALLBACK_COLOR;
}

const EPSILON = 1e-9;

function sumPerSide(plates: PlateCount[]): number {
  return plates.reduce((acc, p) => acc + p.denom * p.count, 0);
}

/**
 * Nearest loadable total for `target`, constrained to owned plate pairs.
 * Greedy largest-first floor, then rounds up by one smallest available
 * plate when that lands closer to the target. Ties round down.
 */
export function computeLoadout(
  target: number,
  unit: WeightUnit,
  barWeight: number,
  collarPerSide: number,
  inventory: PlateInventory,
): Loadout {
  const base = barWeight + 2 * collarPerSide;
  const emptyLoadout: Loadout = {
    platesPerSide: [],
    achievedTotal: base,
    exact: Math.abs(target - base) < EPSILON,
  };
  if (!Number.isFinite(target) || target <= base) return emptyLoadout;

  const perSideTarget = (target - base) / 2;
  const plates: PlateCount[] = [];
  let remaining = perSideTarget;
  let smallestAvailable: number | null = null;

  for (const denom of denomsFor(unit)) {
    const pairs = inventory[denom] ?? 0;
    if (pairs <= 0) continue;
    const used = Math.min(Math.floor(remaining / denom + EPSILON), pairs);
    if (used > 0) {
      plates.push({ denom, count: used });
      remaining -= denom * used;
    }
    if (used < pairs) smallestAvailable = denom;
  }

  if (remaining > EPSILON && smallestAvailable != null) {
    const undershoot = remaining;
    const overshoot = smallestAvailable - remaining;
    if (overshoot < undershoot - EPSILON) {
      const existing = plates.find((p) => p.denom === smallestAvailable);
      if (existing) existing.count += 1;
      else plates.push({ denom: smallestAvailable, count: 1 });
      plates.sort((a, b) => b.denom - a.denom);
    }
  }

  const achievedTotal = base + 2 * sumPerSide(plates);
  return {
    platesPerSide: plates,
    achievedTotal,
    exact: Math.abs(achievedTotal - target) < EPSILON,
  };
}

/**
 * One plate on the bar. Each plate carries its own unit so kg and lb
 * plates can be mixed on the same bar (reverse mode's real-gym case).
 */
export type StackPlate = { denom: number; unit: WeightUnit };

/** A plate's weight expressed in `unit`. */
export function plateValueIn(plate: StackPlate, unit: WeightUnit): number {
  if (plate.unit === unit) return plate.denom;
  return unit === "kg" ? plate.denom / LBS_PER_KG : plate.denom * LBS_PER_KG;
}

/**
 * Total weight of an already-loaded bar (reverse mode) in `unit`.
 * `stack` is one side's plates in loading order, bottom first.
 */
export function reverseTotal(
  stack: StackPlate[],
  barWeight: number,
  collarPerSide: number,
  unit: WeightUnit,
): number {
  const perSide = stack.reduce((acc, p) => acc + plateValueIn(p, unit), 0);
  return barWeight + 2 * collarPerSide + 2 * perSide;
}

/**
 * Grouped per-side plates flattened to an ordered stack (largest first,
 * matching how a load is actually slid onto the sleeve).
 */
export function expandPlates(
  platesPerSide: PlateCount[],
  unit: WeightUnit,
): StackPlate[] {
  const stack: StackPlate[] = [];
  for (const p of platesPerSide) {
    for (let i = 0; i < p.count; i++) stack.push({ denom: p.denom, unit });
  }
  return stack;
}

/** kg value of a weight expressed in `unit` (for the dual readout). */
export function toOtherUnit(value: number, unit: WeightUnit): number {
  return unit === "kg" ? value * LBS_PER_KG : value / LBS_PER_KG;
}

/** Display label for plate and readout visuals: KG / LB (not LBS). */
export function unitDisplay(unit: WeightUnit): string {
  return unit === "kg" ? "KG" : "LB";
}

/** Trim to at most 2 decimals with no trailing zeros. */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return String(parseFloat(value.toFixed(2)));
}

// ──────────────────────────────────────────────────────────────
// RPE / e1RM
//
// Standard RTS-style percentage chart: percent of 1RM by (reps, RPE).
// Rows are RPE 10 down to 6 in 0.5 steps, columns reps 1 to 12.
// ──────────────────────────────────────────────────────────────

export const RPE_VALUES = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6];
export const REP_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// Keyed by rpe * 10 to avoid float keys.
const RPE_CHART: Record<number, number[]> = {
  100: [100, 95.5, 92.2, 89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 70.7, 68.0],
  95: [97.8, 93.9, 90.7, 87.8, 85.0, 82.4, 79.9, 77.4, 75.1, 72.3, 69.4, 66.7],
  90: [95.5, 92.2, 89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 70.7, 68.0, 65.3],
  85: [93.9, 90.7, 87.8, 85.0, 82.4, 79.9, 77.4, 75.1, 72.3, 69.4, 66.7, 64.0],
  80: [92.2, 89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 70.7, 68.0, 65.3, 62.6],
  75: [90.7, 87.8, 85.0, 82.4, 79.9, 77.4, 75.1, 72.3, 69.4, 66.7, 64.0, 61.3],
  70: [89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 70.7, 68.0, 65.3, 62.6, 59.9],
  65: [87.8, 85.0, 82.4, 79.9, 77.4, 75.1, 72.3, 69.4, 66.7, 64.0, 61.3, 58.6],
  60: [86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 70.7, 68.0, 65.3, 62.6, 59.9, 57.4],
};

/** Percent of 1RM (0-100) for a set of `reps` at `rpe`, or null if off-chart. */
export function percentOfMax(reps: number, rpe: number): number | null {
  const row = RPE_CHART[Math.round(rpe * 10)];
  if (!row || reps < 1 || reps > row.length) return null;
  return row[reps - 1];
}

/** e1RM from a last set of weight x reps @ RPE. */
export function estimateE1RM(
  weight: number,
  reps: number,
  rpe: number,
): number | null {
  const pct = percentOfMax(reps, rpe);
  if (pct == null || weight <= 0) return null;
  return weight / (pct / 100);
}

/** Working weight for a target of reps @ RPE given an e1RM. */
export function weightForTarget(
  e1rm: number,
  reps: number,
  rpe: number,
): number | null {
  const pct = percentOfMax(reps, rpe);
  if (pct == null || e1rm <= 0) return null;
  return e1rm * (pct / 100);
}

/** Epley fallback when no RPE is given (treats the set as max effort). */
export function epleyE1RM(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

// ──────────────────────────────────────────────────────────────
// Powerlifting points (raw SBD coefficient sets, inputs in kg)
// ──────────────────────────────────────────────────────────────

export type Sex = "male" | "female";

function poly(coefs: number[], x: number): number {
  return coefs.reduce((acc, c, i) => acc + c * Math.pow(x, i), 0);
}

const DOTS_COEFS: Record<Sex, number[]> = {
  male: [-307.75076, 24.0900756, -0.1918759221, 0.0007391293, -0.000001093],
  female: [-57.96288, 13.6175032, -0.1126655495, 0.0005158568, -0.0000010706],
};

export function dotsScore(
  totalKg: number,
  bodyweightKg: number,
  sex: Sex,
): number {
  if (totalKg <= 0 || bodyweightKg <= 0) return 0;
  return (totalKg * 500) / poly(DOTS_COEFS[sex], bodyweightKg);
}

const WILKS_2020_COEFS: Record<Sex, number[]> = {
  male: [
    47.4617885411949, 8.47206137941125, 0.073694103462609, -0.00139583381094385,
    0.00000707665973070743, -0.0000000120804336482315,
  ],
  female: [
    -125.425539779509, 13.7121941940668, -0.0330725063103405,
    -0.0010504000506583, 0.00000938773881462799, -0.0000000233346138849541,
  ],
};

export function wilks2020Score(
  totalKg: number,
  bodyweightKg: number,
  sex: Sex,
): number {
  if (totalKg <= 0 || bodyweightKg <= 0) return 0;
  return (totalKg * 600) / poly(WILKS_2020_COEFS[sex], bodyweightKg);
}

const IPF_GL_COEFS: Record<Sex, { a: number; b: number; c: number }> = {
  male: { a: 1199.72839, b: 1025.18162, c: 0.00921 },
  female: { a: 610.32796, b: 1045.59282, c: 0.03048 },
};

export function ipfGLScore(
  totalKg: number,
  bodyweightKg: number,
  sex: Sex,
): number {
  if (totalKg <= 0 || bodyweightKg <= 0) return 0;
  const { a, b, c } = IPF_GL_COEFS[sex];
  const denom = a - b * Math.exp(-c * bodyweightKg);
  return denom > 0 ? (totalKg * 100) / denom : 0;
}
