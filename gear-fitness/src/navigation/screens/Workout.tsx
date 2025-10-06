import { Button, Text } from "@react-navigation/elements";
import { StyleSheet, View, FlatList, TouchableOpacity } from "react-native";
import { useState, useEffect } from "react";

export function Workout() {
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
    <View style={styles.container}>
      <View style={styles.topbar}>
        <Text style={styles.dateSelect}>Select Day ▼</Text>
        <TouchableOpacity onPress={toggleTimer}>
          <Text style={styles.timer}>{isRunning ? "⏸ Pause" : "▶ Start"}</Text>
        </TouchableOpacity>
        <Button screen="ExerciseSelect">Add Exercise</Button>
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
        <TouchableOpacity style={styles.button} onPress={toggleTimer}>
          <Text style={styles.buttonText}>
            {isRunning ? "End Workout" : "StartWorkout"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={addExercise}>
          <Text style={styles.buttonText}>Add Exercise</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#FFFFFF",
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
    justifyContent: "space-around",
    marginVertical: 20,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  buttonText: {
    fontWeight: "600",
  },
});
