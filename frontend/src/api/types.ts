/**
 * TypeScript types for API responses
 * These should match the backend DTOs
 */

import { BodyPartDTO } from "./exerciseService";

export interface WorkoutStats {
  totalWorkouts: number;
  workoutsThisWeek: number;
  weeklySplit: {
    Mon: number;
    Tue: number;
    Wed: number;
    Thu: number;
    Fri: number;
    Sat: number;
    Sun: number;
  };
  workoutStreak: number;
  workoutDaysCurrentWeek: number;
}

export interface UserProfile {
  userId: string;
  username: string;
  displayName: string | null;
  gender: string | null;
  email: string;
  weightLbs: number | null;
  heightInches: number | null;
  age: number | null;
  isPrivate: boolean;
  profilePictureUrl: string | null;
  createdAt: string;
  workoutStats: WorkoutStats;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean | null;
}

export interface UsernameAvailabilityResponse {
  available: boolean;
  reason: string | null;
}

export interface FollowerUser {
  userId: string;
  username: string;
  profilePictureUrl?: string | null;
}

export interface FollowersResponse {
  followers: FollowerUser[];
}

export interface FollowingResponse {
  following: FollowerUser[];
}

export interface FollowStatusResponse {
  isFollowing: boolean;
}

export interface FollowResponse {
  followeeId: string;
  followeeUsername: string;
  status: "pending" | "accepted";
  message: string;
}

export interface WeeklyVolumeData {
  weekStartDate: string;
  weekEndDate: string;
  totalVolumeLbs: number;
  workoutCount: number;
}

export interface DailyVolumeData {
  date: string;
  totalVolumeLbs: number;
  workoutCount: number;
}

export interface Workout {
  workoutId: string;
  name: string;
  datePerformed: string;
  createdAt: string;
}

export interface WorkoutSet {
  workoutSetId: string;
  setNumber: number;
  reps: number;
  weightLbs: number | null;
  isPr: boolean;
}

export interface WorkoutExercise {
  workoutExerciseId: string;
  exerciseName: string;
  bodyParts: BodyPartDTO[];
  position: number;
  note: string | null;
  sets: WorkoutSet[];
}

export interface WorkoutDetail {
  workoutId: string;
  name: string;
  datePerformed: string;
  durationMin: number | null;
  bodyTags: string[];
  exercises: WorkoutExercise[];
}

export interface PersonalRecord {
  exerciseName: string;
  maxWeight: number;
  repsAtMaxWeight: number;
  dateAchieved: string | null;
  workoutName: string | null;
}

export interface RoutineExercise {
  routineExerciseId: string;
  exerciseName: string;
  bodyParts: BodyPartDTO[];
  position: number;
  exerciseId: string;
}

export interface Routine {
  routineId: string;
  name: string;
  scheduledDays: string[];
  exercises: RoutineExercise[];
}
