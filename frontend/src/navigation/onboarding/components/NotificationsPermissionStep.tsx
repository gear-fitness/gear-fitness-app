import React, { useRef } from "react";
import * as Notifications from "expo-notifications";
import { StepProps } from "../stepProps";
import { PermissionScreen } from "./PermissionScreen";
import { NotificationsMockGraphic } from "./NotificationsMockGraphic";

export function NotificationsPermissionStep({
  draft,
  updateDraft,
  onNext,
  onBack,
  progress,
}: StepProps) {
  const acting = useRef(false);

  const handleAllow = async () => {
    if (acting.current) return;
    acting.current = true;
    const { status } = await Notifications.requestPermissionsAsync();
    updateDraft({
      permissions: { ...draft.permissions, notifications: status === "granted" },
    });
    onNext();
  };

  const handleDeny = () => {
    if (acting.current) return;
    acting.current = true;
    updateDraft({
      permissions: { ...draft.permissions, notifications: false },
    });
    onNext();
  };

  return (
    <PermissionScreen
      progress={progress}
      onBack={onBack}
      hero={
        <NotificationsMockGraphic onAllow={handleAllow} onDeny={handleDeny} />
      }
      heroPosition="below"
      title="Stay on track with Gear notifications"
      hideActions
    />
  );
}
