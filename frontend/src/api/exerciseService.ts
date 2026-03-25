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

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

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
  const authHeader = await getAuthHeader();

  const response = await fetch(
    `${API_BASE_URL}/api/exercises/${exerciseId}/history`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
    },
  );
  const url = `${API_BASE_URL}/api/exercises/${exerciseId}/history`;
  console.log("Fetching:", url);

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("History API error:", response.status, errorBody);
    throw new Error(`Failed to fetch exercise history: ${response.status}`);
  }

  const text = await response.text();

  if (!text) {
    throw new Error("Empty response from exercise history API");
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to parse exercise history JSON:", text);
    throw new Error("Invalid JSON response from exercise history API");
  }
}

export async function createExercise(data: {
  name: string;
  description: string | null;
  bodyPart: string;
}): Promise<Exercise> {
  const authHeader = await getAuthHeader();
  const response = await fetch(`${API_BASE_URL}/api/exercises`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to create exercise");
  }

  return response.json();
}

export async function deleteExercise(exerciseId: string): Promise<void> {
  const authHeader = await getAuthHeader();
  const response = await fetch(`${API_BASE_URL}/api/exercises/${exerciseId}`, {
    method: "DELETE",
    headers: {
      ...authHeader,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to delete exercise");
  }
}
