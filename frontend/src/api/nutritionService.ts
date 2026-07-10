/**
 * API calls for calorie & macro tracking. The food database is seeded from USDA
 * FoodData Central; daily logs and goals are per-user (scoped server-side by the
 * JWT attached in apiClient).
 *
 * Note: each log entry carries an optional free-text `category` label, a
 * leftover from the retired meal-card UI, kept nullable for old clients. New
 * entries are logged without one.
 */
import apiClient from "./apiClient";
import { unitsForFood } from "../utils/nutritionUnits";
import {
  DaySummary,
  FoodItem,
  FoodLogEntry,
  NutritionGoal,
  NutritionGoalIntensity,
  NutritionGoalType,
  ServingUnit,
} from "./types";

export async function searchFoods(
  query: string,
  page = 0,
): Promise<FoodItem[]> {
  const { data } = await apiClient.get<FoodItem[]>("/nutrition/foods/search", {
    params: { q: query, page },
  });
  // Attach the client-derived set of valid units of measure for each food.
  return (data ?? []).map((f) => ({ ...f, units: unitsForFood(f) }));
}

/**
 * The user's own foods (recent + frequent), shown by the Add Food screen before
 * the user types. Same shape as searchFoods so it renders through FoodRow
 * unchanged; falls back server-side to the popular list for new users.
 */
export async function getUserFoods(): Promise<FoodItem[]> {
  const { data } = await apiClient.get<FoodItem[]>("/nutrition/foods/recent");
  // Attach the client-derived set of valid units of measure for each food.
  return (data ?? []).map((f) => ({ ...f, units: unitsForFood(f) }));
}

/** Create/update payload for a custom food. Nutrition is per serving. */
export interface CustomFoodPayload {
  description: string;
  nickname?: string | null;
  calories: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
}

/** The user's custom foods ("saved meals"), newest first. */
export async function getCustomFoods(): Promise<FoodItem[]> {
  const { data } = await apiClient.get<FoodItem[]>("/nutrition/foods/custom");
  return (data ?? []).map((f) => ({ ...f, units: unitsForFood(f) }));
}

export async function createCustomFood(
  payload: CustomFoodPayload,
): Promise<FoodItem> {
  const { data } = await apiClient.post<FoodItem>(
    "/nutrition/foods/custom",
    payload,
  );
  return { ...data, units: unitsForFood(data) };
}

export async function updateCustomFood(
  foodId: string,
  payload: CustomFoodPayload,
): Promise<FoodItem> {
  const { data } = await apiClient.put<FoodItem>(
    `/nutrition/foods/custom/${foodId}`,
    payload,
  );
  return { ...data, units: unitsForFood(data) };
}

export async function deleteCustomFood(foodId: string): Promise<void> {
  await apiClient.delete(`/nutrition/foods/custom/${foodId}`);
}

/** AI nutrition estimate: summed macros for a described meal, nothing logged. */
export interface AiEstimate {
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  confidence: number;
  noFood: boolean;
}

/**
 * Estimate nutrition from natural-language text via AI (PLUS tier) without
 * logging anything; backs the custom-food form's "calculate calories for me".
 */
export async function aiEstimateFood(text: string): Promise<AiEstimate> {
  const { data } = await apiClient.post<AiEstimate>("/nutrition/ai/estimate", {
    text,
  });
  return data;
}

/** Result of a barcode lookup (local seed first, OpenFoodFacts fallback). */
export interface BarcodeLookup {
  status: "FOUND" | "NOT_FOUND" | "INCOMPLETE";
  food: FoodItem | null;
  // Set on INCOMPLETE: the product exists upstream but has no usable
  // nutrition, so the client prefills the custom-food form with this name.
  productName: string | null;
}

/**
 * Resolve a scanned barcode to a food (PLUS tier, server-gated 403). The
 * backend normalizes the code, so pass the raw scanned value.
 */
export async function lookupBarcode(code: string): Promise<BarcodeLookup> {
  const { data } = await apiClient.get<BarcodeLookup>(
    `/nutrition/foods/barcode/${encodeURIComponent(code)}`,
  );
  return data.food
    ? { ...data, food: { ...data.food, units: unitsForFood(data.food) } }
    : data;
}

/** One food the vision model recognized in a meal photo. */
export interface PhotoEstimateFood {
  description: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/** AI nutrition estimate for a meal photo; nothing is logged by the call. */
export interface AiPhotoEstimate {
  foods: PhotoEstimateFood[];
  reasoning?: string;
  confidence?: number;
  // True when the model saw no food or drink in the image at all.
  noFood: boolean;
}

/**
 * Estimate nutrition from a meal photo via AI (PLUS tier, server-gated 403).
 * The image travels inline as base64 (compress to ~1024px JPEG first); note
 * is optional user context ("2% milk, large bowl"). The client confirms the
 * results and logs them through logFood.
 */
export async function aiPhotoEstimate(payload: {
  imageBase64: string;
  mimeType: string;
  note?: string;
}): Promise<AiPhotoEstimate> {
  const { data } = await apiClient.post<AiPhotoEstimate>(
    "/nutrition/ai/photo/estimate",
    payload,
    // Vision estimates are slow but not endless; a hung connection should
    // surface the generic failure state instead of analyzing forever.
    { timeout: 60000 },
  );
  return data;
}

export async function getDay(date: string): Promise<DaySummary> {
  const { data } = await apiClient.get<DaySummary>("/nutrition/day", {
    params: { date },
  });
  return data;
}

/** ISO dates in [start, end] on which the user logged at least one food. */
export async function getLoggedDates(
  start: string,
  end: string,
): Promise<string[]> {
  const { data } = await apiClient.get<string[]>("/nutrition/logged-dates", {
    params: { start, end },
  });
  return data ?? [];
}

export interface LogFoodPayload {
  foodId?: string | null;
  category?: string;
  date: string;
  quantity: number;
  unit: ServingUnit;
  // Quick-add snapshot (used when foodId is omitted).
  description?: string;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  // Provenance: "AI_SONAR"/"AI_CACHE" for AI-parsed journal lines, "DB" for
  // database picks added from the journal, "BARCODE" for scanned products,
  // "PHOTO" for photo estimates, null for legacy manual entries. Preserved
  // when re-logging an entry through an edit. Values starting with "AI" are
  // reserved for journal-owned lines (the journal reaps unreferenced ones).
  sourceType?: string | null;
  sourceUrl?: string | null;
}

export async function logFood(payload: LogFoodPayload): Promise<FoodLogEntry> {
  const { data } = await apiClient.post<FoodLogEntry>(
    "/nutrition/log",
    payload,
  );
  return data;
}

export async function deleteEntry(entryId: string): Promise<void> {
  await apiClient.delete(`/nutrition/log/${entryId}`);
}

export interface AiLogPayload {
  text: string;
  date?: string;
  category?: string;
}

export interface AiLogResult {
  entries: FoodLogEntry[];
  fromCache: boolean;
  // True when the parse recognized no food in the text; nothing was logged.
  noFood?: boolean;
  sourceUrls: string[];
  // Sonar's short explanation of the estimate + its 0 to 100 confidence.
  // Surfaced in the nutrition-detail sheet's "Gear's thought process" panel.
  reasoning?: string;
  confidence?: number;
}

/**
 * Log food from natural-language text via AI (PLUS tier). One request may
 * create several entries (one per parsed food). Server-side gated: non-PLUS
 * users get a 403.
 */
export async function aiLogFood(payload: AiLogPayload): Promise<AiLogResult> {
  const { data } = await apiClient.post<AiLogResult>(
    "/nutrition/ai/log",
    payload,
  );
  return data;
}

export async function getGoal(): Promise<NutritionGoal> {
  const { data } = await apiClient.get<NutritionGoal>("/nutrition/goal");
  return data;
}

export async function updateGoal(goal: {
  calorieGoal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}): Promise<NutritionGoal> {
  const { data } = await apiClient.put<NutritionGoal>("/nutrition/goal", goal);
  return data;
}

/**
 * Recompute the daily targets server-side from the stored profile. Optionally
 * saves a new cut/bulk direction and pace first (the setup wizard's save
 * path); a bare call just recalculates and marks setup complete.
 */
export async function recalcGoal(params?: {
  goalType?: NutritionGoalType;
  goalIntensity?: NutritionGoalIntensity;
}): Promise<NutritionGoal> {
  const { data } = await apiClient.post<NutritionGoal>(
    "/nutrition/goal/recalculate",
    params ?? {},
  );
  return data;
}
