import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Swipeable } from "react-native-gesture-handler";
import { useNavigation } from "@react-navigation/native";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import Svg, { Path } from "react-native-svg";
import React, { useState } from "react";

import { useWorkoutTimer } from "../../context/WorkoutContext";
import { useSwipeableDelete } from "../../hooks/useSwipeableDelete";
import { useTrackTab } from "../../hooks/useTrackTab";

const ACCENT = "#007AFF";
const DESTRUCTIVE = "#C93838";
const LIVE = "#22B574";

const SERIF = "LibreCaslonText_400Regular";

type Theme = {
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  textFaint: string;
  border: string;
  chipBorder: string;
};

export function WorkoutSummary() {
  useTrackTab("WorkoutSummary");

  const isDark = useColorScheme() === "dark";
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const {
    seconds,
    running,
    start,
    pause,
    exercises,
    removeExercise,
    setCurrentExercise,
  } = useWorkoutTimer();

  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(
    null,
  );

  const { getSwipeableProps } = useSwipeableDelete({
    onDelete: (id) => removeExercise(id),
    deleteTitle: "Delete Exercise",
    deleteMessage: "Are you sure you want to remove this exercise?",
  });

  const t: Theme = isDark
    ? {
        bg: "#0a0a0a",
        surface: "#141414",
        text: "#fff",
        textMuted: "rgba(255,255,255,0.55)",
        textFaint: "rgba(255,255,255,0.4)",
        border: "rgba(255,255,255,0.08)",
        chipBorder: "rgba(255,255,255,0.22)",
      }
    : {
        bg: "#fafafa",
        surface: "#ffffff",
        text: "#000",
        textMuted: "rgba(0,0,0,0.5)",
        textFaint: "rgba(0,0,0,0.4)",
        border: "rgba(0,0,0,0.08)",
        chipBorder: "rgba(0,0,0,0.18)",
      };

  const glassAvailable = isLiquidGlassAvailable();

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(
      2,
      "0",
    )}`;

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const totalSets = exercises.reduce(
    (n, ex) => n + ex.sets.filter((s) => s.reps && s.weight).length,
    0,
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
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      {/* Floating close */}
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
        <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
          <Path
            d="M4 6l4 4 4-4"
            stroke={t.text}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 68,
          paddingBottom: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.heroBlock}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: running ? LIVE : t.textFaint },
              ]}
            />
            <Text style={[styles.overline, { color: t.textMuted }]}>
              {running ? "IN PROGRESS" : "PAUSED"}
            </Text>
          </View>
          <Text
            style={[styles.heroTitle, { color: t.text, fontFamily: SERIF }]}
          >
            {today}
          </Text>

          <View style={styles.metricsRow}>
            <Metric label="Time" value={formatTime(seconds)} t={t} />
            <Metric label="Exercises" value={exercises.length} t={t} />
            <Metric label="Sets" value={totalSets} t={t} />
          </View>
        </View>

        {/* Exercises */}
        <View style={styles.exercisesSection}>
          <Text style={[styles.sectionLabel, { color: t.textMuted }]}>
            EXERCISES
          </Text>

          <View style={styles.exerciseList}>
            {exercises.map((ex) => {
              const last =
                [...ex.sets]
                  .reverse()
                  .find((s) => s.reps !== "" && s.weight !== "") || null;

              return (
                <View key={ex.workoutExerciseId}>
                  <Swipeable {...getSwipeableProps(ex.workoutExerciseId)}>
                    <View
                      onTouchStart={(e) => {
                        setTouchStart({
                          x: e.nativeEvent.pageX,
                          y: e.nativeEvent.pageY,
                        });
                      }}
                      onTouchEnd={(e) => {
                        if (!touchStart) return;
                        const dx = Math.abs(e.nativeEvent.pageX - touchStart.x);
                        const dy = Math.abs(e.nativeEvent.pageY - touchStart.y);
                        if (dx < 5 && dy < 5) {
                          setCurrentExercise(ex.workoutExerciseId);
                          navigation.replace("ExerciseDetail", {
                            exercise: ex,
                          });
                        }
                        setTouchStart(null);
                      }}
                    >
                      <View
                        style={[
                          styles.exerciseCard,
                          {
                            backgroundColor: t.surface,
                            borderColor: t.border,
                          },
                        ]}
                      >
                        <View style={styles.exerciseNameCol}>
                          <Text
                            style={[styles.exerciseName, { color: t.text }]}
                            numberOfLines={1}
                          >
                            {ex.name}
                          </Text>
                        </View>

                        <View style={styles.lastSetCol}>
                          {last ? (
                            <>
                              <Text
                                style={[
                                  styles.lastSetLabel,
                                  { color: t.textMuted },
                                ]}
                              >
                                LAST SET
                              </Text>
                              <Text
                                style={[styles.lastSetValue, { color: t.text }]}
                              >
                                {last.reps}×{last.weight}
                                <Text
                                  style={[
                                    styles.lastSetUnit,
                                    { color: t.textFaint },
                                  ]}
                                >
                                  {" "}
                                  lb
                                </Text>
                              </Text>
                            </>
                          ) : (
                            <Text
                              style={[
                                styles.notStarted,
                                { color: t.textFaint },
                              ]}
                            >
                              Not started
                            </Text>
                          )}
                        </View>

                        <Svg
                          width={12}
                          height={12}
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <Path
                            d="M6 3l5 5-5 5"
                            stroke={t.textFaint}
                            strokeWidth={1.6}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </Svg>
                      </View>
                    </View>
                  </Swipeable>
                </View>
              );
            })}
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.replace("ExerciseSelect")}
            style={[styles.addExerciseBtn, { borderColor: t.chipBorder }]}
          >
            <Svg width={14} height={14} viewBox="0 0 16 16" fill="none">
              <Path
                d="M8 3v10M3 8h10"
                stroke={t.text}
                strokeWidth={1.6}
                strokeLinecap="round"
              />
            </Svg>
            <Text style={[styles.addExerciseText, { color: t.text }]}>
              Add exercise
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Footer */}
      <View
        style={[
          styles.footerWrap,
          {
            backgroundColor: t.bg,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        {running ? (
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
              onPress={pause}
            >
              <Text style={[styles.footerBtnText, { color: t.text }]}>
                Pause
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.footerBtn, { backgroundColor: DESTRUCTIVE }]}
              onPress={() => navigation.navigate("WorkoutComplete")}
            >
              <Text style={[styles.footerBtnText, { color: "#fff" }]}>
                Finish
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={start}
            style={[styles.resumeBtn, { backgroundColor: ACCENT }]}
          >
            <Text style={styles.resumeText}>Resume</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
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
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  overline: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "400",
    letterSpacing: -0.2,
    lineHeight: 38,
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
  exercisesSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  exerciseList: {
    gap: 6,
  },
  exerciseCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  exerciseNameCol: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  lastSetCol: {
    alignItems: "flex-end",
  },
  lastSetLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
  },
  lastSetValue: {
    fontSize: 15,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    marginTop: 2,
  },
  lastSetUnit: {
    fontSize: 11,
    fontWeight: "400",
  },
  notStarted: {
    fontSize: 12,
    fontWeight: "500",
    fontStyle: "italic",
  },
  addExerciseBtn: {
    marginTop: 8,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addExerciseText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.2,
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
  footerBtnText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  resumeBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  resumeText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
});
