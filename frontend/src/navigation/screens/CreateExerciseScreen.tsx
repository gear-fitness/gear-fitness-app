import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Keyboard,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { createExercise } from "../../api/exerciseService";
import { useWorkoutTimer } from "../../context/WorkoutContext";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "..";

const BODY_PARTS = [
  "CHEST",
  "BACK",
  "SHOULDERS",
  "BICEPS",
  "TRICEPS",
  "LEGS",
  "QUADS",
  "HAMSTRINGS",
  "GLUTES",
  "CALVES",
  "CORE",
  "TRAPS",
  "FOREARMS",
  "FULL_BODY",
  "OTHER",
];

export function CreateExerciseScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const isDark = useColorScheme() === "dark";
  const route = useRoute<any>();
  const { start, showPlayer } = useWorkoutTimer();

  const startWorkout = route.params?.startWorkout ?? false;

  const colors = {
    bg: isDark ? "#000" : "#fff",
    text: isDark ? "#fff" : "#000",
    subtle: isDark ? "#aaa" : "#666",
    border: isDark ? "#333" : "#ccc",
    inputBg: isDark ? "#1c1c1e" : "#fff",
  };

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bodyPart, setBodyPart] = useState("CHEST");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setSaving(true);
    setError(null);
    Keyboard.dismiss();

    try {
      const created = await createExercise({
        name: trimmed,
        description: description.trim() || null,
        bodyPart,
      });

      if (startWorkout) {
        start();
        const workoutExerciseId = Date.now().toString();
        showPlayer(workoutExerciseId);

        (navigation as any).replace("ExerciseDetail", {
          exercise: {
            workoutExerciseId,
            exerciseId: created.exerciseId,
            name: created.name,
            sets: [],
          },
        });
      } else {
        navigation.goBack();
      }
    } catch (err) {
      console.error("Failed to create exercise:", err);
      setError("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg }]}
      edges={["bottom"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 125 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Name */}
          <Text style={[styles.label, { color: colors.subtle }]}>Name</Text>
          <TextInput
            placeholder="e.g. Landmine Press"
            placeholderTextColor={colors.subtle}
            value={name}
            onChangeText={setName}
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.inputBg,
              },
            ]}
            returnKeyType="next"
            autoFocus
          />

          {/* Description */}
          <Text style={[styles.label, { color: colors.subtle }]}>
            Description (optional)
          </Text>
          <TextInput
            placeholder="Brief notes on form, cues, etc."
            placeholderTextColor={colors.subtle}
            value={description}
            onChangeText={setDescription}
            multiline
            style={[
              styles.input,
              styles.textArea,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.inputBg,
              },
            ]}
          />

          {/* Body Part */}
          <Text style={[styles.label, { color: colors.subtle }]}>
            Body Part
          </Text>
          <View style={styles.chipWrap}>
            {BODY_PARTS.map((bp) => {
              const selected = bodyPart === bp;
              return (
                <TouchableOpacity
                  key={bp}
                  onPress={() => setBodyPart(bp)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? "#007AFF" : colors.inputBg,
                      borderColor: selected ? "#007AFF" : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: selected ? "#fff" : colors.text,
                      fontSize: 13,
                      fontWeight: selected ? "600" : "400",
                    }}
                  >
                    {bp}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Error */}
          {error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>

        {/* Save — pinned to bottom */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.footerButton, { backgroundColor: "#FF3B30" }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.buttonText, { color: "#fff" }]}>Discard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!name.trim() || saving}
            style={[
              styles.footerButton,
              { opacity: name.trim() && !saving ? 1 : 0.4 },
              { backgroundColor: "#1E90FF" },
            ]}
          >
            <Text style={styles.buttonText}>
              {saving ? "Saving..." : "Save Exercise"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  error: {
    color: "#FF3B30",
    fontSize: 13,
    marginTop: 16,
    textAlign: "center",
  },
  footer: {
    padding: 12,
    flexDirection: "row",
    gap: 12,
    borderTopWidth: 1,
  },
  footerButton: {
    paddingVertical: 14,
    flex: 1,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
