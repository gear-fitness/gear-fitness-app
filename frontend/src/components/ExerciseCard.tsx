import React from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { Text } from "@react-navigation/elements";
import { useColorScheme } from "react-native";
import { renderBodyParts } from "../utils/exerciseUtils";
import { BodyPartDTO } from "../api/exerciseService";

interface ExerciseCardProps {
  exercise: {
    exerciseId: string;
    name: string;
    description?: string;
    bodyParts: BodyPartDTO[];
  };
  onPress: () => void;
  renderActions?: () => React.ReactNode;
}

export function ExerciseCard({
  exercise,
  onPress,
  renderActions,
}: ExerciseCardProps) {
  const isDark = useColorScheme() === "dark";

  const colors = {
    text: isDark ? "#fff" : "#000",
    subtle: isDark ? "#aaa" : "#666",
    border: isDark ? "#333" : "#e0e0e0",
    card: isDark ? "#1c1c1e" : "#fff",
    accent: "#007AFF",
  };

  return (
    <TouchableOpacity
      style={[
        styles.exerciseCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.exerciseCardContent}>
        <View style={styles.exerciseInfo}>
          <Text
            style={[styles.exerciseName, { color: colors.text }]}
            numberOfLines={1}
          >
            {exercise.name}
          </Text>
          {exercise.bodyParts && exercise.bodyParts.length > 0 && (
            <Text style={[styles.bodyPartsText, { color: colors.subtle }]}>
              {renderBodyParts(
                exercise.bodyParts,
                colors.subtle,
                colors.accent,
              )}
            </Text>
          )}
          {exercise.description ? (
            <Text
              style={[styles.exerciseDescription, { color: colors.subtle }]}
              numberOfLines={2}
            >
              {exercise.description}
            </Text>
          ) : null}
        </View>
        {renderActions ? (
          renderActions()
        ) : (
          <View style={styles.exerciseArrow}>
            <Text style={[styles.arrowText, { color: colors.subtle }]}>›</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  exerciseCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  exerciseCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  bodyPartsText: {
    fontSize: 12,
    marginBottom: 4,
  },
  exerciseDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  exerciseArrow: {
    marginLeft: 12,
    justifyContent: "center",
  },
  arrowText: {
    fontSize: 24,
    fontWeight: "300",
  },
});
