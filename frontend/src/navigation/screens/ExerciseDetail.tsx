import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useRef } from "react";

import { useWorkoutTimer } from "../../context/WorkoutContext";
import {
  ExerciseDetailContent,
  ExerciseDetailContentRef,
} from "../../components/ExerciseDetailContent";
import {
  CardioDetailContent,
  CardioDetailContentRef,
} from "../../components/CardioDetailContent";
import { useTrackTab } from "../../hooks/useTrackTab";

export function ExerciseDetail() {
  const route = useRoute<any>();
  if (route.params?.kind === "cardio") {
    return <CardioDetail />;
  }
  return <LiftingDetail />;
}

function LiftingDetail() {
  useTrackTab("ExerciseDetail", { isModal: true });

  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const routeExercise = route.params.exercise;

  const { start, exercises, setCurrentExercise, setActiveExercise } =
    useWorkoutTimer();
  const liveExercise = exercises.find(
    (e) => e.workoutExerciseId === routeExercise.workoutExerciseId,
  );
  const exercise = liveExercise ?? routeExercise;
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

  const handleSwapExercise = () => {
    navigation.replace("ExerciseSelect", {
      returnTo: "ExerciseDetail",
      exercise,
      swapTargetId: exercise.workoutExerciseId,
    });
  };

  return (
    <ExerciseDetailContent
      ref={contentRef}
      exercise={exercise}
      onSummary={() => navigation.replace("WorkoutSummary")}
      onAddExercise={handleNextExercise}
      onSwapExercise={
        exercise.workoutExerciseId ? handleSwapExercise : undefined
      }
    />
  );
}

function CardioDetail() {
  useTrackTab("ExerciseDetail", { isModal: true });

  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const routeCardio = route.params.cardio;

  const { start, cardioEntries, startCardio, resetCardio } = useWorkoutTimer();
  const liveCardio = cardioEntries.find(
    (c) => c.workoutCardioId === routeCardio.workoutCardioId,
  );
  const cardio = liveCardio ?? routeCardio;
  const contentRef = useRef<CardioDetailContentRef>(null);

  useEffect(() => {
    start();
    // Auto-start the cardio stopwatch on first open of a fresh entry so the
    // user lands on a running timer; reopening a saved entry leaves it alone.
    if (!liveCardio) {
      startCardio();
    }
  }, [cardio.workoutCardioId]);

  // Save before leaving screen
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", () => {
      contentRef.current?.save();
    });
    return unsubscribe;
  }, [navigation]);

  const handleAddCardio = () => {
    resetCardio();
    navigation.replace("ExerciseSelect", {
      returnTo: "ExerciseDetail",
      mode: "cardio",
    });
  };

  return (
    <CardioDetailContent
      ref={contentRef}
      cardio={cardio}
      onSummary={() => navigation.replace("WorkoutSummary")}
      onAddCardio={handleAddCardio}
    />
  );
}
