import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { View, StyleSheet, Alert, Appearance } from "react-native";

const initialBg = Appearance.getColorScheme() === "dark" ? "#000" : "#F2F2F7";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  GoogleSignin,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";

import {
  OnboardingDraft, OnboardingStep, Gender, Height, Weight, DOB,
  OnboardingProfile, OnboardingPermissions, TOTAL_STEPS,
} from "../onboarding/types";
import {
  loadOnboardingDraft,
  saveOnboardingDraft,
  markOnboardingSeen,
  clearOnboardingDraft,
} from "../onboarding/storage";
import { loginWithGoogle } from "../../api/authService";
import { updateUserProfile, uploadProfilePicture } from "../../api/userService";
import { useAuth } from "../../context/AuthContext";
import { useOnboardingColors } from "../onboarding/components/useOnboardingColors";
import { RootStackParamList } from "..";

import { IntroStep } from "../onboarding/components/IntroStep";
import { GenderStep } from "../onboarding/components/GenderStep";
import { AboutYouStep } from "../onboarding/components/AboutYouStep";
import { ProfileStep } from "../onboarding/components/ProfileStep";
import { PermissionsStep } from "../onboarding/components/PermissionsStep";
import { AllSetStep } from "../onboarding/components/AllSetStep";

const STEP_COMPONENTS = [
  IntroStep, GenderStep, AboutYouStep, ProfileStep, PermissionsStep, AllSetStep,
] as const;

const defaultDraft = (): OnboardingDraft => ({
  step: 0,
  updatedAt: new Date().toISOString(),
});

function calcAge(year: number, month: number, day: number): number {
  const today = new Date();
  let age = today.getFullYear() - year;
  const m = today.getMonth() - month;
  if (m < 0 || (m === 0 && today.getDate() < day)) age--;
  return Math.max(0, age);
}

export function OnboardingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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
    [hydrated]
  );

  const updateDraft = useCallback(
    (partial: Partial<OnboardingDraft>) => {
      setDraft((prev) => {
        const next = { ...prev, ...partial, updatedAt: new Date().toISOString() };
        persistDraft(next);
        return next;
      });
    },
    [persistDraft]
  );

  // ─── Step navigation ─────────────────────────────────────────
  const goTo = useCallback((step: OnboardingStep) => updateDraft({ step }), [updateDraft]);
  const goBack = useCallback(
    () => goTo(Math.max(0, draft.step - 1) as OnboardingStep),
    [goTo, draft.step]
  );
  const goNext = useCallback(
    () => goTo(Math.min(TOTAL_STEPS, draft.step + 1) as OnboardingStep),
    [goTo, draft.step]
  );

  // ─── Final sign-in CTA ───────────────────────────────────────
  const handleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      const response = await GoogleSignin.signIn();
      if (isSuccessResponse(response)) {
        const { idToken } = response.data;
        if (!idToken) throw new Error("No ID token received from Google");

        const { token, refreshToken } = await loginWithGoogle(idToken);
        await login(token, refreshToken);

        // Sync collected profile data to backend (best-effort, non-blocking)
        try {
          const h = draft.height;
          const w = draft.weight;
          const heightInches = h?.unit === "ft_in"
            ? h.ft * 12 + h.inch
            : h?.unit === "cm"
            ? Math.round(h.cm / 2.54)
            : null;
          const weightLbs = w?.unit === "lbs"
            ? w.value
            : w?.unit === "kg"
            ? Math.round(w.value * 2.205)
            : null;
          const age = draft.dob
            ? calcAge(draft.dob.year, draft.dob.month, draft.dob.day)
            : null;

          await updateUserProfile(heightInches, weightLbs, age);

          if (draft.profile?.photoUri) {
            await uploadProfilePicture(draft.profile.photoUri);
          }
        } catch (syncErr) {
          // Profile sync failure should not block the user from proceeding
          console.warn("Onboarding profile sync failed:", syncErr);
        }

        await markOnboardingSeen();
        await clearOnboardingDraft();

        navigation.reset({ index: 0, routes: [{ name: "HomeTabs" }] });
      }
    } catch (error) {
      console.error("Sign-in error during onboarding:", error);
      Alert.alert(
        "Sign-in Failed",
        "Something went wrong signing in with Google. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  // ─── Step props map ──────────────────────────────────────────
  const stepProps = useMemo(() => {
    const base = { onBack: goBack };
    return [
      { onGetStarted: goNext, onGoogleSignIn: handleSignIn },
      { selected: draft.gender, onSelect: (g: Gender) => updateDraft({ gender: g }), ...base, onContinue: goNext },
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
      { profile: draft.profile, onProfileChange: (p: OnboardingProfile) => updateDraft({ profile: p }), ...base, onContinue: goNext },
      { permissions: draft.permissions, onPermissionsChange: (p: OnboardingPermissions) => updateDraft({ permissions: p }), ...base, onContinue: goNext },
      { onSignIn: handleSignIn, ...base, isLoading: isSigningIn },
    ] as const;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, goBack, goNext, updateDraft, isSigningIn]);

  if (!hydrated) return null;

  const CurrentStep = STEP_COMPONENTS[draft.step] as React.ComponentType<any>;
  const currentProps = stepProps[draft.step];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.screenBg ?? initialBg, paddingTop: insets.top },
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
