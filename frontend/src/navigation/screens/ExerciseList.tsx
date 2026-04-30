import React from "react";
import { useColorScheme, View, Text, StyleSheet } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTrackTab } from "../../hooks/useTrackTab";
import { useExerciseList } from "../../hooks/useExerciseList";
import { ExerciseListView } from "../../components/ExerciseListView";
import { Exercise } from "../../api/exerciseService";
import { FloatingCloseButton } from "../../components/FloatingCloseButton";

export function ExerciseList() {
  useTrackTab("ExerciseList");

  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === "dark";
  const insets = useSafeAreaInsets();
  const { exercises } = useExerciseList();

  const handleExercisePress = (exercise: Exercise) => {
    navigation.navigate("ExerciseHistory", { exercise });
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: isDark ? "#000" : "#fff" }}
      edges={["bottom"]}
    >
      <FloatingCloseButton direction="left" accessibilityLabel="Back" />
      <Text
        style={[
          styles.title,
          { top: insets.top + 10, color: isDark ? "#fff" : "#000" },
        ]}
      >
        Exercises
      </Text>

      <View style={{ flex: 1, paddingTop: insets.top + 60 }}>
        <ExerciseListView
          exercises={exercises}
          onExercisePress={handleExercisePress}
          onCreateExercise={() =>
            navigation.navigate("CreateExercise", { startWorkout: false })
          }
          loading={exercises.length === 0}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    height: 40,
    lineHeight: 40,
    fontSize: 24,
    fontWeight: "700",
    zIndex: 9,
  },
});
