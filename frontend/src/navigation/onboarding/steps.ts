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
import { DaysPerWeekStep } from "./components/DaysPerWeekStep";
import { TrainingDaysStep } from "./components/TrainingDaysStep";
import { TimeOfDayStep } from "./components/TimeOfDayStep";
import { SessionLengthStep } from "./components/SessionLengthStep";
import { CommitmentStep } from "./components/CommitmentStep";
import { HealthPermissionStep } from "./components/HealthPermissionStep";
import { NotificationsPermissionStep } from "./components/NotificationsPermissionStep";
import { FollowFoundersStep } from "./components/FollowFoundersStep";
import { RoutineIntroStep } from "./components/RoutineIntroStep";
import { RoutineBuilderStep } from "./components/RoutineBuilderStep";
import { GeneratingPlanStep } from "./components/GeneratingPlanStep";
import { PlanRevealStep } from "./components/PlanRevealStep";
import { StatsPreviewStep } from "./components/StatsPreviewStep";
import { UsernameStep } from "./components/UsernameStep";
import { ProfilePhotoStep } from "./components/ProfilePhotoStep";
import { AccountStep } from "./components/AccountStep";
import { ReferralStep } from "./components/ReferralStep";
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
  DaysPerWeekStep, // 15
  TrainingDaysStep, // 16
  TimeOfDayStep, // 17
  SessionLengthStep, // 18
  CommitmentStep, // 19
  HealthPermissionStep, // 20
  NotificationsPermissionStep, // 21
  FollowFoundersStep, // 22
  RoutineIntroStep, // 23
  RoutineBuilderStep, // 24
  GeneratingPlanStep, // 25
  PlanRevealStep, // 26
  StatsPreviewStep, // 27
  UsernameStep, // 28
  ProfilePhotoStep, // 29
  AccountStep, // 30
  ReferralStep, // 31
  PaywallStep, // 32
];
