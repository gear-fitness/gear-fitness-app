import { OnboardingDraft } from "./types";

/** Common contract every onboarding step component receives. */
export interface StepProps {
  draft: OnboardingDraft;
  updateDraft: (partial: Partial<OnboardingDraft>) => void;
  onNext: () => void;
  onBack: () => void;
  /** 0..1 position in the flow, for the progress bar. */
  progress: number;
  /** Welcome screen: sign in an existing user with Google. */
  onGoogleSignIn: () => void;
  /** Account creation screen: sign up a new user with Google. */
  onGoogleSignUp: () => void;
  isSigningIn: boolean;
  /** Final screen: complete onboarding and enter the app. */
  onFinish: () => void;
}
