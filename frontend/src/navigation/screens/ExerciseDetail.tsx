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
  useTrackTab("ExerciseDetail", { isModal: true });

  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const exercise = route.params.exercise;

  const { start, exercises, setCurrentExercise, setActiveExercise } =
    useWorkoutTimer();
  const contentRef = useRef<ExerciseDetailContentRef>(null);

  useEffect(() => {
    start();
    if (exercise.workoutExerciseId) {
      setActiveExercise(exercise.workoutExerciseId);
    }
  }, [exercise.workoutExerciseId]);

  // Save before leaving screen
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", () => {
      contentRef.current?.save();
    });
    return unsubscribe;
  }, [navigation]);

  const handleNextExercise = () => {
    const currentIdx = exercises.findIndex(
      (e) => e.workoutExerciseId === exercise.workoutExerciseId,
    );
    const next = currentIdx >= 0 ? exercises[currentIdx + 1] : undefined;
    if (next) {
      setCurrentExercise(next.workoutExerciseId);
      navigation.replace("ExerciseDetail", { exercise: next });
    } else {
      navigation.replace("ExerciseSelect", {
        returnTo: "ExerciseDetail",
        exercise,
      });
    }
  };

  return (
    <ExerciseDetailContent
      ref={contentRef}
      exercise={exercise}
      onSummary={() => navigation.replace("WorkoutSummary")}
      onAddExercise={handleNextExercise}
    />
  );
}
