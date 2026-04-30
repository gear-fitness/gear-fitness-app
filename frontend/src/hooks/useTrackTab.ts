import { useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useWorkoutTimer, LastModalScreen } from "../context/WorkoutContext";

interface UseTrackTabOptions {
  isModal?: boolean;
}

export function useTrackTab(tabName: string, opts?: UseTrackTabOptions) {
  const { setActiveTab, setLastModalScreen } = useWorkoutTimer();
  const isModal = opts?.isModal ?? false;

  // Use useFocusEffect so tab updates when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setActiveTab(tabName);
      if (isModal) {
        setLastModalScreen(tabName as LastModalScreen);
      }
    }, [tabName, isModal, setActiveTab, setLastModalScreen]),
  );
}
