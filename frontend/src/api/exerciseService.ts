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

export interface ExerciseSet {
  setNumber: number;
  reps: number;
  weightLbs: number | null;
  isPr: boolean;
}

export interface ExerciseSession {
  workoutId: string;
  workoutName: string;
  datePerformed: string;
  sets: ExerciseSet[];
}

export interface ExerciseHistory {
  exerciseId: string;
  exerciseName: string;
  bodyPart: string;
  totalSessions: number;
  personalRecordLbs: number | null;
  sessions: ExerciseSession[];
}

/**
 * Get all exercises
 */
export async function getAllExercises(): Promise<Exercise[]> {
  const { data } = await apiClient.get<Exercise[]>("/exercises");
  return data ?? [];
}

/**
 * Get exercise history for the authenticated user
 */
export async function getExerciseHistory(
  exerciseId: string,
): Promise<ExerciseHistory> {
  const { data } = await apiClient.get<ExerciseHistory>(
    `/exercises/${exerciseId}/history`,
  );
  return data;
}

/**
 * Create a new exercise
 */
export async function createExercise(exerciseData: {
  name: string;
  description: string | null;
  bodyPart: string;
}): Promise<Exercise> {
  const { data } = await apiClient.post<Exercise>("/exercises", exerciseData);
  return data;
}

/**
 * Delete an exercise by ID
 */
export async function deleteExercise(exerciseId: string): Promise<void> {
  await apiClient.delete(`/exercises/${exerciseId}`);
}
