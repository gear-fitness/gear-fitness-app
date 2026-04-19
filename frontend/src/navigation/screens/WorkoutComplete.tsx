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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { useState, useRef } from "react";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useWorkoutTimer } from "../../context/WorkoutContext";
import { submitWorkout, WorkoutSubmission } from "../../api/workoutService";
import { getCurrentLocalDateString } from "../../utils/date";
import { useTrackTab } from "../../hooks/useTrackTab";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCENT = "#007AFF";
const DESTRUCTIVE = "#C93838";

type Theme = {
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  textFaint: string;
  border: string;
  chipBg: string;
  chipBorder: string;
};

const BODY_TAGS = [
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

const CLOSE_FLOW_ROUTES = [
  "WorkoutComplete",
  "WorkoutSummary",
  "ExerciseDetail",
  "ExerciseSelect",
];

export function WorkoutComplete() {
  useTrackTab("WorkoutComplete");

  const isDark = useColorScheme() === "dark";
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { exercises, seconds, reset } = useWorkoutTimer();

  const [workoutName, setWorkoutName] = useState("");
  const [bodyTag, setBodyTag] = useState<string[]>(["FULL_BODY"]);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const t: Theme = isDark
    ? {
        bg: "#0a0a0a",
        surface: "#141414",
        text: "#fff",
        textMuted: "rgba(255,255,255,0.55)",
        textFaint: "rgba(255,255,255,0.4)",
        border: "rgba(255,255,255,0.08)",
        chipBg: "rgba(255,255,255,0.08)",
        chipBorder: "rgba(255,255,255,0.28)",
      }
    : {
        bg: "#fafafa",
        surface: "#ffffff",
        text: "#000",
        textMuted: "rgba(0,0,0,0.5)",
        textFaint: "rgba(0,0,0,0.4)",
        border: "rgba(0,0,0,0.08)",
        chipBg: "rgba(0,0,0,0.05)",
        chipBorder: "rgba(0,0,0,0.22)",
      };

  const glassAvailable = isLiquidGlassAvailable();

  const durationMin = Math.floor(seconds / 60);
  const totalSets = exercises.reduce(
    (n, ex) => n + ex.sets.filter((s) => s.reps && s.weight).length,
    0,
  );

  const toggleBodyTag = (tag: string) => {
    setBodyTag((prev) => {
      if (prev.includes(tag)) {
        if (prev.length === 1) return prev;
        return prev.filter((x) => x !== tag);
      }
      return [...prev, tag];
    });
  };

  const popOutOfFlow = () => {
    const state = navigation.getState();
    const modalCount = state.routes.filter((r: any) =>
      CLOSE_FLOW_ROUTES.includes(r.name),
    ).length;
    navigation.pop(modalCount);
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
        durationMin,
        datePerformed: getCurrentLocalDateString(),
        bodyTags: bodyTag,
        exercises: exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          sets: ex.sets.map((set) => ({
            reps: set.reps,
            weight: set.weight,
          })),
          note: ex.note || "",
        })),
        createPost,
        caption: createPost ? caption : undefined,
      };

      await submitWorkout(submission);
      await AsyncStorage.removeItem("@workout_state");

      Alert.alert(
        "Success",
        createPost
          ? "Workout saved and posted!"
          : "Workout saved successfully!",
        [
          {
            text: "OK",
            onPress: () => {
              reset();
              popOutOfFlow();
            },
          },
        ],
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
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            reset();
            popOutOfFlow();
          },
        },
      ],
    );
  };

  const closeButton = (
    <TouchableOpacity
      accessibilityLabel="Close"
      onPress={() => navigation.goBack()}
      activeOpacity={0.7}
      style={[
        styles.closeButton,
        {
          top: insets.top + 8,
          backgroundColor: glassAvailable ? "transparent" : t.surface,
          borderColor: glassAvailable ? "transparent" : t.border,
        },
      ]}
    >
      {glassAvailable && (
        <GlassView
          style={[StyleSheet.absoluteFillObject, { borderRadius: 20 }]}
          glassEffectStyle="regular"
          isInteractive
        />
      )}
      <Svg width={14} height={14} viewBox="0 0 16 16" fill="none">
        <Path
          d="M4 4l8 8M12 4l-8 8"
          stroke={t.text}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      </Svg>
    </TouchableOpacity>
  );

  const footerShadow = isDark
    ? null
    : {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 4,
      };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: t.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {closeButton}

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{
          paddingTop: insets.top + 68,
          paddingBottom: 20,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.heroBlock}>
          <Text style={[styles.overline, { color: t.textMuted }]}>
            WORKOUT COMPLETE
          </Text>
          <Text style={[styles.heroTitle, { color: t.text }]}>Nice work.</Text>

          <View style={styles.metricsRow}>
            <Metric label="Time" value={`${durationMin} min`} t={t} />
            <Metric label="Exercises" value={exercises.length} t={t} />
            <Metric label="Sets" value={totalSets} t={t} />
          </View>
        </View>

        {/* Workout name */}
        <Section label="Workout name" required t={t}>
          <TextInput
            value={workoutName}
            onChangeText={setWorkoutName}
            placeholder="e.g. Chest day"
            placeholderTextColor={t.textFaint}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
            style={[
              styles.nameInput,
              { color: t.text, borderBottomColor: t.border },
            ]}
          />
        </Section>

        {/* Body tag */}
        <Section label="Body tag" required t={t}>
          <View style={styles.tagWrap}>
            {BODY_TAGS.map((tag) => {
              const active = bodyTag.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  activeOpacity={0.7}
                  onPress={() => toggleBodyTag(tag)}
                  style={[
                    styles.tagButton,
                    active
                      ? { backgroundColor: ACCENT, borderColor: ACCENT }
                      : {
                          backgroundColor: "transparent",
                          borderColor: t.chipBorder,
                        },
                  ]}
                >
                  <Text
                    style={[
                      styles.tagText,
                      { color: active ? "#fff" : t.text },
                    ]}
                  >
                    {tag.replace("_", " ")}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        {/* Exercises summary */}
        <Section label={`Exercises (${exercises.length})`} t={t}>
          <View style={styles.exerciseList}>
            {exercises.map((ex) => {
              const count = ex.sets.filter(
                (s) => s.reps && s.weight,
              ).length;
              return (
                <View
                  key={ex.workoutExerciseId}
                  style={[
                    styles.exerciseCard,
                    { backgroundColor: t.surface, borderColor: t.border },
                  ]}
                >
                  <Text
                    style={[styles.exerciseName, { color: t.text }]}
                    numberOfLines={1}
                  >
                    {ex.name}
                  </Text>
                  <Text style={[styles.setsCount, { color: t.textMuted }]}>
                    {count} sets
                  </Text>
                </View>
              );
            })}
          </View>
        </Section>

        {/* Caption */}
        <Section label="How'd it go?" t={t}>
          <View
            style={[
              styles.captionCard,
              {
                backgroundColor: t.chipBg,
                borderColor: t.border,
                borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
              },
            ]}
          >
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Felt strong today. Hit a PR on…"
              placeholderTextColor={t.textFaint}
              multiline
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }}
              style={[styles.captionInput, { color: t.text }]}
            />
          </View>
        </Section>

        {/* Discard — tertiary destructive link */}
        <TouchableOpacity
          activeOpacity={0.5}
          style={styles.discardLink}
          onPress={handleDiscardWorkout}
          disabled={loading}
        >
          <Text style={styles.discardText}>Discard workout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Paired footer */}
      <View
        style={[
          styles.footerWrap,
          {
            backgroundColor: t.bg,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <View
          style={[
            styles.footerCard,
            footerShadow,
            {
              backgroundColor: t.surface,
              borderColor: t.border,
              borderWidth: isDark ? 1 : 0,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.footerBtn}
            onPress={() => handleSaveWorkout(false)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={t.text} />
            ) : (
              <Text style={[styles.footerBtnText, { color: t.text }]}>
                Save
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.footerBtn, { backgroundColor: ACCENT }]}
            onPress={() => handleSaveWorkout(true)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.footerBtnContent}>
                <Text style={[styles.footerBtnText, { color: "#fff" }]}>
                  Save & post
                </Text>
                <Text style={styles.footerBtnArrow}>→</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function Metric({
  label,
  value,
  t,
}: {
  label: string;
  value: string | number;
  t: Theme;
}) {
  return (
    <View>
      <Text style={[styles.metricLabel, { color: t.textMuted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: t.text }]}>{value}</Text>
    </View>
  );
}

function Section({
  label,
  required,
  children,
  t,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  t: Theme;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: t.textMuted }]}>
        {label.toUpperCase()}
        {required ? " *" : ""}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  heroBlock: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  overline: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.8,
    lineHeight: 34,
  },
  metricsRow: {
    flexDirection: "row",
    marginTop: 20,
    gap: 28,
    alignItems: "flex-start",
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  nameInput: {
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 0,
    fontSize: 22,
    fontWeight: "600",
    letterSpacing: -0.4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  tagButton: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
  },
  exerciseList: {
    gap: 6,
    marginTop: 4,
  },
  exerciseCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  exerciseName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  setsCount: {
    fontSize: 13,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    marginLeft: 12,
  },
  captionCard: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 4,
  },
  captionInput: {
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 22,
    minHeight: 66,
    textAlignVertical: "top",
    padding: 0,
  },
  discardLink: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    alignItems: "center",
  },
  discardText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
    color: DESTRUCTIVE,
  },
  footerWrap: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  footerCard: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 16,
    gap: 2,
  },
  footerBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  footerBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerBtnText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  footerBtnArrow: {
    fontSize: 15,
    fontWeight: "400",
    color: "rgba(255,255,255,0.6)",
  },
});
