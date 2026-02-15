/**
 * Exercise service
 * API calls for exercise data
 */

import apiClient from "./apiClient";

export interface Exercise {
  exerciseId: string;
  name: string;
  bodyPart: string;
  description: string;
}

/**
 * Get all exercises
 */
export async function getAllExercises(): Promise<Exercise[]> {
  const { data } = await apiClient.get<Exercise[]>("/exercises");
  return data ?? [];
}
