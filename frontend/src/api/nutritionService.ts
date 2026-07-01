/**
 * API calls for calorie & macro tracking. The food database is seeded from USDA
 * FoodData Central; daily logs and goals are per-user (scoped server-side by the
 * JWT attached in apiClient).
 *
 * Note: meal categories (Breakfast/Lunch/etc.) are purely client-side visual
 * cards managed in NutritionContext — there is no category API. Each log entry
 * just carries a free-text `category` label.
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

export async function getDay(date: string): Promise<DaySummary> {
  const { data } = await apiClient.get<DaySummary>("/nutrition/day", {
    params: { date },
  });
  return data;
}

export interface LogFoodPayload {
  foodId?: string | null;
  category: string;
  date: string;
  quantity: number;
  unit: ServingUnit;
  // Quick-add snapshot (used when foodId is omitted).
  description?: string;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  // Provenance, preserved when re-logging an AI-estimated entry so it stays a
  // Smart Journal entry (kept out of the manual meal cards) after an edit.
  sourceType?: string | null;
  sourceUrl?: string | null;
}

export async function logFood(
  payload: LogFoodPayload,
): Promise<FoodLogEntry> {
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
  sourceUrls: string[];
  // Sonar's short explanation of the estimate + its 0–100 confidence. Surfaced
  // in the nutrition-detail sheet's "Amy's thought process" panel.
  reasoning?: string;
  confidence?: number;
}

/**
 * Log food from natural-language text via AI (ULTRA tier). One request may
 * create several entries (one per parsed food). Server-side gated: non-ULTRA
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
