import { Button, Text } from "@react-navigation/elements";
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  Image,
} from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useColorScheme } from "react-native";
import trash from "../../assets/trash.png";

export function Workout() {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === "dark" ? "white" : "black";

  type WorkoutExercise = {
    id: string; // unique instance ID
    exerciseId: string;
    name: string;
    sets?: Array<{ id: string; reps: string; weight: string }>;
  };

  const [workouts, setWorkouts] = useState<WorkoutExercise[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const toggleTimer = () => setIsRunning(!isRunning);

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "left", "right", "bottom"]}
    >
      <View style={styles.container}>
        {/* Top Bar */}
        <View style={styles.topbar}>
          <Text style={styles.dateSelect}>Select Day ▼</Text>
          <TouchableOpacity onPress={toggleTimer}>
            <Text style={styles.timer}>
              {isRunning ? "⏸ Pause" : "▶ Start"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Workout List */}
        <View style={styles.workoutList}>
          <Text style={styles.sectionTitle}>Today's Workout</Text>

          <FlatList
            data={workouts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.exerciseRow}>
                {/* Click area to open ExerciseDetail */}
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() =>
                    navigation.navigate("ExerciseDetail", {
                      exercise: item,
                      returnToWorkout: (
                        instanceId: string,
                        updatedSets: Array<{
                          id: string;
                          reps: string;
                          weight: string;
                        }> | null
                      ) => {
                        setWorkouts((prev) =>
                          prev.map((ex) =>
                            ex.id === instanceId
                              ? { ...ex, sets: updatedSets ?? [] }
                              : ex
                          )
                        );
                      },
                    })
                  }
                >
                  <Text style={styles.exercise}>{item.name}</Text>

                  {/* If sets exist, show the latest set summary */}
                  {item.sets && item.sets.length > 0 && (
                    <Text style={styles.setPreview}>
                      Last Set: {item.sets[item.sets.length - 1].weight} ×{" "}
                      {item.sets[item.sets.length - 1].reps}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Trash icon to delete exercise */}
                <TouchableOpacity
                  onPress={() =>
                    setWorkouts((prev) =>
                      prev.filter((ex) => ex.id !== item.id)
                    )
                  }
                >
                  <Image
                    source={trash}
                    style={[styles.trashIcon, { tintColor: iconColor }]}
                  />
                </TouchableOpacity>
              </View>
            )}
          />
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <Button onPress={toggleTimer} style={styles.navButton}>
            {isRunning ? "End Workout" : "Start Workout"}
          </Button>

          <Button
            onPress={() =>
              navigation.navigate("ExerciseSelect", {
                onSelectExercise: (exercise: any) => {
                  setWorkouts((prev) => [
                    ...prev,
                    {
                      ...exercise,
                      id: `${exercise.exerciseId}-${Date.now()}-${Math.random()}`,
                    },
                  ]);
                },
              })
            }
            style={styles.navButton}
          >
            Add Exercise
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, padding: 20 },
  topbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  dateSelect: { fontSize: 16, fontWeight: "500" },
  timer: { fontSize: 16, fontWeight: "600" },
  workoutList: { flex: 1 },
  sectionTitle: { fontSize: 20, fontWeight: "700", marginBottom: 10 },

  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },

  exercise: { fontSize: 16, fontWeight: "600" },
  setPreview: { color: "#777", marginTop: 4, fontSize: 14 },

  trashIcon: { width: 22, height: 22, marginLeft: 10 },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingBottom: 25,
  },
  navButton: {
    borderRadius: 10,
    backgroundColor: "#E6F0FF",
    borderColor: "#007AFF",
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 25,
  },
});
