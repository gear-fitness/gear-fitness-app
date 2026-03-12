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
