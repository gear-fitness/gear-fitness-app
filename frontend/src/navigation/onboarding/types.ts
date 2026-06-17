export type OnboardingStep = number;

export const TOTAL_STEPS = 30;

export type Gender =
  | "male"
  | "female"
  | "other"
  | "non_binary"
  | "prefer_not_to_say";

export type HeightFtIn = { unit: "ft_in"; ft: number; inch: number };
export type HeightCm = { unit: "cm"; cm: number };
export type Height = HeightFtIn | HeightCm;

export type WeightLbs = { unit: "lbs"; value: number };
export type WeightKg = { unit: "kg"; value: number };
export type Weight = WeightLbs | WeightKg;

export interface DOB {
  year: number;
  month: number; // 0-indexed (0=Jan)
  day: number; // 1-indexed
}

export type FitnessGoal =
  | "lose_fat"
  | "build_muscle"
  | "improve_performance"
  | "improve_endurance"
  | "general_health"
  | "other";

export type ActivityLevel = "sedentary" | "light" | "moderate" | "very_active";

export type RoutineSplit =
  | "full_body"
  | "upper_lower"
  | "push_pull_legs"
  | "anterior_posterior"
  | "auto";

export type ExperienceLevel =
  | "none"
  | "beginner"
  | "intermediate"
  | "advanced";

export type TrainingLocation = "gym" | "home" | "both" | "other";

export type EquipmentOption =
  | "full_gym"
  | "dumbbells"
  | "barbell"
  | "machines"
  | "bands"
  | "bodyweight";

export type Obstacle =
  | "consistency"
  | "time"
  | "motivation"
  | "knowledge"
  | "plateaus"
  | "support";

export type TimeOfDay = "morning" | "midday" | "evening" | "varies";

export type SessionLength = 30 | 45 | 60 | 90;

export type Injury =
  | "none"
  | "lower_back"
  | "knees"
  | "shoulders"
  | "wrists"
  | "neck"
  | "other";

export type TrainingDay = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

export interface OnboardingProfile {
  name?: string;
  username?: string;
  photoUri?: string;
}

export interface OnboardingPermissions {
  health?: boolean;
  notifications?: boolean;
}

/** A routine drafted during onboarding, before the account exists.
 *  Exercises are referenced by catalog name and resolved to real
 *  exerciseIds (creating missing ones) right after sign-up. */
export interface DraftRoutineExercise {
  name: string;
  bodyParts: { bodyPart: string; targetType: "PRIMARY" | "SECONDARY" }[];
}

export interface DraftRoutine {
  name: string;
  scheduledDays: TrainingDay[];
  exercises: DraftRoutineExercise[];
}

export interface OnboardingDraft {
  step: OnboardingStep;
  gender?: Gender;
  height?: Height;
  weight?: Weight;
  dob?: DOB;
  goals?: FitnessGoal[];
  split?: RoutineSplit;
  activityLevel?: ActivityLevel;
  experience?: ExperienceLevel;
  goalWeight?: Weight;
  obstacles?: Obstacle[];
  trainingLocation?: TrainingLocation;
  equipment?: EquipmentOption[];
  daysPerWeek?: number;
  trainingDays?: TrainingDay[];
  timeOfDay?: TimeOfDay;
  sessionLength?: SessionLength;
  injuries?: Injury[];
  profile?: OnboardingProfile;
  permissions?: OnboardingPermissions;
  /** Usernames queued to follow once the account exists. */
  pendingFollows?: string[];
  routines?: DraftRoutine[];
  referralSent?: boolean;
  updatedAt: string;
}
