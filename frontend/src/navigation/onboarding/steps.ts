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

/** The ordered onboarding flow. Index === draft.step. */
export const STEP_COMPONENTS: React.ComponentType<StepProps>[] = [
  WelcomeStep, // 0
  NameStep, // 1
  GoalStep, // 2
  SocialProofStep, // 3
  GenderStep, // 4
  BirthdayStep, // 5
  HeightStep, // 6
  WeightStep, // 7
  ActivityStep, // 8
  ExperienceStep, // 9
  GoalWeightStep, // 10
  ProgressChartStep, // 11
  ObstaclesStep, // 12
  LocationStep, // 13
  EquipmentStep, // 14
  TrainingDaysStep, // 15
  TimeOfDayStep, // 16
  SessionLengthStep, // 17
  CommitmentStep, // 18
  HealthPermissionStep, // 19
  NotificationsPermissionStep, // 20
  // FollowFoundersStep — temporarily hidden; re-add here (and the import) to restore.
  RoutineIntroStep, // 21
  RoutineBuilderStep, // 22
  GeneratingPlanStep, // 23
  PlanRevealStep, // 24
  StatsPreviewStep, // 25
  UsernameStep, // 26
  ProfilePhotoStep, // 27
  AccountStep, // 28
  // ReferralStep — temporarily hidden; re-add here (and the import) to restore.
  PaywallStep, // 29
];
