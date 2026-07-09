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
  dailyActivity: number[];
}

// How active the user is day to day; drives the TDEE multiplier in the
// calorie calculator. Mirrors the onboarding ActivityStep options.
export type ActivityLevel = "sedentary" | "light" | "moderate" | "very_active";

export interface UserProfile {
  userId: string;
  username: string;
  displayName: string | null;
  gender: string | null;
  email: string;
  weightLbs: number | null;
  heightInches: number | null;
  age: number | null;
  // Calorie-calculator inputs (optional so profiles cached before these fields
  // existed still parse).
  activityLevel?: ActivityLevel | null;
  goalWeightLbs?: number | null;
  isPrivate: boolean;
  profilePictureUrl: string | null;
  createdAt: string;
  workoutStats: WorkoutStats;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean | null;
  followStatus?: "ACCEPTED" | "PENDING" | "BLOCKED" | "NONE" | null;
  // Subscription tier (authoritative, from the RevenueCat webhook). Optional so
  // profiles cached before this field existed still parse.
  tier?: "BASIC" | "PLUS";
}

export interface UsernameAvailabilityResponse {
  available: boolean;
  reason: string | null;
}

export interface FollowerUser {
  userId: string;
  username: string;
  displayName?: string | null;
  profilePictureUrl?: string | null;
  isFollowing: boolean;
  followStatus?: "ACCEPTED" | "PENDING" | "BLOCKED" | "NONE";
}

export interface SearchUserResult {
  userId: string;
  username: string;
  displayName: string | null;
  profilePictureUrl: string | null;
  currentUserFollows: boolean;
  followsCurrentUser: boolean;
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
  status: "PENDING" | "ACCEPTED";
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
  durationMin: number | null;
  exerciseCount: number;
  bodyTags: string[];
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

// Units of measure a food can be logged in. The backend only persists
// SERVING/GRAM (see ServingUnit); these richer units are a client-side concept
// resolved to grams when logging. `grams` is how much one of the unit weighs
// for the specific food it belongs to.
export type MeasureUnitKey = "serving" | "g" | "oz" | "cup" | "ml";

export interface MeasureUnit {
  key: MeasureUnitKey;
  label: string;
  grams: number;
}

export interface FoodItem {
  foodId: string;
  fdcId: number | null;
  description: string;
  brandOwner: string | null;
  // "CUSTOM" for user-created saved meals; USDA type strings otherwise.
  dataType: string | null;
  servingSize: number | null;
  servingUnit: string | null;
  householdServing: string | null;
  // Optional display nickname (custom foods only).
  nickname?: string | null;
  // Valid units of measure for this item (client-derived; see nutritionUnits).
  units?: MeasureUnit[];
  // Nutrient values are per 100 g.
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
}

export type ServingUnit = "SERVING" | "GRAM";

/**
 * The unit a logged entry is displayed/edited in. Persisted client-side
 * (AsyncStorage) keyed by entryId, since the backend only stores SERVING/GRAM.
 */
export interface EntryUnitMeta {
  unitKey: MeasureUnitKey;
  quantity: number;
  servingGrams: number;
  units?: MeasureUnit[];
}

export interface FoodLogEntry {
  entryId: string;
  foodId: string | null;
  // Free-text label for the client-side visual card this entry belongs to.
  category: string | null;
  description: string;
  quantity: number;
  unit: ServingUnit;
  // Consumed amounts (already scaled by quantity).
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  // Provenance for AI-logged entries: "AI_SONAR" | "AI_CACHE"; null for manual.
  sourceType?: string | null;
  sourceUrl?: string | null;
}

export type NutritionGoalType = "CUT" | "MAINTAIN" | "BULK";
export type NutritionGoalIntensity = "SLOW" | "MODERATE" | "AGGRESSIVE";

export interface NutritionGoal {
  calorieGoal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  isCustom: boolean;
  // Optional so responses from servers predating the setup wizard still parse
  // (an undefined setupComplete also never renders the wizard over the
  // tracker, which requires a strict false).
  goalType?: NutritionGoalType;
  goalIntensity?: NutritionGoalIntensity;
  setupComplete?: boolean;
}

export interface MacroTotals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface DaySummary {
  date: string;
  goal: NutritionGoal;
  totals: MacroTotals;
  entries: FoodLogEntry[];
}
