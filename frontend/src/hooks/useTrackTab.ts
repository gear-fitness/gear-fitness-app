import { useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useWorkoutTimer } from "../context/WorkoutContext";

export function useTrackTab(tabName: string) {
  const { setActiveTab } = useWorkoutTimer();

  // Use useFocusEffect so tab updates when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setActiveTab(tabName);
    }, [tabName, setActiveTab])
  );
}
