import { Text } from "@react-navigation/elements";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { SymbolView } from "expo-symbols";
import { useExerciseList } from "../../hooks/useExerciseList";
import { useWorkoutTimer } from "../../context/WorkoutContext";
import { ExerciseListView } from "../../components/ExerciseListView";
import { Exercise } from "../../api/exerciseService";
import {
  CardioActivity,
  getAllCardioActivities,
  getCachedCardioActivities,
} from "../../api/cardioService";
import { useTrackTab } from "../../hooks/useTrackTab";
import { FloatingCloseButton } from "../../components/FloatingCloseButton";

export function ExerciseSelect() {
  useTrackTab("ExerciseSelect");

  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isDark = useColorScheme() === "dark";
  const { exercises } = useExerciseList();
  const { showPlayer, start, swapExercise, setActiveExercise, resetCardio } =
    useWorkoutTimer();
  const insets = useSafeAreaInsets();
  const swapTargetId: string | undefined = route.params?.swapTargetId;

  const [mode, setMode] = useState<"exercise" | "cardio">(
    route.params?.mode === "cardio" ? "cardio" : "exercise",
  );
  const [cardioActivities, setCardioActivities] = useState<CardioActivity[]>(
    [],
  );

  useEffect(() => {
    let active = true;
    getCachedCardioActivities().then((cached) => {
      if (active && cached.length) setCardioActivities(cached);
    });
    getAllCardioActivities()
      .then((list) => {
        if (active) setCardioActivities(list);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

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

  const handleCardioPress = (activity: CardioActivity) => {
    start();
    resetCardio();
    // When swapping the activity of an existing entry, reuse its id so the new
    // selection overwrites it in place instead of creating a second entry.
    const swapCardioId: string | undefined = route.params?.swapCardioId;
    navigation.replace("ExerciseDetail", {
      kind: "cardio",
      cardio: {
        workoutCardioId: swapCardioId ?? Date.now().toString(),
        cardioActivityId: activity.cardioActivityId,
        activityType: activity.name,
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
          if (returnTo === "ExerciseDetail" && route.params?.exercise) {
            // Lifting "next/swap" flow — return to the exercise we came from.
            navigation.replace("ExerciseDetail", {
              exercise: route.params.exercise,
            });
          } else if (
            returnTo === "ExerciseDetail" ||
            returnTo === "WorkoutSummary"
          ) {
            // Cardio add/swap flows arrive here with no exercise param; the
            // cardio entry already lives in the workout, so fall back to the
            // summary instead of a lifting detail with an undefined exercise.
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
          { top: insets.top + 10, color: isDark ? "#fff" : "#000" },
        ]}
      >
        {mode === "cardio" ? "Select Cardio" : "Select Exercise"}
      </Text>

      <TouchableOpacity
        onPress={() => setMode((m) => (m === "cardio" ? "exercise" : "cardio"))}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel={
          mode === "cardio" ? "Switch to exercises" : "Switch to cardio"
        }
        style={[
          styles.toggle,
          {
            top: insets.top + 10,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(0,0,0,0.05)",
          },
        ]}
      >
        <SymbolView
          name={mode === "cardio" ? "dumbbell.fill" : "figure.run"}
          tintColor={isDark ? "#fff" : "#000"}
          size={22}
        />
      </TouchableOpacity>

      <View style={{ flex: 1, paddingTop: insets.top + 60 }}>
        {mode === "cardio" ? (
          <ExerciseListView
            mode="cardio"
            exercises={[]}
            onExercisePress={() => {}}
            cardioActivities={cardioActivities}
            onCardioPress={handleCardioPress}
            loading={cardioActivities.length === 0}
          />
        ) : (
          <ExerciseListView
            exercises={exercises}
            onExercisePress={handleExercisePress}
            onCreateExercise={() =>
              navigation.navigate("CreateExercise", { startWorkout: true })
            }
            loading={exercises.length === 0}
          />
        )}
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
  toggle: {
    position: "absolute",
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
});
