/**
 * TypeScript types for API responses
 * These should match the backend DTOs
 */

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
}

export interface UserProfile {
  userId: string;
  username: string;
  email: string;
  weightLbs: number | null;
  heightInches: number | null;
  age: number | null;
  isPrivate: boolean;
  createdAt: string;
  workoutStats: WorkoutStats;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean | null;
}

export interface FollowerUser {
  userId: string;
  username: string;
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
  durationMin: number | null;
  bodyTag: string | null;
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
  bodyPart: string;
  position: number;
  note: string | null;
  sets: WorkoutSet[];
}

export interface WorkoutDetail {
  workoutId: string;
  name: string;
  datePerformed: string;
  durationMin: number | null;
  bodyTag: string | null;
  exercises: WorkoutExercise[];
}

export interface PersonalRecord {
  exerciseName: string;
  maxWeight: number;
  repsAtMaxWeight: number;
  dateAchieved: string | null;
  workoutName: string | null;
}
