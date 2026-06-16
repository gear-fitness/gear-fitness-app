import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { View, StyleSheet, Alert, Appearance } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CommonActions, useNavigation } from "@react-navigation/native";
import {
  GoogleSignin,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";

import { OnboardingDraft, OnboardingStep } from "../onboarding/types";
import {
  clearOnboardingDraft,
  saveOnboardingDraft,
  loadOnboardingDraft,
  markOnboardingSeen,
} from "../onboarding/storage";
import {
  AuthApiError,
  AppleAuthIntent,
  GoogleAuthIntent,
  loginWithApple,
  loginWithGoogle,
} from "../../api/authService";
import { useAuth } from "../../context/AuthContext";
import { useOnboardingColors } from "../onboarding/components/useOnboardingColors";
import { useTrackTab } from "../../hooks/useTrackTab";
import { StepProps } from "../onboarding/stepProps";
import { STEP_COMPONENTS } from "../onboarding/steps";
import { runPostSignupSync } from "../onboarding/onboardingSync";
import { TesterSkipButton } from "../onboarding/components/TesterSkipButton";
import { TesterBackButton } from "../onboarding/components/TesterBackButton";

const initialBg =
  Appearance.getColorScheme() === "dark" ? "#0a0a0a" : "#fafafa";

const LAST_STEP = STEP_COMPONENTS.length - 1;

const defaultDraft = (): OnboardingDraft => ({
  step: 0,
  updatedAt: new Date().toISOString(),
});

export function OnboardingScreen() {
  const navigation = useNavigation();
  const { login, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();
  const colors = useOnboardingColors();
  useTrackTab("Onboarding");

  const [draft, setDraft] = useState<OnboardingDraft>(defaultDraft());
  const [hydrated, setHydrated] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Hydrate saved draft on mount ───────────────────────────
  useEffect(() => {
    loadOnboardingDraft()
      .then((saved) => {
        if (saved) setDraft(saved);
        setHydrated(true);
      })
      .catch(() => setHydrated(true));
  }, []);

  // ─── Debounced persist ──────────────────────────────────────
  const persistDraft = useCallback(
    (updated: OnboardingDraft) => {
      if (!hydrated) return;
      const stamped = { ...updated, updatedAt: new Date().toISOString() };
      if (persistTimer.current) clearTimeout(persistTimer.current);
      persistTimer.current = setTimeout(() => {
        saveOnboardingDraft(stamped);
      }, 600);
    },
    [hydrated],
  );

  const updateDraft = useCallback(
    (partial: Partial<OnboardingDraft>) => {
      setDraft((prev) => {
        const next = {
          ...prev,
          ...partial,
          updatedAt: new Date().toISOString(),
        };
        persistDraft(next);
        return next;
      });
    },
    [persistDraft],
  );

  // ─── Step navigation ─────────────────────────────────────────
  const goTo = useCallback(
    (step: OnboardingStep) => updateDraft({ step }),
    [updateDraft],
  );
  const goBack = useCallback(
    () => goTo(Math.max(0, draft.step - 1)),
    [goTo, draft.step],
  );
  const goNext = useCallback(
    () => goTo(Math.min(LAST_STEP, draft.step + 1)),
    [goTo, draft.step],
  );

  const completeOnboarding = useCallback(async () => {
    await markOnboardingSeen();
    await clearOnboardingDraft();
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: "HomeTabs" }] }),
    );
  }, [navigation]);

  const handleGoogleAuth = useCallback(
    async (intent: GoogleAuthIntent) => {
      if (isSigningIn) return;
      setIsSigningIn(true);
      try {
        const response = await GoogleSignin.signIn();
        if (isSuccessResponse(response)) {
          const { idToken } = response.data;
          if (!idToken) throw new Error("No ID token received from Google");

          const result = await loginWithGoogle(idToken, intent);

          // Soft-deleted account: offer to restore rather than failing.
          if (result.accountPendingDeletion) {
            setIsSigningIn(false); // release the lock so the prompt can re-engage
            Alert.alert(
              "Restore account?",
              "This account is scheduled for deletion. Would you like to restore it?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Restore",
                  onPress: async () => {
                    setIsSigningIn(true);
                    try {
                      const restored = await loginWithGoogle(
                        idToken,
                        "sign_in",
                        true,
                      );
                      if (!restored.token || !restored.refreshToken) {
                        throw new Error("Missing tokens in restore response");
                      }
                      await login(restored.token, restored.refreshToken);
                      await completeOnboarding();
                    } catch (err) {
                      console.error("Google restore failed:", err);
                      Alert.alert(
                        "Couldn't restore account",
                        "Please try signing in again.",
                      );
                    } finally {
                      setIsSigningIn(false);
                    }
                  },
                },
              ],
            );
            return;
          }

          if (!result.token || !result.refreshToken) {
            throw new Error("Google sign-in did not return valid session tokens");
          }
          await login(result.token, result.refreshToken);

          if (intent === "sign_up") {
            // Persist everything collected so far, then continue the flow
            // (referral → paywall) rather than dropping into the app.
            await runPostSignupSync(draft, refreshUser);
            goNext();
          } else {
            // Returning user signing in — straight into the app.
            await completeOnboarding();
          }
        }
      } catch (error: any) {
        if (error instanceof AuthApiError) {
          if (intent === "sign_in" && error.code === "ACCOUNT_NOT_FOUND") {
            Alert.alert(
              "Account Not Found",
              "No account exists for this Google account. Tap Get Started to create one.",
              [{ text: "OK", onPress: () => goTo(0) }],
            );
            return;
          }
          if (intent === "sign_up" && error.code === "ACCOUNT_ALREADY_EXISTS") {
            Alert.alert(
              "Account Already Exists",
              "An account already exists for this Google account. Would you like to sign in?",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Sign In", onPress: () => handleGoogleAuth("sign_in") },
              ],
            );
            return;
          }
        }
        console.error("Sign-in error during onboarding:", error);
        Alert.alert(
          "Sign-in Failed",
          "Something went wrong signing in with Google. Please try again.",
          [{ text: "OK" }],
        );
      } finally {
        setIsSigningIn(false);
      }
    },
    [isSigningIn, login, draft, refreshUser, goNext, goTo, completeOnboarding],
  );

  const handleAppleAuth = useCallback(
    async (intent: AppleAuthIntent) => {
      if (isSigningIn) return;
      setIsSigningIn(true);
      try {
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });
        if (!credential.identityToken) {
          throw new Error("No identity token received from Apple");
        }

        const result = await loginWithApple({
          identityToken: credential.identityToken,
          appleUserId: credential.user,
          email: credential.email,
          firstName: credential.fullName?.givenName,
          lastName: credential.fullName?.familyName,
          intent,
        });

        // Soft-deleted account: offer to restore rather than failing.
        if (result.accountPendingDeletion) {
          setIsSigningIn(false); // release the lock so the prompt can re-engage
          Alert.alert(
            "Restore account?",
            "This account is scheduled for deletion. Would you like to restore it?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Restore",
                onPress: async () => {
                  setIsSigningIn(true);
                  try {
                    const restored = await loginWithApple({
                      identityToken: credential.identityToken!,
                      appleUserId: credential.user,
                      intent: "sign_in",
                      confirmRestore: true,
                    });
                    if (!restored.token || !restored.refreshToken) {
                      throw new Error("Missing tokens in restore response");
                    }
                    await login(restored.token, restored.refreshToken);
                    await completeOnboarding();
                  } catch (err) {
                    console.error("Apple restore failed:", err);
                    Alert.alert(
                      "Couldn't restore account",
                      "Please try signing in again.",
                    );
                  } finally {
                    setIsSigningIn(false);
                  }
                },
              },
            ],
          );
          return;
        }

        // Email already used by another provider: offer to link this Apple ID.
        if (result.accountExistsForLinking) {
          setIsSigningIn(false);
          const providerLabel =
            result.existingProvider === "google"
              ? "Google"
              : "another provider";
          Alert.alert(
            "Account exists",
            `An account already exists for this email via ${providerLabel}. Link your Apple ID to that account?`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Link",
                onPress: async () => {
                  setIsSigningIn(true);
                  try {
                    const linked = await loginWithApple({
                      identityToken: credential.identityToken!,
                      appleUserId: credential.user,
                      email: credential.email,
                      firstName: credential.fullName?.givenName,
                      lastName: credential.fullName?.familyName,
                      intent,
                      confirmLink: true,
                    });
                    if (!linked.token || !linked.refreshToken) {
                      throw new Error("Missing tokens in link response");
                    }
                    await login(linked.token, linked.refreshToken);
                    // Attaching to an existing account — keep its profile,
                    // don't sync the onboarding draft over it.
                    await completeOnboarding();
                  } catch (err) {
                    console.error("Apple linking failed:", err);
                    Alert.alert(
                      "Couldn't link account",
                      "Please try signing in again.",
                    );
                  } finally {
                    setIsSigningIn(false);
                  }
                },
              },
            ],
          );
          return;
        }

        if (!result.token || !result.refreshToken) {
          throw new Error("Apple sign-in did not return valid session tokens");
        }
        await login(result.token, result.refreshToken);

        if (intent === "sign_up") {
          // Persist everything collected so far, then continue the flow
          // (referral → paywall) rather than dropping into the app.
          await runPostSignupSync(draft, refreshUser);
          goNext();
        } else {
          // Returning user signing in — straight into the app.
          await completeOnboarding();
        }
      } catch (error: any) {
        // User dismissed the native Apple sheet — nothing to surface.
        if (error?.code === "ERR_REQUEST_CANCELED") {
          return;
        }
        if (error instanceof AuthApiError) {
          if (intent === "sign_in" && error.code === "ACCOUNT_NOT_FOUND") {
            Alert.alert(
              "Account Not Found",
              "No account exists for this Apple ID. Tap Get Started to create one.",
              [{ text: "OK", onPress: () => goTo(0) }],
            );
            return;
          }
          if (intent === "sign_up" && error.code === "ACCOUNT_ALREADY_EXISTS") {
            Alert.alert(
              "Account Already Exists",
              "An account already exists for this Apple ID. Would you like to sign in?",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Sign In", onPress: () => handleAppleAuth("sign_in") },
              ],
            );
            return;
          }
        }
        console.error("Apple sign-in error during onboarding:", error);
        Alert.alert(
          "Sign-in Failed",
          "Something went wrong signing in with Apple. Please try again.",
          [{ text: "OK" }],
        );
      } finally {
        setIsSigningIn(false);
      }
    },
    [isSigningIn, login, draft, refreshUser, goNext, goTo, completeOnboarding],
  );

  const onGoogleSignIn = useCallback(
    () => handleGoogleAuth("sign_in"),
    [handleGoogleAuth],
  );
  const onGoogleSignUp = useCallback(
    () => handleGoogleAuth("sign_up"),
    [handleGoogleAuth],
  );
  const onAppleSignIn = useCallback(
    () => handleAppleAuth("sign_in"),
    [handleAppleAuth],
  );
  const onAppleSignUp = useCallback(
    () => handleAppleAuth("sign_up"),
    [handleAppleAuth],
  );

  // TESTING ONLY — advance past the current screen. On the final screen it
  // finishes onboarding. Remove together with TesterSkipButton before release.
  const onTesterSkip = useCallback(() => {
    if (draft.step >= LAST_STEP) {
      completeOnboarding();
    } else {
      goNext();
    }
  }, [draft.step, goNext, completeOnboarding]);

  const stepProps: StepProps = useMemo(
    () => ({
      draft,
      updateDraft,
      onNext: goNext,
      onBack: goBack,
      progress: LAST_STEP === 0 ? 1 : draft.step / LAST_STEP,
      onGoogleSignIn,
      onGoogleSignUp,
      onAppleSignIn,
      onAppleSignUp,
      isSigningIn,
      onFinish: completeOnboarding,
    }),
    [
      draft,
      updateDraft,
      goNext,
      goBack,
      onGoogleSignIn,
      onGoogleSignUp,
      onAppleSignIn,
      onAppleSignUp,
      isSigningIn,
      completeOnboarding,
    ],
  );

  if (!hydrated) return null;

  const safeStep = Math.min(Math.max(0, draft.step), LAST_STEP);
  const CurrentStep = STEP_COMPONENTS[safeStep];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.screenBg ?? initialBg,
          paddingTop: insets.top,
        },
      ]}
    >
      <CurrentStep {...stepProps} />
      <TesterBackButton onBack={goBack} />
      <TesterSkipButton onSkip={onTesterSkip} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 0,
  },
});
