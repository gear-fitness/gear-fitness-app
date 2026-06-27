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
  return data ?? [];
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
