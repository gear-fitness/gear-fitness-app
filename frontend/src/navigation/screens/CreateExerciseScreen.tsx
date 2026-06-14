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
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
import { MUSCLE_GROUPS } from "../../constants/muscleGroups";

/** "FULL_BODY" -> "Full Body" for display; raw enum is still sent to the API. */
const formatMuscle = (bp: string) =>
  bp
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");

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
    accent: isDark ? "#fff" : "#000",
  };

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  // Exactly one primary muscle, plus any number of secondaries.
  const [primary, setPrimary] = useState<string | null>(null);
  const [secondary, setSecondary] = useState<string[]>([]);
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectPrimary = (bp: string) => {
    setPrimary((prev) => (prev === bp ? null : bp));
    // A muscle can't be primary and secondary at once.
    setSecondary((prev) => prev.filter((m) => m !== bp));
  };

  const toggleSecondary = (bp: string) => {
    setSecondary((prev) =>
      prev.includes(bp) ? prev.filter((m) => m !== bp) : [...prev, bp],
    );
  };

  const goBack = () => {
    const nav = navigation as any;
    const parent = nav.getParent();
    if (parent) parent.goBack();
    else nav.goBack();
  };

  const handleDismiss = () => {
    const hasInput =
      !!name.trim() ||
      !!description.trim() ||
      !!primary ||
      secondary.length > 0;

    if (!hasInput) {
      goBack();
      return;
    }

    Alert.alert(
      "Discard exercise?",
      "Your changes won't be saved.",
      [
        { text: "Keep editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: goBack },
      ],
      { cancelable: true },
    );
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (!primary) {
      setError("Pick a primary muscle.");
      return;
    }

    const bodyParts: BodyPartDTO[] = [
      { bodyPart: primary, targetType: "PRIMARY" },
      ...secondary.map((bp) => ({
        bodyPart: bp,
        targetType: "SECONDARY" as const,
      })),
    ];

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
        goBack();
      }
    } catch (err) {
      console.error("Failed to create exercise:", err);
      setError("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const canSave = !!name.trim() && !!primary;

  const activeText = isDark ? "#000" : "#fff";
  const inactiveBorder = isDark
    ? "rgba(255,255,255,0.22)"
    : "rgba(0,0,0,0.18)";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg }]}
      edges={["bottom"]}
    >
      <FloatingCloseButton onPress={handleDismiss} accessibilityLabel="Close" />
      <FloatingCloseButton
        position="right"
        icon="check"
        accessibilityLabel="Save exercise"
        onPress={handleSave}
        disabled={!canSave || saving}
      />

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

          {/* ── Primary muscle (single-select) ── */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Primary muscle
          </Text>
          <Text style={[styles.hint, { color: colors.subtle }]}>
            The main muscle this exercise targets. Pick one.
          </Text>
          <View style={styles.chipWrap}>
            {MUSCLE_GROUPS.map((bp) => {
              const isSelected = primary === bp;
              return (
                <TouchableOpacity
                  key={bp}
                  onPress={() => selectPrimary(bp)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected
                        ? colors.accent
                        : "transparent",
                      borderColor: isSelected ? colors.accent : inactiveBorder,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: isSelected ? activeText : colors.text,
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    {formatMuscle(bp)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Secondary muscles (collapsible multi-select) ── */}
          <TouchableOpacity
            onPress={() => setSecondaryOpen((o) => !o)}
            activeOpacity={0.7}
            style={styles.sectionHeader}
          >
            <Text
              style={[styles.sectionTitle, { color: colors.text, marginTop: 0 }]}
            >
              Secondary muscles
              {secondary.length > 0 ? ` (${secondary.length})` : ""}
            </Text>
            <Ionicons
              name={secondaryOpen ? "chevron-up" : "chevron-down"}
              size={20}
              color={colors.subtle}
            />
          </TouchableOpacity>

          {secondaryOpen && (
            <>
              <Text style={[styles.hint, { color: colors.subtle }]}>
                Other muscles this exercise works. Optional — pick any.
              </Text>
              <View style={styles.chipWrap}>
                {MUSCLE_GROUPS.filter((bp) => bp !== primary).map((bp) => {
              const isSelected = secondary.includes(bp);
              return (
                <TouchableOpacity
                  key={bp}
                  onPress={() => toggleSecondary(bp)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected
                        ? colors.accent
                        : "transparent",
                      borderColor: isSelected ? colors.accent : inactiveBorder,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: isSelected ? activeText : colors.text,
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    {formatMuscle(bp)}
                  </Text>
                </TouchableOpacity>
              );
                })}
              </View>
            </>
          )}

          {/* Error */}
          {error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
  },
  hint: {
    fontSize: 12,
    marginTop: 2,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  error: {
    color: "#FF3B30",
    fontSize: 13,
    marginTop: 16,
    textAlign: "center",
  },
});
