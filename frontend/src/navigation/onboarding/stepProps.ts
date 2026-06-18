import { OnboardingDraft } from "./types";

/** Common contract every onboarding step component receives. */
export interface StepProps {
  draft: OnboardingDraft;
  updateDraft: (partial: Partial<OnboardingDraft>) => void;
  onNext: () => void;
  onBack: () => void;
  /** 0..1 position in the flow, for the progress bar. */
  progress: number;
  /** Welcome screen: open the dedicated "sign in to an existing account" screen. */
  onSignIn: () => void;
  /** Welcome screen: sign in an existing user with Google. */
  onGoogleSignIn: () => void;
  /** Account creation screen: sign up a new user with Google. */
  onGoogleSignUp: () => void;
  /** Welcome screen: sign in an existing user with Apple (iOS only). */
  onAppleSignIn: () => void;
  /** Account creation screen: sign up a new user with Apple (iOS only). */
  onAppleSignUp: () => void;
  isSigningIn: boolean;
  /** Final screen: complete onboarding and enter the app. */
  onFinish: () => void;
}
