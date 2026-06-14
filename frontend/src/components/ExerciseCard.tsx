import React from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { Text } from "@react-navigation/elements";
import { renderBodyParts } from "../utils/exerciseUtils";
import { useThemeColors } from "../hooks/useThemeColors";
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
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      style={[
        styles.exerciseCard,
        {
          backgroundColor: colors.cardBg,
          borderColor: colors.cardBorder,
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
            <Text style={[styles.bodyPartsText, { color: colors.textMuted }]}>
              {renderBodyParts(
                exercise.bodyParts,
                colors.textMuted,
                colors.accent,
              )}
            </Text>
          )}
          {exercise.description ? (
            <Text
              style={[styles.exerciseDescription, { color: colors.textMuted }]}
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
            <Text style={[styles.arrowText, { color: colors.textMuted }]}>›</Text>
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
