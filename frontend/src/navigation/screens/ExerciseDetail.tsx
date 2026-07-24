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
  const routeExercise = route.params.exercise;

  const {
    start,
    exercises,
    hasActiveWorkout,
    setCurrentExercise,
    setActiveExercise,
  } = useWorkoutTimer();
  const liveExercise = exercises.find(
    (e) => e.workoutExerciseId === routeExercise.workoutExerciseId,
  );
  const exercise = liveExercise ?? routeExercise;
  const contentRef = useRef<ExerciseDetailContentRef>(null);

  useEffect(() => {
    // start() releases the post-reset write barrier and sets running, so it
    // must only run when a workout genuinely exists. Every legitimate path
    // into this screen already satisfies that: ExerciseSelect and
    // CreateExercise call start() in their press handlers before navigating
    // here, and every other entry arrives with live workout state. A stale
    // mount after a posted workout has neither; calling start() there would
    // resurrect a zombie running state whose next background event re-arms
    // the unfinished-workout reminder.
    if (!hasActiveWorkout) return;
    start();
    if (exercise.workoutExerciseId) {
      setActiveExercise(exercise.workoutExerciseId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // A superset is one station: alternating inside it happens via log
    // auto-swap and the partner chip, so "Next exercise" leaves the whole
    // group. Members are position-adjacent, so skipping the consecutive run
    // that shares this group id lands on the first exercise after it.
    let nextIdx = currentIdx + 1;
    const group =
      currentIdx >= 0 ? exercises[currentIdx].supersetGroup : undefined;
    if (group !== undefined) {
      while (
        nextIdx < exercises.length &&
        exercises[nextIdx].supersetGroup === group
      ) {
        nextIdx++;
      }
    }
    const next = currentIdx >= 0 ? exercises[nextIdx] : undefined;
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

  // "Pick from library" in the superset partner sheet. Mirrors the
  // swapTargetId contract; ExerciseSelect links the picked exercise into this
  // one's group and lands back here (linking is configuration, not
  // navigation). The replace fires beforeRemove, which flushes this exercise.
  const handleSupersetFromLibrary = () => {
    (navigation as any).replace("ExerciseSelect", {
      returnTo: "ExerciseDetail",
      exercise,
      supersetTargetId: exercise.workoutExerciseId,
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
      onSupersetFromLibrary={
        exercise.workoutExerciseId ? handleSupersetFromLibrary : undefined
      }
    />
  );
}
