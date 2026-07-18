import React from "react";
import { StepProps } from "./stepProps";

import { WelcomeStep } from "./components/WelcomeStep";
import { NameStep } from "./components/NameStep";
import { GoalStep } from "./components/GoalStep";
import { SocialProofStep } from "./components/SocialProofStep";
import { GenderStep } from "./components/GenderStep";
import { BirthdayStep } from "./components/BirthdayStep";
import { HeightStep } from "./components/HeightStep";
import { WeightStep } from "./components/WeightStep";
import { ActivityStep } from "./components/ActivityStep";
import { ExperienceStep } from "./components/ExperienceStep";
import { GoalWeightStep } from "./components/GoalWeightStep";
import { ProgressChartStep } from "./components/ProgressChartStep";
import { ObstaclesStep } from "./components/ObstaclesStep";
import { LocationStep } from "./components/LocationStep";
import { EquipmentStep } from "./components/EquipmentStep";
import { TrainingDaysStep } from "./components/TrainingDaysStep";
import { TimeOfDayStep } from "./components/TimeOfDayStep";
import { SessionLengthStep } from "./components/SessionLengthStep";
import { CommitmentStep } from "./components/CommitmentStep";
import { HealthPermissionStep } from "./components/HealthPermissionStep";
import { NotificationsPermissionStep } from "./components/NotificationsPermissionStep";
// Temporarily hidden from the flow — keep the import/component for easy restore.
// import { FollowFoundersStep } from "./components/FollowFoundersStep";
import { RoutineIntroStep } from "./components/RoutineIntroStep";
import { RoutineBuilderStep } from "./components/RoutineBuilderStep";
import { GeneratingPlanStep } from "./components/GeneratingPlanStep";
import { PlanRevealStep } from "./components/PlanRevealStep";
import { StatsPreviewStep } from "./components/StatsPreviewStep";
import { UsernameStep } from "./components/UsernameStep";
import { ProfilePhotoStep } from "./components/ProfilePhotoStep";
import { AccountStep } from "./components/AccountStep";
// Temporarily hidden from the flow — keep the import/component for easy restore.
// import { ReferralStep } from "./components/ReferralStep";
import { PaywallStep } from "./components/PaywallStep";

/**
 * The full ("long") onboarding flow, vaulted 2026-07-06 while the short flow
 * below is live. To restore it, point STEP_COMPONENTS at this array. Keeping
 * it as a real, typechecked array (not a comment block) so the imports and
 * components can't rot while it's shelved.
 */
export const STEP_COMPONENTS_FULL: React.ComponentType<StepProps>[] = [
  WelcomeStep,
  NameStep,
  GoalStep,
  SocialProofStep,
  GenderStep,
  BirthdayStep,
  HeightStep,
  WeightStep,
  ActivityStep,
  ExperienceStep,
  GoalWeightStep,
  ProgressChartStep,
  ObstaclesStep,
  LocationStep,
  EquipmentStep,
  TrainingDaysStep,
  TimeOfDayStep,
  SessionLengthStep,
  CommitmentStep,
  HealthPermissionStep,
  NotificationsPermissionStep,
  // FollowFoundersStep — temporarily hidden; re-add here (and the import) to restore.
  RoutineIntroStep,
  RoutineBuilderStep,
  GeneratingPlanStep,
  PlanRevealStep,
  StatsPreviewStep,
  UsernameStep,
  ProfilePhotoStep,
  AccountStep,
  // ReferralStep — temporarily hidden; re-add here (and the import) to restore.
  PaywallStep,
];

/**
 * The ordered onboarding flow. Index === draft.step.
 *
 * Currently the short flow: essentials only (profile stats, goal weight,
 * projection, permissions, account, paywall). The intake steps that feed
 * routine generation (goals, experience, equipment, training days, splits,
 * routine builder) are skipped, so no routines are drafted or saved during
 * onboarding — users build routines in-app instead. AccountStep and
 * ProgressChartStep handle those missing draft fields.
 */
export const STEP_COMPONENTS: React.ComponentType<StepProps>[] = [
  WelcomeStep, // 0
  NameStep, // 1
  GenderStep, // 2
  BirthdayStep, // 3
  HeightStep, // 4
  WeightStep, // 5
  ActivityStep, // 6
  GoalWeightStep, // 7
  ProgressChartStep, // 8
  HealthPermissionStep, // 9
  NotificationsPermissionStep, // 10
  UsernameStep, // 11
  ProfilePhotoStep, // 12
  AccountStep, // 13
  PaywallStep, // 14
];
