import React, { useState } from "react";
import { Alert, Platform } from "react-native";
import { StepProps } from "../stepProps";
import { PermissionScreen } from "./PermissionScreen";
import { HealthSyncGraphic } from "./HealthSyncGraphic";
import { syncOnboardingDataToHealthKit } from "../../../utils/healthKitSync";

export function HealthPermissionStep({
  draft,
  updateDraft,
  onNext,
  onBack,
  progress,
}: StepProps) {
  const [busy, setBusy] = useState(false);

  const onPrimary = async () => {
    if (busy) return;

    if (Platform.OS !== "ios") {
      Alert.alert(
        "Not Available",
        "Apple Health is only available on iOS devices.",
      );
      onNext();
      return;
    }

    setBusy(true);
    try {
      // Requests HealthKit permission, then writes height + weight.
      await syncOnboardingDataToHealthKit({
        height: draft.height,
        weight: draft.weight,
      });
      updateDraft({ permissions: { ...draft.permissions, health: true } });
    } catch (err) {
      console.error("HealthKit sync failed:", err);
      // The user said yes; the sync just didn't take this time.
      updateDraft({ permissions: { ...draft.permissions, health: true } });
    } finally {
      setBusy(false);
      onNext();
    }
  };

  return (
    <PermissionScreen
      progress={progress}
      onBack={onBack}
      hero={<HealthSyncGraphic />}
      title="Connect to Apple Health"
      description="Sync your stats and activity between Gear and Apple Health to keep everything accurate in one place."
      primaryLabel="Connect Apple Health"
      onPrimary={onPrimary}
      onSkip={onNext}
      busy={busy}
    />
  );
}
