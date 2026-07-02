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
  const routeExercise = route.params?.exercise;

  const { start, exercises, setCurrentExercise, setActiveExercise } =
    useWorkoutTimer();
  const liveExercise = exercises.find(
    (e) => e.workoutExerciseId === routeExercise?.workoutExerciseId,
  );
  const exercise = liveExercise ?? routeExercise;
  const contentRef = useRef<ExerciseDetailContentRef>(null);

  useEffect(() => {
    // Defensive: if we somehow landed here without an exercise (e.g. a stray
    // navigation from a cardio flow), don't crash — just back out.
    if (!exercise) {
      navigation.goBack();
      return;
    }
    start();
    if (exercise.workoutExerciseId) {
      setActiveExercise(exercise.workoutExerciseId);
    }
  }, [exercise?.workoutExerciseId]);

  // Save before leaving screen
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", () => {
      contentRef.current?.save();
    });
    return unsubscribe;
  }, [navigation]);

  if (!exercise) return null;

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

  const {
    start,
    cardioEntries,
    resetCardio,
    showCardio,
    removeCardioEntry,
    freezeActiveExercise,
  } = useWorkoutTimer();
  const liveCardio = cardioEntries.find(
    (c) => c.workoutCardioId === routeCardio.workoutCardioId,
  );
  const cardio = liveCardio ?? routeCardio;
  const contentRef = useRef<CardioDetailContentRef>(null);

  useEffect(() => {
    // Ensure the global workout timer is running, but do NOT auto-start the
    // cardio-scoped stopwatch — it stays at 00:00 until the user taps play.
    start();
    // Stop the previously-active exercise's per-exercise clock so the time spent
    // logging cardio never accrues to a lifting exercise's duration. This only
    // touches the per-exercise timer; the global workout timer keeps running.
    freezeActiveExercise();
    // Register this cardio as the player's current item so minimizing the
    // detail collapses back to the player showing this cardio (mirrors how
    // LiftingDetail registers its exercise via showPlayer/setActiveExercise).
    showCardio(cardio.workoutCardioId);
  }, [cardio.workoutCardioId]);

  // NOTE: the cardio stopwatch is intentionally NOT paused on unmount — it lives
  // in WorkoutContext and keeps ticking so the MiniPlayer can show/control it
  // live after the user minimizes. It still never touches the global timer.

  // Save before leaving screen
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", () => {
      contentRef.current?.save();
    });
    return unsubscribe;
  }, [navigation]);

  const handleCancelCardio = () => {
    // Discard this entry entirely: remove it from the workout, reset the cardio
    // stopwatch, then drop the user on the cardio picker so they can choose a
    // different activity (or toggle back to exercises).
    removeCardioEntry(cardio.workoutCardioId);
    resetCardio();
    navigation.replace("ExerciseSelect", {
      returnTo: "WorkoutSummary",
      mode: "cardio",
    });
  };

  // Change the activity type for this same entry. Passing swapCardioId keeps the
  // workoutCardioId stable so picking a new activity overwrites this entry in
  // place rather than appending a second one.
  const handleSwapCardio = () => {
    navigation.replace("ExerciseSelect", {
      returnTo: "ExerciseDetail",
      mode: "cardio",
      swapCardioId: cardio.workoutCardioId,
    });
  };

  return (
    <CardioDetailContent
      ref={contentRef}
      cardio={cardio}
      onSummary={() => navigation.replace("WorkoutSummary")}
      onCancelCardio={handleCancelCardio}
      onSwapCardio={handleSwapCardio}
    />
  );
}
