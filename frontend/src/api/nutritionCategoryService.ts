import apiClient from "./apiClient";

/**
 * Meal-category mutation API — STUBS.
 *
 * Meal categories are currently client-side visual cards (see NutritionContext),
 * and the server endpoints below do not exist yet. These wrappers define the
 * intended contract so the UI and the offline-first queue
 * (utils/nutritionCategoryQueue) can be built against a stable surface; swap the
 * bodies for the real routes when the backend lands. They are best-effort sync:
 * the client state in AsyncStorage is the source of truth.
 */

export async function renameCategoryApi(
  from: string,
  to: string,
): Promise<void> {
  await apiClient.patch("/nutrition/categories/rename", { from, to });
}

export async function deleteCategoryApi(name: string): Promise<void> {
  await apiClient.delete(
    `/nutrition/categories/${encodeURIComponent(name)}`,
  );
}

export async function setCategoryRecurringApi(
  name: string,
  recurring: boolean,
  from?: string,
): Promise<void> {
  await apiClient.patch("/nutrition/categories/recurring", {
    name,
    recurring,
    from,
  });
}
