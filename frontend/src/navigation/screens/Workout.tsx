import { Button, Text } from "@react-navigation/elements";
import { StyleSheet, View, FlatList, TouchableOpacity } from "react-native";
import { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

export function Workout() {
  const navigation = useNavigation();
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [workouts, setWorkouts] = useState<Array<{ id: number; name: string }>>(
    []
  );
  const toggleTimer = () => setIsRunning(!isRunning);

  const addExercise = () => {
    const newExercise = {
      id: Date.now(),
      name: `Exercise ${workouts.length + 1}`,
    };
    setWorkouts([...workouts, newExercise]);
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "left", "right", "bottom"]}
    >
      <View style={styles.container}>
        <View style={styles.topbar}>
          <Text style={styles.dateSelect}>Select Day ▼</Text>
          <TouchableOpacity onPress={toggleTimer}>
            <Text style={styles.timer}>
              {isRunning ? "⏸ Pause" : "▶ Start"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.workoutList}>
          <Text style={styles.sectionTitle}>Today's Workout</Text>
          <FlatList
            data={workouts}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <Text style={styles.exercise}>{item.name}</Text>
            )}
          />
        </View>
        <View style={styles.buttonRow}>
          <Button onPress={toggleTimer} style={styles.navButton}>
            {isRunning ? "End Workout" : "Start Workout"}
          </Button>

          <Button
            onPress={() => navigation.navigate("ExerciseSelect")}
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
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  topbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  dateSelect: { fontSize: 16, fontWeight: "500" },
  timer: { fontSize: 16, fontWeight: "600" },
  workoutList: { flex: 1 },
  sectionTitle: { fontSize: 20, fontWeight: "700", marginBottom: 10 },
  exercise: {
    fontSize: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingHorizontal: 20,
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
  buttonText: {
    fontWeight: "600",
  },
});
