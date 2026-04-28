import React from "react";
import { useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTrackTab } from "../../hooks/useTrackTab";
import { useExerciseList } from "../../hooks/useExerciseList";
import { useWorkoutTimer } from "../../context/WorkoutContext";
import { ExerciseListView } from "../../components/ExerciseListView";
import { Exercise } from "../../api/exerciseService";

export function ExerciseSelect() {
  useTrackTab("ExerciseSelect");

  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === "dark";
  const { exercises } = useExerciseList();
  const { showPlayer, start } = useWorkoutTimer();

  const handleExercisePress = (exercise: Exercise) => {
    start();
    const workoutExerciseId = Date.now().toString();
    showPlayer(workoutExerciseId);

    navigation.replace("ExerciseDetail", {
      exercise: {
        workoutExerciseId,
        exerciseId: exercise.exerciseId,
        name: exercise.name,
        bodyParts: exercise.bodyParts,
        sets: [],
      },
    });
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: isDark ? "#000" : "#fff" }}
      edges={["bottom"]}
    >
      <ExerciseListView
        exercises={exercises}
        onExercisePress={handleExercisePress}
        onCreateExercise={() =>
          navigation.navigate("CreateExercise", { startWorkout: true })
        }
      />
    </SafeAreaView>
  );
}
