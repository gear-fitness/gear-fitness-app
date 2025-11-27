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
