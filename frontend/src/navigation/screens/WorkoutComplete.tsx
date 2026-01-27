// frontend/src/navigation/screens/WorkoutComplete.tsx
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Text,
  StyleSheet,
  useColorScheme,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { useWorkoutTimer } from "../../context/WorkoutContext";
import { submitWorkout, WorkoutSubmission } from "../../api/workoutService";
import { getCurrentLocalDateString } from "../../utils/date";
import { useTrackTab } from "../../hooks/useTrackTab";

export function WorkoutComplete() {
  useTrackTab("WorkoutComplete");

  const isDark = useColorScheme() === "dark";
  const navigation = useNavigation<any>();
  const { exercises, seconds, reset, triggerPostWorkoutRefresh } = useWorkoutTimer();

  const [workoutName, setWorkoutName] = useState("");
  const [bodyTag, setBodyTag] = useState<string[]>(["FULL_BODY"]);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);

  const colors = {
    bg: isDark ? "#000" : "#fff",
    text: isDark ? "#fff" : "#000",
    subtle: isDark ? "#aaa" : "#666",
    card: isDark ? "#1c1c1e" : "#f2f2f2",
    border: isDark ? "#333" : "#ccc",
    input: isDark ? "#2a2a2a" : "#fff",
  };

  const bodyTags = [
    "FULL_BODY",
    "CHEST",
    "BACK",
    "SHOULDERS",
    "BICEPS",
    "TRICEPS",
    "LEGS",
    "GLUTES",
    "HAMSTRINGS",
    "QUADS",
    "CALVES",
    "CORE",
  ];

  const toggleBodyTag = (tag: string) => {
    setBodyTag((prev) => {
      if (prev.includes(tag)) {
        // Don't allow removing the last tag
        if (prev.length === 1) return prev;
        return prev.filter((t) => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  const handleSaveWorkout = async (createPost: boolean) => {
    if (!workoutName.trim()) {
      Alert.alert("Error", "Please enter a workout name");
      return;
    }

    if (exercises.length === 0) {
      Alert.alert("Error", "No exercises to save");
      return;
    }

    setLoading(true);

    try {
      const submission: WorkoutSubmission = {
        name: workoutName,
        durationMin: Math.floor(seconds / 60),
        datePerformed: getCurrentLocalDateString(),
        bodyTags: bodyTag, // Send all selected tags to backend
        exercises: exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          sets: ex.sets.map((set) => ({
            reps: set.reps,
            weight: set.weight,
          })),
        })),
        createPost: createPost,
        caption: createPost ? caption : undefined,
      };

      const result = await submitWorkout(submission);

      // Reset workout context

      Alert.alert(
        "Success",
        createPost
          ? "Workout saved and posted!"
          : "Workout saved successfully!",
        [
          {
            text: "OK",
            onPress: () => {
              triggerPostWorkoutRefresh();
              reset();

              const state = navigation.getState();
              const modalCount = state.routes.filter((r) =>
                [
                  "WorkoutComplete",
                  "WorkoutSummary",
                  "ExerciseDetail",
                  "ExerciseSelect",
                ].includes(r.name)
              ).length;

              navigation.pop(modalCount);
            },
          },
        ]
      );
    } catch (error) {
      console.error("Failed to save workout:", error);
      Alert.alert("Error", "Failed to save workout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDiscardWorkout = () => {
    Alert.alert(
      "Discard Workout",
      "Are you sure you want to discard this workout? All progress will be lost.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            reset();

            const state = navigation.getState();
            const modalCount = state.routes.filter((r: any) =>
              [
                "WorkoutComplete",
                "WorkoutSummary",
                "ExerciseDetail",
                "ExerciseSelect",
              ].includes(r.name)
            ).length;

            navigation.pop(modalCount);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: colors.text }]}>
          Workout Complete! 🎉
        </Text>

        <Text style={[styles.subtitle, { color: colors.subtle }]}>
          Duration: {Math.floor(seconds / 60)} minutes
        </Text>

        {/* Workout Name */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            Workout Name *
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.input, color: colors.text },
            ]}
            placeholder="e.g., Chest Day, Leg Day..."
            placeholderTextColor={colors.subtle}
            value={workoutName}
            onChangeText={setWorkoutName}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
        </View>

        {/* Body Tag */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Body Tag *</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tagScroll}
          >
            {bodyTags.map((tag) => (
              <TouchableOpacity
                key={tag}
                onPress={() => toggleBodyTag(tag)}
                style={[
                  styles.tagButton,
                  {
                    backgroundColor: bodyTag.includes(tag)
                      ? "#007AFF"
                      : colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tagText,
                    { color: bodyTag.includes(tag) ? "#fff" : colors.text },
                  ]}
                >
                  {tag.replace("_", " ")}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Exercises Summary */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            Exercises ({exercises.length})
          </Text>
          {exercises.map((ex) => (
            <View
              key={ex.workoutExerciseId}
              style={[
                styles.exerciseCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.exerciseName, { color: colors.text }]}>
                {ex.name}
              </Text>
              <Text style={{ color: colors.subtle }}>
                {ex.sets.filter((s) => s.reps && s.weight).length} sets
              </Text>
            </View>
          ))}
        </View>

        {/* Caption (for posting) */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            Caption (optional - for posting)
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.captionInput,
              { backgroundColor: colors.input, color: colors.text },
            ]}
            placeholder="Share your thoughts about this workout..."
            placeholderTextColor={colors.subtle}
            value={caption}
            onChangeText={setCaption}
            multiline
            blurOnSubmit={true}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.card }]}
            onPress={() => handleSaveWorkout(false)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.text }]}>
                Save Workout
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#007AFF" }]}
            onPress={() => handleSaveWorkout(true)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.buttonText, { color: "#fff" }]}>
                Save & Post
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.discardButton]}
            onPress={handleDiscardWorkout}
            disabled={loading}
          >
            <Text style={[styles.buttonText, { color: "#FF3B30" }]}>
              Discard Workout
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  captionInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  tagScroll: {
    flexDirection: "row",
  },
  tagButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 14,
    fontWeight: "600",
  },
  exerciseCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  buttonContainer: {
    gap: 12,
    marginTop: 12,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  discardButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#FF3B30",
  },
});
