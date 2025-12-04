import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useRef } from "react";

import { useWorkoutTimer } from "../../context/WorkoutContext";
import {
  ExerciseDetailContent,
  ExerciseDetailContentRef,
} from "../../components/ExerciseDetailContent";

export function ExerciseDetail() {
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
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      contentRef.current?.save();
    });
    return unsubscribe;
  }, [navigation]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ExerciseDetailContent
        ref={contentRef}
        exercise={exercise}
        onSummary={() => navigation.replace("WorkoutSummary")}
        onAddExercise={() => navigation.replace("ExerciseSelect")}
      />
    </SafeAreaView>
  );
}
