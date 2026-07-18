import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { View, StyleSheet, Alert, Appearance } from "react-native";
import { FontScaleProvider } from "../../components/Text";
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
import {
  runPostSignupSync,
  resolveDisplayName,
} from "../onboarding/onboardingSync";
import { TesterSkipButton } from "../onboarding/components/TesterSkipButton";
import { TesterBackButton } from "../onboarding/components/TesterBackButton";
import { SignInScreen } from "../onboarding/components/SignInScreen";
import { AccountExistsScreen } from "../onboarding/components/AccountExistsScreen";

/**
 * Full-screen auth overlay shown over the current onboarding step. Replaces the
 * native Alerts that used to handle "sign in" and "account already exists".
 */
type AuthOverlay =
  | { mode: "signIn" }
  | { mode: "accountExists"; provider: "google" | "apple" };

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
  const [authOverlay, setAuthOverlay] = useState<AuthOverlay | null>(null);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openSignIn = useCallback(() => setAuthOverlay({ mode: "signIn" }), []);
  const closeAuthOverlay = useCallback(() => setAuthOverlay(null), []);

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
      // Capture the Google-provided name so a new user (the sign-in bounce
      // below) skips NameStep and we never re-ask for it after social sign-in.
      let googleFullName: string | null = null;
      try {
        const response = await GoogleSignin.signIn();
        if (isSuccessResponse(response)) {
          const { idToken } = response.data;
          if (!idToken) throw new Error("No ID token received from Google");

          const gUser = response.data.user;
          const gName = (
            gUser?.name ||
            `${gUser?.givenName ?? ""} ${gUser?.familyName ?? ""}`
          ).trim();
          googleFullName = gName.length > 0 ? gName : null;

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
            throw new Error(
              "Google sign-in did not return valid session tokens",
            );
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
            // ─── New Google user → required onboarding ───────────────
            // Account creation is gated behind onboarding, so we can't
            // sign them in here. Surfacing an error-styled "Account Not
            // Found" dialog makes the sign-in look broken (App Review
            // flagged the Apple equivalent), so we redirect into
            // onboarding and explain it with friendly, informational copy.
            // We never re-ask for the name after social sign-in: prefill it
            // from the captured Google profile and skip NameStep (step 1),
            // landing on GoalStep (step 2).
            closeAuthOverlay();
            if (googleFullName) {
              updateDraft({
                profile: { ...draft.profile, name: googleFullName },
                step: 2,
              });
            } else {
              goTo(2);
            }
            Alert.alert(
              "Let's set up your account",
              "You don't have an account yet, so we'll walk you through a quick setup.",
              [{ text: "OK" }],
            );
            return;
          }
          if (intent === "sign_up" && error.code === "ACCOUNT_ALREADY_EXISTS") {
            setAuthOverlay({ mode: "accountExists", provider: "google" });
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
    [
      isSigningIn,
      login,
      draft,
      refreshUser,
      goNext,
      goTo,
      completeOnboarding,
      closeAuthOverlay,
      updateDraft,
    ],
  );

  const handleAppleAuth = useCallback(
    async (intent: AppleAuthIntent) => {
      if (isSigningIn) return;
      setIsSigningIn(true);
      // Apple returns the user's name only on the very first authorization.
      // Capture it here so a new user (the sign-in bounce below) skips
      // NameStep and we never re-ask for it after Sign in with Apple.
      let appleFullName: string | null = null;
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
        const capturedName = [
          credential.fullName?.givenName,
          credential.fullName?.familyName,
        ]
          .filter(Boolean)
          .join(" ")
          .trim();
        appleFullName = capturedName.length > 0 ? capturedName : null;

        const result = await loginWithApple({
          identityToken: credential.identityToken,
          appleUserId: credential.user,
          email: credential.email,
          firstName: credential.fullName?.givenName,
          lastName: credential.fullName?.familyName,
          intent,
          // The backend's Apple path requires a username at creation (it's
          // NOT NULL and, unlike the Google path, has no auto-generated
          // fallback). Send the onboarding-chosen one; runPostSignupSync fills
          // in the remaining profile fields right after.
          profile:
            intent === "sign_up"
              ? {
                  username: draft.profile?.username ?? null,
                  displayName: resolveDisplayName(draft),
                }
              : undefined,
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
            // ─── New Apple user → required onboarding ────────────────
            // Account creation is gated behind onboarding, so we can't
            // sign them in here. App Review flagged the old error-styled
            // "Account Not Found" dialog as a broken Apple sign-in, so we
            // redirect into onboarding and just explain it with friendly,
            // informational copy (no error styling). Apple's guideline 4
            // forbids re-asking for the name after Sign in with Apple, so we
            // prefill it from the captured credential and skip NameStep
            // (step 1), landing on GoalStep (step 2).
            closeAuthOverlay();
            if (appleFullName) {
              updateDraft({
                profile: { ...draft.profile, name: appleFullName },
                step: 2,
              });
            } else {
              goTo(2);
            }
            Alert.alert(
              "Let's set up your account",
              "You don't have an account yet, so we'll walk you through a quick setup.",
              [{ text: "OK" }],
            );
            return;
          }
          if (intent === "sign_up" && error.code === "ACCOUNT_ALREADY_EXISTS") {
            setAuthOverlay({ mode: "accountExists", provider: "apple" });
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
    [
      isSigningIn,
      login,
      draft,
      refreshUser,
      goNext,
      goTo,
      completeOnboarding,
      closeAuthOverlay,
      updateDraft,
    ],
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
      onSignIn: openSignIn,
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
      openSignIn,
      isSigningIn,
      completeOnboarding,
    ],
  );

  if (!hydrated) return null;

  const safeStep = Math.min(Math.max(0, draft.step), LAST_STEP);
  const CurrentStep = STEP_COMPONENTS[safeStep];

  return (
    // Onboarding layouts are pixel-exact; never let iOS text sizing scale them.
    <FontScaleProvider max={1}>
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
        {__DEV__ && <TesterBackButton onBack={goBack} />}
        {__DEV__ && <TesterSkipButton onSkip={onTesterSkip} />}
        {authOverlay && (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colors.screenBg ?? initialBg },
            ]}
          >
            {authOverlay.mode === "signIn" ? (
              <SignInScreen
                onBack={closeAuthOverlay}
                onGoogleSignIn={onGoogleSignIn}
                onAppleSignIn={onAppleSignIn}
                onSignUp={() => {
                  closeAuthOverlay();
                  goTo(1); // NameStep: first onboarding question (skip Welcome)
                }}
                isSigningIn={isSigningIn}
              />
            ) : (
              <AccountExistsScreen
                provider={authOverlay.provider}
                onBack={closeAuthOverlay}
                onSignIn={() =>
                  authOverlay.provider === "google"
                    ? handleGoogleAuth("sign_in")
                    : handleAppleAuth("sign_in")
                }
                isSigningIn={isSigningIn}
              />
            )}
          </View>
        )}
      </View>
    </FontScaleProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 0,
  },
});
