import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { StepProps } from "../stepProps";
import { useOnboardingColors } from "./useOnboardingColors";

const TASKS = [
  "Matching exercises to your equipment",
  "Balancing your weekly volume",
  "Setting your starting weights",
  "Mapping your progress timeline",
];

export function GeneratingPlanStep({ onNext }: StepProps) {
  const colors = useOnboardingColors();
  const [pct, setPct] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timer.current = setInterval(() => {
      setPct((prev) => {
        if (prev >= 100) {
          if (timer.current) clearInterval(timer.current);
          return 100;
        }
        // Ease the climb so it feels like real work.
        const step = prev < 70 ? 3 : prev < 90 ? 1.5 : 1;
        return Math.min(100, prev + step);
      });
    }, 45);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const done = pct >= 100;
  const activeTask = Math.min(TASKS.length - 1, Math.floor(pct / 25));

  return (
    <View style={[styles.screen, { backgroundColor: colors.screenBg }]}>
      <View style={styles.center}>
        <Text style={[styles.pct, { color: colors.text }]}>
          {Math.round(pct)}%
        </Text>
        <Text style={[styles.title, { color: colors.text }]}>
          {done ? "Your plan is ready" : "Building your plan"}
        </Text>
        <View style={[styles.track, { backgroundColor: colors.trackBg }]}>
          <View
            style={[
              styles.fill,
              { width: `${pct}%`, backgroundColor: colors.accent },
            ]}
          />
        </View>
        <View style={styles.tasks}>
          {TASKS.map((task, i) => {
            const complete = done || i < activeTask;
            const current = !done && i === activeTask;
            return (
              <View key={task} style={styles.taskRow}>
                <View
                  style={[
                    styles.taskDot,
                    {
                      backgroundColor: complete ? colors.accent : "transparent",
                      borderColor: complete ? colors.accent : colors.border,
                    },
                  ]}
                >
                  {complete && (
                    <Text
                      style={[styles.taskCheck, { color: colors.accentText }]}
                    >
                      ✓
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.taskText,
                    {
                      color:
                        complete || current ? colors.text : colors.secondary,
                      fontWeight: current ? "600" : "400",
                    },
                  ]}
                >
                  {task}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
      <View style={styles.footer}>
        <Pressable
          onPress={onNext}
          disabled={!done}
          style={[
            styles.btn,
            { backgroundColor: colors.accent },
            !done && styles.btnDisabled,
          ]}
        >
          <Text style={[styles.btnText, { color: colors.accentText }]}>
            See my plan
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
  },
  pct: {
    fontSize: 72,
    fontWeight: "800",
    letterSpacing: -3,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 28,
  },
  track: {
    alignSelf: "stretch",
    height: 6,
    borderRadius: 99,
    overflow: "hidden",
    marginBottom: 28,
  },
  fill: {
    height: "100%",
    borderRadius: 99,
  },
  tasks: {
    alignSelf: "stretch",
    gap: 16,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  taskDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  taskCheck: {
    fontSize: 12,
    fontWeight: "700",
  },
  taskText: {
    fontSize: 15,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 44,
    paddingTop: 10,
  },
  btn: {
    height: 60,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
});
