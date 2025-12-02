/**
 * Workout service
 * API calls for workout-related data
 */

import { getAuthHeader } from "../utils/auth";
import {
  WeeklyVolumeData,
  Workout,
  WorkoutDetail,
  PersonalRecord,
} from "./types";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

/**
 * Get weekly volume data for a user
 */
export async function getWeeklyVolume(
  userId: string,
  weeks: number = 8
): Promise<WeeklyVolumeData[]> {
  const authHeader = await getAuthHeader();

  const response = await fetch(
    `${API_BASE_URL}/api/workouts/user/${userId}/weekly-volume?weeks=${weeks}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch weekly volume: ${errorText}`);
  }

  return response.json();
}

/**
 * Get all workouts for a user
 */
export async function getUserWorkouts(userId: string): Promise<Workout[]> {
  const authHeader = await getAuthHeader();

  const response = await fetch(
    `${API_BASE_URL}/api/workouts/user/${userId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch workouts: ${errorText}`);
  }

  return response.json();
}

/**
 * Get detailed workout by ID
 */
export async function getWorkoutDetails(
  workoutId: string
): Promise<WorkoutDetail> {
  const authHeader = await getAuthHeader();

  const response = await fetch(`${API_BASE_URL}/api/workouts/${workoutId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch workout details: ${errorText}`);
  }

  return response.json();
}

/**
 * Get personal records for a user
 */
export async function getUserPersonalRecords(
  userId: string
): Promise<PersonalRecord[]> {
  const authHeader = await getAuthHeader();

  const response = await fetch(
    `${API_BASE_URL}/api/personal-records/user/${userId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch personal records: ${errorText}`);
  }

  return response.json();
}
