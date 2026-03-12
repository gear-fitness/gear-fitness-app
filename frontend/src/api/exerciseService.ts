/**
 * Exercise service
 * API calls for exercise data
 */

import { getAuthHeader } from "../utils/auth";

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
  const authHeader = await getAuthHeader();

  const response = await fetch(`${API_BASE_URL}/api/exercises`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
    },
  });

  console.log("Response status:", response.status);
  console.log("Response headers:", response.headers);

  if (!response.ok) {
    throw new Error("Failed to fetch exercises");
  }

  const text = await response.text();
  console.log("Response body:", text); // ← This will show you what's actually returned

  if (!text) {
    return [];
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to parse exercises JSON:", text);
    throw new Error("Invalid JSON response from exercises API");
  }
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
