import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import {
  GoogleSignin,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";

import { OnboardingDraft, OnboardingStep, Gender, Height, Weight, DOB, OnboardingProfile, OnboardingPermissions } from "../onboarding/types";
import {
  loadOnboardingDraft,
  saveOnboardingDraft,
  markOnboardingSeen,
  clearOnboardingDraft,
} from "../onboarding/storage";
import { loginWithGoogle } from "../../api/authService";
import { useAuth } from "../../context/AuthContext";

import { IntroStep } from "../onboarding/components/IntroStep";
import { GenderStep } from "../onboarding/components/GenderStep";
import { AboutYouStep } from "../onboarding/components/AboutYouStep";
import { ProfileStep } from "../onboarding/components/ProfileStep";
import { PermissionsStep } from "../onboarding/components/PermissionsStep";
import { AllSetStep } from "../onboarding/components/AllSetStep";

const defaultDraft = (): OnboardingDraft => ({
  step: 0,
  updatedAt: new Date().toISOString(),
});

export function OnboardingScreen() {
  const navigation = useNavigation();
  const { login } = useAuth();
  const insets = useSafeAreaInsets();

  const [draft, setDraft] = useState<OnboardingDraft>(defaultDraft());
  const [hydrated, setHydrated] = useState(false);

  // ─── Hydrate saved draft on mount ───────────────────────────
  useEffect(() => {
    loadOnboardingDraft().then((saved) => {
      if (saved) setDraft(saved);
      setHydrated(true);
    });
  }, []);

  // ─── Persist draft whenever it changes (after hydration) ────
  const persistDraft = useCallback(
    (updated: OnboardingDraft) => {
      if (!hydrated) return;
      const stamped = { ...updated, updatedAt: new Date().toISOString() };
      saveOnboardingDraft(stamped);
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
  const goTo = (step: OnboardingStep) => updateDraft({ step });
  const goBack = () => goTo(Math.max(0, draft.step - 1) as OnboardingStep);
  const goNext = () => goTo(Math.min(5, draft.step + 1) as OnboardingStep);

  // ─── Final sign-in CTA ───────────────────────────────────────
  const handleSignIn = async () => {
    try {
      const response = await GoogleSignin.signIn();
      if (isSuccessResponse(response)) {
        const { idToken } = response.data;
        if (!idToken) throw new Error("No ID token received from Google");

        const { token, refreshToken } = await loginWithGoogle(idToken);
        await login(token, refreshToken);

        await markOnboardingSeen();
        await clearOnboardingDraft();

        navigation.reset({ index: 0, routes: [{ name: "HomeTabs" }] });
      }
    } catch (error) {
      console.error("Sign-in error during onboarding:", error);
    }
  };

  if (!hydrated) return null;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: 0 },
      ]}
    >
      {draft.step === 0 && (
        <IntroStep onGetStarted={goNext} />
      )}
      {draft.step === 1 && (
        <GenderStep
          selected={draft.gender}
          onSelect={(g: Gender) => updateDraft({ gender: g })}
          onBack={goBack}
          onContinue={goNext}
        />
      )}
      {draft.step === 2 && (
        <AboutYouStep
          height={draft.height}
          weight={draft.weight}
          dob={draft.dob}
          onHeightChange={(h: Height) => updateDraft({ height: h })}
          onWeightChange={(w: Weight) => updateDraft({ weight: w })}
          onDobChange={(d: DOB) => updateDraft({ dob: d })}
          onBack={goBack}
          onContinue={goNext}
        />
      )}
      {draft.step === 3 && (
        <ProfileStep
          profile={draft.profile}
          onProfileChange={(p: OnboardingProfile) => updateDraft({ profile: p })}
          onBack={goBack}
          onContinue={goNext}
        />
      )}
      {draft.step === 4 && (
        <PermissionsStep
          permissions={draft.permissions}
          onPermissionsChange={(p: OnboardingPermissions) => updateDraft({ permissions: p })}
          onBack={goBack}
          onContinue={goNext}
        />
      )}
      {draft.step === 5 && (
        <AllSetStep
          onSignIn={handleSignIn}
          onBack={goBack}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
});
