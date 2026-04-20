import React from "react";
import { useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTrackTab } from "../../hooks/useTrackTab";
import { useExerciseList } from "../../hooks/useExerciseList";
import { ExerciseListView } from "../../components/ExerciseListView";
import { Exercise } from "../../api/exerciseService";

export function ExerciseList() {
  useTrackTab("ExerciseList");

  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === "dark";
  const { exercises } = useExerciseList();

  const handleExercisePress = (exercise: Exercise) => {
    navigation.navigate("ExerciseHistory", { exercise });
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
          navigation.navigate("CreateExercise", { startWorkout: false })
        }
      />
    </SafeAreaView>
  );
}
