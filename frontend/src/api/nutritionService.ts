/**
 * API calls for calorie & macro tracking. The food database is seeded from USDA
 * FoodData Central; daily logs and goals are per-user (scoped server-side by the
 * JWT attached in apiClient).
 *
 * Note: each log entry carries an optional free-text `category` label — a
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
 * logging anything — backs the custom-food form's "calculate calories for me".
 */
export async function aiEstimateFood(text: string): Promise<AiEstimate> {
  const { data } = await apiClient.post<AiEstimate>("/nutrition/ai/estimate", {
    text,
  });
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
  // database picks added from the journal, null for legacy manual entries.
  // Preserved when re-logging an entry through an edit.
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
  // True when the parse recognized no food in the text — nothing was logged.
  noFood?: boolean;
  sourceUrls: string[];
  // Sonar's short explanation of the estimate + its 0–100 confidence. Surfaced
  // in the nutrition-detail sheet's "Gear's thought process" panel.
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

export async function recalcGoal(): Promise<NutritionGoal> {
  const { data } = await apiClient.post<NutritionGoal>(
    "/nutrition/goal/recalculate",
  );
  return data;
}
