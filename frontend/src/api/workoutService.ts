/**
 * Workout service
 * API calls for workout-related data
 */

import apiClient from "./apiClient";
import { BodyPartDTO } from "./exerciseService";
import {
  DailyVolumeData,
  WeeklyVolumeData,
  Workout,
  WorkoutDetail,
  PersonalRecord,
} from "./types";
import { getCurrentLocalDateString } from "../utils/date";

export interface WorkoutSubmission {
  name: string;
  durationMin: number;
  datePerformed?: string; // Optional - date in YYYY-MM-DD format
  bodyTags: string[];
  exercises: ExerciseSubmission[];
  createPost?: boolean;
  caption?: string;
  imageUrl?: string;
  photoUrls?: string[];
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
  bodyTags: string[];
  exercises: Array<{
    workoutExerciseId: string;
    exerciseName: string;
    bodyParts: BodyPartDTO[];
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
  photoUrls: string[];
}

export async function submitWorkout(
  submission: WorkoutSubmission,
): Promise<WorkoutDetailResponse> {
  const { data } = await apiClient.post("/workouts/submit", submission);
  return data;
}

/**
 * Upload a single workout photo to S3. Returns the public S3 URL.
 */
export async function uploadWorkoutPhoto(
  imageUri: string,
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", {
    uri: imageUri,
    type: "image/jpeg",
    name: "workout-photo.jpg",
  } as any);

  const { data } = await apiClient.post("/workouts/photos", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

/**
 * Get weekly volume data for a user
 */
export async function getWeeklyVolume(
  userId: string,
  weeks: number = 8,
): Promise<WeeklyVolumeData[]> {
  const { data } = await apiClient.get(
    `/workouts/user/${userId}/weekly-volume`,
    {
      params: { weeks, localDate: getCurrentLocalDateString() },
    },
  );
  return data;
}

/**
 * Get daily volume data for a user
 */
export async function getDailyVolume(
  userId: string,
  weeks: number = 2,
  weekStartDay: string = "SUNDAY",
): Promise<DailyVolumeData[]> {
  const { data } = await apiClient.get(
    `/workouts/user/${userId}/daily-volume`,
    {
      params: { weeks, weekStartDay, localDate: getCurrentLocalDateString() },
    },
  );
  return data;
}

/**
 * Get all workouts for a user
 */
export async function getUserWorkouts(userId: string): Promise<Workout[]> {
  const { data } = await apiClient.get(`/workouts/user/${userId}`);
  return data;
}

/**
 * Get detailed workout by ID
 */
export async function getWorkoutDetails(
  workoutId: string,
): Promise<WorkoutDetail> {
  const { data } = await apiClient.get(`/workouts/${workoutId}`);
  return data;
}

/**
 * Get personal records for a user
 */
export async function getUserPersonalRecords(
  userId: string,
): Promise<PersonalRecord[]> {
  const { data } = await apiClient.get(`/personal-records/user/${userId}`);
  return data;
}

/**
 * Delete a workout by ID
 */
export async function deleteWorkout(workoutId: string): Promise<void> {
  await apiClient.delete(`/workouts/${workoutId}`);
}
