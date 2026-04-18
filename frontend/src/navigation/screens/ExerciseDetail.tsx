import { useNavigation, useRoute } from "@react-navigation/native";
import { Header } from "@react-navigation/native-stack";
import { useEffect, useRef } from "react";

import { useWorkoutTimer } from "../../context/WorkoutContext";
import {
  ExerciseDetailContent,
  ExerciseDetailContentRef,
} from "../../components/ExerciseDetailContent";
import { useTrackTab } from "../../hooks/useTrackTab";

export function ExerciseDetail() {
  useTrackTab("ExerciseDetail");

  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const exercise = route.params.exercise;

  const { start } = useWorkoutTimer();
  const contentRef = useRef<ExerciseDetailContentRef>(null);

  useEffect(() => {
    start();
  }, []);

  // Save before leaving screen
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", () => {
      contentRef.current?.save();
    });
    return unsubscribe;
  }, [navigation]);

  return (
    <ExerciseDetailContent
      ref={contentRef}
      exercise={exercise}
      onSummary={() => navigation.replace("WorkoutSummary")}
      onAddExercise={() => navigation.replace("ExerciseSelect")}
    />
  );
}
