import { FoodItem, MeasureUnit, MeasureUnitKey } from "../api/types";

/**
 * Serving-unit helpers for the calorie tracker.
 *
 * Nutrients are stored per 100 g, so every unit is expressed as a gram weight
 * ("how many grams is one of this unit, for this food"). Mass units are exact;
 * volume units (cup/ml) assume a water-like density, which is a deliberate
 * approximation that's good enough for a serving picker. The backend only
 * understands SERVING/GRAM, so the chosen unit is preserved client-side (see
 * EntryUnitMeta in NutritionContext) and converted to grams when logging.
 */

// Grams per one of each non-serving unit.
export const GENERIC_GRAMS: Record<Exclude<MeasureUnitKey, "serving">, number> =
  {
    g: 1,
    oz: 28.3495,
    cup: 240,
    ml: 1,
  };

const VOLUME_HINTS = ["ml", "milliliter", "millilitre", "liter", "litre", "fl", "cup"];

/** Grams in one serving of a food (its serving size, defaulting to 100 g). */
export function servingGramsOf(food: Pick<FoodItem, "servingSize">): number {
  return food.servingSize && food.servingSize > 0 ? food.servingSize : 100;
}

export function looksVolumetric(
  servingUnit: string | null | undefined,
): boolean {
  if (!servingUnit) return false;
  const u = servingUnit.toLowerCase();
  return VOLUME_HINTS.some((h) => u.includes(h));
}

/**
 * Build the list of units that make sense for a food: always grams + oz, a
 * "serving" unit sized to the food's serving, and volume units when the food's
 * serving unit looks volumetric.
 */
export function buildUnits(
  servingGrams: number,
  opts: { includeServing?: boolean; includeVolume?: boolean } = {},
): MeasureUnit[] {
  const { includeServing = true, includeVolume = false } = opts;
  const units: MeasureUnit[] = [];
  if (includeServing) {
    units.push({ key: "serving", label: "serving", grams: servingGrams });
  }
  units.push({ key: "g", label: "g", grams: GENERIC_GRAMS.g });
  units.push({ key: "oz", label: "oz", grams: GENERIC_GRAMS.oz });
  if (includeVolume) {
    units.push({ key: "cup", label: "cup", grams: GENERIC_GRAMS.cup });
    units.push({ key: "ml", label: "ml", grams: GENERIC_GRAMS.ml });
  }
  return units;
}

export function unitsForFood(food: FoodItem): MeasureUnit[] {
  return buildUnits(servingGramsOf(food), {
    includeVolume: looksVolumetric(food.servingUnit),
  });
}

const PLURAL: Partial<Record<MeasureUnitKey, string>> = { serving: "servings" };

export function unitLabel(unitKey: MeasureUnitKey): string {
  return unitKey;
}

/** Human label like "4 oz", "100 g", "1 cup", "2 servings". */
export function formatQuantity(
  quantity: number,
  unitKey: MeasureUnitKey,
): string {
  const n = Math.round(quantity * 100) / 100;
  const label = n === 1 ? unitLabel(unitKey) : PLURAL[unitKey] ?? unitLabel(unitKey);
  return `${n} ${label}`;
}

/** Grams in one of `unitKey`, preferring the food-specific list when available. */
export function gramsPerUnit(
  unitKey: MeasureUnitKey,
  servingGrams: number,
  units?: MeasureUnit[],
): number {
  const found = units?.find((u) => u.key === unitKey);
  if (found) return found.grams;
  if (unitKey === "serving") return servingGrams;
  return GENERIC_GRAMS[unitKey];
}
