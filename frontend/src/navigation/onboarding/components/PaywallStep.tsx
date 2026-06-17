import React from "react";
import { StepProps } from "../stepProps";
import { OnboardingTopBar } from "./OnboardingTopBar";
import { PaywallContent } from "./PaywallContent";

// Onboarding's final step. The paywall UI + purchase flow live in the shared
// PaywallContent (also used by the standalone Paywall modal); here we just
// supply the onboarding top bar and complete onboarding when the user is done.
export function PaywallStep({ onFinish, onBack, progress }: StepProps) {
  return (
    <PaywallContent
      header={<OnboardingTopBar progress={progress} onBack={onBack} />}
      onDone={onFinish}
    />
  );
}
