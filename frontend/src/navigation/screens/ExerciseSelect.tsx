import { Text } from "@react-navigation/elements";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  SectionList,
} from "react-native";
import React, { useState, useEffect, useMemo } from "react";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useColorScheme } from "react-native";

import { getAllExercises } from "../../api/exerciseService";
import { useWorkoutTimer } from "../../context/WorkoutContext";
import { useTrackTab } from "../../hooks/useTrackTab";

import { ExerciseSearchBar } from "../../components/ExerciseSearchBar";
import { ExerciseCard } from "../../components/ExerciseCard";
import { FloatingCloseButton } from "../../components/FloatingCloseButton";

export function ExerciseSelect() {
  useTrackTab("ExerciseSelect");

  const navigation = useNavigation();
  const { showPlayer, start } = useWorkoutTimer();
  const insets = useSafeAreaInsets();

  const isDark = useColorScheme() === "dark";

  const colors = {
    bg: isDark ? "#000" : "#fff",
    text: isDark ? "#fff" : "#000",
    subtle: isDark ? "#aaa" : "#666",
    border: isDark ? "#333" : "#e0e0e0",
    inputBg: isDark ? "#1c1c1e" : "#f5f5f5",
    accent: isDark ? "#fff" : "#000",
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [exercises, setExercises] = useState<any[]>([]);
  const [selectedBodyPart, setSelectedBodyPart] = useState<string | null>(null);

  useEffect(() => {
    const loadExercises = async () => {
      try {
        const data = await getAllExercises();
        setExercises(data);
      } catch (err) {
        console.error("Failed to fetch exercises:", err);
      }
    };
    loadExercises();
  }, []);

  const bodyParts = useMemo(() => {
    const parts = new Set(exercises.map((ex) => ex.bodyPart.toUpperCase()));
    return Array.from(parts).sort();
  }, [exercises]);

  const sections = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    const filtered = exercises.filter((ex) => {
      const matchesSearch =
        !query ||
        ex.name.toLowerCase().includes(query) ||
        ex.bodyPart.toLowerCase().includes(query);

      const matchesBodyPart =
        !selectedBodyPart || ex.bodyPart.toUpperCase() === selectedBodyPart;

      return matchesSearch && matchesBodyPart;
    });

    const grouped: Record<string, any[]> = {};
    filtered.forEach((ex) => {
      const key = ex.bodyPart.toUpperCase();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(ex);
    });

    return Object.keys(grouped)
      .sort()
      .map((key) => ({
        title: key,
        data: grouped[key].sort((a: any, b: any) =>
          a.name.localeCompare(b.name),
        ),
      }));
  }, [exercises, searchQuery, selectedBodyPart]);

  const handleExercisePress = (exercise: any) => {
    start();

    const workoutExerciseId = Date.now().toString();

    showPlayer(workoutExerciseId);

    navigation.replace("ExerciseDetail", {
      exercise: {
        workoutExerciseId,
        exerciseId: exercise.exerciseId,
        name: exercise.name,
        sets: [],
      },
    });
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg }]}
      edges={["bottom"]}
    >
      <FloatingCloseButton />

      <View style={{ height: insets.top + 8 + 40, marginBottom: 20 }}>
        <View style={[styles.headerRow, { top: insets.top + 8 }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Select Exercise
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <ExerciseSearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Search exercises..."
      />

      {/* Body Part Filter Chips */}
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
          onPress={() => setSelectedBodyPart(null)}
        >
          <Text
            style={[
              styles.chipText,
              { color: !selectedBodyPart ? (isDark ? "#000" : "#fff") : colors.text },
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
              setSelectedBodyPart(selectedBodyPart === part ? null : part)
            }
          >
            <Text
              style={[
                styles.chipText,
                { color: selectedBodyPart === part ? (isDark ? "#000" : "#fff") : colors.text },
              ]}
            >
              {part}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Exercise List */}
      <SectionList
        style={styles.list}
        sections={sections}
        keyExtractor={(item) => item.exerciseId}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        stickySectionHeadersEnabled
        renderSectionHeader={({ section: { title } }) => (
          <View style={[styles.sectionHeader, { backgroundColor: colors.bg }]}>
            <Text style={[styles.sectionHeaderText, { color: colors.subtle }]}>
              {title}
            </Text>
            <Text style={[styles.sectionCount, { color: colors.subtle }]}>
              {sections.find((s) => s.title === title)?.data.length || 0}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <ExerciseCard
            exercise={item}
            onPress={() => handleExercisePress(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListFooterComponent={
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("CreateExercise", { startWorkout: true })
            }
            style={[styles.createButton, { borderColor: colors.border }]}
          >
            <Text style={[styles.createButtonText, { color: colors.subtle }]}>
              + Create Custom Exercise
            </Text>
            <Text style={[styles.createButtonHint, { color: colors.border }]}>
              Don't see your exercise? Add it here
            </Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No exercises found
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.subtle }]}>
              Try adjusting your search or filters
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  headerRow: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
  },

  // Filter Chips
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

  // Section Headers
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Exercise List
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Create Button
  createButton: {
    marginTop: 20,
    marginBottom: 30,
    paddingVertical: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    gap: 4,
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  createButtonHint: {
    fontSize: 12,
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
});
