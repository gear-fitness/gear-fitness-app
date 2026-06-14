import { Text } from "@react-navigation/elements";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useExerciseList } from "../../hooks/useExerciseList";
import { useWorkoutTimer } from "../../context/WorkoutContext";
import { ExerciseListView } from "../../components/ExerciseListView";
import { Exercise } from "../../api/exerciseService";
import { useTrackTab } from "../../hooks/useTrackTab";
import { FloatingCloseButton } from "../../components/FloatingCloseButton";
import { useThemeColors } from "../../hooks/useThemeColors";

export function ExerciseSelect() {
  useTrackTab("ExerciseSelect");

  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const colors = useThemeColors();
  const { exercises } = useExerciseList();
  const { showPlayer, start, swapExercise, setActiveExercise } =
    useWorkoutTimer();
  const insets = useSafeAreaInsets();
  const swapTargetId: string | undefined = route.params?.swapTargetId;

  const handleExercisePress = (exercise: Exercise) => {
    start();

    if (swapTargetId) {
      swapExercise(swapTargetId, {
        exerciseId: exercise.exerciseId,
        name: exercise.name,
        bodyParts: exercise.bodyParts,
      });
      setActiveExercise(swapTargetId);
      navigation.replace("ExerciseDetail", {
        exercise: {
          workoutExerciseId: swapTargetId,
          exerciseId: exercise.exerciseId,
          name: exercise.name,
          bodyParts: exercise.bodyParts,
          sets: [],
        },
      });
      return;
    }

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
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
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
      <Text
        style={[
          styles.title,
          { top: insets.top + 10, color: colors.text },
        ]}
      >
        Select Exercise
      </Text>

      <View style={{ flex: 1, paddingTop: insets.top + 60 }}>
        <ExerciseListView
          exercises={exercises}
          onExercisePress={handleExercisePress}
          onCreateExercise={() =>
            navigation.navigate("CreateExercise", { startWorkout: true })
          }
          loading={exercises.length === 0}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    height: 40, // matches button height
    lineHeight: 40, // vertically centers text in that height
    fontSize: 24,
    fontWeight: "700",
    zIndex: 9,
  },
});
