import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { Text } from "@react-navigation/elements";
import { SafeAreaView } from "react-native-safe-area-context";

import { Exercise } from "../api/exerciseService";
import { useExerciseList } from "../hooks/useExerciseList";
import { ExerciseListView } from "./ExerciseListView";
import {
  getFeaturedExerciseId,
  setFeaturedExerciseId,
} from "../widgets/featuredExercise";
import { updateFeaturedWidget } from "../widgets/updateFeaturedWidget";

interface FeaturedExerciseModalProps {
  visible: boolean;
  onClose: () => void;
}

export function FeaturedExerciseModal({
  visible,
  onClose,
}: FeaturedExerciseModalProps) {
  const isDark = useColorScheme() === "dark";

  const colors = {
    bg: isDark ? "#000" : "#fff",
    text: isDark ? "#fff" : "#000",
    subtle: isDark ? "#aaa" : "#666",
    accent: "#007AFF",
    inputBg: isDark ? "#1c1c1e" : "#f5f5f5",
  };

  // Only auto-fetch once the modal is actually opened
  const { exercises, loading, error, fetchExercises } = useExerciseList(false);

  const [currentFeaturedId, setCurrentFeaturedId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!visible) return;

    fetchExercises();
    getFeaturedExerciseId().then(setCurrentFeaturedId);
  }, [visible]);

  const handleSelect = async (exercise: Exercise) => {
    await setFeaturedExerciseId(exercise.exerciseId);
    setCurrentFeaturedId(exercise.exerciseId);
    updateFeaturedWidget();
    onClose();
  };

  const handleClear = async () => {
    await setFeaturedExerciseId(null);
    setCurrentFeaturedId(null);
    updateFeaturedWidget();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.bg }]}
        edges={["top", "bottom"]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Text style={[styles.headerAction, { color: colors.accent }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Widget Exercise
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* "None" row — always shown above the list */}
        <TouchableOpacity
          style={[
            styles.noneRow,
            {
              backgroundColor: colors.inputBg,
              borderColor:
                currentFeaturedId === null ? colors.accent : "transparent",
            },
          ]}
          onPress={handleClear}
        >
          <View>
            <Text style={[styles.noneLabel, { color: colors.text }]}>None</Text>
            <Text style={[styles.noneHint, { color: colors.subtle }]}>
              Hide widget data
            </Text>
          </View>
          {currentFeaturedId === null && (
            <Text style={[styles.check, { color: colors.accent }]}>✓</Text>
          )}
        </TouchableOpacity>

        {/* Body */}
        {loading && exercises.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={[styles.errorText, { color: colors.subtle }]}>
              {error}
            </Text>
          </View>
        ) : (
          <ExerciseListView
            exercises={exercises}
            onExercisePress={handleSelect}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerAction: {
    fontSize: 17,
    minWidth: 60,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  headerSpacer: {
    minWidth: 60,
  },

  noneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
  },
  noneLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  noneHint: {
    fontSize: 13,
    marginTop: 2,
  },
  check: {
    fontSize: 20,
    fontWeight: "700",
  },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorText: {
    fontSize: 15,
    textAlign: "center",
  },
});
