import { Button, Text } from "@react-navigation/elements";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
} from "react-native";
import React, { useState, useEffect } from "react";
import search from "../../assets/search.png";
import filter from "../../assets/filter.png";
import close from "../../assets/close.png";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useColorScheme } from "react-native";

type FilterKey =
  | "CALVES"
  | "HAMSTRINGS"
  | "TRICEPS"
  | "BICEPS"
  | "LEGS"
  | "BACK"
  | "CHEST"
  | "SHOULDERS"
  | "CORE";

type SelectedFilters = Record<FilterKey, boolean>;

export function ExerciseSelect({ route }: { route: any }) {
  const navigation = useNavigation();

  const isDark = useColorScheme() === "dark";

  const colors = {
    bg: isDark ? "#000" : "#fff",
    text: isDark ? "#fff" : "#000",
    subtle: isDark ? "#aaa" : "#666",
    icon: isDark ? "#fff" : "#555",
    border: isDark ? "#333" : "#ccc",
    inputBg: isDark ? "#1c1c1e" : "#fff",
    modalBg: isDark ? "#111" : "#fff",
    card: isDark ? "#222" : "#fff",
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [isFiltering, setIsFiltering] = useState(false);

  const [selectedFilters, setSelectedFilters] = useState<SelectedFilters>({
    LEGS: false,
    BACK: false,
    CHEST: false,
    SHOULDERS: false,
    CORE: false,
    CALVES: false,
    HAMSTRINGS: false,
    TRICEPS: false,
    BICEPS: false,
  });

  const [exercises, setExercises] = useState<any[]>([]);

  const activeFilters = Object.entries(selectedFilters)
    .filter(([_, value]) => value)
    .map(([key]) => key);

  const filteredExercises = exercises.filter((ex) => {
    const searchMatch =
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.bodyPart.toLowerCase().includes(searchQuery.toLowerCase());

    const filterMatch =
      activeFilters.length === 0 ||
      activeFilters.includes(ex.bodyPart.toUpperCase());

    return searchMatch && filterMatch;
  });

  useEffect(() => {
    const loadExercises = async () => {
      try {
        const res = await fetch("http://10.58.14.218:8080/api/exercises");
        const text = await res.text();
        if (!res.ok) return;
        setExercises(JSON.parse(text));
      } catch (err) {
        console.error("Failed to fetch exercises:", err);
      }
    };

    loadExercises();
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Search Bar */}
      <View style={styles.searchRow}>
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
            placeholder="Search Exercises"
            placeholderTextColor={colors.subtle}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.text }]}
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

        {/* Filter Button */}
        <TouchableOpacity
          onPress={() => setIsFiltering(true)}
          style={[
            styles.filterButton,
            { backgroundColor: colors.inputBg, borderColor: colors.border },
          ]}
        >
          <Image
            source={filter}
            style={[styles.filterIcon, { tintColor: colors.icon }]}
          />
        </TouchableOpacity>
      </View>

      {/* Exercises List */}
      <ScrollView style={{ marginTop: 20 }}>
        {filteredExercises.map((ex) => (
          <TouchableOpacity
            key={ex.exerciseId}
            onPress={() =>
              navigation.navigate("ExerciseDetail", {
                exercise: ex,
              })
            }
            style={{ paddingVertical: 10 }}
          >
            <Text
              style={{ fontSize: 16, fontWeight: "600", color: colors.text }}
            >
              {ex.name}
            </Text>
            <Text style={{ color: colors.subtle }}>{ex.bodyPart}</Text>
            <Text style={{ color: colors.subtle, marginTop: 4 }}>
              {ex.description}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Filter Modal */}
      <Modal visible={isFiltering} animationType="fade" transparent>
        <View style={styles.modalBackground}>
          <View
            style={[styles.modalContainer, { backgroundColor: colors.modalBg }]}
          >
            <TouchableOpacity onPress={() => setIsFiltering(false)}>
              <Image
                source={close}
                style={[
                  styles.clearIcon,
                  { tintColor: colors.icon, alignSelf: "flex-end" },
                ]}
              />
            </TouchableOpacity>

            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Filter Exercises
            </Text>

            <ScrollView style={styles.scrollArea}>
              {Object.entries(selectedFilters).map(([key, value]) => {
                const typedKey = key as FilterKey;

                return (
                  <TouchableOpacity
                    key={typedKey}
                    onPress={() =>
                      setSelectedFilters((prev) => ({
                        ...prev,
                        [typedKey]: !prev[typedKey],
                      }))
                    }
                    style={styles.filterOption}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        {
                          backgroundColor: value ? "#007AFF" : colors.card,
                          borderColor: colors.border,
                        },
                      ]}
                    />

                    <Text style={{ fontSize: 16, color: colors.text }}>
                      {typedKey}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Button onPress={() => setIsFiltering(false)}>Apply Filters</Button>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },

  searchRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },

  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    height: 40,
  },

  searchIcon: { width: 18, height: 18, marginRight: 8 },
  clearIcon: { width: 16, height: 16 },

  searchInput: { flex: 1, fontSize: 16 },

  filterButton: {
    marginLeft: 10,
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  filterIcon: { width: 20, height: 20 },

  modalBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },

  modalContainer: {
    width: "80%",
    borderRadius: 10,
    padding: 20,
  },

  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },

  scrollArea: { maxHeight: 300, marginVertical: 10 },

  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 5,
  },

  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    marginRight: 10,
    borderRadius: 4,
  },
});
