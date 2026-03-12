import { Text } from "@react-navigation/elements";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Keyboard,
  SectionList,
} from "react-native";
import React, { useState, useEffect, useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useColorScheme } from "react-native";

import search from "../../assets/search.png";
import close from "../../assets/close.png";
import { getAllExercises } from "../../api/exerciseService";
import { useTrackTab } from "../../hooks/useTrackTab";

export function ExerciseList() {
  useTrackTab("ExerciseList");

  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === "dark";

  const colors = {
    bg: isDark ? "#000" : "#fff",
    text: isDark ? "#fff" : "#000",
    subtle: isDark ? "#aaa" : "#666",
    icon: isDark ? "#fff" : "#555",
    border: isDark ? "#333" : "#e0e0e0",
    inputBg: isDark ? "#1c1c1e" : "#f5f5f5",
    card: isDark ? "#1c1c1e" : "#fff",
    sectionBg: isDark ? "#111" : "#f9f9f9",
    accent: "#007AFF",
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
    navigation.navigate("ExerciseHistory", { exercise });
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg }]}
      edges={["bottom"]}
    >
      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: colors.inputBg, borderColor: colors.border },
          ]}
        >
          <Image
            source={search}
            style={[styles.searchIcon, { tintColor: colors.icon }]}
          />
          <TextInput
            placeholder="Search exercises..."
            placeholderTextColor={colors.subtle}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.text }]}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Image
                source={close}
                style={[styles.clearIcon, { tintColor: colors.icon }]}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

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
              setSelectedBodyPart(selectedBodyPart === part ? null : part)
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
          <TouchableOpacity
            style={[
              styles.exerciseCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={() => handleExercisePress(item)}
            activeOpacity={0.7}
          >
            <View style={styles.exerciseCardContent}>
              <View style={styles.exerciseInfo}>
                <Text
                  style={[styles.exerciseName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text
                  style={[styles.exerciseDescription, { color: colors.subtle }]}
                  numberOfLines={2}
                >
                  {item.description}
                </Text>
              </View>
              <View style={styles.exerciseArrow}>
                <Text style={[styles.arrowText, { color: colors.subtle }]}>
                  ›
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
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

  // Search
  searchWrapper: {
    marginTop: 10,
    paddingHorizontal: 20,
    marginBottom: 12,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },

  searchIcon: {
    width: 18,
    height: 18,
    marginRight: 8,
  },

  clearIcon: {
    width: 16,
    height: 16,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
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
