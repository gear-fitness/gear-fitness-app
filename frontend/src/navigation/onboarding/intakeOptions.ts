import {
  ActivityLevel,
  EquipmentOption,
  ExperienceLevel,
  FitnessGoal,
  Injury,
  Obstacle,
  SessionLength,
  TimeOfDay,
  TrainingDay,
  TrainingLocation,
} from "./types";

export const GOAL_OPTIONS: {
  value: FitnessGoal;
  label: string;
  hint: string;
  emoji: string;
}[] = [
  {
    value: "lose_fat",
    label: "Lose fat",
    hint: "Lean out while keeping your strength",
    emoji: "🔥",
  },
  {
    value: "build_muscle",
    label: "Build muscle",
    hint: "Add size and get stronger",
    emoji: "💪",
  },
  {
    value: "improve_performance",
    label: "Improve performance",
    hint: "Train for sport, speed, and power",
    emoji: "⚡",
  },
  {
    value: "general_health",
    label: "General health",
    hint: "Feel better, move better, live better",
    emoji: "❤️",
  },
];

export const GOAL_LABELS: Record<FitnessGoal, string> = {
  lose_fat: "lose fat",
  build_muscle: "build muscle",
  improve_performance: "improve performance",
  general_health: "improve your health",
};

export const ACTIVITY_OPTIONS: {
  value: ActivityLevel;
  label: string;
  hint: string;
}[] = [
  {
    value: "sedentary",
    label: "Mostly sedentary",
    hint: "Desk job, little exercise",
  },
  {
    value: "light",
    label: "Lightly active",
    hint: "Walks or light exercise 1–2 times a week",
  },
  {
    value: "moderate",
    label: "Moderately active",
    hint: "On your feet often, regular exercise",
  },
  {
    value: "very_active",
    label: "Very active",
    hint: "Physical job or training most days",
  },
];

export const EXPERIENCE_OPTIONS: {
  value: ExperienceLevel;
  label: string;
  hint: string;
}[] = [
  {
    value: "beginner",
    label: "Just getting started",
    hint: "Less than a year of lifting",
  },
  {
    value: "intermediate",
    label: "Comfortable in the gym",
    hint: "1–3 years of consistent training",
  },
  {
    value: "advanced",
    label: "Experienced lifter",
    hint: "3+ years, I know my way around",
  },
];

export const OBSTACLE_OPTIONS: {
  value: Obstacle;
  label: string;
  emoji: string;
}[] = [
  { value: "consistency", label: "Staying consistent", emoji: "📆" },
  { value: "time", label: "Finding the time", emoji: "⏰" },
  { value: "motivation", label: "Staying motivated", emoji: "🔋" },
  { value: "knowledge", label: "Knowing what to do", emoji: "🧭" },
  { value: "plateaus", label: "Hitting plateaus", emoji: "📉" },
  { value: "support", label: "No one to train with", emoji: "👥" },
];

export const LOCATION_OPTIONS: {
  value: TrainingLocation;
  label: string;
  hint: string;
  emoji: string;
}[] = [
  {
    value: "gym",
    label: "At the gym",
    hint: "Full access to racks and machines",
    emoji: "🏋️",
  },
  {
    value: "home",
    label: "At home",
    hint: "Train with what you have",
    emoji: "🏠",
  },
  {
    value: "both",
    label: "A mix of both",
    hint: "Flexible between gym and home",
    emoji: "🔁",
  },
];

export const EQUIPMENT_OPTIONS: {
  value: EquipmentOption;
  label: string;
}[] = [
  { value: "full_gym", label: "Full gym access" },
  { value: "dumbbells", label: "Dumbbells" },
  { value: "barbell", label: "Barbell & plates" },
  { value: "machines", label: "Machines & cables" },
  { value: "bands", label: "Resistance bands" },
  { value: "bodyweight", label: "Just my bodyweight" },
];

export const TIME_OF_DAY_OPTIONS: {
  value: TimeOfDay;
  label: string;
  hint: string;
  emoji: string;
}[] = [
  {
    value: "morning",
    label: "Morning",
    hint: "Before the day gets busy",
    emoji: "🌅",
  },
  {
    value: "midday",
    label: "Midday",
    hint: "Lunch-break sessions",
    emoji: "☀️",
  },
  {
    value: "evening",
    label: "Evening",
    hint: "After work or school",
    emoji: "🌙",
  },
  {
    value: "varies",
    label: "It varies",
    hint: "Whenever I can fit it in",
    emoji: "🔀",
  },
];

export const SESSION_LENGTH_OPTIONS: {
  value: SessionLength;
  label: string;
  hint: string;
}[] = [
  { value: 30, label: "30 minutes", hint: "Quick and focused" },
  { value: 45, label: "45 minutes", hint: "The sweet spot" },
  { value: 60, label: "60 minutes", hint: "A full session" },
  { value: 90, label: "90+ minutes", hint: "I take my time" },
];

export const INJURY_OPTIONS: {
  value: Injury;
  label: string;
}[] = [
  { value: "none", label: "No limitations" },
  { value: "lower_back", label: "Lower back" },
  { value: "knees", label: "Knees" },
  { value: "shoulders", label: "Shoulders" },
  { value: "wrists", label: "Wrists or elbows" },
  { value: "neck", label: "Neck" },
  { value: "other", label: "Something else" },
];

export const TRAINING_DAY_OPTIONS: {
  value: TrainingDay;
  label: string;
}[] = [
  { value: "MON", label: "Monday" },
  { value: "TUE", label: "Tuesday" },
  { value: "WED", label: "Wednesday" },
  { value: "THU", label: "Thursday" },
  { value: "FRI", label: "Friday" },
  { value: "SAT", label: "Saturday" },
  { value: "SUN", label: "Sunday" },
];

/** Headline stat for the social-proof screen. Marketing-owned number —
 *  update here when the real cohort stat is available. */
export const GOAL_SUCCESS_STAT_PCT = 87;
