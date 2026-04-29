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

import {
  OnboardingDraft,
  OnboardingStep,
  Gender,
  Height,
  Weight,
  DOB,
  OnboardingProfile,
  OnboardingPermissions,
  TOTAL_STEPS,
} from "../onboarding/types";
import {
  clearOnboardingDraft,
  saveOnboardingDraft,
  loadOnboardingDraft,
  markOnboardingSeen,
} from "../onboarding/storage";
import {
  AuthApiError,
  GoogleAuthIntent,
  loginWithGoogle,
} from "../../api/authService";
import { updateUserProfile, uploadProfilePicture } from "../../api/userService";
import { useAuth } from "../../context/AuthContext";
import { useOnboardingColors } from "../onboarding/components/useOnboardingColors";

import { IntroStep } from "../onboarding/components/IntroStep";
import { GenderStep } from "../onboarding/components/GenderStep";
import { AboutYouStep } from "../onboarding/components/AboutYouStep";
import { ProfileStep } from "../onboarding/components/ProfileStep";
import { PermissionsStep } from "../onboarding/components/PermissionsStep";
import { AllSetStep } from "../onboarding/components/AllSetStep";
import { calcAge } from "../onboarding/calcAge";

const initialBg = Appearance.getColorScheme() === "dark" ? "#000" : "#eff2f5";

const STEP_COMPONENTS = [
  IntroStep,
  GenderStep,
  AboutYouStep,
  ProfileStep,
  PermissionsStep,
  AllSetStep,
] as const;

const defaultDraft = (): OnboardingDraft => ({
  step: 0,
  updatedAt: new Date().toISOString(),
});

export function OnboardingScreen() {
  const navigation = useNavigation();
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const colors = useOnboardingColors();

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
    () => goTo(Math.max(0, draft.step - 1) as OnboardingStep),
    [goTo, draft.step],
  );
  const goNext = useCallback(
    () => goTo(Math.min(TOTAL_STEPS, draft.step + 1) as OnboardingStep),
    [goTo, draft.step],
  );

  const syncOnboardingProfile = async () => {
    // Sync collected profile data to backend (best-effort, non-blocking)
    try {
      const h = draft.height;
      const w = draft.weight;
      const heightInches =
        h?.unit === "ft_in"
          ? h.ft * 12 + h.inch
          : h?.unit === "cm"
            ? Math.round(h.cm / 2.54)
            : null;
      const weightLbs =
        w?.unit === "lbs"
          ? w.value
          : w?.unit === "kg"
            ? Math.round(w.value * 2.205)
            : null;
      const age = draft.dob
        ? calcAge(draft.dob.year, draft.dob.month, draft.dob.day)
        : null;

      await updateUserProfile(
        heightInches,
        weightLbs,
        age,
        draft.profile?.username ?? null,
        draft.profile?.name ?? null,
        draft.gender ?? null,
      );

      if (draft.profile?.photoUri) {
        await uploadProfilePicture(draft.profile.photoUri);
      }
    } catch (syncErr) {
      // Profile sync failure should not block the user from proceeding
      console.warn("Onboarding profile sync failed:", syncErr);
    }
  };

  const completeAuthFlow = async () => {
    await markOnboardingSeen();
    await clearOnboardingDraft();
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: "HomeTabs" }] }),
    );
  };

  const handleGoogleAuth = async (intent: GoogleAuthIntent) => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      const response = await GoogleSignin.signIn();
      if (isSuccessResponse(response)) {
        const { idToken } = response.data;
        if (!idToken) throw new Error("No ID token received from Google");

        const { token, refreshToken } = await loginWithGoogle(idToken, intent);
        await login(token, refreshToken);

        if (intent === "sign_up") {
          await syncOnboardingProfile();
        }
        await completeAuthFlow();
      }
    } catch (error: any) {
      if (error instanceof AuthApiError) {
        if (intent === "sign_in" && error.code === "ACCOUNT_NOT_FOUND") {
          Alert.alert(
            "Account Not Found",
            "No account exists for this Google account. Please sign up first.",
            [{ text: "OK", onPress: () => goTo(0) }],
          );
          return;
        }
        if (intent === "sign_up" && error.code === "ACCOUNT_ALREADY_EXISTS") {
          Alert.alert(
            "Account Already Exists",
            "An account already exists for this Google account. Please sign in instead.",
            [{ text: "Go to Sign In", onPress: () => goTo(0) }],
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
  };

  const handleGoogleSignInExisting = async () => handleGoogleAuth("sign_in");

  const handleGoogleSignUpNew = async () => handleGoogleAuth("sign_up");

  // ─── Step props map ──────────────────────────────────────────
  const stepProps = useMemo(() => {
    const base = { onBack: goBack };
    return [
      { onGetStarted: goNext, onGoogleSignIn: handleGoogleSignInExisting },
      {
        selected: draft.gender,
        onSelect: (g: Gender) => updateDraft({ gender: g }),
        ...base,
        onContinue: goNext,
      },
      {
        height: draft.height,
        weight: draft.weight,
        dob: draft.dob,
        onHeightChange: (h: Height) => updateDraft({ height: h }),
        onWeightChange: (w: Weight) => updateDraft({ weight: w }),
        onDobChange: (d: DOB) => updateDraft({ dob: d }),
        ...base,
        onContinue: goNext,
      },
      {
        profile: draft.profile,
        onProfileChange: (p: OnboardingProfile) => updateDraft({ profile: p }),
        ...base,
        onContinue: goNext,
      },
      {
        permissions: draft.permissions,
        // PermissionsStep needs the current draft height/weight so it
        // can push them into HealthKit when the user toggles Apple Health on.
        height: draft.height,
        weight: draft.weight,
        onPermissionsChange: (p: OnboardingPermissions) =>
          updateDraft({ permissions: p }),
        ...base,
        onContinue: goNext,
      },
      { onSignIn: handleGoogleSignUpNew, ...base, isLoading: isSigningIn },
    ] as const;
  }, [
    draft.step,
    draft.gender,
    draft.height,
    draft.weight,
    draft.dob,
    draft.profile,
    draft.permissions,
    goBack,
    goNext,
    updateDraft,
    isSigningIn,
    handleGoogleSignInExisting,
    handleGoogleSignUpNew,
  ]);

  if (!hydrated) return null;

  const CurrentStep = STEP_COMPONENTS[draft.step] as React.ComponentType<any>;
  const currentProps = stepProps[draft.step];

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
      <CurrentStep {...currentProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 0,
  },
});
