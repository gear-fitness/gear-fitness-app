import React from "react";
import { StepProps } from "./stepProps";

import { WelcomeStep } from "./components/WelcomeStep";
import { GoalStep } from "./components/GoalStep";
import { SocialProofStep } from "./components/SocialProofStep";
import { GenderStep } from "./components/GenderStep";
import { BirthdayStep } from "./components/BirthdayStep";
import { BodyMetricsStep } from "./components/BodyMetricsStep";
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
import { InjuriesStep } from "./components/InjuriesStep";
import { CommitmentStep } from "./components/CommitmentStep";
import { PermissionsStep } from "./components/PermissionsStep";
import { FollowFoundersStep } from "./components/FollowFoundersStep";
import { RoutineIntroStep } from "./components/RoutineIntroStep";
import { RoutineBuilderStep } from "./components/RoutineBuilderStep";
import { GeneratingPlanStep } from "./components/GeneratingPlanStep";
import { PlanRevealStep } from "./components/PlanRevealStep";
import { StatsPreviewStep } from "./components/StatsPreviewStep";
import { ProfileStep } from "./components/ProfileStep";
import { AccountStep } from "./components/AccountStep";
import { ReferralStep } from "./components/ReferralStep";
import { PaywallStep } from "./components/PaywallStep";

/** The ordered 30-screen onboarding flow. Index === draft.step. */
export const STEP_COMPONENTS: React.ComponentType<StepProps>[] = [
  WelcomeStep, // 0
  GoalStep, // 1
  SocialProofStep, // 2
  GenderStep, // 3
  BirthdayStep, // 4
  BodyMetricsStep, // 5
  ActivityStep, // 6
  ExperienceStep, // 7
  GoalWeightStep, // 8
  ProgressChartStep, // 9
  ObstaclesStep, // 10
  LocationStep, // 11
  EquipmentStep, // 12
  DaysPerWeekStep, // 13
  TrainingDaysStep, // 14
  TimeOfDayStep, // 15
  SessionLengthStep, // 16
  InjuriesStep, // 17
  CommitmentStep, // 18
  PermissionsStep, // 19
  FollowFoundersStep, // 20
  RoutineIntroStep, // 21
  RoutineBuilderStep, // 22
  GeneratingPlanStep, // 23
  PlanRevealStep, // 24
  StatsPreviewStep, // 25
  ProfileStep, // 26
  AccountStep, // 27
  ReferralStep, // 28
  PaywallStep, // 29
];
