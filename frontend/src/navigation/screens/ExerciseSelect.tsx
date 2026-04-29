import { Text } from "@react-navigation/elements";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  SectionList,
} from "react-native";
import React, { useState, useEffect, useMemo } from "react";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useExerciseList } from "../../hooks/useExerciseList";
import { useWorkoutTimer } from "../../context/WorkoutContext";
import { ExerciseListView } from "../../components/ExerciseListView";
import { Exercise } from "../../api/exerciseService";
import { useTrackTab } from "../../hooks/useTrackTab";

import { ExerciseSearchBar } from "../../components/ExerciseSearchBar";
import { ExerciseCard } from "../../components/ExerciseCard";
import { FloatingCloseButton } from "../../components/FloatingCloseButton";

export function ExerciseSelect() {
  useTrackTab("ExerciseSelect");

  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isDark = useColorScheme() === "dark";
  const { exercises } = useExerciseList();
  const { showPlayer, start } = useWorkoutTimer();
  const insets = useSafeAreaInsets();
  console.log("ExerciseSelect", {
    insets,
    parent:
      navigation.getParent()?.getId?.() ??
      navigation.getParent()?.getState?.()?.type,
    state: navigation.getState()?.type,
    routes: navigation.getState()?.routes?.map((r) => r.name),
  });

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
    <View style={{ flex: 1, backgroundColor: isDark ? "#000" : "#fff" }}>
      <FloatingCloseButton
        direction="left"
        accessibilityLabel="Back"
        onPress={() => {
          const returnTo = route.params?.returnTo;
          if (returnTo === "ExerciseDetail") {
            navigation.replace("ExerciseDetail", {
              exercise: route.params.exercise,
            });
          } else if (returnTo === "WorkoutSummary") {
            navigation.replace("WorkoutSummary");
          } else {
            const parent = navigation.getParent();
            if (parent) parent.goBack();
            else navigation.goBack();
          }
        }}
      />
      <View style={{ flex: 1, paddingTop: insets.top + 60 }}>
        <ExerciseListView
          exercises={exercises}
          onExercisePress={handleExercisePress}
          onCreateExercise={() =>
            navigation.navigate("CreateExercise", { startWorkout: true })
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  headerRow: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
  },

  // Filter Chips
  chipScrollView: {
    flexGrow: 0,
    marginBottom: 8,
  },
  chipContainer: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Section Headers
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Exercise List
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Create Button
  createButton: {
    marginTop: 20,
    marginBottom: 30,
    paddingVertical: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    gap: 4,
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  createButtonHint: {
    fontSize: 12,
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
});
