/**
 * API calls for calorie & macro tracking. The food database is seeded from USDA
 * FoodData Central; daily logs and goals are per-user (scoped server-side by the
 * JWT attached in apiClient).
 */
import apiClient from "./apiClient";
import {
  DaySummary,
  FoodItem,
  FoodLogEntry,
  MealCategory,
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
  categoryId?: string | null;
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

export async function getCategories(): Promise<MealCategory[]> {
  const { data } = await apiClient.get<MealCategory[]>(
    "/nutrition/categories",
  );
  return data ?? [];
}

export async function createCategory(name: string): Promise<MealCategory> {
  const { data } = await apiClient.post<MealCategory>(
    "/nutrition/categories",
    { name },
  );
  return data;
}

export async function deleteCategory(categoryId: string): Promise<void> {
  await apiClient.delete(`/nutrition/categories/${categoryId}`);
}
