import React from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { Text } from "@react-navigation/elements";
import { ExerciseSearchBar } from "./ExerciseSearchBar";

interface ExerciseFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  bodyParts: string[];
  selectedBodyPart: string | null;
  onSelectBodyPart: (bodyPart: string | null) => void;
  placeholder?: string;
}

export function ExerciseFilterBar({
  searchQuery,
  onSearchChange,
  bodyParts,
  selectedBodyPart,
  onSelectBodyPart,
  placeholder = "Search exercises...",
}: ExerciseFilterBarProps) {
  const isDark = useColorScheme() === "dark";

  const colors = {
    text: isDark ? "#fff" : "#000",
    border: isDark ? "#333" : "#e0e0e0",
    inputBg: isDark ? "#1c1c1e" : "#f5f5f5",
    accent: "#007AFF",
  };

  return (
    <>
      <ExerciseSearchBar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        placeholder={placeholder}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScrollView}
        contentContainerStyle={styles.chipContainer}
      >
        <TouchableOpacity
          style={[
            styles.chip,
            {
              backgroundColor: !selectedBodyPart
                ? colors.accent
                : colors.inputBg,
              borderColor: !selectedBodyPart ? colors.accent : colors.border,
            },
          ]}
          onPress={() => onSelectBodyPart(null)}
        >
          <Text
            style={[
              styles.chipText,
              { color: !selectedBodyPart ? "#fff" : colors.text },
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {bodyParts.map((part) => (
          <TouchableOpacity
            key={part}
            style={[
              styles.chip,
              {
                backgroundColor:
                  selectedBodyPart === part ? colors.accent : colors.inputBg,
                borderColor:
                  selectedBodyPart === part ? colors.accent : colors.border,
              },
            ]}
            onPress={() =>
              onSelectBodyPart(selectedBodyPart === part ? null : part)
            }
          >
            <Text
              style={[
                styles.chipText,
                { color: selectedBodyPart === part ? "#fff" : colors.text },
              ]}
            >
              {part}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  chipScrollView: {
    flexGrow: 0,
    marginBottom: 8,
  },
  chipContainer: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
