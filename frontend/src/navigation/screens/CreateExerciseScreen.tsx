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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { BodyPartDTO, createExercise } from "../../api/exerciseService";
import { useWorkoutTimer } from "../../context/WorkoutContext";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "..";
import { FloatingCloseButton } from "../../components/FloatingCloseButton";

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
import { MUSCLE_GROUPS } from "../../constants/muscleGroups";

const TARGET_COLORS = {
  PRIMARY: "#007AFF",
  SECONDARY: "#5856D6",
};

const TARGET_LABELS = {
  PRIMARY: "P",
  SECONDARY: "S",
};

export function CreateExerciseScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const isDark = useColorScheme() === "dark";
  const route = useRoute<any>();
  const { start, showPlayer } = useWorkoutTimer();
  const insets = useSafeAreaInsets();

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
  const [bodyParts, setBodyParts] = useState<BodyPartDTO[]>([
    { bodyPart: "CHEST", targetType: "PRIMARY" },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasPrimary = bodyParts.some((bp) => bp.targetType === "PRIMARY");

  const getTargetType = (bp: string): "PRIMARY" | "SECONDARY" | null => {
    const found = bodyParts.find((b) => b.bodyPart === bp);
    return found ? (found.targetType as "PRIMARY" | "SECONDARY") : null;
  };

  const cycleBodyPart = (bp: string) => {
    const current = getTargetType(bp);

    if (current === null) {
      // Not selected → add as PRIMARY if none exists, otherwise SECONDARY
      const defaultType = hasPrimary ? "SECONDARY" : "PRIMARY";
      setBodyParts((prev) => [
        ...prev,
        { bodyPart: bp, targetType: defaultType },
      ]);
    } else if (current === "PRIMARY") {
      // PRIMARY → SECONDARY
      setBodyParts((prev) =>
        prev.map((b) =>
          b.bodyPart === bp ? { ...b, targetType: "SECONDARY" as const } : b,
        ),
      );
    } else {
      // SECONDARY → remove (unless it's the last one)
      if (bodyParts.length > 1) {
        setBodyParts((prev) => prev.filter((b) => b.bodyPart !== bp));
      }
    }
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (!hasPrimary) {
      setError("At least one body part must be PRIMARY.");
      return;
    }

    setSaving(true);
    setError(null);
    Keyboard.dismiss();

    try {
      const created = await createExercise({
        name: trimmed,
        description: description.trim() || null,
        bodyParts,
      });

      if (startWorkout) {
        start();
        const workoutExerciseId = Date.now().toString();
        showPlayer(workoutExerciseId);

        (navigation as any).replace("WorkoutFlow", {
          screen: "ExerciseDetail",
          params: {
            exercise: {
              workoutExerciseId,
              exerciseId: created.exerciseId,
              name: created.name,
              bodyParts: created.bodyParts,
              sets: [],
            },
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
      <FloatingCloseButton />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 68 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            New Exercise
          </Text>

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

          {/* Body Parts */}
          <Text style={[styles.label, { color: colors.subtle }]}>
            Body Parts
          </Text>
          <Text style={[styles.hint, { color: colors.subtle }]}>
            Tap to add. First selection is Primary. Tap again to cycle.
          </Text>
          <View style={styles.chipWrap}>
            {MUSCLE_GROUPS.map((bp) => {
              const targetType = getTargetType(bp);
              const isSelected = targetType !== null;
              const chipColor = isSelected
                ? TARGET_COLORS[targetType]
                : colors.inputBg;
              const borderColor = isSelected
                ? TARGET_COLORS[targetType]
                : colors.border;

              return (
                <TouchableOpacity
                  key={bp}
                  onPress={() => cycleBodyPart(bp)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected
                        ? isDark
                          ? "#fff"
                          : "#000"
                        : colors.inputBg,
                      borderColor: isSelected
                        ? isDark
                          ? "#fff"
                          : "#000"
                        : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: isSelected ? "#fff" : colors.text,
                      fontSize: 13,
                      fontWeight: isSelected ? "600" : "400",
                    }}
                  >
                    {bp}
                  </Text>
                  {isSelected && (
                    <View style={styles.targetBadge}>
                      <Text style={styles.targetBadgeText}>
                        {TARGET_LABELS[targetType]}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: TARGET_COLORS.PRIMARY },
                ]}
              />
              <Text style={[styles.legendText, { color: colors.subtle }]}>
                Primary
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: TARGET_COLORS.SECONDARY },
                ]}
              />
              <Text style={[styles.legendText, { color: colors.subtle }]}>
                Secondary
              </Text>
            </View>
          </View>

          {/* Validation hint */}
          {!hasPrimary && bodyParts.length > 0 && (
            <Text style={styles.warning}>
              At least one body part must be Primary
            </Text>
          )}

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
            disabled={!name.trim() || saving || !hasPrimary}
            style={[
              styles.footerButton,
              { opacity: name.trim() && !saving && hasPrimary ? 1 : 0.4 },
              { backgroundColor: isDark ? "#fff" : "#000" },
            ]}
          >
            <Text
              style={[styles.buttonText, { color: isDark ? "#000" : "#fff" }]}
            >
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
  heroTitle: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
    lineHeight: 38,
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 6,
    marginTop: 16,
  },
  hint: {
    fontSize: 12,
    marginBottom: 8,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  targetBadge: {
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  targetBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  legendRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    fontWeight: "500",
  },
  warning: {
    color: "#FF9500",
    fontSize: 13,
    marginTop: 12,
    textAlign: "center",
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
