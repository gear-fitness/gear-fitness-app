import { Button, Text } from "@react-navigation/elements";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
} from "react-native";
import React, { useState, useEffect } from "react";
import search from "../../assets/search.png";
import filter from "../../assets/filter.png";
import close from "../../assets/close.png";
import { Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

export function ExerciseSelect() {
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

  const [exercises, setExercises] = useState<
    Array<{ name: string; muscleGroup: string }>
  >([]);

  const filteredExercises = exercises.filter((ex: any) => {
    const matchesFilters =
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (activeFilters.length === 0 ||
        activeFilters.includes(ex.muscleGroup.toUpperCase()));
    return matchesFilters;

    const matchesSearch = ex.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
  });

  const activeFilters = Object.entries(selectedFilters)
    .filter(([_, value]) => value)
    .map(([key, _]) => key);

  useEffect(() => {
    // Fetch exercises from backend (placeholder URL)
    fetch("http:///10.58.14.218:8080/api/exercises")
      .then((res) => res.json())
      .then((data) => setExercises(data))
      .catch((error) => console.error("Error fetching exercises:", error));
  }, []);

  const toggleFilter = (key: FilterKey) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    //Search bar container
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right", "bottom"]}
    >
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Image source={search} style={styles.searchIcon} />
          <TextInput
            placeholder="Search Exercises"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Image source={close} style={styles.clearIcon} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={() => setIsFiltering(true)}
          style={styles.filterButton}
        >
          <Image source={filter} style={styles.filterIcon} />
        </TouchableOpacity>
      </View>

      {/* Exercise display */}
      <ScrollView style={{ marginTop: 20 }}>
        {filteredExercises.map((ex: any) => (
          <View key={ex.id} style={{ paddingVertical: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: "600" }}>{ex.name}</Text>
            <Text style={{ color: "#666" }}>{ex.bodyPart}</Text>
          </View>
        ))}
      </ScrollView>

      <Modal visible={isFiltering} animationType="fade" transparent={true}>
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <TouchableOpacity onPress={() => setIsFiltering(false)}>
              <Image
                source={close}
                style={[styles.clearIcon, { alignSelf: "flex-end" }]}
              />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Filter Exercises</Text>

            <ScrollView style={styles.scrollArea}>
              {Object.entries(selectedFilters).map(([key, value]) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => toggleFilter(key as FilterKey)}
                  style={styles.filterOption}
                >
                  <View
                    style={[
                      styles.checkbox,
                      { backgroundColor: value ? "#007AFF" : "#fff" },
                    ]}
                  >
                    {value && <View style={styles.checkboxInner} />}
                  </View>

                  <Text style={styles.filterText}>{key}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Button onPress={() => setIsFiltering(false)}>Apply Filters</Button>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },

  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    paddingHorizontal: 10,
    height: 40,
    backgroundColor: "#fff",
  },

  searchIcon: {
    width: 18,
    height: 18,
    tintColor: "#555",
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
  },

  clearIcon: {
    width: 16,
    height: 16,
    tintColor: "#555",
  },

  filterButton: {
    marginLeft: 10,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },

  filterIcon: {
    width: 20,
    height: 20,
    tintColor: "#333",
  },

  modalBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },

  modalContainer: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },

  scrollArea: {
    maxHeight: 300,
    marginVertical: 10,
  },

  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 5,
  },

  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  checkboxInner: {
    width: 10,
    height: 10,
    backgroundColor: "#fff",
  },

  filterText: {
    fontSize: 16,
    textTransform: "capitalize",
  },
});
