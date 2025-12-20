/**
 * Workout service
 * API calls for workout-related data
 */

import { getAuthHeader } from "../utils/auth";
import {
  DailyVolumeData,
  WeeklyVolumeData,
  Workout,
  WorkoutDetail,
  PersonalRecord,
} from "./types";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export interface WorkoutSubmission {
  name: string;
  durationMin: number;
  bodyTags: string[];
  exercises: ExerciseSubmission[];
  createPost?: boolean;
  caption?: string;
  imageUrl?: string;
}

export interface ExerciseSubmission {
  exerciseId: string;
  note?: string;
  sets: SetSubmission[];
}

export interface SetSubmission {
  reps: string;
  weight: string;
}

export interface WorkoutDetailResponse {
  workoutId: string;
  name: string;
  datePerformed: string;
  durationMin: number;
  bodyTag: string;
  exercises: Array<{
    workoutExerciseId: string;
    exerciseName: string;
    bodyPart: string;
    position: number;
    note: string;
    sets: Array<{
      workoutSetId: string;
      setNumber: number;
      reps: number;
      weightLbs: string;
      isPr: boolean;
    }>;
  }>;
}

export async function submitWorkout(
  submission: WorkoutSubmission
): Promise<WorkoutDetailResponse> {
  const authHeader = await getAuthHeader();

  const response = await fetch(`${API_BASE_URL}/api/workouts/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
    },
    body: JSON.stringify(submission),
  });

  if (!response.ok) {
    throw new Error("Failed to submit workout");
  }

  return response.json();
}

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
 * Get daily volume data for a user
 */
export async function getDailyVolume(
  userId: string,
  weeks: number = 2,
  weekStartDay: string = 'SUNDAY'
): Promise<DailyVolumeData[]> {
  const authHeader = await getAuthHeader();

  const response = await fetch(
    `${API_BASE_URL}/api/workouts/user/${userId}/daily-volume?weeks=${weeks}&weekStartDay=${weekStartDay}`,
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
    throw new Error(`Failed to fetch daily volume: ${errorText}`);
  }

  return response.json();
}

/**
 * Get all workouts for a user
 */
export async function getUserWorkouts(userId: string): Promise<Workout[]> {
  const authHeader = await getAuthHeader();

  const response = await fetch(`${API_BASE_URL}/api/workouts/user/${userId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
    },
  });

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
