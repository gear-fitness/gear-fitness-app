export type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5;

export type Gender = "male" | "female" | "non_binary" | "prefer_not_to_say";

export type HeightFtIn = { unit: "ft_in"; ft: number; inch: number };
export type HeightCm = { unit: "cm"; cm: number };
export type Height = HeightFtIn | HeightCm;

export type WeightLbs = { unit: "lbs"; value: number };
export type WeightKg = { unit: "kg"; value: number };
export type Weight = WeightLbs | WeightKg;

export interface DOB {
  year: number;
  month: number; // 0-indexed (0=Jan)
  day: number;   // 1-indexed
}

export interface OnboardingProfile {
  name?: string;
  username?: string;
  photoUri?: string;
}

export interface OnboardingPermissions {
  health?: boolean;
  location?: boolean;
  notifications?: boolean;
}

export interface OnboardingDraft {
  step: OnboardingStep;
  gender?: Gender;
  height?: Height;
  weight?: Weight;
  dob?: DOB;
  profile?: OnboardingProfile;
  permissions?: OnboardingPermissions;
  updatedAt: string;
}
