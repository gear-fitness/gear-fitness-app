import {
  ActivityLevel,
  NutritionGoalIntensity,
  NutritionGoalType,
} from "../../../api/types";

/**
 * Client-side mirror of the server's auto-goal formula, used only for the live
 * preview in the nutrition setup wizard. The server (NutritionService
 * .applyAutoGoal) remains the source of truth: on save the wizard persists the
 * inputs and stores whatever the server computes. Keep the two in sync.
 *
 * Mifflin-St Jeor BMR x an activity factor, shifted by the cut/bulk choice,
 * protein-forward macro split.
 */

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
};

const CUT_OFFSETS: Record<NutritionGoalIntensity, number> = {
  SLOW: -250,
  MODERATE: -500,
  AGGRESSIVE: -750,
};

const BULK_OFFSETS: Record<NutritionGoalIntensity, number> = {
  SLOW: 150,
  MODERATE: 300,
  AGGRESSIVE: 500,
};

export interface GoalPlan {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export function goalOffset(
  goalType: NutritionGoalType,
  intensity: NutritionGoalIntensity,
): number {
  if (goalType === "CUT") return CUT_OFFSETS[intensity];
  if (goalType === "BULK") return BULK_OFFSETS[intensity];
  return 0;
}

export function computeGoalPlan(params: {
  heightInches: number | null;
  weightLbs: number | null;
  age: number | null;
  gender: string | null;
  activityLevel: ActivityLevel;
  goalType: NutritionGoalType;
  goalIntensity: NutritionGoalIntensity;
}): GoalPlan {
  const { heightInches, weightLbs, age, gender } = params;

  // Same fallback the server uses when the profile is incomplete.
  if (heightInches == null || weightLbs == null || age == null) {
    return { calories: 2000, proteinG: 150, fatG: 67, carbsG: 200 };
  }

  const weightKg = weightLbs / 2.2046;
  const heightCm = heightInches * 2.54;
  const g = gender?.trim().toLowerCase() ?? "";
  const sexOffset = g.startsWith("m") ? 5 : g.startsWith("f") ? -161 : -78;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + sexOffset;
  const tdee = bmr * ACTIVITY_FACTORS[params.activityLevel];

  const calories = Math.max(
    Math.round(tdee) + goalOffset(params.goalType, params.goalIntensity),
    1200,
  );
  const proteinG = Math.round(weightLbs * 1.0); // ~1 g per lb
  const fatG = Math.round((calories * 0.25) / 9.0); // 25% of kcal from fat
  const carbsG = Math.round(
    Math.max(calories - proteinG * 4 - fatG * 9, 0) / 4,
  );

  return { calories, proteinG, fatG, carbsG };
}
