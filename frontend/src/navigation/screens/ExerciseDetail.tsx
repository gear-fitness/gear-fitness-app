import { Button, Text } from "@react-navigation/elements";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
} from "react-native";
import { useColorScheme } from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import trashIcon from "../../assets/trash.png"; // icon for deleting individual sets

export function ExerciseDetail() {
  const navigation = useNavigation();
  const route = useRoute<any>();

  const exercise = route.params.exercise;
  const returnToWorkout = route.params.returnToWorkout;

  const [sets, setSets] = useState<
    Array<{ id: string; reps: string; weight: string }>
  >(exercise.sets ?? []);

  const [repsInput, setRepsInput] = useState("");
  const [weightInput, setWeightInput] = useState("");

  // DETECT DARK MODE
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const textColor = isDark ? "white" : "black";
  const placeholderColor = isDark ? "#999" : "#666";
  const inputBackground = isDark ? "#1C1C1E" : "white";
  const borderColor = isDark ? "#3A3A3C" : "#ccc";

  // Add a set
  const addSet = () => {
    if (!repsInput || !weightInput) return;

    const newSet = {
      id: Date.now().toString(),
      reps: repsInput,
      weight: weightInput,
    };

    setSets((prev) => [...prev, newSet]);
    setRepsInput("");
    setWeightInput("");

    // Update WorkoutPage
    returnToWorkout(exercise.id, [...sets, newSet]);
  };

  // Delete an individual set
  const deleteSet = (id: string) => {
    const updated = sets.filter((set) => set.id !== id);
    setSets(updated);
    returnToWorkout(exercise.id, updated);
  };

  // Clear all sets WITHOUT leaving page
  const clearSets = () => {
    setSets([]);
    returnToWorkout(exercise.id, []);
  };

  // Save and return to workout page
  const saveAndReturn = () => {
    returnToWorkout(exercise.id, sets);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>{exercise.name}</Text>

        <TouchableOpacity onPress={clearSets}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* INPUT ROW */}
      <View style={styles.inputRow}>
        <TextInput
          placeholder="Reps"
          placeholderTextColor={placeholderColor}
          value={repsInput}
          onChangeText={setRepsInput}
          style={[
            styles.input,
            { color: textColor, backgroundColor: inputBackground, borderColor },
          ]}
          keyboardType="numeric"
        />

        <TextInput
          placeholder="Weight"
          placeholderTextColor={placeholderColor}
          value={weightInput}
          onChangeText={setWeightInput}
          style={[
            styles.input,
            { color: textColor, backgroundColor: inputBackground, borderColor },
          ]}
          keyboardType="numeric"
        />

        <Button onPress={addSet}>Add</Button>
      </View>

      {/* LIST OF SETS */}
      <FlatList
        data={sets}
        keyExtractor={(item) => item.id}
        style={{ marginTop: 20 }}
        renderItem={({ item, index }) => (
          <View style={styles.setRow}>
            <Text style={[styles.setText, { color: textColor }]}>
              Set {index + 1}: {item.weight} × {item.reps}
            </Text>

            <TouchableOpacity onPress={() => deleteSet(item.id)}>
              <Image
                source={trashIcon}
                style={{
                  width: 20,
                  height: 20,
                  tintColor: isDark ? "white" : "black",
                }}
              />
            </TouchableOpacity>
          </View>
        )}
      />

      {/* SAVE BUTTON */}
      <Button onPress={saveAndReturn} style={styles.saveButton}>
        Save
      </Button>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
  },

  clearText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF", // iOS Blue
  },

  inputRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    alignItems: "center",
  },

  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },

  setRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#e0e0e0",
  },

  setText: {
    fontSize: 16,
  },

  saveButton: {
    marginTop: 25,
    backgroundColor: "#E6F0FF",
  },
});
