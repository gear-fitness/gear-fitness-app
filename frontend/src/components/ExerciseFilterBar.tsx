import React from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { Text } from "@react-navigation/elements";
import { SearchBar } from "./SearchBar";

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
    activeBg: isDark ? "#fff" : "#000",
    activeText: isDark ? "#000" : "#fff",
    inactiveBorder: isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.18)",
  };

  const renderChip = (label: string, active: boolean, onPress: () => void) => (
    <TouchableOpacity
      key={label}
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.activeBg : "transparent",
          borderColor: active ? colors.activeBg : colors.inactiveBorder,
        },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          { color: active ? colors.activeText : colors.text },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <>
      <View style={styles.searchWrapper}>
        <SearchBar
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder={placeholder}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScrollView}
        contentContainerStyle={styles.chipContainer}
      >
        {renderChip("All", !selectedBodyPart, () => onSelectBodyPart(null))}
        {bodyParts.map((part) =>
          renderChip(part, selectedBodyPart === part, () =>
            onSelectBodyPart(selectedBodyPart === part ? null : part),
          ),
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  searchWrapper: {
    marginTop: 10,
    marginBottom: 12,
  },
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
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
